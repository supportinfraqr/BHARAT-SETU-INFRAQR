/* Document readers: UIDAI Offline e-KYC ZIP/XML, e-Aadhaar PDF, e-PAN PDF and Driving Licence PDFs
   (Sarathi Print DL saved as PDF, or a DigiLocker copy). Everything is read in the browser; scanned PDFs fall back to OCR.
   A file is routed by what it contains, so the download-folder watcher and a drop on any tile go the same way. */

if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
if (window.zip) zip.configure({ useWebWorkers: false });

async function readDocFiles(d, fileList) {
  if (state.locked) return;
  setBusy(d, 'Reading…');
  try {
    for (const f of [...fileList]) {
      if (f.type.startsWith('image/')) {                // a screenshot dropped instead of a live capture
        if (d.action.kind !== 'capture') { toast(`${f.name}: drop the PDF downloaded from the portal`); continue; }
        const text = await ocr(f);
        const ev = await addEvidence(d.id, f, { kind: 'upload', source: 'upload', name: f.name, text, note: 'Uploaded screenshot: lower trust than a live capture' });
        feed(d, text, 'upload', ev);
        continue;
      }
      await routeFile(f, d.id);
    }
  } catch (e) { toast(e.message); }
  finally { setBusy(d, ''); }
}

/* Any downloaded file → the right tile. hint = the tile it was dropped on (used only when the content can't tell). */
async function routeFile(file, hint = null) {
  const n = file.name.toLowerCase();
  if (/\.zip$/.test(n)) return applyOfflineKycZip(file);
  if (/\.xml$/.test(n)) return applyKycXml(await file.text(), state.shareCode, file, file.name);
  if (!/pdf/i.test(file.type) && !/\.pdf$/.test(n)) { toast(`${file.name}: not a PDF, ZIP or XML from a portal`); return false; }
  const pdf = await openPdf(file, pdfPasswords());
  const type = classify(pdf.lines.join('\n'));
  const target = { Aadhaar: 'aadhaar', PAN: 'pan', 'Driving Licence': 'dl' }[type] || hint;
  if (!target) { toast(`${file.name}: not an Aadhaar, PAN or Driving Licence file, skipped`); return false; }
  if (hint && target !== hint) toast(`${file.name} is a ${type} file: added to the ${docById(target).title} tile`);
  if (target === 'aadhaar') await applyAadhaar(file, pdf);
  else if (target === 'pan') await applyPan(file, pdf);
  else if (target === 'dl') await applyDl(file, pdf);
  else {                                              // e.g. an e-UAN card PDF dropped on the UAN tile
    const d = docById(target);
    const ev = await keepPdfEvidence(target, file, pdf, d.title);
    feed(d, pdf.lines.join('\n'), 'pdf', ev);
  }
  return true;
}

/* ---------- Aadhaar ---------- */
async function applyAadhaar(file, pdf) {
  const x = parseAadhaar(pdf.lines);
  if (!x.number && !x.name) toast('This does not look like an e-Aadhaar PDF: check the file');
  await keepPdfEvidence('aadhaar', file, pdf, 'e-Aadhaar');
  setRecord('aadhaar', x, 'pdf');
  report('Aadhaar', x, ['name', 'dob', 'gender', 'number', 'address'], !!pdf.photo);
}

function parseAadhaar(lines) {
  const T = lines.join('\n'), out = {};
  const vid = T.match(/VID\s*:?\s*(\d{4}\s?\d{4}\s?\d{4}\s?\d{4})/i);
  if (vid) out.vid = vid[1].replace(/\s/g, '');
  const noVid = vid ? T.replace(vid[0], ' ') : T;
  const num = noVid.match(/(?<![\d ]\d)\b(\d{4}\s\d{4}\s\d{4})\b(?! ?\d)/) || noVid.match(/\b([X*x]{4}\s?[X*x]{4}\s?\d{4})\b/);
  if (num) out.number = num[1].replace(/\s/g, '').toUpperCase();
  const dob = T.match(/(?:DOB|D\.O\.B|Date of Birth)\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
  const yob = T.match(/Year of Birth\s*[:\-]?\s*(\d{4})/i);
  if (dob) out.dob = dob[1].replace(/\//g, '-'); else if (yob) out.dob = yob[1];
  const g = T.match(/\b(MALE|FEMALE|TRANSGENDER)\b/i);
  if (g) out.gender = g[1][0].toUpperCase() + g[1].slice(1).toLowerCase();
  const mob = T.match(/Mobile(?:\s*No\.?)?\s*:?\s*([X*\d]{10})\b/i);
  if (mob) out.mobile = mob[1].toUpperCase();

  // Name: the English line just above the DOB line; else the line after "To" in the letter part.
  const isName = l => /^[A-Za-z][A-Za-z .']{2,60}$/.test(l) && !/GOVERNMENT|INDIA|AADHAAR|UNIQUE|AUTHORITY|ENROLMENT|ADDRESS|DOWNLOAD|ISSUE/i.test(l);
  const di = lines.findIndex(l => /DOB|Date of Birth|Year of Birth/i.test(l));
  for (let j = di - 1; j >= Math.max(0, di - 3) && !out.name; j--) if (isName(lines[j].trim())) out.name = lines[j].trim();
  const ti = lines.findIndex(l => /^To\b/i.test(l.trim()));
  if (!out.name && ti >= 0) for (let j = ti + 1; j <= ti + 3 && j < lines.length && !out.name; j++) if (isName(lines[j].trim())) out.name = lines[j].trim();

  // Address: after "Address:" up to the line with the PIN code; else the "To" block.
  const addrFrom = (start, firstRest) => {
    const parts = [];
    if (firstRest) parts.push(firstRest);
    for (let j = start; j < lines.length && j < start + 7; j++) {
      if (/VID|Aadhaar|www\.|help@|uidai|1947/i.test(lines[j])) break;
      parts.push(lines[j].trim());
      if (/\b\d{6}\b/.test(lines[j])) break;
    }
    return parts.join(', ').replace(/\s*,\s*,/g, ',').replace(/,\s*$/, '');
  };
  const ai = lines.findIndex(l => /^\s*Address\s*:?/i.test(l));
  if (ai >= 0) out.address = addrFrom(ai + 1, lines[ai].replace(/^\s*Address\s*:?\s*/i, '').trim());
  else if (ti >= 0 && out.name) { const ni = lines.findIndex((l, j) => j > ti && l.trim() === out.name); if (ni >= 0) out.address = addrFrom(ni + 1); }
  const co = (out.address || T).match(/\b([SDWC]\/O)\s*:?\s*([A-Za-z .]+?)(?=,|\n|$)/i);
  if (co) out.careOf = `${co[1].toUpperCase()} ${co[2].trim()}`;
  return out;
}

/* ---------- PAN ---------- */
async function applyPan(file, pdf) {
  const x = parsePan(pdf.lines);
  if (!x.number) toast('No PAN found in this PDF: is it the e-PAN?');
  await keepPdfEvidence('pan', file, pdf, 'e-PAN');
  setRecord('pan', x, 'pdf');
  report('PAN', x, ['name', 'father', 'dob', 'number'], !!pdf.photo);
}

function parsePan(lines) {
  const T = lines.join('\n'), out = {};
  const pan = findPan(T);
  if (pan) out.number = pan;
  const isName = l => /^[A-Za-z][A-Za-z .']{1,60}$/.test(l) && !/NAME|FATHER|BIRTH|INCOME|DEPARTMENT|GOVT|INDIA|PERMANENT|ACCOUNT|SIGNATURE|CARD/i.test(l);
  // Value after a label: on the same line after the label, or on one of the next two lines.
  const after = isLabel => {
    const i = lines.findIndex(isLabel); if (i < 0) return '';
    const rest = lines[i].replace(/^.*?(Name|Father'?s Name)\s*[:\/]?\s*/i, '').trim();
    if (isName(rest)) return rest;
    for (let j = i + 1; j <= i + 2 && j < lines.length; j++) if (isName(lines[j].trim())) return lines[j].trim();
    return '';
  };
  out.name = after(l => /(^|[\/\s])Name\b/i.test(l) && !/Father|Mother/i.test(l));
  out.father = after(l => /Father'?s?\s*Name/i.test(l));
  const di = lines.findIndex(l => /Date of Birth|DOB/i.test(l));
  const near = di >= 0 ? lines.slice(di, di + 3).join(' ') : '';
  const dob = near.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/) || T.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
  if (dob) out.dob = dob[1].replace(/\//g, '-');
  return out;
}

/* PAN in text, tolerant of OCR swaps (0/O, 1/I, 5/S, 8/B, 2/Z) in the letter and digit positions. */
function findPan(T) {
  const L = s => s.replace(/0/g, 'O').replace(/1/g, 'I').replace(/5/g, 'S').replace(/8/g, 'B').replace(/2/g, 'Z');
  for (const t of String(T).toUpperCase().match(/\b[A-Z0-9]{10}\b/g) || []) {
    const c = L(t.slice(0, 5)) + ocrDigits(t.slice(5, 9)) + L(t[9]);
    if (/^[A-Z]{3}[PCHFATBLJG][A-Z]\d{4}[A-Z]$/.test(c) && /[A-Z]/.test(t.slice(0, 5))) return c;
  }
  return '';
}
const ocrDigits = s => s.replace(/O/g, '0').replace(/[IL]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/Z/g, '2');

/* ---------- Driving Licence (Sarathi details page, Print DL PDF, DigiLocker DL) ---------- */
function classify(T) {
  if (/Driving\s*Licen[cs]e|Licen[cs]e\s*(?:No|Number)|Sarathi|Parivahan/i.test(T)) return 'Driving Licence';
  if (/Permanent Account Number|PAN Verification|Income Tax/i.test(T)) return 'PAN';
  if (/Unique Identification|Aadhaar|आधार/i.test(T)) return 'Aadhaar';
  return 'Other';
}
async function applyDl(file, pdf) {
  const x = parseDlText(pdf.lines.join('\n'));
  if (!x.number) toast('No DL number found in this PDF: is it the licence print?');
  await keepPdfEvidence('dl', file, pdf, 'Driving Licence');
  setRecord('dl', x, 'pdf');
  report('Driving Licence', x, ['number', 'name', 'dob', 'validTill'], !!pdf.photo);
}
function parseDlText(text) {
  const U = String(text).toUpperCase(), out = {};
  // Standard number: state (2) + RTO (2) + year (4) + serial (7), with optional spaces / hyphens.
  for (const m of U.matchAll(/\b([A-Z]{2})[\s\-]?([0-9OILSBZ]{2})[\s\-]?([0-9OILSBZ]{4})[\s\-]?([0-9OILSBZ]{7})\b/g)) {
    const num = m[1] + ocrDigits(m[2] + m[3] + m[4]), yr = +num.slice(4, 8);
    if (/^[A-Z]{2}\d{13}$/.test(num) && yr >= 1950 && yr <= new Date().getFullYear()) { out.number = num; break; }
  }
  if (!out.number) {                                  // older state formats, only next to a label
    const lab = U.match(/(?:LICEN[CS]E|DL)\s*(?:NO|NUMBER)\.?\s*[:\-]?\s*([A-Z]{2}[A-Z0-9\s\-\/]{7,18})/);
    if (lab) { const v = lab[1].replace(/[\s\-\/]/g, '').slice(0, 16); if (/^[A-Z]{2}[A-Z0-9]{7,14}$/.test(v)) out.number = v; }
  }
  const name = U.match(/(?:HOLDER'?S?\s*NAME|NAME\s*OF\s*(?:THE\s*)?(?:LICEN[CS]E\s*)?HOLDER|^\s*NAME)\s*[:\-]?\s*([A-Z][A-Z .]{2,40})/m);
  if (name) out.name = name[1].replace(/\s+(?:DATE|DOB|S\/O|D\/O|W\/O|SON|FATHER|GUARDIAN).*$/, '').trim();
  const dob = U.match(/(?:DOB|D\.O\.B|DATE\s*OF\s*BIRTH)\D{0,20}(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/);
  if (dob) out.dob = `${dob[1]}-${dob[2]}-${dob[3]}`;
  // Validity: the last date in the Non-Transport line, else "Valid till / upto".
  const nt = U.match(/NON[\s\-]?TRANSPORT[^\n]{0,90}/);
  const ntDates = nt ? [...nt[0].matchAll(/(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/g)] : [];
  const vt = ntDates.length ? ntDates[ntDates.length - 1] : U.match(/VALID(?:ITY)?\s*(?:TILL|UP\s*TO|UPTO|TO)\D{0,20}(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/);
  if (vt) out.validTill = `${vt[1]}-${vt[2]}-${vt[3]}`;
  const st = U.match(/STATUS\W{0,6}(ACTIVE|INACTIVE|SUSPENDED|EXPIRED|REVOKED|SURRENDERED|DISQUALIFIED)/) || U.match(/\b(SUSPENDED|REVOKED|DISQUALIFIED)\b/);
  if (st) out.dlStatus = st[1];
  const cov = [...new Set([...U.matchAll(/\b(MCWG|MCWOG|LMV(?:[\s\-]?(?:NT|TR))?|HMV|HGMV|HPMV|HTV|MGV|TRANS|3W[\s\-]?(?:NT|TR|CAB)|E[\s\-]?RICKSHAW|INVCRG|ADPVEH)\b/g)].map(m => m[1].replace(/\s/g, '-')))];
  if (cov.length) out.cov = cov.join(', ');
  const app = U.match(/APPLICATION\s*(?:NO|NUMBER)\.?\D{0,12}(\d{6,14})/);
  if (app) out.appNo = app[1];
  return out;
}

/* ---------- Aadhaar Paperless Offline e-KYC (ZIP protected by the share code → UIDAI-signed XML) ---------- */
async function applyOfflineKycZip(file) {
  if (!window.zip) throw new Error('ZIP reader did not load: check internet');
  const reader = new zip.ZipReader(new zip.BlobReader(file));
  let xml, code = state.shareCode, entryName;
  try {
    const entry = (await reader.getEntries()).find(e => /\.xml$/i.test(e.filename));
    if (!entry) throw new Error(`${file.name}: no XML inside, not an Offline e-KYC file`);
    entryName = entry.filename.replace(/^.*\//, '');
    for (;;) {
      try { xml = await entry.getData(new zip.TextWriter(), { password: code }); break; }
      catch (e) {
        if (!/password|encrypt/i.test(e.message)) throw e;
        code = prompt(`${file.name} did not open with share code ${state.shareCode}.\nEnter the share code typed on the Offline e-KYC page:`);
        if (!code) throw new Error('Share code needed to open the e-KYC file');
      }
    }
  } finally { await reader.close(); }
  return applyKycXml(xml, code, file, entryName);
}

async function applyKycXml(xmlText, shareCode, file, xmlName) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const poi = doc.querySelector('Poi'), poa = doc.querySelector('Poa'), pht = doc.querySelector('Pht');
  if (doc.querySelector('parsererror') || !poi) throw new Error(`${xmlName}: not a UIDAI Offline e-KYC XML`);
  const a = (el, k) => (el?.getAttribute(k) || '').trim();
  const refId = doc.documentElement.getAttribute('referenceId') || '';
  const last4 = refId.slice(0, 4), ts = refId.slice(4);
  const generatedAt = ts.length >= 14 ? new Date(`${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)}+05:30`) : null;
  const address = poa ? ['house', 'street', 'landmark', 'loc', 'vtc', 'po', 'subdist', 'dist', 'state']
    .map(k => a(poa, k)).filter((v, i, arr) => v && arr.indexOf(v) === i).join(', ') + (a(poa, 'pc') ? ` - ${a(poa, 'pc')}` : '') : '';

  // UIDAI stores the mobile only as SHA-256(mobile + share code), hashed N times (N = last Aadhaar digit, at least 1).
  // A match proves the declared mobile is the one linked to this Aadhaar.
  let mobile = '';
  if (a(poi, 'm') && /^\d{10}$/.test(state.worker.mobile) && shareCode) {
    const h = await iterHash(state.worker.mobile + shareCode, Math.max(1, +last4.slice(-1) || 0));
    mobile = h === a(poi, 'm').toLowerCase() ? 'linked' : 'notlinked';
  }
  const signed = !!doc.getElementsByTagName('Signature').length;
  state.docs.aadhaar.extra = {
    source: 'UIDAI Paperless Offline e-KYC', referenceId: refId, generatedAt: generatedAt?.toISOString() || null, signaturePresent: signed,
    pincode: a(poa, 'pc'), district: a(poa, 'dist'), state: a(poa, 'state'),
    mobileCheck: mobile || (a(poi, 'm') ? 'Declared mobile missing: enter it to check the Aadhaar-linked mobile' : 'No mobile hash in this file'),
  };

  if (file) await addEvidence('aadhaar', file, { kind: 'file', source: 'ekyc', name: file.name, note: 'Offline e-KYC file from UIDAI' });
  await addEvidence('aadhaar', new Blob([xmlText], { type: 'application/xml' }), { kind: 'file', source: 'ekyc', name: xmlName.endsWith('.xml') ? xmlName : `${xmlName}.xml`, note: `UIDAI-signed XML${signed ? '' : ' (signature element missing)'}` });
  if (pht?.textContent.trim()) {
    const photo = await (await fetch(`data:image/jpeg;base64,${pht.textContent.trim()}`)).blob();
    await addEvidence('aadhaar', photo, { kind: 'generated', source: 'ekyc', name: 'aadhaar_ekyc_photo.jpg', note: 'Photo from the e-KYC XML' });
    state.photos.aadhaar = URL.createObjectURL(photo);
  }
  const x = { name: a(poi, 'name'), dob: a(poi, 'dob'), gender: a(poi, 'gender'), number: last4 ? 'XXXXXXXX' + last4 : '', mobile, careOf: a(poa, 'careof'), address };
  setRecord('aadhaar', x, 'ekyc');
  const age = generatedAt ? Math.floor((Date.now() - generatedAt) / 864e5) : null;
  toast(`Aadhaar e-KYC read: ${x.name || 'no name'}${mobile === 'linked' ? ' · mobile is Aadhaar-linked ✓' : mobile === 'notlinked' ? ' · mobile is NOT Aadhaar-linked ✕' : ''}${age > 3 ? ` · file is ${age} days old` : ''}`);
  return true;
}
async function iterHash(s, n) {
  for (let i = 0; i < n; i++) s = await sha256Hex(s);
  return s;
}

/* ---------- Shared ---------- */
async function keepPdfEvidence(docId, file, pdf, label, photoSlot = docId) {
  const ev = await addEvidence(docId, file, { kind: 'file', source: 'pdf', name: file.name, text: pdf.lines.join('\n'), note: `${label} PDF${pdf.password ? ' · opened with password' : ''}` });
  if (pdf.page) await addEvidence(docId, pdf.page, { kind: 'generated', source: 'pdf', name: `${label.replace(/\W+/g, '_')}_page1.png`, note: 'Page 1 rendered from the PDF' });
  if (pdf.photo) {
    await addEvidence(docId, pdf.photo, { kind: 'generated', source: 'pdf', name: `${label.replace(/\W+/g, '_')}_photo.png`, note: 'Photo extracted from the PDF' });
    if (photoSlot) { state.photos[photoSlot] = URL.createObjectURL(pdf.photo); renderAll(); }
  }
  return ev;
}
function report(title, x, fields, photo) {
  const got = fields.filter(f => x[f]).map(f => FIELD_LABEL[f]);
  const miss = fields.filter(f => !x[f]).map(f => FIELD_LABEL[f]);
  toast(`${title}: read ${got.join(', ') || 'nothing'}${photo ? ' + photo' : ''}${miss.length ? ` · type missing: ${miss.join(', ')}` : ''}`);
}

/* Every password rule the portals use, tried in turn: the file type is not known until it opens. */
function pdfPasswords() {
  const w = state.worker, out = [''];
  if (w.dob) { const [y, m, dd] = w.dob.split('-'); out.push(`${dd}${m}${y}`, `${dd}${m}${y.slice(2)}`); }   // e-PAN: DOB as DDMMYYYY
  if (w.name && w.dob) {                                                                              // e-Aadhaar: first 4 letters CAPS + birth year
    const up = w.name.toUpperCase().trim(), yr = w.dob.slice(0, 4);
    out.push(up.replace(/[^A-Z]/g, '').slice(0, 4) + yr, up.slice(0, 4) + yr);
  }
  return [...new Set(out)];
}

/* Opens the PDF (trying the known password rules, then asking), returns its text as reading-order lines,
   page 1 as an image, and the photo embedded in it. */
async function openPdf(file, tries) {
  if (!window.pdfjsLib) throw new Error('PDF reader did not load: check internet');
  const data = new Uint8Array(await file.arrayBuffer());
  let doc, password = '';
  for (const p of tries) {
    try { doc = await pdfjsLib.getDocument({ data: data.slice(), password: p }).promise; password = p; break; }
    catch (e) { if (e.name !== 'PasswordException') throw new Error(`${file.name}: not a readable PDF`); }
  }
  while (!doc) {
    const p = prompt(`${file.name} is password protected and the usual passwords did not work (check the declared name and DOB).\ne-Aadhaar: first 4 letters of name in CAPITALS + birth year (e.g. RAME1990)\ne-PAN: date of birth as DDMMYYYY\n\nPassword:`);
    if (!p) throw new Error('PDF password needed');
    try { doc = await pdfjsLib.getDocument({ data: data.slice(), password: p }).promise; password = p; }
    catch { toast('Wrong password, try again'); }
  }
  let lines = [];
  for (let i = 1; i <= Math.min(doc.numPages, 4); i++) lines = lines.concat(await pageLines(await doc.getPage(i)));
  const page1 = await doc.getPage(1);
  const vp = page1.getViewport({ scale: 2 });
  const canvas = Object.assign(document.createElement('canvas'), { width: vp.width, height: vp.height });
  await page1.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  if (lines.join('').replace(/\s/g, '').length < 40) lines = (await ocr(canvas)).split('\n').map(l => l.trim()).filter(Boolean); // scanned PDF
  return { lines, page: await toPng(canvas), photo: await pdfPhoto(doc), password: !!password };
}

/* Text in reading order. Cards print front and back side by side, so a row is split where there is a wide gap. */
async function pageLines(page) {
  const tc = await page.getTextContent(), segs = [];
  const width = page.getViewport({ scale: 1 }).width;
  const rows = [];
  tc.items.filter(it => it.str.trim()).forEach(it => {
    const y = it.transform[5], x = it.transform[4];
    let row = rows.find(r => Math.abs(r.y - y) < 3);
    if (!row) rows.push(row = { y, items: [] });
    row.items.push({ x, end: x + (it.width || it.str.length * 5), s: it.str });
  });
  rows.forEach(r => {
    r.items.sort((a, b) => a.x - b.x);
    let cur = null;
    r.items.forEach(it => {
      if (cur && it.x - cur.end < 24) { cur.s += (it.x - cur.end > 1 ? ' ' : '') + it.s; cur.end = it.end; }
      else segs.push(cur = { x: it.x, y: r.y, end: it.end, s: it.s });
    });
  });
  // Full-width text and the left column first, then the right column, each top to bottom.
  const col = s => (s.x > width * 0.48 ? 1 : 0);
  segs.sort((a, b) => col(a) - col(b) || b.y - a.y || a.x - b.x);
  return segs.map(s => s.s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/* The photo: among the images in the PDF, the portrait-shaped one with the most colours
   (the QR code is square, the emblem and logos have few colours). */
async function pdfPhoto(doc) {
  const OPS = pdfjsLib.OPS, cands = [];
  for (let p = 1; p <= Math.min(doc.numPages, 2); p++) {
    const page = await doc.getPage(p), ops = await page.getOperatorList();
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] !== OPS.paintImageXObject && ops.fnArray[i] !== OPS.paintJpegXObject) continue;
      const id = ops.argsArray[i][0];
      const store = id.startsWith('g_') ? page.commonObjs : page.objs;
      const img = await new Promise(res => { try { store.get(id, res); } catch { res(null); } setTimeout(() => res(null), 3000); });
      const c = img && imageToCanvas(img);
      if (!c || c.width < 40 || c.height < 40) continue;
      const ratio = c.height / c.width;
      cands.push({ c, ratio, colours: colourCount(c), area: c.width * c.height });
    }
  }
  const portrait = cands.filter(x => x.ratio > 1.05 && x.ratio < 1.75);
  const pick = (portrait.length ? portrait : cands.filter(x => x.ratio > 0.7 && x.ratio < 1.8 && x.colours > 200))
    .sort((a, b) => b.colours - a.colours || b.area - a.area)[0];
  return pick && pick.colours > 60 ? toPng(pick.c) : null;
}
function imageToCanvas(img) {
  const w = img.width, h = img.height; if (!w || !h) return null;
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = c.getContext('2d');
  if (img.bitmap) { g.drawImage(img.bitmap, 0, 0); return c; }
  if (!img.data) return null;
  const out = g.createImageData(w, h), src = img.data, n = w * h;
  if (img.kind === 3) out.data.set(src.subarray(0, n * 4));                                  // RGBA
  else if (img.kind === 2) for (let i = 0; i < n; i++) { out.data[i * 4] = src[i * 3]; out.data[i * 4 + 1] = src[i * 3 + 1]; out.data[i * 4 + 2] = src[i * 3 + 2]; out.data[i * 4 + 3] = 255; }
  else if (img.kind === 1) { const rowBytes = (w + 7) >> 3; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = (src[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0, i = (y * w + x) * 4; out.data[i] = out.data[i + 1] = out.data[i + 2] = v; out.data[i + 3] = 255; } }
  else return null;
  g.putImageData(out, 0, 0);
  return c;
}
function colourCount(c) {
  const s = Object.assign(document.createElement('canvas'), { width: 48, height: 48 }), g = s.getContext('2d');
  g.drawImage(c, 0, 0, 48, 48);
  const px = g.getImageData(0, 0, 48, 48).data, seen = new Set();
  for (let i = 0; i < px.length; i += 4) seen.add((px[i] >> 4) << 8 | (px[i + 1] >> 4) << 4 | (px[i + 2] >> 4));
  return seen.size;
}
