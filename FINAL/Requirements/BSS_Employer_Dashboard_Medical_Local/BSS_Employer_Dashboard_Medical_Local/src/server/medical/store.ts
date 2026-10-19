import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import { INDIAN_STATES, KIT_TEMPLATE, TRAINING_TEMPLATE, DEFAULT_TESTS, addMonths, normaliseState, todayIso } from '@/components/employer/medical/catalog';
import { OSH_FORM_HTML, OSH_TEMPLATE_ID } from '@/components/employer/medical/oshFormTemplate';
import type { DirectoryEmployer, FormDispatch, MedicalExam, SafetyRecord, StateForm } from '@/components/employer/medical/types';

/* ────────────────────────────────────────────────────────────────────────────
 * DEMO STORE — the only file to replace when integrating with the real backend.
 *
 * Persists to a JSON file (`.data/bss-medical-store.json` under the app root) so
 * the BSS Staff and Employer views share state on a local port. In production,
 * swap each exported function for a call to the backend (same signatures) —
 * the route handlers in src/app/api/** and every UI component stay unchanged.
 * Seed data below (directory, first dispatch, sample exams / PPE records) is
 * demo-only and is generated only when a record does not exist yet.
 * ──────────────────────────────────────────────────────────────────────────── */

type Db = {
  forms: Record<string, StateForm>;
  dispatches: FormDispatch[];
  exams: Record<string, MedicalExam[]>;   // by workerId, newest first
  safety: Record<string, SafetyRecord>;   // by workerId
  frozen?: Record<string, string>;        // last locked HTML per state
  seededDispatch?: boolean;
};

const FILE = path.join(process.cwd(), '.data', 'bss-medical-store.json');

/** Demo employer directory for the BSS Staff "send to" picker. In production this
 *  comes from the employer master (employer → sites with state). */
export const DEMO_DIRECTORY: DirectoryEmployer[] = [
  { id: 'BSSE7K2M9Q4X', name: 'Talent India Group Pvt Ltd', sites: [
    { id: 'site-noida', name: 'Office Noida 136', location: 'Noida', state: 'Uttar Pradesh' },
    { id: 'site-gurugram', name: 'Factory Unit 2', location: 'Gurugram', state: 'Haryana' },
    { id: 'site-pune', name: 'Chakan Plant', location: 'Pune', state: 'Maharashtra' },
    { id: 'site-blr', name: 'Whitefield Warehouse', location: 'Bengaluru', state: 'Karnataka' },
  ] },
  { id: 'BSSE3P8R1T6W', name: 'Shakti Steel Works Ltd', sites: [
    { id: 'ssw-jsr', name: 'Jamshedpur Rolling Mill', location: 'Jamshedpur', state: 'Jharkhand' },
    { id: 'ssw-rkl', name: 'Rourkela Yard', location: 'Rourkela', state: 'Odisha' },
  ] },
  { id: 'BSSE5H2N7C4Z', name: 'Coastal Agro Foods Pvt Ltd', sites: [
    { id: 'caf-chn', name: 'Sriperumbudur Unit', location: 'Chennai', state: 'Tamil Nadu' },
    { id: 'caf-vzg', name: 'Vizag Cold Store', location: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { id: 'caf-noida', name: 'Greater Noida Packaging', location: 'Greater Noida', state: 'Uttar Pradesh' },
  ] },
];

let queue: Promise<unknown> = Promise.resolve();
/** Serialise read-modify-write cycles so concurrent requests don't clobber the file. */
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function load(): Promise<Db> {
  let db: Db;
  try { db = JSON.parse(await fs.readFile(FILE, 'utf8')) as Db; }
  catch { db = { forms: {}, dispatches: [], exams: {}, safety: {} }; }
  if (!db.seededDispatch) {
    // Demo: Uttar Pradesh form already issued to the Noida office so the employer view is not empty.
    const emp = DEMO_DIRECTORY[0], site = emp.sites[0];
    db.frozen = { ...db.frozen, 'Uttar Pradesh': OSH_FORM_HTML };
    db.forms['Uttar Pradesh'] = { state: 'Uttar Pradesh', templateId: OSH_TEMPLATE_ID, html: OSH_FORM_HTML, status: 'frozen', version: 1, updatedAt: new Date(Date.now() - 6 * 86_400_000).toISOString(), updatedBy: 'BSS Staff' };
    db.dispatches.push({ id: `dsp_${Date.now().toString(36)}`, state: 'Uttar Pradesh', version: 1, html: OSH_FORM_HTML, employerId: emp.id, employerName: emp.name, siteIds: [site.id], siteNames: [site.name], note: 'Initial issue — Form-VIII as notified in the Gazette.', sentAt: new Date(Date.now() - 6 * 86_400_000).toISOString(), sentBy: 'BSS Staff' });
    db.seededDispatch = true;
    await save(db);
  }
  return db;
}
async function save(db: Db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db));
}

function defaultForm(state: string): StateForm {
  return { state, templateId: OSH_TEMPLATE_ID, html: OSH_FORM_HTML, status: 'default', version: 0, updatedAt: '', updatedBy: '' };
}

/* ── BSS Staff: state forms ── */
export async function listStateForms() {
  const db = await load();
  return INDIAN_STATES.map(s => {
    const f = db.forms[s.name] ?? defaultForm(s.name);
    const sent = db.dispatches.filter(d => d.state === s.name);
    return { state: f.state, code: s.code, kind: s.kind, status: f.status, version: f.version, updatedAt: f.updatedAt, updatedBy: f.updatedBy,
      dispatches: sent.length, sites: new Set(sent.flatMap(d => d.siteIds)).size, lastSentAt: sent.at(-1)?.sentAt ?? '' };
  });
}
export async function getStateForm(state: string) {
  const db = await load();
  return db.forms[normaliseState(state)] ?? defaultForm(normaliseState(state));
}
/** `status: 'draft'` saves edits while unlocked; `'frozen'` locks and bumps the version if the HTML changed. */
export function saveStateForm(state: string, html: string, status: 'draft' | 'frozen', by: string) {
  return locked(async () => {
    const db = await load();
    const name = normaliseState(state);
    const prev = db.forms[name] ?? defaultForm(name);
    db.frozen ??= {};
    let version = prev.version;
    // A new version is cut only when the locked HTML differs from the last locked one.
    if (status === 'frozen' && (version === 0 || html !== db.frozen[name])) { version += 1; db.frozen[name] = html; }
    const next: StateForm = { state: name, templateId: prev.templateId, html, status, version, updatedAt: new Date().toISOString(), updatedBy: by };
    db.forms[name] = next;
    await save(db);
    return next;
  });
}
export function resetStateForm(state: string) {
  return locked(async () => {
    const db = await load();
    delete db.forms[normaliseState(state)];
    if (db.frozen) delete db.frozen[normaliseState(state)];
    await save(db);
    return defaultForm(normaliseState(state));
  });
}

/* ── Dispatch ── */
export async function listDirectory() { return DEMO_DIRECTORY; }
export async function listDispatches(filter: { state?: string; employerId?: string } = {}) {
  const db = await load();
  return db.dispatches.filter(d => (!filter.state || d.state === normaliseState(filter.state)) && (!filter.employerId || d.employerId === filter.employerId))
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}
export function createDispatch(input: { state: string; employerId: string; siteIds: string[]; note?: string; by: string }) {
  return locked(async () => {
    const db = await load();
    const state = normaliseState(input.state);
    const form = db.forms[state];
    if (!form || form.status !== 'frozen') throw new Error('Lock (freeze) the form before sending it.');
    const emp = (await listDirectory()).find(e => e.id === input.employerId);
    if (!emp) throw new Error('Unknown employer.');
    const sites = emp.sites.filter(s => input.siteIds.includes(s.id));
    if (!sites.length) throw new Error('Select at least one site.');
    const wrong = sites.filter(s => normaliseState(s.state) !== state);
    if (wrong.length) throw new Error(`${wrong.map(s => s.name).join(', ')} ${wrong.length > 1 ? 'are' : 'is'} not in ${state}. Health forms are state specific.`);
    const d: FormDispatch = { id: `dsp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, state, version: form.version, html: form.html,
      employerId: emp.id, employerName: emp.name, siteIds: sites.map(s => s.id), siteNames: sites.map(s => s.name), note: input.note?.trim() || undefined,
      sentAt: new Date().toISOString(), sentBy: input.by };
    db.dispatches.push(d);
    await save(db);
    return d;
  });
}

/* ── Deterministic demo seeding ── */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
const DOCTORS = [['Dr. A. K. Sharma', 'UPMC-12345', 'City Medical Center, Noida'], ['Dr. Meera Iyer', 'KMC-55821', 'Whitefield Occupational Health Clinic'], ['Dr. R. S. Malik', 'HMC-30417', 'Medanta OHC, Gurugram'], ['Dr. S. Kulkarni', 'MMC-77310', 'Chakan Industrial Health Centre']];

function seedExam(workerId: string): MedicalExam | null {
  const r = rng(`med:${workerId}`);
  const roll = r();
  if (roll < 0.22) return null; // never examined
  // valid · due within 30 days · expired
  const offsetDays = roll < 0.62 ? -Math.round(60 + r() * 500) : roll < 0.8 ? -Math.round(700 + r() * 25) : -Math.round(760 + r() * 200);
  const exam = new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
  const doc = DOCTORS[Math.floor(r() * DOCTORS.length)];
  const h = 158 + Math.round(r() * 22), w = 55 + Math.round(r() * 30);
  const vals: Record<string, string> = { height: String(h), weight: String(w), bmi: (w / ((h / 100) ** 2)).toFixed(1), vision: '6/6, 6/6', colour: 'Normal', bp: `${112 + Math.round(r() * 20)}/${72 + Math.round(r() * 12)}`, xray: 'Normal', ecg: 'Normal', audiometry: 'Normal', fbs: String(84 + Math.round(r() * 20)) };
  return {
    id: `mex_${workerId}_seed`, workerId, siteId: '', state: '', formType: 'VIII', dispatchId: null, formVersion: null,
    partA: { name: '', gender: '', dob: '', company: '', designation: '', department: '', role: '', uan: '', aadhaar: '', incharge: '', mobile: '', email: '', address: '', illness: 'None reported', nature: '' },
    tests: DEFAULT_TESTS.map(t => ({ key: t.key, name: t.name, unit: t.unit, result: vals[t.key] ?? '', flag: 'Normal', fileName: '' })),
    doctor: { name: doc[0], reg: doc[1], hospital: doc[2] }, examDate: exam, intervalMonths: 24, nextDue: addMonths(exam, 24),
    remarks: 'No significant abnormality detected.', heightWork: { value: 'No', detail: '' }, overall: 'Fit', restrictions: '',
    altFit: { enabled: false, role: '', work: '', dept: '', remarks: '' }, unfit: { role: '', work: '', dept: '', recommendation: '' }, recordedAt: `${exam}T10:00:00.000Z`,
  };
}

function seedSafety(workerId: string): SafetyRecord {
  const r = rng(`ppe:${workerId}`);
  const quality = r(); // high = well equipped
  const base = new Date(Date.now() - Math.round((40 + r() * 400) * 86_400_000)).toISOString().slice(0, 10);
  const kitItems: SafetyRecord['kitItems'] = {};
  KIT_TEMPLATE.forEach(k => {
    const issued = k.mandatory ? r() < 0.55 + quality * 0.5 : r() < 0.25 + quality * 0.3;
    kitItems[k.key] = issued ? { issued, issueDate: k.replMonths <= 3 ? addMonths(todayIso(), -Math.floor(r() * 4)) : base, size: ['S', 'M', 'L', 'XL', 'Std'][Math.floor(r() * 5)], condition: r() < 0.75 ? 'Good' : r() < 0.6 ? 'Fair' : 'Needs Replacement' } : { issued: false };
  });
  const trainings: SafetyRecord['trainings'] = {};
  TRAINING_TEMPLATE.forEach(t => {
    const done = t.mandatory ? r() < 0.6 + quality * 0.45 : r() < 0.2 + quality * 0.3;
    if (!done) { trainings[t.key] = { completed: false }; return; }
    const date = addMonths(todayIso(), -Math.floor(r() * (t.validityMonths + (quality < 0.3 ? 6 : 0))));
    trainings[t.key] = { completed: true, date, trainer: ['R. Kumar', 'A. Singh', 'Dr. Mehta', 'S. Verma', 'V. Rao'][Math.floor(r() * 5)], score: 'Pass', validUntil: addMonths(date, t.validityMonths) };
  });
  return { workerId, kitItems, trainings, issuedBy: 'R. Kumar — Safety Officer', kitCondition: 'Good', updatedAt: `${base}T09:00:00.000Z` };
}

/* ── Employer: medical exams ── */
export function listExams(workerIds: string[]) {
  return locked(async () => {
    const db = await load();
    let dirty = false;
    for (const id of workerIds) if (!(id in db.exams)) { const s = seedExam(id); db.exams[id] = s ? [s] : []; dirty = true; }
    if (dirty) await save(db);
    return Object.fromEntries(workerIds.map(id => [id, db.exams[id] ?? []]));
  });
}
export function saveExam(exam: MedicalExam) {
  return locked(async () => {
    const db = await load();
    const rec = { ...exam, id: exam.id || `mex_${Date.now().toString(36)}`, recordedAt: new Date().toISOString() };
    db.exams[exam.workerId] = [rec, ...(db.exams[exam.workerId] ?? [])];
    await save(db);
    return rec;
  });
}

/* ── Employer: PPE kit + training ── */
export function listSafety(workerIds: string[]) {
  return locked(async () => {
    const db = await load();
    let dirty = false;
    for (const id of workerIds) if (!db.safety[id]) { db.safety[id] = seedSafety(id); dirty = true; }
    if (dirty) await save(db);
    return Object.fromEntries(workerIds.map(id => [id, db.safety[id]]));
  });
}
export function saveSafety(record: SafetyRecord) {
  return locked(async () => {
    const db = await load();
    const prev = db.safety[record.workerId];
    db.safety[record.workerId] = { ...prev, ...record, kitItems: { ...prev?.kitItems, ...record.kitItems }, trainings: { ...prev?.trainings, ...record.trainings }, updatedAt: new Date().toISOString() };
    await save(db);
    return db.safety[record.workerId];
  });
}
