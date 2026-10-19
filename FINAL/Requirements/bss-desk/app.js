/* BSS Worker Verification Desk: core.
   Left = what the worker declares. Right = the official record, read straight from the issuing portals.
   Every portal opens in ONE shared window that is read live (OCR) the moment a result appears;
   files the portals download (e-Aadhaar, Offline e-KYC, e-PAN, DL print) are picked up from the download folder.
     Aadhaar → UIDAI e-Aadhaar PDF or Offline e-KYC ZIP (signed XML; also proves the Aadhaar-linked mobile)
     PAN     → Income Tax Instant e-PAN (by Aadhaar OTP) or Protean / UTIITSL e-PAN PDF
     DL      → Sarathi "Find Application Number" by name + DOB + worker's mobile OTP
     UAN     → EPFO "Know your UAN" by the worker's mobile
     ESIC    → UMANG "Know Your IP Number" by the worker's mobile
   Static page, no backend: data stays in this browser and the folder the operator picks. */

const DOCS = [
  {
    id: 'aadhaar', title: 'Aadhaar', icon: 'UID', accent: '#C2410C', source: 'UIDAI · e-Aadhaar / Offline e-KYC', domains: ['uidai.gov.in'],
    live: false, // UIDAI shows no result on screen: the data comes from the downloaded file
    field: { label: 'Aadhaar', placeholder: '1234 5678 9012', inputmode: 'numeric' },
    portals: [
      { label: 'Download e-Aadhaar', url: 'https://myaadhaar.uidai.gov.in/genricDownloadAadhaar', copy: 'number' },
      { label: 'Offline e-KYC', url: 'https://myaadhaar.uidai.gov.in/offline-ekyc', copy: 'shareCode' },
      { label: 'Find Aadhaar no. by mobile', url: 'https://myaadhaar.uidai.gov.in/retrieve-eid-uid', copy: 'mobile' },
    ],
    action: { kind: 'pdf', label: 'Add e-Aadhaar / e-KYC', accept: '.pdf,.zip,.xml' },
    steps: ['No number? Find by mobile: name + worker\'s mobile → OTP → number arrives by SMS', 'Offline e-KYC (share code {code}) or e-Aadhaar → OTP → Download', 'The file is picked up from the download folder automatically'],
    record: ['name', 'dob', 'gender', 'number', 'mobile', 'careOf', 'address', 'vid'], required: ['name', 'dob', 'gender', 'number'],
    validate(v) {
      if (!/^\d{12}$/.test(v)) return [false, '12 digits'];
      if (/^[01]/.test(v)) return [false, 'Never starts with 0 or 1'];
      return verhoeff(v) ? [true, 'Checksum OK'] : [false, 'Checksum failed: typo?'];
    },
    format: v => v.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 '),
  },
  {
    id: 'pan', title: 'PAN', icon: 'PAN', accent: '#1E3A8A', source: 'Income Tax · Instant e-PAN', domains: ['incometax.gov.in', 'proteantech.in', 'utiitsl.com'],
    field: { label: 'PAN', placeholder: 'ABCDE1234F' },
    portals: [
      { label: 'Instant e-PAN (by Aadhaar)', url: 'https://eportal.incometax.gov.in/iec/foservices/#/pre-login/instant-e-pan', copy: 'aadhaar', typed: ['name', 'dob'] },
      { label: 'Protean e-PAN', url: 'https://onlineservices.proteantech.in/paam/requestAndDownloadEPAN.html', copy: 'number', typed: ['name', 'dob'] },
      { label: 'UTIITSL e-PAN', url: 'https://www.pan.utiitsl.com/PAN_ONLINE/ePANCard', copy: 'number', typed: ['name', 'dob'] },
    ],
    action: { kind: 'pdf', label: 'Add e-PAN PDF' },
    steps: ['Instant e-PAN → Check status / Download → worker\'s Aadhaar → OTP', 'The PAN on the status page is read live', 'Download the e-PAN: it is picked up automatically (password = DOB)'],
    record: ['name', 'father', 'dob', 'number'], required: ['name', 'dob', 'number'],
    validate(v) {
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(v)) return [false, '5 letters, 4 digits, 1 letter'];
      return v[3] === 'P' ? [true, 'Individual PAN'] : [false, `4th letter "${v[3]}" is not an individual PAN`];
    },
    format: v => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
  },
  {
    id: 'uan', title: 'UAN (EPFO)', icon: 'EPF', accent: '#0F766E', source: 'Know your UAN · by mobile', domains: ['epfindia.gov.in'],
    field: { label: 'UAN', placeholder: '100XXXXXXXXX', inputmode: 'numeric' },
    portals: [{ label: 'EPFO · Know your UAN', url: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/', copy: 'mobile', typed: ['name', 'dob'] }],
    action: { kind: 'capture', label: 'Capture now' },
    steps: ['EPFO → "Know your UAN" at the bottom', 'Worker\'s mobile + captcha → OTP → name, DOB, Aadhaar', 'The UAN is read live when it appears'],
    record: ['number', 'mobile', 'name', 'dob'], required: ['number', 'mobile'],
    validate(v) {
      if (!/^\d{12}$/.test(v)) return [false, '12 digits'];
      return /^10/.test(v) ? [true, 'Valid format'] : [true, 'Unusual: UANs usually start 10'];
    },
    format: v => v.replace(/\D/g, '').slice(0, 12),
  },
  {
    id: 'esic', title: 'ESIC', icon: 'ESI', accent: '#7C3AED', source: 'Know Your IP Number · by mobile', domains: ['umang.gov.in', 'esic.gov.in'],
    field: { label: 'ESIC IP no.', placeholder: '10 digits', inputmode: 'numeric' },
    portals: [{ label: 'UMANG · ESIC', url: 'https://web.umang.gov.in/', copy: 'mobile' }],
    action: { kind: 'capture', label: 'Capture now' },
    steps: ['UMANG → log in with the worker\'s mobile OTP', 'ESIC → Know Your IP Number → worker\'s mobile', 'The IP number is read live when it appears'],
    record: ['number', 'mobile', 'name'], required: ['number', 'mobile'],
    validate: v => /^\d{10}$/.test(v) ? [true, 'Valid format'] : [false, '10 digits'],
    format: v => v.replace(/\D/g, '').slice(0, 10),
  },
  {
    id: 'dl', title: 'Driving Licence', icon: 'DL', accent: '#0369A1', source: 'Sarathi · find by mobile', domains: ['parivahan.gov.in'],
    field: { label: 'DL no.', placeholder: 'MH1220110012345' },
    portals: [{ label: 'Sarathi · find DL', url: 'https://sarathi.parivahan.gov.in/sarathiservice/stateSelection.do', copy: 'mobile', typed: ['name', 'dob'] }],
    action: { kind: 'capture', label: 'Capture now', accept: '.pdf,image/*' },
    steps: ['Sarathi → worker\'s state → Others → Find Application Number', 'Name + DOB + worker\'s mobile → OTP → Get Details', 'The DL details are read live; a saved Print DL PDF is picked up too'],
    record: ['number', 'name', 'dob', 'mobile', 'validTill', 'dlStatus', 'cov', 'appNo'], required: ['number', 'name', 'dob'],
    validate(v) {
      const m = v.match(/^([A-Z]{2})(\d{2})(\d{4})(\d{7})$/);
      if (m) return +m[3] >= 1950 && +m[3] <= new Date().getFullYear() ? [true, `${m[1]} · RTO ${m[2]} · issued ${m[3]}`] : [false, `Year ${m[3]} looks wrong`];
      return /^[A-Z]{2}[A-Z0-9]{7,14}$/.test(v) ? [true, 'Older state format: check on Sarathi'] : [false, 'State code first, e.g. MH1220110012345'];
    },
    format: v => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16),
  },
];

const FIELD_LABEL = { name: 'Name', dob: 'DOB', gender: 'Gender', number: 'Number', mobile: 'Mobile', careOf: 'Care of', address: 'Address', vid: 'VID', father: 'Father', aadhaarNo: 'Aadhaar', panNo: 'PAN', validTill: 'Valid till', dlStatus: 'Status', cov: 'Vehicles', appNo: 'Appl. no.' };
const INFO = new Set(['careOf', 'address', 'vid', 'father', 'validTill', 'dlStatus', 'cov', 'appNo']); // shown, kept, not compared
const TRUST = { ekyc: 4, pdf: 3, capture: 3, upload: 2, manual: 1 };
const SOURCE_LABEL = { ekyc: 'UIDAI signed e-KYC XML', pdf: 'Official PDF', capture: 'Live portal capture', upload: 'Uploaded screenshot', manual: 'Typed by operator' };
const SOURCE_TAG = { ekyc: 'XML', pdf: 'PDF', capture: 'CAP', upload: 'IMG', manual: 'TYPED' };
const MOBILE_TEXT = { match: 'Seen in capture', confirmed: 'OTP came to worker\'s phone', nomatch: 'Different mobile', linked: 'Aadhaar-linked ✓', notlinked: 'NOT Aadhaar-linked' };

/* ---------- State (in memory) ---------- */
const state = {
  caseId: newCaseId(), openedAt: Date.now(), locked: false, operator: '',
  shareCode: String(1000 + Math.floor(Math.random() * 9000)), // suggested Offline e-KYC share code, so the ZIP opens without asking
  worker: { name: '', dob: '', gender: '', mobile: '', bssid: '' },
  docs: {}, audit: [], dupes: {}, photos: {},
};
DOCS.forEach(d => state.docs[d.id] = { value: '', status: 'pending', override: null, record: {}, evidence: [], extra: null, formatOk: false });

/* Live reading of the shared portal window, and the watched download folder (both run in live.js). */
const LIVE = { on: false, stream: null, video: null, timer: null, busy: false, label: '', portal: null, sig: null, ocrSig: null, stableSince: 0, reads: 0, lastAt: null, last: {}, formText: {}, status: '' };
const WATCH = { dir: null, on: false, pending: null, timer: null, busy: false, seen: new Set(), old: new Set(), sizes: new Map(), picked: 0, savedAt: null, saveError: '' };

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const docById = id => DOCS.find(d => d.id === id);
const tileEl = id => $(`.tile[data-doc="${id}"]`);
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3000); };
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function newCaseId() {
  const d = new Date();
  return `BSS-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
const shortTitle = d => d.title.replace(/ \(.*/, '');

/* ---------- Audit trail ---------- */
function log(event, doc = null, detail = '') {
  state.audit.push({ at: new Date().toISOString(), operator: state.operator || null, event, doc, detail });
  renderAudit();
  window.scheduleSave?.(); // case JSON follows every change
}
const maskNum = (id, v) => (id === 'aadhaar' || id === 'aadhaarNo') && v ? 'XXXXXXXX' + v.slice(-4) : v;

/* ---------- Declared (left) ---------- */
function buildDeclared() {
  const box = $('#docFields');
  DOCS.filter(d => d.field).forEach(d => {
    const wrap = document.createElement('div');
    wrap.className = 'f'; wrap.dataset.doc = d.id;
    wrap.innerHTML = `<label>${d.field.label}<input data-doc="${d.id}" placeholder="${d.field.placeholder}" ${d.field.inputmode ? `inputmode="${d.field.inputmode}"` : ''} autocomplete="off" spellcheck="false"></label><small class="msg"></small>`;
    box.appendChild(wrap);
  });
  box.addEventListener('input', e => {
    const inp = e.target, d = docById(inp.dataset.doc); if (!d) return;
    inp.value = d.format(inp.value);
    state.docs[d.id].value = inp.value.replace(/\s/g, '');
    declaredChanged([d.id], `${d.field.label} changed`);
  });
  $$('[data-key]').forEach(inp => inp.addEventListener('input', () => {
    if (inp.id === 'w_mobile') inp.value = inp.value.replace(/\D/g, '').slice(0, 10);
    state.worker[inp.dataset.key] = inp.value;
    declaredChanged(DOCS.map(d => d.id), `Declared ${inp.dataset.key} changed`);
  }));
  const op = $('#operator');
  try { op.value = localStorage.getItem('bss.operator') || ''; } catch {}
  state.operator = op.value;
  op.addEventListener('input', () => { state.operator = op.value.trim(); try { localStorage.setItem('bss.operator', state.operator); } catch {} renderIntegrity(); });
}

/* Declared data changed: anything already decided against the old value must be decided again. */
const pendingLog = {};
function declaredChanged(docIds, why) {
  docIds.forEach(id => {
    const rec = state.docs[id];
    if (rec.status !== 'pending') {
      rec.status = 'pending'; rec.override = null;
      log('Status reset: declared data changed after decision', id, why);
      toast(`${docById(id).title} reset to pending: declared data changed`);
    }
  });
  clearTimeout(pendingLog[why]);
  pendingLog[why] = setTimeout(() => log(why), 1500);
  checkDuplicates();
  renderAll();
}

function workerIssues() {
  const w = state.worker, out = [];
  if (!w.name) out.push(['name', 'Name not declared', 'missing']);
  else if (!/^[A-Za-z][A-Za-z .']{2,}$/.test(w.name.trim())) out.push(['name', 'Name has digits/symbols', 'fail']);
  if (!w.dob) out.push(['dob', 'DOB not declared', 'missing']);
  else {
    const a = ageOf(w.dob);
    if (a < 18) out.push(['dob', `Age ${a}: under 18 cannot be onboarded`, 'fail']);
    else if (a > 70) out.push(['dob', `Age ${a}: check DOB`, 'review']);
  }
  if (!w.mobile) out.push(['mobile', 'Mobile not declared', 'missing']);
  else if (!/^[6-9]\d{9}$/.test(w.mobile) || /^(\d)\1{9}$/.test(w.mobile)) out.push(['mobile', 'Not a valid Indian mobile', 'fail']);
  return out;
}

function renderDeclared() {
  const issues = workerIssues();
  $$('.f[data-w]').forEach(f => {
    const k = f.dataset.w, v = state.worker[k], issue = issues.find(i => i[0] === k && i[2] !== 'missing');
    f.classList.toggle('invalid', !!issue && issue[2] === 'fail');
    f.classList.toggle('warn', !!issue && issue[2] === 'review');
    f.classList.toggle('valid', !!v && !issue);
    $('.msg', f).textContent = issue ? issue[1] : k === 'dob' && v ? `Age ${ageOf(v)}` : '';
  });
  DOCS.filter(d => d.field).forEach(d => {
    const rec = state.docs[d.id], f = $(`.f[data-doc="${d.id}"]`), msg = $('.msg', f);
    f.classList.remove('valid', 'invalid', 'warn');
    if (!rec.value) { rec.formatOk = false; msg.textContent = ''; return; }
    let [ok, text] = d.validate(rec.value, rec);
    if (ok && isDummy(rec.value)) [ok, text] = [false, 'Looks like a dummy number'];
    rec.formatOk = ok;
    const dupe = state.dupes[d.id];
    f.classList.add(dupe ? 'invalid' : ok ? 'valid' : 'invalid');
    msg.textContent = dupe ? `Used in case ${dupe.caseId}` : text;
  });
  const strip = $('#photoStrip');
  const ph = Object.entries(state.photos);
  strip.hidden = !ph.length;
  strip.innerHTML = ph.map(([id, url]) => `<figure><img src="${url}" alt="Photo from ${shortTitle(docById(id))}"><figcaption>${shortTitle(docById(id))}</figcaption></figure>`).join('')
    + (ph.length ? '<small>Same person as in front of you?</small>' : '');
}

/* ---------- Comparison (declared ↔ official) ---------- */
function compareNumber(official, declared, id) {
  const off = String(official).toUpperCase().replace(/[\s\-\/]/g, ''), dec = (declared || '').toUpperCase();
  if (!dec) return { result: 'review', note: 'No declared number to compare' };
  if (/[X*]/.test(off)) return { result: off.slice(-4) === dec.slice(-4) ? 'pass' : 'fail', note: `Masked: last 4 ${off.slice(-4)} vs ${dec.slice(-4)}` };
  return off === dec ? { result: 'pass', note: 'Same number' } : { result: 'fail', note: `${maskNum(id, off)} vs declared ${maskNum(id, dec)}` };
}

function fieldCheck(d, f) {
  const rec = state.docs[d.id], r = rec.record[f], w = state.worker;
  if (!r?.value) return { result: 'missing', note: 'Not read yet' };
  if (INFO.has(f)) return { result: 'na', note: '' };
  const v = String(r.value);
  switch (f) {
    case 'name': {
      if (!w.name) return { result: 'review', note: 'No declared name to compare' };
      const m = matchNames(w.name, v);
      return { result: m.verdict === 'match' ? 'pass' : m.verdict === 'partial' ? 'review' : 'fail', note: `${Math.round(m.score * 100)}% match with "${w.name}"${m.notes.length ? ' · ' + m.notes.join('; ') : ''}` };
    }
    case 'dob': {
      if (!w.dob) return { result: 'review', note: 'No declared DOB' };
      if (/^\d{4}$/.test(v.trim())) return v.trim() === w.dob.slice(0, 4) ? { result: 'review', note: 'Only the birth year is on record' } : { result: 'fail', note: `Year ${v} vs declared ${w.dob.slice(0, 4)}` };
      const iso = toIso(v);
      if (!iso) return { result: 'review', note: 'Unreadable date' };
      return iso === w.dob ? { result: 'pass', note: 'Same date' } : { result: 'fail', note: `${isoToDmy(iso)} vs declared ${isoToDmy(w.dob)}` };
    }
    case 'gender': {
      if (!w.gender) return { result: 'review', note: 'No declared gender' };
      return v[0].toUpperCase() === w.gender ? { result: 'pass', note: 'Same' } : { result: 'fail', note: `${v} vs declared ${w.gender}` };
    }
    case 'number': return compareNumber(v, rec.value, d.id);
    case 'aadhaarNo': return compareNumber(v, state.docs.aadhaar.value, 'aadhaar');
    case 'panNo': return compareNumber(v, state.docs.pan.value, 'pan');
    case 'mobile': {
      if (v === 'match') return { result: 'pass', note: 'Worker\'s mobile seen in the portal capture' };
      if (v === 'confirmed') return { result: 'pass', note: 'Operator confirmed the OTP came to the worker\'s phone' };
      if (v === 'nomatch') return { result: 'fail', note: 'A different mobile is linked' };
      if (v === 'linked') return { result: 'pass', note: 'Declared mobile is the Aadhaar-linked mobile (UIDAI e-KYC hash)' };
      if (v === 'notlinked') return { result: 'fail', note: 'Declared mobile is NOT the Aadhaar-linked mobile (UIDAI e-KYC hash)' };
      const digits = v.replace(/\D/g, '');
      if (!w.mobile) return { result: 'review', note: 'No declared mobile' };
      return w.mobile.endsWith(digits.slice(-4)) ? { result: 'pass', note: `Ends ${digits.slice(-4)}, same as declared` } : { result: 'fail', note: `Ends ${digits.slice(-4)}, declared ends ${w.mobile.slice(-4)}` };
    }
  }
  return { result: 'review', note: '' };
}

const hasProof = d => state.docs[d.id].evidence.some(e => e.trust >= 3 && e.kind !== 'attestation');

function blockers(d) {
  const rec = state.docs[d.id], out = [];
  if (d.field) {
    if (!rec.value) out.push('No number declared on the left');
    else if (!rec.formatOk) out.push('Declared number format invalid');
    if (state.dupes[d.id]) out.push(`Number already used in case ${state.dupes[d.id].caseId}`);
  }
  workerIssues().filter(i => i[2] === 'fail').forEach(i => out.push(i[1]));
  if (!hasProof(d)) out.push(d.action.kind === 'capture' ? 'No live capture of the result yet' : `No ${d.action.label.replace('Add ', '')} yet`);
  if (d.id === 'dl') {
    const till = toIso(rec.record.validTill?.value || ''), st = rec.record.dlStatus?.value;
    if (till && till < new Date().toISOString().slice(0, 10)) out.push(`Licence expired on ${isoToDmy(till)}`);
    if (st && (!/ACTIVE/i.test(st) || /INACTIVE/i.test(st))) out.push(`Licence status: ${st}`);
  }
  d.record.forEach(f => {
    const c = fieldCheck(d, f);
    if (c.result === 'missing' && d.required.includes(f)) out.push(`${FIELD_LABEL[f]} not read yet`);
    if (c.result === 'fail') out.push(`${FIELD_LABEL[f]} mismatch: ${c.note}`);
    if (c.result === 'review') out.push(`${FIELD_LABEL[f]} needs review: ${c.note}`);
  });
  return out;
}

function viewState(d) {
  const rec = state.docs[d.id];
  if (rec.status === 'verified') return rec.override ? 'override' : 'verified';
  if (rec.status === 'mismatch') return 'mismatch';
  return blockers(d).length ? 'pending' : 'ready';
}

/* ---------- Tiles (right) ---------- */
function buildTiles() {
  const grid = $('#grid'), tpl = $('#tileTpl'), integrity = $('#integrity');
  DOCS.forEach(d => {
    const el = tpl.content.firstElementChild.cloneNode(true);
    el.dataset.doc = d.id;
    el.style.setProperty('--accent', d.accent);
    $('.t-icon', el).textContent = d.icon;
    $('h3', el).textContent = d.title;
    $('.t-source', el).textContent = d.source;
    if (!d.field) $('.t-num', el).remove();
    else $('.t-value', el).addEventListener('click', () => copyValue(d));
    $('.t-steps', el).innerHTML = d.steps.map(s => `<li>${esc(s.replace('{code}', state.shareCode))}</li>`).join('');

    const open = $('.act.open', el);
    open.textContent = `① ${d.portals[0].label} ↗`;
    open.title = d.portals[0].url;
    open.addEventListener('click', () => popout(d, d.portals[0]));
    const links = $('.t-links', el);
    d.portals.slice(1).forEach(p => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'chip link', textContent: `${p.label} ↗`, title: p.url });
      b.addEventListener('click', () => popout(d, p));
      links.appendChild(b);
    });
    if (!links.children.length) links.remove();
    const main = $('.act.main', el), fi = $('input[type=file]', main);
    $('span', main).textContent = `② ${d.action.kind === 'capture' ? '📸 ' : ''}${d.action.label}`;
    if (d.action.kind === 'capture') {
      fi.remove();
      main.addEventListener('click', e => { e.preventDefault(); capturePortal(d); });
    } else {
      fi.accept = d.action.accept || '.pdf,application/pdf';
      fi.multiple = true;
      fi.addEventListener('change', () => { if (fi.files.length) readDocFiles(d, fi.files); fi.value = ''; });
    }
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('over'); });
    el.addEventListener('dragleave', () => el.classList.remove('over'));
    el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('over'); if (e.dataTransfer.files.length) readDocFiles(d, e.dataTransfer.files); });
    $('.ok', el).addEventListener('click', () => verify(d));
    $('.bad', el).addEventListener('click', () => markMismatch(d));

    const rows = $('.rec-rows', el);
    d.record.forEach(f => {
      const row = document.createElement('div');
      row.className = 'rec-row' + (INFO.has(f) ? ' info' : ''); row.dataset.f = f;
      const ctl = INFO.has(f) ? '<output></output>'
        : f === 'mobile' && d.action.kind === 'capture'
          ? `<select aria-label="Mobile link"><option value="">—</option><option value="match">Seen in capture</option><option value="confirmed">OTP came to worker's phone</option><option value="nomatch">Different mobile</option></select>`
          : `<input aria-label="Official ${FIELD_LABEL[f]}" spellcheck="false" placeholder="—">`;
      row.innerHTML = `<span class="rl">${FIELD_LABEL[f]}</span>${ctl}<span class="src"></span><span class="res" data-r="missing"></span>`;
      const input = $('input, select', row);
      input?.addEventListener('input', () => {
        const rec = state.docs[d.id];
        rec.record[f] = { value: input.value.trim(), source: 'manual', trust: TRUST.manual };
        if (rec.status !== 'pending') { rec.status = 'pending'; rec.override = null; log('Status reset: official record edited', d.id); }
        clearTimeout(row._t); row._t = setTimeout(() => log(`${FIELD_LABEL[f]} typed by operator`, d.id, f === 'number' ? maskNum(d.id, input.value) : input.value), 1200);
        renderAll(true);
      });
      rows.appendChild(row);
    });
    grid.insertBefore(el, integrity);
  });
}

/* Fill official fields; a weaker source never overwrites a stronger one. Returns the fields that changed.
   fillOnly (live reading): never replace a value that already came from a file or a capture. */
function setRecord(docId, values, source, { fillOnly = false } = {}) {
  const rec = state.docs[docId], changed = [];
  Object.entries(values).forEach(([f, v]) => {
    if (!v || !docById(docId).record.includes(f)) return;
    const cur = rec.record[f];
    if (cur && cur.trust > TRUST[source]) return;
    if (fillOnly && cur && cur.trust >= TRUST.capture) return;
    if (cur && cur.value === String(v) && cur.source === source) return;
    rec.record[f] = { value: String(v), source, trust: TRUST[source], at: new Date().toISOString() };
    changed.push(f);
  });
  if (changed.length) {
    if (rec.status !== 'pending') { rec.status = 'pending'; rec.override = null; }
    log(`Read from ${SOURCE_LABEL[source]}`, docId, changed.map(f => FIELD_LABEL[f]).join(', '));
  }
  renderAll();
  return changed;
}

function renderTile(d, keepInputs) {
  const el = tileEl(d.id), rec = state.docs[d.id];
  if (d.field) $('.t-value', el).textContent = rec.value ? d.format(rec.value) : 'Declared number appears here';
  const s = viewState(d), status = $('.status', el);
  status.dataset.state = s;
  status.textContent = { pending: 'Pending', ready: 'Ready', verified: 'Verified', override: 'Override', mismatch: 'Mismatch' }[s];
  el.dataset.state = s;
  el.classList.toggle('has-proof', rec.evidence.length > 0);
  el.classList.toggle('live', LIVE.on && LIVE.portal?.docId === d.id);
  const photo = state.photos[d.id];
  if (photo) $('.t-icon', el).innerHTML = `<img src="${photo}" alt="">`;

  d.record.forEach(f => {
    const row = $(`.rec-row[data-f="${f}"]`, el), r = rec.record[f], c = fieldCheck(d, f);
    const ctl = $('input, select', row), out = $('output', row);
    if (ctl && !(keepInputs && document.activeElement === ctl)) ctl.value = (ctl.tagName === 'INPUT' && f === 'mobile' && MOBILE_TEXT[r?.value]) || r?.value || '';
    if (out) { out.textContent = r?.value || '—'; out.title = r?.value || ''; }
    row.hidden = INFO.has(f) && !r?.value;
    const src = $('.src', row);
    src.dataset.s = r?.source || ''; src.title = r ? SOURCE_LABEL[r.source] : '';
    src.textContent = r ? SOURCE_TAG[r.source] : '';
    const res = $('.res', row);
    res.dataset.r = c.result; res.title = c.note;
    res.textContent = { pass: '✓', fail: '✕', review: '!', missing: '·', na: '' }[c.result];
  });

  const strip = $('.ev-strip', el);
  strip.innerHTML = '';
  rec.evidence.forEach(ev => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `ev t${ev.trust}`;
    b.title = `${ev.kindLabel} · ${SOURCE_LABEL[ev.source]} · ${new Date(ev.at).toLocaleTimeString('en-IN')}`;
    b.innerHTML = ev.thumb ? `<img src="${ev.thumb}" alt="">` : `<span>${ev.blob.type.includes('pdf') ? 'PDF' : 'FILE'}</span>`;
    b.addEventListener('click', () => openEvidence(d.id, ev.id));
    strip.appendChild(b);
  });

  const bl = blockers(d), ok = $('.ok', el), bad = $('.bad', el);
  $('.blockers', el).textContent = rec.status === 'verified' ? (rec.override ? 'Override logged' : 'All checks passed') : bl.length ? `${bl.length} open: ${bl[0]}` : 'All checks passed';
  $('.blockers', el).title = bl.join('\n');
  ok.classList.toggle('on', rec.status === 'verified');
  bad.classList.toggle('on', rec.status === 'mismatch');
  ok.textContent = rec.status === 'verified' ? 'Verified' : 'Verify';
}

function renderAll(keepInputs = true) {
  renderDeclared();
  DOCS.forEach(d => renderTile(d, keepInputs));
  renderIntegrity();
  window.renderLive?.();
  if (state.locked) lockUi();
}

/* ---------- Integrity panel ---------- */
function renderIntegrity() {
  let pass = 0, total = 0;
  const worst = rs => rs.includes('fail') ? 'fail' : rs.includes('review') ? 'review' : rs.includes('missing') ? 'missing' : rs.includes('pass') ? 'pass' : 'na';
  const cell = (d, fs) => { const present = fs.filter(f => d.record.includes(f)); return present.length ? worst(present.map(f => fieldCheck(d, f).result)) : 'na'; };
  const icon = r => `<td><span class="res" data-r="${r}">${{ pass: '✓', fail: '✕', review: '!', missing: '·', na: '' }[r]}</span></td>`;
  const rows = DOCS.map(d => {
    const cells = [cell(d, ['name']), cell(d, ['dob']), cell(d, ['number', 'aadhaarNo', 'panNo']), cell(d, ['mobile']), hasProof(d) ? 'pass' : 'missing'];
    cells.forEach(r => { if (r !== 'na') { total++; if (r === 'pass') pass++; } });
    return `<tr><th>${shortTitle(d)}</th>${cells.map(icon).join('')}<td><span class="mini-status" data-state="${viewState(d)}"></span></td></tr>`;
  }).join('');
  $('#matrix').innerHTML = `<thead><tr><th></th><th>Name</th><th>DOB</th><th>No.</th><th>Mobile</th><th>Proof</th><th></th></tr></thead><tbody>${rows}</tbody>`;
  const pct = total ? Math.round(pass / total * 100) : 0;
  const sc = $('#intScore'); sc.textContent = `${pct}%`; sc.dataset.level = pct >= 90 ? 'good' : pct >= 60 ? 'mid' : 'low';

  const flags = [];
  workerIssues().filter(i => i[2] !== 'missing').forEach(i => flags.push([i[2] === 'fail' ? 'fail' : 'warn', i[1]]));
  Object.entries(state.dupes).forEach(([id, v]) => v && flags.push(['fail', `${docById(id).title} already used in ${v.caseId} (${v.who})`]));
  const ov = DOCS.filter(d => state.docs[d.id].override).length;
  if (ov) flags.push(['warn', `${ov} override${ov > 1 ? 's' : ''} logged`]);
  flags.push(REC.on ? ['pass', 'Session recording on'] : ['warn', 'Session not recorded']);
  if (!state.operator) flags.push(['warn', 'Operator name missing']);
  $('#flags').innerHTML = flags.map(([c, t]) => `<li class="${c}">${esc(t)}</li>`).join('');

  const done = DOCS.filter(d => state.docs[d.id].status === 'verified').length;
  $('#progressText').textContent = `${done}/${DOCS.length}`;
  $('#progressBar').style.strokeDashoffset = 97.4 * (1 - done / DOCS.length);
}
function renderAudit() {
  $('#auditList').innerHTML = state.audit.slice(-30).reverse().map(a => `<li><time>${new Date(a.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>${a.doc ? `<b>${esc(shortTitle(docById(a.doc)) || a.doc)}</b> ` : ''}${esc(a.event)}</li>`).join('');
}

/* ---------- Decisions ---------- */
let ovTarget = null;
function verify(d) {
  if (state.locked) return;
  const rec = state.docs[d.id];
  if (rec.status === 'verified') { rec.status = 'pending'; rec.override = null; log('Verification withdrawn', d.id); renderAll(); return; }
  const bl = blockers(d);
  if (!bl.length) return decide(d, 'verified');
  ovTarget = d;
  $('#ovTitle').textContent = `Verify ${d.title} with ${bl.length} open issue${bl.length > 1 ? 's' : ''}?`;
  $('#ovList').innerHTML = bl.map(b => `<li class="fail">${esc(b)}</li>`).join('');
  $('#ovReason').value = ''; $('#ovOk').disabled = true;
  $('#ovWho').textContent = state.operator ? `Logged as ${state.operator}` : 'Enter your operator name at the top first';
  $('#overrideDlg').showModal();
}
$('#ovReason').addEventListener('input', e => $('#ovOk').disabled = e.target.value.trim().length < 15 || !state.operator);
$('#ovCancel').addEventListener('click', () => $('#overrideDlg').close());
$('#ovOk').addEventListener('click', () => {
  const d = ovTarget, reason = $('#ovReason').value.trim();
  state.docs[d.id].override = { reason, blockers: blockers(d), by: state.operator, at: new Date().toISOString() };
  $('#overrideDlg').close();
  decide(d, 'verified', `OVERRIDE: ${reason}`);
});
function markMismatch(d) {
  if (state.locked) return;
  const rec = state.docs[d.id];
  if (rec.status === 'mismatch') { rec.status = 'pending'; log('Mismatch withdrawn', d.id); renderAll(); return; }
  decide(d, 'mismatch', blockers(d).join('; '));
}
async function decide(d, status, detail = '') {
  const rec = state.docs[d.id];
  rec.status = status; rec.decidedAt = new Date().toISOString();
  if (status !== 'verified') rec.override = null;
  log(status === 'verified' ? 'Marked VERIFIED' : 'Marked MISMATCH', d.id, detail);
  renderAll();
  await attestSnapshot(d, status);
}

/* ---------- Portal windows ---------- */
async function copyText(v, what, quiet = false) {
  if (!v) return false;
  try { await navigator.clipboard.writeText(v); if (!quiet) toast(`${what} copied: paste it in the portal`); return true; } catch { return false; }
}
const copyValue = d => copyText(state.docs[d.id].value, d.field.label);

/* What each portal needs pasted first. */
function portalValue(d, p) {
  const w = state.worker;
  switch (p.copy) {
    case 'mobile': return [w.mobile, 'Worker mobile', 'Type the worker\'s mobile on the left first'];
    case 'shareCode': return [state.shareCode, `Share code ${state.shareCode}`, ''];
    case 'aadhaar': return [state.docs.aadhaar.value, 'Aadhaar number', 'Type the worker\'s Aadhaar number on the left first'];
    default: return [state.docs[d.id].value, d.field?.label || 'Number', `Type the ${d.field?.label || 'number'} on the left first`];
  }
}

/* All portals share ONE window, so the operator shares it once and live reading follows every portal. */
function popout(d, p = d.portals[0]) {
  const [value, what, missing] = portalValue(d, p);
  const copied = copyText(value, what, !LIVE.on); // copy while this page still has focus
  const sw = screen.availWidth, w = Math.round(sw * 0.5);
  const win = window.open(p.url, 'bss_portal', `popup=yes,width=${w},height=${screen.availHeight},left=${(screen.availLeft || 0) + sw - w},top=${screen.availTop || 0}`);
  if (!win) return toast('Pop-up blocked: allow pop-ups for this page');
  LIVE.portal = { docId: d.id, label: p.label, url: p.url, copied: (value || '').replace(/\s/g, ''), typed: p.typed || [], at: Date.now() };
  LIVE.ocrSig = null; // read the new page even if it looks like the last one
  log('Opened official portal', d.id, `${p.label} · ${p.url}`);
  if (LIVE.on) { win.focus(); copied.then(ok => { if (!ok && missing) toast(missing); }); }
  else window.startLive?.(win); // first portal of the case: ask once which window to read
  renderAll();
}

/* ---------- Duplicate registry (this device; stores only hashes) ---------- */
const REG_KEY = 'bss.registry';
const readReg = () => { try { return JSON.parse(localStorage.getItem(REG_KEY) || '{}'); } catch { return {}; } };
const regKey = (id, v) => sha256Hex(`${id}:${v.toUpperCase()}`);
async function checkDuplicates() {
  const reg = readReg();
  for (const d of DOCS.filter(x => x.field)) {
    const v = state.docs[d.id].value;
    const hit = v && v.length > 5 ? reg[await regKey(d.id, v)] : null;
    state.dupes[d.id] = hit && hit.caseId !== state.caseId ? hit : null;
  }
  renderDeclared(); DOCS.forEach(d => renderTile(d, true)); renderIntegrity();
}
async function registerCase() {
  const reg = readReg(), who = state.worker.name.split(/\s+/).filter(Boolean).map(t => t[0] + '***').join(' ');
  for (const d of DOCS.filter(x => x.field)) { const v = state.docs[d.id].value; if (v) reg[await regKey(d.id, v)] = { caseId: state.caseId, who, at: new Date().toISOString() }; }
  try { localStorage.setItem(REG_KEY, JSON.stringify(reg)); } catch {}
}

/* ---------- Lock & download ---------- */
$('#lockBtn').addEventListener('click', async () => {
  if (state.locked) return downloadCase();
  if (!window.JSZip) return toast('ZIP library failed to load: check internet');
  if (!state.operator) { $('#operator').focus(); return toast('Enter your operator name before locking'); }
  const done = DOCS.filter(d => state.docs[d.id].status === 'verified').length;
  if (!confirm(`Lock case ${state.caseId}? ${done}/${DOCS.length} verified.\n\nAfter locking nothing can be edited. The case file is sealed with SHA-256 fingerprints.`)) return;
  log('Case locked', null, `${done}/${DOCS.length} verified`);
  await stopRecording();
  window.stopLive?.('Case locked');
  state.locked = true; state.lockedAt = new Date().toISOString();
  await registerCase();
  lockUi();
  await window.saveJson?.();
  await downloadCase();
});

function lockUi() {
  $$('.desk input, .desk select, .desk textarea, .tile button, .tile .act, #recBtn, #operator').forEach(e => { if (e.tagName === 'LABEL') e.classList.add('disabled'); else e.disabled = true; });
  $$('.tile .ev').forEach(e => e.disabled = false);
  $('#lockBtn').textContent = 'Download again';
  document.body.classList.add('locked');
}

let caseZip = null;
async function downloadCase() {
  if (!caseZip) caseZip = await buildCaseZip();
  Object.assign(document.createElement('a'), { href: URL.createObjectURL(caseZip.blob), download: caseZip.name }).click();
  toast(`Case sealed · ${caseZip.hash.slice(0, 12)}…`);
}

async function buildCaseZip() {
  const zip = new JSZip(), files = [];
  const add = async (path, blob, meta = {}) => { zip.file(path, blob); files.push({ path, size: blob.size, sha256: await sha256Hex(blob), ...meta }); };
  for (const d of DOCS) for (const ev of state.docs[d.id].evidence) {
    await add(`evidence/${d.id}/${ev.name}`, ev.blob, { kind: ev.kind, source: ev.source, trust: ev.trust, at: ev.at, capturedSha256: ev.sha256 });
    if (ev.text) await add(`evidence/${d.id}/${ev.name}.text.txt`, new Blob([ev.text], { type: 'text/plain' }), { kind: 'extracted-text', of: ev.name });
  }
  if (REC.blob) await add('session/session-recording.webm', REC.blob, { kind: 'session-recording', startedAt: REC.startedAt });
  const data = caseData();
  await add('verification.json', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  await add('audit-trail.json', new Blob([JSON.stringify(state.audit, null, 2)], { type: 'application/json' }));
  const caseHash = await sha256Hex(files.map(f => `${f.sha256}  ${f.path}`).sort().join('\n'));
  zip.file('manifest.json', JSON.stringify({ caseId: state.caseId, caseHash, algorithm: 'SHA-256 over sorted "sha256  path" lines', generatedAt: new Date().toISOString(), files }, null, 2));
  zip.file('summary.html', summaryHtml(data, caseHash));
  const blob = await zip.generateAsync({ type: 'blob' });
  const nm = (state.worker.name || 'worker').trim().replace(/\s+/g, '_');
  return { blob, hash: caseHash, name: `${state.caseId}_${nm}_${caseHash.slice(0, 8)}.zip` };
}

/* The whole case as one JSON document: autosaved while working (live.js) and sealed into the ZIP at lock.
   Aadhaar numbers are kept masked (last 4 only), as UIDAI requires outside an Aadhaar Data Vault. */
const maskAadhaarText = t => String(t || '').replace(/\b\d{4}\s?\d{4}\s?(\d{4})\b/g, 'XXXX XXXX $1');
function caseData() {
  const num = (id, v) => (id === 'aadhaar' && v ? maskNum('aadhaar', String(v).replace(/\s/g, '')) : v) || null;
  return {
    schema: 'bss.worker-case/v1',
    caseId: state.caseId, openedAt: new Date(state.openedAt).toISOString(), savedAt: new Date().toISOString(),
    locked: state.locked, lockedAt: state.lockedAt || null, operator: state.operator, userAgent: navigator.userAgent,
    declared: { ...state.worker, numbers: Object.fromEntries(DOCS.filter(d => d.field).map(d => [d.id, num(d.id, state.docs[d.id].value)])) },
    workerIssues: workerIssues().map(([field, issue, level]) => ({ field, issue, level })),
    documents: DOCS.map(d => {
      const r = state.docs[d.id];
      return {
        id: d.id, type: d.title, declaredNumber: num(d.id, r.value), status: r.status, decidedAt: r.decidedAt || null, override: r.override,
        official: Object.fromEntries(Object.entries(r.record).map(([k, v]) => [k, {
          label: FIELD_LABEL[k], value: k === 'number' ? num(d.id, v.value) : v.value, source: v.source, sourceLabel: SOURCE_LABEL[v.source], at: v.at || null,
        }])),
        checks: d.record.filter(f => !INFO.has(f)).map(f => ({ field: FIELD_LABEL[f], ...fieldCheck(d, f) })),
        openIssues: blockers(d), duplicateOf: state.dupes[d.id] || null,
        ...(r.extra ? { details: r.extra } : {}),
        evidence: r.evidence.map(ev => ({
          file: `evidence/${d.id}/${ev.name}`, kind: ev.kind, source: ev.source, trust: ev.trust, at: ev.at, sha256: ev.sha256, note: ev.note,
          text: d.id === 'aadhaar' ? maskAadhaarText(ev.text) : ev.text || '',
        })),
      };
    }),
    live: { reads: LIVE.reads, portalWindow: LIVE.label || null, downloadsPicked: WATCH.picked },
    audit: state.audit,
  };
}

function summaryHtml(data, hash) {
  const w = data.declared;
  const photos = Object.entries(state.photos).map(([id, url]) => `<figure><img src="${url}"><figcaption>${shortTitle(docById(id))}</figcaption></figure>`).join('');
  const rows = data.documents.map(d => `<tr><td><b>${esc(d.type)}</b><br><small>${esc(d.type === 'Aadhaar' ? maskNum('aadhaar', d.declaredNumber) : d.declaredNumber || '')}</small></td>
    <td class="${d.status}">${d.status.toUpperCase()}${d.override ? '<br><small>OVERRIDE: ' + esc(d.override.reason) + '</small>' : ''}</td>
    <td>${d.checks.map(c => `<span class="${c.result}">${c.result === 'pass' ? '✓' : c.result === 'fail' ? '✕' : c.result === 'missing' ? '·' : '!'} ${esc(c.field)}</span>`).join('<br>')}</td>
    <td><small>${d.openIssues.map(esc).join('<br>') || '—'}</small></td></tr>`).join('');
  return `<!doctype html><meta charset="utf-8"><title>${esc(data.caseId)}</title>
<style>body{font-family:Inter,system-ui,sans-serif;color:#1D1D1F;max-width:900px;margin:32px auto;padding:0 16px;font-size:14px}
h1{color:#073B67;margin:0}.bar{height:4px;background:linear-gradient(90deg,#FF9933 33%,#fff 33% 66%,#138808 66%);margin:12px 0 20px}
table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #E3E6EB;padding:8px;text-align:left;vertical-align:top}
th{background:#073B67;color:#fff}.verified,.pass{color:#2F9E67;font-weight:600}.mismatch,.fail{color:#C8433A;font-weight:600}.pending,.missing{color:#6E6E73}.review{color:#B4581B}
dl{display:grid;grid-template-columns:150px 1fr;gap:4px 12px}dt{color:#6E6E73}code{font-size:12px;word-break:break-all}
.ph{display:flex;gap:12px}figure{margin:0;text-align:center;font-size:12px;color:#6E6E73}figure img{height:110px;border-radius:6px;border:1px solid #E3E6EB}</style>
<h1>Bharat Shram Setu: Worker Verification</h1><div class="bar"></div>
<div class="ph">${photos}</div>
<dl><dt>Case</dt><dd>${esc(data.caseId)}</dd><dt>Worker (declared)</dt><dd>${esc(w.name || '—')} · DOB ${esc(w.dob || '—')} · ${esc(w.gender || '—')} · ${esc(w.mobile || '—')}</dd>
<dt>Operator</dt><dd>${esc(data.operator)}</dd><dt>Locked</dt><dd>${new Date(data.lockedAt).toLocaleString('en-IN')}</dd>
<dt>Case fingerprint</dt><dd><code>${hash}</code></dd></dl>
<table><tr><th>Document</th><th>Decision</th><th>Declared vs official</th><th>Open issues</th></tr>${rows}</table>
<p><small>Every file's SHA-256 is in manifest.json; the case fingerprint is the SHA-256 of that list. Changing any file changes the fingerprint. Store the fingerprint in BSS at submission.</small></p>`;
}

$('#resetBtn').addEventListener('click', () => {
  if (!state.locked && !confirm('Discard this case and start a new one?')) return;
  window.removeEventListener('beforeunload', guard);
  location.reload();
});
function guard(e) {
  if (state.locked) return;
  if (Object.values(state.docs).some(r => r.value || r.evidence.length) || state.worker.name) { e.preventDefault(); e.returnValue = ''; }
}
window.addEventListener('beforeunload', guard);

/* ---------- Helpers ---------- */
async function sha256Hex(data) {
  const buf = data instanceof Blob ? await data.arrayBuffer() : new TextEncoder().encode(data);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(b => b.toString(16).padStart(2, '0')).join('');
}
function ageOf(iso) {
  const b = new Date(iso + 'T00:00'), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}
function toIso(v) {
  let m = v.match(/(\d{4})[-\/.](\d{2})[-\/.](\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}
const isoToDmy = iso => iso.split('-').reverse().join('-');
/* All one digit, or a straight run like 123456789012 / 987654321098 (letters ignored). */
function isDummy(v) {
  const d = v.replace(/\D/g, '');
  if (d.length < 9) return false; // PAN has too few digits for this test
  if (/^(\d)\1+$/.test(d)) return true;
  const step = (+d[1] - +d[0] + 10) % 10;
  return (step === 1 || step === 9) && [...d].every((c, i) => !i || (+c - +d[i - 1] + 10) % 10 === step);
}

/* Names: official names are often reordered, use initials, carry titles, or differ by one letter. */
const TITLES = new Set(['MR', 'MRS', 'MS', 'MISS', 'SHRI', 'SRI', 'SMT', 'KUMARI', 'KU', 'DR', 'MD']);
function nameTokens(n) { return n.toUpperCase().replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(t => t && !TITLES.has(t)); }
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function matchNames(refName, otherName) {
  const A = nameTokens(refName), B = nameTokens(otherName), notes = [];
  if (!A.length || !B.length) return { score: 0, verdict: 'none', notes };
  if (A.join('') === B.join('')) return { score: 1, verdict: 'match', notes: A.length !== B.length ? ['Same letters, different spacing'] : [] };
  const used = new Set(); let pts = 0;
  for (const b of B) {
    let best = -1, bestPts = 0;
    A.forEach((a, i) => {
      if (used.has(i)) return;
      let p = 0;
      if (a === b) p = 1;
      else if (b.length === 1 && a[0] === b) p = 0.8;
      else if (a.length === 1 && b[0] === a) p = 0.8;
      else if (Math.min(a.length, b.length) >= 4 && lev(a, b) <= (Math.max(a.length, b.length) >= 7 ? 2 : 1)) p = 0.85;
      else if (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a))) p = 0.7;
      if (p > bestPts) { bestPts = p; best = i; }
    });
    if (best >= 0) { used.add(best); pts += bestPts; if (bestPts < 1) notes.push(`"${b}" ≈ "${A[best]}"`); }
  }
  const score = Math.min(pts / Math.max(A.length, B.length), 1);
  const firstOk = B.some(b => b === A[0] || (b.length > 1 && lev(b, A[0]) <= 1));
  const firstInitial = B.some(b => b.length === 1 && b === A[0][0]);
  // A different first name with the same surname is a different person, so never treat that as partial.
  const verdict = score >= 0.8 && firstOk ? 'match' : score >= 0.5 && (firstOk || firstInitial) ? 'partial' : 'none';
  if (!firstOk && !firstInitial) notes.push('first name not found');
  else if (!firstOk) notes.push('first name only as initial');
  return { score, verdict, notes };
}

/* Verhoeff checksum, used by UIDAI for the last Aadhaar digit */
function verhoeff(num) {
  const d = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
  const p = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
  let c = 0;
  [...num].reverse().forEach((ch, i) => { c = d[c][p[i % 8][+ch]]; });
  return c === 0;
}

/* Boot happens in evidence.js once capture/OCR helpers exist. */
