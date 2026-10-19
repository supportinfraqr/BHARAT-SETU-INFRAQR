/**
 * PREVIEW HARNESS ONLY — deterministic fake attendance / analytics engine used
 * by the mock API routes. Everything derives from `@/data/employer` so numbers
 * stay consistent with the dashboard's context data. Attendance is seeded per
 * (worker, date), so it is stable across reloads but today's live status moves
 * with the wall clock.
 */
import { COMPANY, SITE_GEO, mockEmployer } from '@/data/employer';
import type { EmployerWorker } from '@/types/portal';

export type StatusCode = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HALF_DAY' | 'LATE' | 'HOLIDAY';
export type Source = 'QR' | 'APP' | 'CAMERA' | 'BIOMETRIC';
const SOURCE_LABEL: Record<Source, string> = { QR: 'QR scan', APP: 'Mobile app', CAMERA: 'CCTV face match', BIOMETRIC: 'Biometric' };
const SHORT_SOURCE: Record<Source, string> = { QR: 'QR', APP: 'App', CAMERA: 'CCTV', BIOMETRIC: 'Biometric' };

/** Shift per worker (index-based): mostly General, a few Second / Night so the live view has people on site in the evening too. */
const SHIFT_OF: Record<string, { name: string; start: number; end: number }> = {};
const SHIFTS = {
  general: { name: 'General', start: 9 * 60, end: 17 * 60 + 30 },
  second: { name: 'Second', start: 14 * 60, end: 22 * 60 + 30 },
  night: { name: 'Night', start: 21 * 60 + 30, end: 24 * 60 + 6 * 60 },
};
mockEmployer.workers.forEach((w, i) => {
  SHIFT_OF[w.id] = i % 6 === 2 ? SHIFTS.second : i % 8 === 5 ? SHIFTS.night : i % 5 === 4 ? SHIFTS.second : SHIFTS.general;
});

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rand(seed: string) { return (hash(seed) % 10_000) / 10_000; }

export const pad = (n: number) => String(n).padStart(2, '0');
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (mins: number) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;
function at(date: string, mins: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setMinutes(mins);
  return d.toISOString();
}
const minutesNow = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

export type DayRecord = {
  id: string; date: string; worker: string; bssId: string; workerId: string; site: string; siteId: string;
  contractor: string; contractorId: string; status: string; statusCode: StatusCode; source?: string; sourceCode?: Source;
  shift: string; checkIn?: string; checkOut?: string; checkInAt?: string; checkOutAt?: string;
  verification?: string; matchStatus?: string; camera?: string; cameraArea?: string;
  geofenceOk?: boolean; distanceM?: number; accuracyM?: number; gpsLat?: number; gpsLong?: number; gpsAddress?: string; remarks?: string;
  leaveType?: string; leaveStatus?: string;
  events: Array<Record<string, unknown>>;
};

const HOLIDAYS = new Set(['2026-10-02', '2026-10-20', '2026-08-15', '2026-01-26']);
const STATUS_LABEL: Record<StatusCode, string> = { PRESENT: 'Present', ABSENT: 'Absent', LEAVE: 'Leave', HALF_DAY: 'Half Day', LATE: 'Late', HOLIDAY: 'Holiday' };

/** One attendance day for one worker, or null for weekly-off / not yet joined / future. */
export function dayRecord(w: EmployerWorker, date: string): DayRecord | null {
  const d = new Date(`${date}T00:00:00`);
  const today = isoDate(new Date());
  if (date > today || date < w.doj) return null;
  if (d.getDay() === 0) return null; // Sunday weekly off
  const base = {
    id: `att-${w.id}-${date}`, date, worker: w.name, bssId: w.bssId, workerId: w.id, site: w.site, siteId: w.siteId,
    contractor: w.contractor, contractorId: w.contractorId, shift: SHIFT_OF[w.id].name, events: [] as Array<Record<string, unknown>>,
  };
  if (HOLIDAYS.has(date)) return { ...base, status: 'Holiday', statusCode: 'HOLIDAY' };

  const r = rand(`${w.id}|${date}`);
  const presentP = w.status === 'Inactive' ? 0.35 : w.attendance / 100;
  let code: StatusCode;
  if (r < presentP) code = rand(`${w.id}|${date}|late`) < 0.12 ? 'LATE' : 'PRESENT';
  else if (r < presentP + (1 - presentP) * 0.45) code = 'LEAVE';
  else if (r < presentP + (1 - presentP) * 0.6) code = 'HALF_DAY';
  else code = 'ABSENT';
  if (code === 'ABSENT' || code === 'LEAVE') {
    return { ...base, status: STATUS_LABEL[code], statusCode: code, ...(code === 'LEAVE' ? { leaveType: rand(`${w.id}${date}lt`) < 0.5 ? 'Casual Leave' : 'Sick Leave', leaveStatus: 'Approved' } : {}) };
  }

  const shift = SHIFT_OF[w.id];
  const sources: Source[] = ['QR', 'APP', 'CAMERA', 'BIOMETRIC'];
  const src = sources[hash(`${w.id}${date}src`) % sources.length];
  const inMin = shift.start - 25 + Math.floor(rand(`${w.id}${date}in`) * (code === 'LATE' ? 80 : 40)) + (code === 'LATE' ? 25 : 0);
  const outMin = code === 'HALF_DAY' ? shift.start + 4 * 60 + Math.floor(rand(`${w.id}${date}ho`) * 30) : shift.end + Math.floor(rand(`${w.id}${date}out`) * 45);
  const geo = SITE_GEO[w.siteId];
  const offsetM = Math.round(rand(`${w.id}${date}geo`) * 180);
  const geofenceOk = offsetM < 150;
  const lat = geo.lat + offsetM / 111_000, lng = geo.lng + offsetM / 140_000;

  const isToday = date === today;
  const now = minutesNow();
  const arrived = !isToday || now >= inMin;
  if (!arrived) return { ...base, status: 'Expected', statusCode: 'PRESENT', sourceCode: src, source: SHORT_SOURCE[src], events: [], checkInAt: undefined };
  const left = !isToday || now >= Math.min(outMin, 24 * 60 - 1);

  const ev = (type: 'IN' | 'OUT', mins: number) => ({
    type, typeLabel: type === 'IN' ? 'Check-in' : 'Check-out', source: src, sourceLabel: SOURCE_LABEL[src],
    method: src === 'APP' ? 'Selfie + GPS' : src === 'QR' ? 'Gate QR' : undefined, at: at(date, mins),
    gpsLat: src === 'APP' ? lat : null, gpsLong: src === 'APP' ? lng : null, address: geo.address,
    geofenceOk: src === 'APP' ? geofenceOk : null, distanceM: src === 'APP' ? offsetM : null,
  });
  const events = [ev('IN', inMin)];
  if (left) events.push(ev('OUT', outMin));
  return {
    ...base, status: STATUS_LABEL[code], statusCode: code, sourceCode: src, source: SHORT_SOURCE[src],
    checkIn: hhmm(inMin), checkOut: left ? hhmm(outMin) : undefined, checkInAt: at(date, inMin), checkOutAt: left ? at(date, outMin) : undefined,
    verification: src === 'CAMERA' ? 'Face match' : src === 'BIOMETRIC' ? 'Fingerprint' : src === 'APP' ? 'Selfie + GPS' : 'Gate QR',
    matchStatus: src === 'CAMERA' ? (rand(`${w.id}${date}m`) < 0.9 ? 'Verified' : 'Low confidence') : undefined,
    camera: src === 'CAMERA' ? `CAM-${w.siteId.replace('site-', '').toUpperCase()}-0${1 + (hash(w.id) % 3)}` : undefined,
    cameraArea: src === 'CAMERA' ? 'Main gate' : undefined,
    geofenceOk: src === 'APP' ? geofenceOk : undefined, distanceM: src === 'APP' ? offsetM : undefined, accuracyM: src === 'APP' ? 12 : undefined,
    gpsLat: src === 'APP' ? lat : undefined, gpsLong: src === 'APP' ? lng : undefined, gpsAddress: geo.address,
    remarks: !geofenceOk && src === 'APP' ? 'Checked in from outside the site geo-fence' : undefined,
    events,
  };
}

export type Scope = { siteId?: string | null; contractorId?: string | null };
export function scopedWorkers(scope: Scope = {}) {
  return mockEmployer.workers.filter(w => (!scope.siteId || w.siteId === scope.siteId) && (!scope.contractorId || w.contractorId === scope.contractorId));
}

export function recordsBetween(from: Date, to: Date, scope: Scope = {}) {
  const out: DayRecord[] = [];
  const ws = scopedWorkers(scope);
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const date = isoDate(d);
    for (const w of ws) { const r = dayRecord(w, date); if (r && r.status !== 'Expected') out.push(r); }
  }
  return out;
}

export function monthRecords(month: string) {
  const [y, m] = month.split('-').map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0);
  return recordsBetween(from, to).sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ── Live ─────────────────────────────────────────────────────────────────
type LiveStatus = 'on_site' | 'checked_out' | 'not_arrived';
export function liveSnapshot(scope: Scope = {}) {
  const today = isoDate(new Date());
  const ws = scopedWorkers(scope).filter(w => w.status === 'Active');
  const rows = ws.map(w => {
    const r = dayRecord(w, today);
    const present = !!r?.checkInAt;
    const status: LiveStatus = !present ? 'not_arrived' : r?.checkOutAt ? 'checked_out' : 'on_site';
    const last = r?.events.at(-1) as { type?: string; at?: string } | undefined;
    return {
      row: {
        worker: w.name, bssId: w.bssId, site: w.site, contractor: w.contractor, status,
        checkIn: r?.checkInAt, checkOut: r?.checkOutAt, lastSource: present ? r?.source : undefined,
        lastType: last?.type, lastAt: last?.at, punches: r?.events.length ?? 0,
      },
      rec: r, w,
    };
  });
  const workersList = rows.map(r => r.row);
  const group = (key: 'site' | 'contractor') => {
    const m = new Map<string, typeof workersList>();
    workersList.forEach(r => { const k = r[key]; m.set(k, [...(m.get(k) ?? []), r]); });
    return [...m.entries()].map(([label, list]) => ({
      [key]: label, workers: list.length, onSite: list.filter(r => r.status === 'on_site').length,
      present: list.filter(r => r.status !== 'not_arrived').length, workerList: list,
    }));
  };
  const hourly = Array.from({ length: 24 }, (_, h) => {
    const names = rows.filter(r => r.rec?.checkInAt && new Date(r.rec.checkInAt).getHours() === h).map(r => r.w.name);
    return { label: `${pad(h)}:00`, value: names.length, workers: names };
  });
  const recentEvents = rows.flatMap(r => (r.rec?.events ?? []).map(e => ({
    worker: r.w.name, bssId: r.w.bssId, site: r.w.site, source: r.rec!.source ?? 'QR', type: String(e.type), at: String(e.at),
  }))).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 40);
  const onSite = workersList.filter(r => r.status === 'on_site').length;
  const checkedOut = workersList.filter(r => r.status === 'checked_out').length;
  const notArrived = workersList.filter(r => r.status === 'not_arrived').length;
  return {
    generatedAt: new Date().toISOString(),
    onSiteNow: onSite,
    boundWorkers: scopedWorkers(scope).length,
    today: { present: onSite + checkedOut, onSite, checkedOut, notArrived },
    bySite: group('site'),
    byContractor: group('contractor'),
    workers: workersList,
    hourlyArrivals: hourly,
    recentEvents,
  };
}

// ── Periods ──────────────────────────────────────────────────────────────
export function periodRange(period: string, fromQ?: string | null, toQ?: string | null) {
  const to = new Date(); to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  switch (period) {
    case 'today': case 'live': break;
    case 'week': from.setDate(from.getDate() - 6); break;
    case '3m': from.setMonth(from.getMonth() - 3); break;
    case '6m': from.setMonth(from.getMonth() - 6); break;
    case '12m': from.setMonth(from.getMonth() - 12); break;
    case 'custom': {
      const f = fromQ ? new Date(`${fromQ}T00:00:00`) : null; const t = toQ ? new Date(`${toQ}T00:00:00`) : null;
      if (f && !Number.isNaN(f.getTime())) from.setTime(f.getTime()); else from.setDate(1);
      if (t && !Number.isNaN(t.getTime())) to.setTime(Math.min(t.getTime(), to.getTime()));
      break;
    }
    default: from.setDate(1); // month
  }
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  return { from, to, days };
}

export function trend(records: DayRecord[], days: number) {
  const monthly = days > 62;
  const key = (date: string) => (monthly ? date.slice(0, 7) : date);
  const label = (k: string) => {
    const d = new Date(monthly ? `${k}-01T00:00:00` : `${k}T00:00:00`);
    return monthly ? d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };
  const m = new Map<string, { present: number; absent: number; leave: number }>();
  for (const r of records) {
    const k = key(r.date);
    const b = m.get(k) ?? { present: 0, absent: 0, leave: 0 };
    if (['PRESENT', 'LATE', 'HALF_DAY'].includes(r.statusCode)) b.present++;
    else if (r.statusCode === 'ABSENT') b.absent++;
    else if (r.statusCode === 'LEAVE') b.leave++;
    m.set(k, b);
  }
  return [...m.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => ({ label: label(k), value: v.present, ...v }));
}

// ── Workforce explorer rows ──────────────────────────────────────────────
export function explorerRows() {
  const today = isoDate(new Date());
  return mockEmployer.workers.map(w => {
    const site = mockEmployer.sites.find(s => s.id === w.siteId)!;
    const r = dayRecord(w, today);
    const attendance = !r ? 'WEEKLY OFF' : r.status === 'Expected' ? 'EXPECTED' : r.statusCode === 'LATE' || r.statusCode === 'HALF_DAY' ? 'PRESENT' : r.statusCode;
    return {
      id: w.id, bssId: w.bssId, name: w.name, state: site.state, district: site.district ?? site.location, city: site.location,
      age: w.age ?? null, gender: w.gender ?? '', category: w.category ?? '', occupation: w.designation, site: w.site,
      siteType: SITE_GEO[w.siteId]?.type ?? '', employer: COMPANY, contractor: w.contractor, migrant: !!w.migrant,
      stateOfOrigin: w.stateOfOrigin ?? '', attendance, epfoLinked: !!w.epfoLinked, esicLinked: !!w.esicLinked, wage: w.wage ?? 0,
    };
  });
}

export function countBy<T>(rows: T[], key: (r: T) => string | null | undefined) {
  const m = new Map<string, number>();
  rows.forEach(r => { const k = key(r); if (k) m.set(k, (m.get(k) ?? 0) + 1); });
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

// ── Static grievance + gate-scan sample (not in the portal payload) ───────
export const GRIEVANCES = [
  { id: 'grv-1', category: 'Wages', status: 'Open', siteId: 'site-pune', contractorId: 'ctr-safehands', raisedAt: '2026-10-08', resolvedHours: null },
  { id: 'grv-2', category: 'Safety', status: 'In Progress', siteId: 'site-blr', contractorId: 'ctr-buildright', raisedAt: '2026-10-11', resolvedHours: null },
  { id: 'grv-3', category: 'Canteen / Facilities', status: 'Resolved', siteId: 'site-noida', contractorId: 'ctr-tci', raisedAt: '2026-09-22', resolvedHours: 30 },
  { id: 'grv-4', category: 'Overtime', status: 'Resolved', siteId: 'site-gurugram', contractorId: 'ctr-buildright', raisedAt: '2026-09-18', resolvedHours: 52 },
  { id: 'grv-5', category: 'Harassment', status: 'Open', siteId: 'site-gurugram', contractorId: 'ctr-safehands', raisedAt: '2026-10-02', resolvedHours: null },
  { id: 'grv-6', category: 'Wages', status: 'Reopened', siteId: 'site-blr', contractorId: 'ctr-tci', raisedAt: '2026-09-29', resolvedHours: null },
  { id: 'grv-7', category: 'Leave', status: 'Resolved', siteId: 'site-pune', contractorId: 'ctr-tci', raisedAt: '2026-09-10', resolvedHours: 18 },
];
