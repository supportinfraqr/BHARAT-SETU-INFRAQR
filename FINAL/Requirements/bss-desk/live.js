/* Live capture: the three things that run by themselves once started.
   1. Live reading: the shared portal window is watched; whenever it settles on a new screen it is OCR'd,
      and a result (UAN, IP number, PAN, DL details) is saved as proof and fills the official record.
   2. Download folder: files the portals download are picked up within seconds and routed to the right tile.
   3. Case JSON: the whole case is rewritten to <folder>/BSS-cases/<case>.json after every change. */

/* ---------- 1. Live reading ---------- */
const DETECT = { // used only when the window shows no official domain and no portal was opened from the desk
  aadhaar: /uidai|myaadhaar/i, pan: /incometax|e-?filing|instant\s*e-?pan|protean|utiitsl/i,
  dl: /parivahan|sarathi/i, uan: /epfindia|know\s*your\s*uan|universal\s*account/i, esic: /umang|esic|insurance\s*number|ip\s*number/i,
};

/* Called from the first "Open portal" click (still inside the click, so the browser allows the share dialog). */
async function startLive(win = null) {
  if (LIVE.on || LIVE.starting || state.locked) return;
  if (!navigator.mediaDevices?.getDisplayMedia) { LIVE.status = 'Live reading needs Chrome or Edge'; return renderLive(); }
  LIVE.starting = true;
  toast('Live reading: in the share dialog pick the portal window (Window tab), then Share');
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'window', frameRate: { ideal: 4, max: 8 } }, audio: false,
      selfBrowserSurface: 'exclude', surfaceSwitching: 'include', monitorTypeSurfaces: 'exclude',
    });
  } catch (e) {
    LIVE.starting = false;
    LIVE.status = e.name === 'NotAllowedError' ? 'Not shared: click Start to read the portal live' : 'Click Start to begin live reading';
    renderLive();
    return;
  }
  LIVE.starting = false;
  const track = stream.getVideoTracks()[0];
  if (track.getSettings().displaySurface === 'monitor') {   // the desk itself would be read
    stream.getTracks().forEach(t => t.stop());
    LIVE.status = 'Whole screen refused: click Start and pick the portal window';
    toast('Pick the portal WINDOW, not the entire screen');
    return renderLive();
  }
  const v = Object.assign(document.createElement('video'), { muted: true, playsInline: true, srcObject: stream });
  await v.play();
  Object.assign(LIVE, { on: true, stream, video: v, label: track.label || 'portal window', sig: null, ocrSig: null, stableSince: Date.now(), movingSince: 0, status: '' });
  track.addEventListener('ended', () => stopLive('Sharing stopped'));
  LIVE.timer = setInterval(tick, 600);
  log('Live reading started', null, LIVE.label);
  toast(`Live reading on: ${LIVE.label}`);
  try { win?.focus(); } catch {}
  renderAll();
}

function stopLive(reason = 'Stopped') {
  if (!LIVE.on) return;
  clearInterval(LIVE.timer);
  LIVE.stream?.getTracks().forEach(t => t.stop());
  Object.assign(LIVE, { on: false, stream: null, video: null, timer: null, busy: false, status: `${reason}: opening a portal starts it again` });
  log('Live reading stopped', null, reason);
  renderAll();
}

/* The current frame of the shared window at full size. */
function liveFrame() {
  const v = LIVE.video;
  const c = Object.assign(document.createElement('canvas'), { width: v.videoWidth, height: v.videoHeight });
  c.getContext('2d').drawImage(v, 0, 0);
  return c;
}

/* A 96×54 grey thumbnail: cheap to compare every 600 ms, coarse enough to ignore a blinking cursor. */
const sigCanvas = Object.assign(document.createElement('canvas'), { width: 96, height: 54 });
function signature(v) {
  const g = sigCanvas.getContext('2d', { willReadFrequently: true });
  g.drawImage(v, 0, 0, 96, 54);
  const px = g.getImageData(0, 0, 96, 54).data, out = new Uint8Array(96 * 54);
  for (let i = 0; i < out.length; i++) out[i] = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
  return out;
}
function sigDiff(a, b) {
  if (!a || !b) return 255;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

/* Read when the window has settled on a screen that differs from the last one read.
   Pages that never settle (carousels, spinners) are read every 4 s instead. */
function tick() {
  if (!LIVE.on || LIVE.busy || state.locked || !LIVE.video?.videoWidth) return;
  const sig = signature(LIVE.video), now = Date.now();
  const motion = sigDiff(sig, LIVE.sig);
  LIVE.sig = sig;
  if (motion > 0.3) {
    LIVE.movingSince ||= now;
    LIVE.stableSince = now;
    if (now - LIVE.movingSince < 5000 || now - (LIVE.lastReadAt || 0) < 4000) return;
  } else {
    LIVE.movingSince = 0;
    if (now - LIVE.stableSince < 900) return;
  }
  if (sigDiff(sig, LIVE.ocrSig) < 0.25) return;
  LIVE.ocrSig = sig;
  readLive();
}

function whichDoc(text) {
  const hay = text.toLowerCase().replace(/\s+/g, '');
  const cur = LIVE.portal && docById(LIVE.portal.docId);
  const seen = DOCS.filter(d => d.domains.some(dom => hay.includes(dom)));
  if (cur && (seen.includes(cur) || !seen.length)) return cur;
  return seen[0] || DOCS.find(d => DETECT[d.id]?.test(text)) || null;
}

async function readLive() {
  LIVE.busy = true; LIVE.lastReadAt = Date.now();
  renderLive();
  try {
    const canvas = liveFrame();
    const text = await ocr(ocrCanvas(canvas));
    LIVE.reads++; LIVE.lastAt = new Date(); LIVE.lastText = text;
    const d = whichDoc(text);
    if (!d || d.live === false || state.locked) return;
    const portal = LIVE.portal?.docId === d.id ? LIVE.portal : { copied: '', typed: [...new Set(d.portals.flatMap(p => p.typed || []))] };
    const x = extractFields(d, text, { live: true });
    if (x.number && portal.copied && x.number === portal.copied) delete x.number; // the number we pasted into the form
    if (!x.number) { LIVE.formText[d.id] = text; return; }                       // still on the form: remember what is typed
    dropTyped(d, x, text, portal.typed);
    Object.keys(x).forEach(k => { if (!x[k]) delete x[k]; });
    const key = JSON.stringify(x);
    if (LIVE.last[d.id] === key) return;                                          // same result as last time
    LIVE.last[d.id] = key;
    const png = await toPng(watermark(canvas, `${d.title} live read`));
    const ev = await addEvidence(d.id, png, { kind: 'capture', source: 'capture', note: `Live reading · ${LIVE.label}`, text });
    feed(d, text, 'capture', ev, LIVE.label, { values: x, live: true });
  } catch (e) {
    LIVE.status = `OCR error: ${e.message}`;
  } finally {
    LIVE.busy = false;
    renderLive();
  }
}

/* Name / DOB that the operator typed into the form are on the result screen too. Keep such a value only if it
   appears more often now than it did on the form, i.e. the portal printed it as well. */
function dropTyped(d, x, text, typed) {
  const norm = { name: s => s.toUpperCase().replace(/[^A-Z]/g, ''), dob: s => s.replace(/\D/g, '') };
  const count = (hay, k) => { let n = 0, i = 0; while ((i = hay.indexOf(k, i)) >= 0) { n++; i += k.length; } return n; };
  const form = LIVE.formText[d.id];
  typed.forEach(f => {
    if (!x[f] || !norm[f]) return;
    const k = norm[f](x[f]);
    if (!k || !form || count(norm[f](text), k) <= count(norm[f](form), k)) delete x[f];
  });
}

/* ---------- 2. Download folder ---------- */
const fsOk = 'showDirectoryPicker' in window;

async function pickFolder() {
  if (!fsOk) return toast('Folder watching needs Chrome or Edge');
  let dir;
  try { dir = await showDirectoryPicker({ id: 'bss-downloads', mode: 'readwrite', startIn: 'downloads' }); }
  catch (e) { if (e.name !== 'AbortError') toast(e.message); return; }
  await useFolder(dir);
}

async function useFolder(dir) {
  Object.assign(WATCH, { dir, pending: null, on: true });
  idbSet('folder', dir);
  clearInterval(WATCH.timer);
  WATCH.timer = setInterval(poll, 1500);
  log('Watching download folder', null, dir.name);
  poll();
  saveJson();
}

/* Re-use last session's folder. Without a click the browser may only report "prompt": then the first click resumes it. */
async function resumeFolder(gesture) {
  const h = WATCH.pending || await idbGet('folder');
  if (!h) return;
  let p = 'prompt';
  try {
    p = await h.queryPermission({ mode: 'readwrite' });
    if (p !== 'granted' && gesture) p = await h.requestPermission({ mode: 'readwrite' });
  } catch {}
  if (p === 'granted') return useFolder(h);
  WATCH.pending = h;
  renderLive();
}

async function poll() {
  if (!WATCH.on || WATCH.busy || state.locked) return;
  WATCH.busy = true;
  try {
    for await (const [name, h] of WATCH.dir.entries()) {
      if (h.kind !== 'file' || !/\.(pdf|zip|xml)$/i.test(name) || WATCH.old.has(name)) continue;
      const f = await h.getFile();
      if (f.lastModified < state.openedAt) { WATCH.old.add(name); continue; } // older downloads belong to other cases
      const key = `${name}|${f.size}|${f.lastModified}`;
      if (WATCH.seen.has(key)) continue;
      if (WATCH.sizes.get(name) !== key) { WATCH.sizes.set(name, key); continue; } // unchanged for one round = finished
      WATCH.seen.add(key); WATCH.picked++;
      log('Download picked up', null, name);
      toast(`New download: ${name}`);
      try { await routeFile(f); }
      catch (e) { toast(`${name}: ${e.message}`); log('Download could not be read', null, `${name}: ${e.message}`); }
    }
  } catch (e) {
    clearInterval(WATCH.timer);
    Object.assign(WATCH, { on: false, pending: WATCH.dir, dir: null });
    toast(`Download folder: ${e.message}`);
  } finally {
    WATCH.busy = false;
    renderLive();
  }
}

/* ---------- 3. Case JSON ---------- */
let saveTimer = null;
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveJson, 1200); }

async function saveJson() {
  if (!WATCH.dir) return;
  try {
    const sub = await WATCH.dir.getDirectoryHandle('BSS-cases', { create: true });
    const w = await (await sub.getFileHandle(`${state.caseId}.json`, { create: true })).createWritable();
    await w.write(JSON.stringify(caseData(), null, 2));
    await w.close();
    WATCH.savedAt = new Date(); WATCH.saveError = '';
  } catch (e) { WATCH.saveError = `Not saved: ${e.message}`; }
  renderLive();
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(caseData(), null, 2)], { type: 'application/json' });
  Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${state.caseId}.json` }).click();
  log('Case JSON downloaded');
}

/* ---------- Panel ---------- */
function renderLive() {
  const t = d => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const row = (id, st, title, sub, btn) => {
    $(`#${id}Dot`).dataset.state = st;
    $(`#${id}Title`).textContent = title;
    $(`#${id}Sub`).textContent = sub; $(`#${id}Sub`).title = sub;
    if (btn !== undefined) $(`#${id}Btn`).textContent = btn;
  };
  row('live', LIVE.busy ? 'busy' : LIVE.on ? 'on' : LIVE.status ? 'warn' : 'off',
    LIVE.on ? `Reading ${LIVE.portal?.label || 'portal window'}` : 'Live reading off',
    LIVE.on ? `${LIVE.busy ? 'Reading screen… · ' : ''}${LIVE.reads} reads${LIVE.lastAt ? ' · last ' + t(LIVE.lastAt) : ''} · ${LIVE.label}` : LIVE.status || 'Starts by itself when you open a portal',
    LIVE.on ? 'Stop' : 'Start');
  row('watch', WATCH.on ? 'on' : WATCH.pending ? 'warn' : 'off',
    WATCH.on ? `Watching ${WATCH.dir.name}` : 'Download folder',
    WATCH.on ? `${WATCH.picked} file${WATCH.picked === 1 ? '' : 's'} picked up` : WATCH.pending ? `Click Resume to keep watching ${WATCH.pending.name}` : fsOk ? 'Pick the folder the browser saves downloads to' : 'Needs Chrome or Edge',
    WATCH.on ? 'Change' : WATCH.pending ? 'Resume' : 'Pick');
  row('json', WATCH.savedAt && !WATCH.saveError ? 'on' : WATCH.saveError ? 'warn' : 'off', 'Case JSON',
    WATCH.saveError || (WATCH.savedAt && WATCH.dir ? `${WATCH.dir.name}/BSS-cases/${state.caseId}.json · ${t(WATCH.savedAt)}` : 'Autosaved into the folder once picked'));
  $('#liveBtn').disabled = state.locked;
  $('#watchBtn').disabled = !fsOk;
}

$('#liveBtn').addEventListener('click', () => LIVE.on ? stopLive('Stopped by operator') : startLive(null));
$('#watchBtn').addEventListener('click', () => (!WATCH.on && WATCH.pending ? resumeFolder(true) : pickFolder()));
$('#jsonBtn').addEventListener('click', downloadJson);
// The browser needs one click before it re-grants last session's folder: use the operator's first click anywhere.
document.addEventListener('pointerdown', function once(e) {
  if (e.target.closest('#watchBtn')) return;
  if (WATCH.pending && !WATCH.on) resumeFolder(true);
  document.removeEventListener('pointerdown', once);
}, true);

/* ---------- Tiny IndexedDB store for the folder handle ---------- */
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('bss-desk', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet(k) {
  try { const db = await idbOpen(); return await new Promise(res => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }
  catch { return null; }
}
async function idbSet(k, v) {
  try { const db = await idbOpen(); db.transaction('kv', 'readwrite').objectStore('kv').put(v, k); } catch {}
}

if (fsOk) resumeFolder(false);
renderLive();
