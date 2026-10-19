/* Evidence: live portal captures, session recording, OCR / PDF reading and the automatic feed into the official record.
   Every item is fingerprinted (SHA-256) the moment it is added, and every add/remove goes to the audit trail. */

const REC = { on: false, stream: null, recorder: null, chunks: [], blob: null, startedAt: null };

/* ---------- Evidence store ---------- */
async function addEvidence(docId, blob, { kind, source, name, note = '', text = '' }) {
  const at = new Date().toISOString();
  const ext = (blob.type.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace('svg+xml', 'svg').replace(/;.*/, '');
  const ev = {
    id: crypto.randomUUID(), kind, source, trust: TRUST[source], note, text, blob, at,
    name: name || `${docId}_${kind}_${at.replace(/[:.]/g, '-').slice(0, 19)}.${ext}`,
    kindLabel: { capture: 'Portal capture', attestation: 'Decision snapshot', file: 'Portal file', upload: 'Uploaded image', import: 'Imported', generated: 'Generated' }[kind] || kind,
    sha256: await sha256Hex(blob),
    thumb: blob.type.startsWith('image/') ? URL.createObjectURL(blob) : null,
  };
  state.docs[docId].evidence.push(ev);
  log(`Proof added: ${ev.kindLabel}`, docId, `${ev.name} · sha256 ${ev.sha256.slice(0, 16)}…`);
  renderAll();
  return ev;
}

let evOpen = null;
function openEvidence(docId, evId) {
  const ev = state.docs[docId].evidence.find(e => e.id === evId); if (!ev) return;
  evOpen = { docId, evId };
  const url = URL.createObjectURL(ev.blob);
  $('#evTitle').textContent = `${docById(docId).title}: ${ev.kindLabel}`;
  $('#evMeta').textContent = `${SOURCE_LABEL[ev.source]} · ${new Date(ev.at).toLocaleString('en-IN')}${ev.note ? ' · ' + ev.note : ''}`;
  $('#evView').innerHTML = ev.blob.type.startsWith('image/') ? `<img src="${url}" alt="">`
    : ev.blob.type.includes('pdf') ? `<iframe src="${url}" title="PDF"></iframe>`
    : ev.blob.type.startsWith('video/') ? `<video src="${url}" controls></video>`
    : `<p class="ev-file">${esc(ev.name)} · ${Math.round(ev.blob.size / 1024)} KB</p>`;
  $('#evText').textContent = ev.text || '(no text)';
  $('.ev-text').hidden = !ev.text;
  $('#evHash').textContent = `SHA-256 ${ev.sha256}`;
  $('#evSave').href = url; $('#evSave').download = ev.name;
  $('#evRemove').hidden = state.locked;
  $('#evDlg').showModal();
}
$('#evClose').addEventListener('click', () => $('#evDlg').close());
$('#evRemove').addEventListener('click', () => {
  const { docId, evId } = evOpen, list = state.docs[docId].evidence, i = list.findIndex(e => e.id === evId);
  if (i < 0 || !confirm('Remove this proof? The removal is recorded in the audit trail.')) return;
  const [ev] = list.splice(i, 1);
  log('Proof REMOVED', docId, `${ev.name} · sha256 ${ev.sha256.slice(0, 16)}…`);
  if (state.docs[docId].status !== 'pending') { state.docs[docId].status = 'pending'; state.docs[docId].override = null; }
  $('#evDlg').close();
  renderAll();
});

/* ---------- Frame grabbing ---------- */
async function grabFrame(stream) {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.srcObject = stream;
  await v.play();
  await new Promise(r => (v.requestVideoFrameCallback ? v.requestVideoFrameCallback(() => r()) : setTimeout(r, 300)));
  const c = Object.assign(document.createElement('canvas'), { width: v.videoWidth, height: v.videoHeight });
  c.getContext('2d').drawImage(v, 0, 0);
  v.pause(); v.srcObject = null;
  return c;
}
/* Burns case, operator, document and time into a band under the image, so a capture can't be reused for another case. */
function watermark(canvas, label) {
  const band = Math.max(28, Math.round(canvas.width / 60));
  const out = Object.assign(document.createElement('canvas'), { width: canvas.width, height: canvas.height + band });
  const g = out.getContext('2d');
  g.drawImage(canvas, 0, 0);
  g.fillStyle = '#073B67'; g.fillRect(0, canvas.height, out.width, band);
  g.fillStyle = '#F47A32'; g.fillRect(0, canvas.height, 6, band);
  g.fillStyle = '#fff'; g.font = `600 ${Math.round(band * 0.5)}px Inter, sans-serif`; g.textBaseline = 'middle';
  g.fillText(`BSS ${state.caseId} · ${label} · Operator: ${state.operator || '—'} · ${new Date().toLocaleString('en-IN')} IST`, 16, canvas.height + band / 2);
  return out;
}
const toPng = c => new Promise(r => c.toBlob(r, 'image/png'));
/* Portal windows are often half a screen wide: enlarge small frames so OCR can read 12–13 px text. */
function ocrCanvas(c) {
  const s = Math.min(2, Math.max(1, 1800 / c.width));
  if (s === 1) return c;
  const out = Object.assign(document.createElement('canvas'), { width: Math.round(c.width * s), height: Math.round(c.height * s) });
  const g = out.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(c, 0, 0, out.width, out.height);
  return out;
}

/* ---------- Capture portal window → proof + OCR → official record ---------- */
/* Manual capture. While live reading is on it takes the current frame of the shared portal window at once;
   otherwise it asks for a window. Unlike live reading, a manual capture may replace values already read. */
async function capturePortal(d) {
  if (state.locked) return;
  let canvas, label = '', surface = 'window';
  if (LIVE.on && LIVE.video) {
    canvas = liveFrame();
    label = LIVE.label;
  } else {
    if (!navigator.mediaDevices?.getDisplayMedia) return toast('Screen capture not supported in this browser: use Chrome or Edge');
    let stream;
    try {
      toast('Pick the portal window in the share dialog');
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'window' }, audio: false,
        selfBrowserSurface: 'exclude', surfaceSwitching: 'exclude', monitorTypeSurfaces: 'exclude',
      });
    } catch { return toast('Capture cancelled'); }
    const track = stream.getVideoTracks()[0];
    label = track.label || '';
    surface = track.getSettings().displaySurface;
    try { canvas = await grabFrame(stream); } finally { stream.getTracks().forEach(t => t.stop()); }
    if (surface === 'monitor') toast('Whole screen picked: the desk itself is in the image, so values are not auto-read');
  }

  const png = await toPng(watermark(canvas, `${d.title} portal capture`));
  setBusy(d, 'Reading capture…');
  let text = '';
  try { text = surface === 'monitor' ? '' : await ocr(ocrCanvas(canvas)); } catch (e) { toast('OCR failed: ' + e.message); }
  const ev = await addEvidence(d.id, png, { kind: 'capture', source: 'capture', note: label ? `Window: ${label}` : '', text });
  setBusy(d, '');
  if (text) feed(d, text, 'capture', ev, label);
}

function setBusy(d, msg) {
  const el = tileEl(d.id);
  el.classList.toggle('busy', !!msg);
  el.dataset.busy = msg;
}

/* ---------- Automatic feed: text → official fields ---------- */
/* values: already extracted (live reading filters them first); live: fill empty fields only, toast only on news. */
function feed(d, text, source, ev, windowLabel = '', { values: pre = null, live = false } = {}) {
  const x = pre ? { ...pre } : extractFields(d, text);
  if (source === 'capture' && d.domains.length) {
    const hay = (text + ' ' + windowLabel).toLowerCase().replace(/\s+/g, '');
    const domainOk = d.domains.some(dom => hay.includes(dom.replace(/\s/g, '')));
    ev.note += domainOk ? ' · official domain visible' : ' · official domain NOT visible';
    log(domainOk ? 'Official domain seen in capture' : 'Official domain NOT seen in capture: check this is the real portal', d.id);
  }
  const changed = setRecord(d.id, x, source, { fillOnly: live });
  const found = Object.keys(x).filter(k => x[k]);
  if (live) { if (changed.length) toast(`Live · ${d.title}: read ${changed.map(f => FIELD_LABEL[f]).join(', ')}`); return changed; }
  toast(found.length ? `${d.title}: read ${found.map(f => FIELD_LABEL[f]).join(', ')}${changed.length < found.length ? ' (stronger values kept)' : ''}` : `${d.title}: proof saved, but no fields could be read. Type them in.`);
  return changed;
}

/* Result screens (UAN, ESIC, PAN status, DL details): the number, whether the worker's mobile is the one shown,
   and name / DOB if printed. live: be strict, because form fields the operator typed are on screen too. */
function extractFields(d, text, { live = false } = {}) {
  const U = text.toUpperCase().replace(/[|]/g, ' ');
  const flat = U.replace(/[\s\-]/g, '');
  const rec = state.docs[d.id], mob = state.worker.mobile, out = {};

  if (mob) {
    // A masked mobile is printed by the portal itself; a full number on screen may be the one typed into the form,
    // so live reading trusts only the masked one.
    const masked = flat.match(/[X*•]{6}(\d{4})/) || flat.match(/(\d{2})[X*•]{6}(\d{2})/);
    if (masked) out.mobile = masked.length === 2 ? (mob.endsWith(masked[1]) ? 'match' : 'nomatch') : (mob.startsWith(masked[1]) && mob.endsWith(masked[2]) ? 'match' : 'nomatch');
    else if (!live && flat.includes(mob)) out.mobile = 'match';
  }

  const notMobile = n => n !== mob;
  if (!live && rec.value && flat.includes(rec.value)) out.number = rec.value;
  else if (d.id === 'uan') {
    const lab = U.match(/UAN\D{0,25}(\d{12})/) || U.match(/\b(10\d{10})\b/);
    if (lab) out.number = lab[1];
  } else if (d.id === 'esic') {
    const lab = U.match(/(?:IP\s*(?:NO|NUMBER)|INSURANCE\s*(?:NO|NUMBER)|IP\s*NUMBER\s*IS)\D{0,25}(\d{10})\b/);
    const any = [...U.matchAll(/\b(\d{10})\b/g)].map(m => m[1]).filter(notMobile);
    out.number = lab ? lab[1] : live ? '' : any[0]; // live: only a labelled number (helplines are 10 digits too)
  } else if (d.id === 'pan') {
    out.number = findPan(U);
  } else if (d.id === 'dl') {
    Object.assign(out, parseDlText(text));
  }

  const words = U.replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(w => w && w.length < 20);
  if (state.worker.name && !out.name) {
    const n = nameTokens(state.worker.name).length;
    let best = { score: 0, text: '' };
    for (let size = Math.max(1, n - 1); size <= n + 1; size++)
      for (let i = 0; i + size <= words.length; i++) {
        const cand = words.slice(i, i + size).join(' ');
        if (nameTokens(cand).length < Math.min(2, n)) continue;
        const m = matchNames(state.worker.name, cand);
        if (m.score > best.score + 0.001) best = { score: m.score, text: cand };
      }
    if (best.score >= 0.5) out.name = best.text;
  }
  const dob = U.match(/(?:DOB|DATE\s*OF\s*BIRTH|BIRTH)\D{0,25}(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/);
  if (dob) out.dob = `${dob[1]}-${dob[2]}-${dob[3]}`;
  return out;
}

/* ---------- OCR (Tesseract, runs in the browser) ---------- */
let ocrWorker = null;
async function ocr(img) {
  if (!window.Tesseract) throw new Error('OCR library did not load: check internet');
  if (!ocrWorker) ocrWorker = await Tesseract.createWorker('eng');
  const { data } = await ocrWorker.recognize(img);
  return data.text || '';
}

/* ---------- Session recording (whole screen) ---------- */
$('#recBtn').addEventListener('click', async () => {
  if (REC.on) return stopRecording();
  if (!navigator.mediaDevices?.getDisplayMedia) return toast('Screen recording not supported: use Chrome or Edge');
  try {
    REC.stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor', frameRate: { ideal: 5, max: 10 } }, audio: false, selfBrowserSurface: 'include', monitorTypeSurfaces: 'include' });
  } catch { return toast('Recording cancelled'); }
  const track = REC.stream.getVideoTracks()[0];
  if (track.getSettings().displaySurface !== 'monitor') toast('Tip: choose "Entire screen" so portal windows are recorded too');
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  REC.chunks = []; REC.blob = null;
  REC.recorder = new MediaRecorder(REC.stream, { mimeType: mime, videoBitsPerSecond: 700_000 });
  REC.recorder.ondataavailable = e => e.data.size && REC.chunks.push(e.data);
  REC.recorder.start(5000);
  REC.on = true; REC.startedAt = new Date().toISOString();
  track.addEventListener('ended', () => stopRecording());
  $('#recBtn').classList.add('on'); $('#recText').textContent = 'Recording';
  log('Session recording started', null, track.label);
  renderIntegrity();
});
async function stopRecording() {
  if (!REC.on) return;
  REC.on = false;
  await new Promise(r => { REC.recorder.onstop = r; REC.recorder.state !== 'inactive' ? REC.recorder.stop() : r(); });
  REC.stream.getTracks().forEach(t => t.stop());
  REC.blob = new Blob(REC.chunks, { type: 'video/webm' });
  $('#recBtn').classList.remove('on'); $('#recText').textContent = 'Recorded ✓';
  log('Session recording stopped', null, `${Math.round(REC.blob.size / 1024)} KB · sha256 ${(await sha256Hex(REC.blob)).slice(0, 16)}…`);
  renderIntegrity();
}

/* When the session is recorded, every Verify/Mismatch decision also snapshots the whole screen. */
async function attestSnapshot(d, status) {
  if (!REC.on || !REC.stream) return;
  try {
    const canvas = await grabFrame(REC.stream);
    const png = await toPng(watermark(canvas, `${d.title} marked ${status.toUpperCase()}`));
    await addEvidence(d.id, png, { kind: 'attestation', source: 'capture', note: `Screen at the moment of ${status}` });
  } catch {}
}

/* ---------- Boot ---------- */
buildDeclared();
buildTiles();
$('#caseId').textContent = state.caseId;
log('Case opened', null, state.caseId);
renderAll(false);
