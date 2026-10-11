"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Loader2, RefreshCw, ChevronDown, X } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import { BarChart, HBar, Donut } from '@/components/charts';
import AttendanceDetailDialog from '@/components/attendance/AttendanceDetailDialog';
import type { AttendanceRecord } from '@/types/portal';

type Series = { label: string; value: number };
type WorkerRow = { worker: string; bssId: string; site: string; siteId?: number; contractor: string; status: 'on_site' | 'checked_out' | 'not_arrived'; checkIn?: string; checkOut?: string; lastSource?: string; lastType?: string; lastAt?: string; punches?: number };
const STATUS_META: Record<WorkerRow['status'], { label: string; cls: string }> = {
  on_site: { label: 'On site', cls: 'bg-bss-soft-green text-bss-green' },
  checked_out: { label: 'Checked out', cls: 'bg-bss-blue-tint text-bss-interactive-blue' },
  not_arrived: { label: 'Not arrived', cls: 'bg-bss-soft-orange text-bss-orange' },
};
const E_ATT_STATUS: Record<string, string> = { PRESENT: 'Present', ABSENT: 'Absent', LEAVE: 'Leave', HOLIDAY: 'Holiday', HALF_DAY: 'Half Day', LATE: 'Late', EXPECTED: 'Expected' };
type EmpAttRow = { id?: string; date: string; worker?: string; bssId?: string; site: string; status?: string; statusCode?: string; source?: string; capture?: string; checkIn?: string; checkOut?: string; events?: Array<Record<string, unknown>> } & Record<string, unknown>;
function toAttendanceRecord(r: EmpAttRow): AttendanceRecord {
  return { ...(r as unknown as AttendanceRecord), presence: (E_ATT_STATUS[r.statusCode || r.status || ''] ?? 'Present') as AttendanceRecord['presence'], events: r.events as unknown as AttendanceRecord['events'] };
}
type Kpis = {
  workers: number; activeSites: number; contractors: number; attendanceRate: number;
  presentToday: number; absentToday: number; payrollProcessed: number; payrollExceptions: number;
  activeGatePasses: number; openGrievances: number; documentsExpiring: number;
  period: { total: number; present: number; absent: number; leave: number };
};
type LiveData = {
  generatedAt: string; onSiteNow: number; boundWorkers: number;
  today: { present: number; onSite: number; checkedOut: number; notArrived: number };
  bySite: Array<{ site: string; workers: number; onSite: number; present: number; workerList?: WorkerRow[] }>;
  byContractor: Array<{ contractor: string; workers: number; onSite: number; present: number; workerList?: WorkerRow[] }>;
  workers?: WorkerRow[];
  hourlyArrivals: Array<Series & { workers?: string[] }>;
  recentEvents: Array<{ worker: string; bssId: string; site: string; source: string; type: string; at: string }>;
};
type AnalyticsData = {
  tab: string;
  kpis?: Kpis;
  trend?: Array<Series & { present?: number; absent?: number; leave?: number }>;
  alerts?: Array<{ tone: string; label: string; href: string }>;
  bySite?: Array<Record<string, unknown>>;
  sourceMix?: Array<{ source: string; value: number }>;
  geofenceExceptions?: number; avgCheckIn?: string; totalRecords?: number;
  gender?: Series[]; ageBands?: Series[]; bloodGroup?: Series[];
  verified?: number; unverified?: number; joiners?: number; exits?: number;
  documents?: { valid: number; expiring: number; missing: number };
  statusMix?: Series[]; reports?: number;
  byPeriod?: Series[]; byContractor?: Array<Record<string, unknown>>;
  exceptions?: number; processed?: number; pending?: number;
  wageDistribution?: { min: number; avg: number; max: number };
  contractors?: Array<{ contractor: string; workers: number; sites: number }>;
  passStatusMix?: Series[]; passes?: number;
  scans?: { allow: number; deny: number; total: number };
  open?: number; total?: number; byCategory?: Series[]; byStatus?: Series[];
  avgResolutionHours?: number; overdue?: number;
} & Partial<LiveData>;

const PERIODS: Array<[string, string]> = [
  ['live', 'Live'], ['today', 'Today'], ['week', 'This week'], ['month', 'This month'],
  ['3m', 'Last 3 months'], ['6m', 'Last 6 months'], ['12m', 'Last 12 months'], ['custom', 'Custom'],
];
const TABS: Array<[string, string]> = [
  ['live', 'Live'], ['overview', 'Overview'], ['attendance', 'Attendance'], ['workforce', 'Workforce'],
  ['compliance', 'Compliance'], ['contractors', 'Contractors'],
  ['access', 'Access & Gate'], ['grievances', 'Grievances'],
];

function inr(n?: number) { return `₹${Number(n ?? 0).toLocaleString('en-IN')}`; }

export default function EmployerAnalyticsPage() {
  const { employer } = useEmployer();
  const sites = employer.sites.map(s => ({ id: String(s.id), name: s.name }));
  const contractors = useMemo(() => {
    const seen = new Map<string, string>();
    (employer.workers || []).forEach(w => { const s = String(w.contractorId || ''); if (s && !seen.has(s)) seen.set(s, w.contractor || s); });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [employer.workers]);

  const [tab, setTab] = useState('live');
  const [period, setPeriod] = useState('month');
  const [siteId, setSiteId] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  const effectivePeriod = tab === 'live' ? 'live' : period;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const q = new URLSearchParams({ tab, period: effectivePeriod });
      if (siteId) q.set('siteId', siteId);
      if (contractorId) q.set('contractorId', contractorId);
      if (effectivePeriod === 'custom') { if (from) q.set('from', from); if (to) q.set('to', to); }
      const response = await fetch(`/api/employer/analytics?${q}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: AnalyticsData; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error || 'Analytics could not be loaded.');
      setData(body.data);
      setUpdatedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Analytics could not be loaded.');
    } finally { setLoading(false); }
  }, [tab, effectivePeriod, siteId, contractorId, from, to]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + filter reload
  useEffect(() => { void load(); }, [load]);

  // Live tab auto-refreshes.
  useEffect(() => {
    if (tab !== 'live') return;
    const id = setInterval(() => { void load(); }, 30000);
    return () => clearInterval(id);
  }, [tab, load]);

  return <div className="space-y-5 pb-12">
    <header className="bss-reveal bss-gradient-hero bss-elevated relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white">
      <div className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute right-24 -bottom-20 w-48 h-48 rounded-full bg-white/5" />
      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-bss-soft-green uppercase tracking-[0.14em] flex items-center gap-1.5"><Activity size={14}/>Insights</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">Workforce Analytics</h1>
          <p className="text-sm text-white/70 mt-1 max-w-2xl">Live status and trends across your sites — workforce, attendance, compliance, access and grievances.</p>
        </div>
        <button type="button" onClick={() => void load()} className="self-start h-10 px-4 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/20 transition-colors backdrop-blur-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> {updatedAt ? `Updated ${updatedAt}` : 'Refresh'}
        </button>
      </div>
    </header>

    <div className="bss-reveal bss-card p-3 flex flex-wrap items-center gap-3" style={{ ['--bss-delay' as string]: '60ms' }}>
      <label className="text-xs font-semibold text-bss-text-secondary">Period
        <select value={effectivePeriod} disabled={tab === 'live'} onChange={e => setPeriod(e.target.value)} className="ml-2 h-9 border border-bss-border rounded-lg px-2.5 text-sm bg-white text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 disabled:opacity-60">
          {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      {effectivePeriod === 'custom' && <>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 border border-bss-border rounded-lg px-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30"/>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 border border-bss-border rounded-lg px-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30"/>
      </>}
      <label className="text-xs font-semibold text-bss-text-secondary">Site
        <select value={siteId} onChange={e => setSiteId(e.target.value)} className="ml-2 h-9 border border-bss-border rounded-lg px-2.5 text-sm bg-white text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30">
          <option value="">All sites</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-bss-text-secondary">Contractor
        <select value={contractorId} onChange={e => setContractorId(e.target.value)} className="ml-2 h-9 border border-bss-border rounded-lg px-2.5 text-sm bg-white text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30">
          <option value="">All contractors</option>{contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
    </div>

    <div className="bss-reveal inline-flex flex-wrap gap-1 rounded-xl border border-bss-border bg-white p-1.5 shadow-sm" style={{ ['--bss-delay' as string]: '100ms' }}>
      {TABS.map(([v, l]) => <button key={v} onClick={() => setTab(v)} className={`h-8 px-3.5 rounded-lg text-xs font-semibold transition-all ${tab === v ? 'bg-bss-navy text-white shadow-sm' : 'text-bss-text-secondary hover:bg-bss-bg hover:text-bss-text-primary'}`}>{l}</button>)}
    </div>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    {loading && !data ? <p className="flex items-center gap-2 text-sm text-bss-text-muted py-10"><Loader2 size={15} className="animate-spin"/>Loading analytics…</p>
      : data && <div className="bss-reveal" style={{ ['--bss-delay' as string]: '140ms' }}><TabBody tab={tab} data={data} inr={inr}/></div>}
  </div>;
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="bss-card rounded-2xl p-5 hover:border-bss-border transition-colors">
    <h2 className="text-sm font-semibold text-bss-text-primary">{title}</h2>
    {subtitle && <p className="text-[11px] text-bss-text-muted mt-0.5">{subtitle}</p>}
    <div className="mt-4">{children}</div>
  </section>;
}

function Stat({ label, value, tone = 'text-bss-text-primary' }: { label: string; value: string | number; tone?: string }) {
  return <div className="bss-surface-soft border border-bss-border rounded-xl p-4 bss-hover-lift">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-bss-text-muted">{label}</p>
    <strong className={`block text-2xl mt-1 ${tone}`}>{value}</strong>
  </div>;
}

function StatGrid({ items }: { items: Array<{ label: string; value: string | number; tone?: string }> }) {
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{items.map(i => <Stat key={i.label} {...i}/>)}</div>;
}

function WorkersTable({ workers, onWorker, pageSize = 10 }: { workers: WorkerRow[]; onWorker: (w: WorkerRow) => void; pageSize?: number }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | WorkerRow['status']>('all');
  const [page, setPage] = useState(1);
  const counts = {
    all: workers.length,
    on_site: workers.filter(w => w.status === 'on_site').length,
    checked_out: workers.filter(w => w.status === 'checked_out').length,
    not_arrived: workers.filter(w => w.status === 'not_arrived').length,
  };
  const filtered = workers.filter(w =>
    (status === 'all' || w.status === status) &&
    (!q || `${w.worker} ${w.bssId}`.toLowerCase().includes(q.toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, pages);
  const slice = filtered.slice((cur - 1) * pageSize, cur * pageSize);
  const t = (v?: string) => (v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');
  const chips: Array<['all' | WorkerRow['status'], string, number]> = [
    ['all', 'All', counts.all], ['on_site', 'On site', counts.on_site],
    ['checked_out', 'Checked out', counts.checked_out], ['not_arrived', 'Not arrived', counts.not_arrived],
  ];
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-1.5">
      <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search worker or BSS ID" className="h-8 rounded-lg border border-bss-border px-2.5 text-xs flex-1 min-w-[150px]" />
      {chips.map(([v, l, n]) => <button key={v} type="button" onClick={() => { setStatus(v); setPage(1); }} className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold border transition-colors ${status === v ? 'bg-bss-navy text-white border-bss-navy' : 'border-bss-border text-bss-text-secondary hover:bg-bss-bg'}`}>{l} {n}</button>)}
    </div>
    {slice.length ? <div className="overflow-hidden rounded-xl border border-bss-border">
      <table className="w-full text-xs">
        <thead className="bg-bss-bg text-[10px] uppercase tracking-wide text-bss-text-muted"><tr>
          <th className="text-left px-3 py-2 font-semibold">Worker</th>
          <th className="text-left px-2 py-2 font-semibold hidden sm:table-cell">Site</th>
          <th className="text-left px-2 py-2 font-semibold hidden md:table-cell">Contractor</th>
          <th className="px-2 py-2 font-semibold text-center">In–Out</th>
          <th className="px-2 py-2 font-semibold text-center">Status</th>
        </tr></thead>
        <tbody className="divide-y divide-bss-border">
          {slice.map((w, i) => {
            const m = STATUS_META[w.status];
            return <tr key={i} onClick={() => onWorker(w)} className="cursor-pointer hover:bg-bss-bg/60">
              <td className="px-3 py-2"><span className="block font-semibold text-bss-text-primary truncate max-w-[150px]">{w.worker}</span><span className="block text-[10px] font-mono text-bss-text-muted truncate">{w.bssId}</span></td>
              <td className="px-2 py-2 text-bss-text-secondary truncate max-w-[120px] hidden sm:table-cell">{w.site || '—'}</td>
              <td className="px-2 py-2 text-bss-text-secondary truncate max-w-[150px] hidden md:table-cell">{w.contractor || '—'}</td>
              <td className="px-2 py-2 text-center text-bss-text-secondary whitespace-nowrap">{t(w.checkIn)} – {t(w.checkOut)}</td>
              <td className="px-2 py-2 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${m.cls}`}>{m.label}</span></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div> : <p className="text-xs text-bss-text-muted px-1 py-3">No workers match.</p>}
    {pages > 1 && <div className="flex items-center justify-between text-[11px] text-bss-text-muted">
      <span>{filtered.length} worker{filtered.length === 1 ? '' : 's'}</span>
      <span className="flex items-center gap-1.5">
        <button type="button" disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="h-7 px-2 rounded-lg border border-bss-border disabled:opacity-40 hover:bg-bss-bg">Prev</button>
        <span>Page {cur} / {pages}</span>
        <button type="button" disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="h-7 px-2 rounded-lg border border-bss-border disabled:opacity-40 hover:bg-bss-bg">Next</button>
      </span>
    </div>}
  </div>;
}

function LiveByTable({ rows, firstLabel, matchKey, allWorkers, onWorker }: { rows: Array<{ label: string; workers: number; onSite: number; present: number }>; firstLabel: string; matchKey: 'site' | 'contractor'; allWorkers: WorkerRow[]; onWorker: (w: WorkerRow) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  if (!rows.length) return <p className="text-xs text-bss-text-muted">Nothing in scope.</p>;
  const filtered = q ? rows.filter(r => r.label.toLowerCase().includes(q.toLowerCase())) : rows;
  return <div className="space-y-2">
    <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${firstLabel.toLowerCase()}`} className="h-8 w-full rounded-lg border border-bss-border px-2.5 text-xs" />
    <div className="overflow-hidden rounded-xl border border-bss-border">
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-bss-bg text-[10px] uppercase tracking-wide text-bss-text-muted sticky top-0 z-10"><tr>
            <th className="text-left px-3 py-2 font-semibold">{firstLabel}</th>
            <th className="px-2 py-2 font-semibold text-center">Workers</th>
            <th className="px-2 py-2 font-semibold text-center text-bss-green">On site</th>
            <th className="px-2 py-2 font-semibold text-center">Present</th>
          </tr></thead>
          <tbody className="divide-y divide-bss-border">
            {filtered.map((r, i) => {
              const isOpen = open === r.label;
              const members = allWorkers.filter(w => (matchKey === 'site' ? w.site : w.contractor) === r.label);
              return <Fragment key={i}>
                <tr onClick={() => setOpen(isOpen ? null : r.label)} className="cursor-pointer hover:bg-bss-bg/60">
                  <td className="px-3 py-2 font-semibold text-bss-text-primary truncate max-w-[180px]"><span className="inline-flex items-center gap-1.5"><ChevronDown size={12} className={`text-bss-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />{r.label}</span></td>
                  <td className="px-2 py-2 text-center text-bss-text-secondary">{r.workers}</td>
                  <td className="px-2 py-2 text-center font-bold text-bss-green">{r.onSite}</td>
                  <td className="px-2 py-2 text-center text-bss-text-secondary">{r.present}</td>
                </tr>
                {isOpen && <tr><td colSpan={4} className="p-3 bg-bss-bg/60"><WorkersTable workers={members} onWorker={onWorker} pageSize={6} /></td></tr>}
              </Fragment>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}

function HourlyChart({ data }: { data: Array<Series & { workers?: string[] }> }) {
  const [sel, setSel] = useState<string | null>(null);
  if (!data.length) return <p className="text-xs text-bss-text-muted">No data.</p>;
  const total = data.reduce((s, d) => s + d.value, 0);
  const max = Math.max(1, ...data.map(d => d.value));
  const peak = data.reduce((best, d) => (d.value > best.value ? d : best), data[0]);
  const selected = sel ? data.find(d => d.label === sel) : null;
  return <div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mb-3">
      <span className="text-bss-text-secondary">Total check-ins: <strong className="text-bss-text-primary">{total}</strong></span>
      {total > 0 && <span className="text-bss-text-secondary">Busiest hour: <strong className="text-bss-text-primary">{peak.label}</strong> ({peak.value})</span>}
      <span className="text-bss-text-muted">Tap a bar for who checked in</span>
    </div>
    <div className="flex items-end gap-0.5 h-40 border-b border-bss-border">
      {data.map((d, i) => {
        const active = sel === d.label;
        return <button key={i} type="button" onClick={() => setSel(active ? null : d.label)} title={`${d.label} · ${d.value} check-in(s)`} className="group flex-1 flex flex-col items-center justify-end h-full">
          {d.value > 0 && <span className="text-[9px] font-bold text-bss-text-primary leading-none mb-0.5">{d.value}</span>}
          <span className={`w-full rounded-t transition-all ${d.value === 0 ? 'bg-bss-bg' : active ? 'bg-bss-orange' : d.value === max ? 'bg-bss-green' : 'bg-bss-interactive-blue'}`} style={{ height: `${Math.max(3, (d.value / max) * 100)}%` }} />
        </button>;
      })}
    </div>
    <div className="flex gap-0.5 mt-1">
      {data.map((d, i) => <span key={i} className="flex-1 text-center text-[8px] text-bss-text-muted">{i % 3 === 0 ? d.label.slice(0, 2) : ''}</span>)}
    </div>
    {selected && <div className="mt-3 rounded-xl border border-bss-border bg-bss-bg p-3 text-xs">
      <p className="font-semibold text-bss-text-primary">{selected.label} — {selected.value} check-in{selected.value === 1 ? '' : 's'}</p>
      {selected.workers?.filter(Boolean).length ? <p className="text-bss-text-secondary mt-1">{selected.workers.filter(Boolean).join(', ')}</p> : <p className="text-bss-text-muted mt-1">No check-ins in this hour.</p>}
    </div>}
  </div>;
}

function WorkerDetailDialog({ row, onClose }: { row: WorkerRow; onClose: () => void }) {
  const [rows, setRows] = useState<EmpAttRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [sel, setSel] = useState<AttendanceRecord | null>(null);
  useEffect(() => {
    let active = true;
    const m = new Date().toISOString().slice(0, 7);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch when the worker changes
    setBusy(true);
    fetch(`/api/employer/attendance/records?month=${m}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((b: { data?: EmpAttRow[] } | null) => { if (active) setRows((b?.data ?? []).filter(x => x.bssId === row.bssId)); })
      .catch(() => {})
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [row.bssId]);
  const meta = STATUS_META[row.status];
  const t = (v?: string) => (v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');
  return <div className="fixed inset-0 z-[130] grid place-items-center bg-bss-navy/40 backdrop-blur-sm p-4" onClick={onClose}>
    <div className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
      <header className="relative overflow-hidden bg-gradient-to-br from-bss-navy via-bss-deep-navy to-bss-interactive-blue text-white px-5 py-4 flex items-start justify-between gap-3">
        <div className="relative z-10 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">Worker</p>
          <h3 className="text-lg font-bold mt-0.5 truncate">{row.worker}</h3>
          <p className="text-[11px] text-white/70 mt-0.5 truncate"><span className="font-mono">{row.bssId}</span>{row.site ? ` · ${row.site}` : ''}{row.contractor ? ` · ${row.contractor}` : ''}</p>
        </div>
        <div className="relative z-10 flex items-center gap-2 flex-shrink-0">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20"><X size={18}/></button>
        </div>
      </header>
      <div className="p-5 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-bss-bg border border-bss-border"><span className="text-[10px] uppercase font-bold text-bss-text-muted block">Today in – out</span><span className="text-sm font-bold text-bss-text-primary">{t(row.checkIn)} – {t(row.checkOut)}</span></div>
          <div className="p-3 rounded-2xl bg-bss-bg border border-bss-border"><span className="text-[10px] uppercase font-bold text-bss-text-muted block">Punches today</span><span className="text-sm font-bold text-bss-text-primary">{row.punches ?? 0}</span></div>
          <div className="p-3 rounded-2xl bg-bss-bg border border-bss-border"><span className="text-[10px] uppercase font-bold text-bss-text-muted block">Last source</span><span className="text-sm font-bold text-bss-text-primary">{row.lastSource || '—'}{row.lastType ? ` ${row.lastType}` : ''}</span></div>
          <div className="p-3 rounded-2xl bg-bss-bg border border-bss-border"><span className="text-[10px] uppercase font-bold text-bss-text-muted block">Last punch</span><span className="text-sm font-bold text-bss-text-primary">{t(row.lastAt)}</span></div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-bss-text-muted mb-2">Attendance history this month</p>
          {busy ? <p className="text-xs text-bss-text-muted flex items-center gap-2"><Loader2 size={13} className="animate-spin" />Loading…</p>
            : rows.length ? <ul className="divide-y divide-bss-border rounded-xl border border-bss-border overflow-hidden">{rows.map((r, i) => {
                const s = r.statusCode || r.status || '';
                return <li key={i}><button type="button" onClick={() => setSel(toAttendanceRecord(r))} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs hover:bg-bss-bg">
                  <span className="font-semibold text-bss-text-primary w-24 text-left">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                  <span className="text-bss-text-secondary flex-1 text-left">{r.checkIn || '—'} – {r.checkOut || '—'}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s === 'PRESENT' ? 'bg-bss-soft-green text-bss-green' : s === 'ABSENT' ? 'bg-bss-soft-orange text-bss-error' : 'bg-bss-soft-orange text-bss-orange'}`}>{E_ATT_STATUS[s] ?? (s || '—')}</span>
                  <ChevronDown size={12} className="-rotate-90 text-bss-text-muted" />
                </button></li>;
              })}</ul>
            : <p className="text-xs text-bss-text-muted">No attendance records this month.</p>}
        </div>
      </div>
    </div>
    {sel && <AttendanceDetailDialog record={sel} subtitle={`${row.worker} · ${row.bssId}`} onClose={() => setSel(null)} />}
  </div>;
}

function TabBody({ tab, data, inr }: { tab: string; data: AnalyticsData; inr: (n?: number) => string }) {
  const [drill, setDrill] = useState<WorkerRow | null>(null);
  if (tab === 'live') {
    const bySite = (data.bySite ?? []) as LiveData['bySite'];
    const byContractor = (data.byContractor ?? []) as LiveData['byContractor'];
    return <div className="space-y-5">
      <StatGrid items={[
        { label: 'On site now', value: data.onSiteNow ?? 0, tone: 'text-bss-green' },
        { label: 'Bound workers', value: data.boundWorkers ?? 0 },
        { label: 'Present today', value: data.today?.present ?? 0 },
        { label: 'Checked out', value: data.today?.checkedOut ?? 0, tone: 'text-bss-interactive-blue' },
        { label: 'Not arrived', value: data.today?.notArrived ?? 0, tone: 'text-bss-orange' },
        { label: 'Punches today', value: (data.recentEvents ?? []).length },
      ]}/>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="By site" subtitle="Search · tap a site to see its workers"><LiveByTable firstLabel="Site" matchKey="site" allWorkers={data.workers ?? []} rows={bySite.map(s => ({ label: s.site, workers: s.workers, onSite: s.onSite, present: s.present }))} onWorker={setDrill}/></Card>
        <Card title="By contractor" subtitle="Search · tap a contractor to see its workers"><LiveByTable firstLabel="Contractor" matchKey="contractor" allWorkers={data.workers ?? []} rows={byContractor.map(c => ({ label: c.contractor, workers: c.workers, onSite: c.onSite, present: c.present }))} onWorker={setDrill}/></Card>
      </div>
      <Card title={`All workers (${(data.workers ?? []).length})`} subtitle="Search, filter by status, page through — tap a worker for full details">
        <WorkersTable workers={data.workers ?? []} onWorker={setDrill} pageSize={12} />
      </Card>
      <Card title="Today's snapshot"><Donut slices={[
        { label: 'On site', value: data.today?.onSite ?? 0, color: '#14843C' },
        { label: 'Checked out', value: data.today?.checkedOut ?? 0, color: '#1E3A8A' },
        { label: 'Not arrived', value: data.today?.notArrived ?? 0, color: '#F59E0B' },
      ]}/></Card>
      <Card title="Hourly arrivals (check-ins)" subtitle="Today — tap a bar to see who checked in"><HourlyChart data={data.hourlyArrivals ?? []} /></Card>
      <Card title="Live event feed" subtitle="Latest punches — any source · tap to open the worker">
        {data.recentEvents && data.recentEvents.length
          ? <ul className="divide-y divide-bss-border">{data.recentEvents.map((e, i) => <li key={i}>
              <button type="button" onClick={() => setDrill({ worker: e.worker, bssId: e.bssId, site: e.site, contractor: '', status: e.type === 'IN' ? 'on_site' : 'checked_out', lastSource: e.source, lastType: e.type, lastAt: e.at })} className="w-full py-2 flex items-center justify-between gap-2 text-xs text-left hover:bg-bss-bg rounded-lg px-2 -mx-2 transition-colors">
                <span className="text-bss-text-secondary min-w-0 truncate"><strong>{e.worker}</strong> · <span className="font-mono text-[11px] text-bss-text-muted">{e.bssId}</span> · {e.site}</span>
                <span className="flex items-center gap-2 flex-shrink-0"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.type === 'IN' ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-blue-tint text-bss-interactive-blue'}`}>{e.source} {e.type}</span><span className="text-bss-text-muted">{e.at ? new Date(e.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span></span>
              </button>
            </li>)}</ul>
          : <p className="text-xs text-bss-text-muted">No punches yet today.</p>}
      </Card>
      {drill && <WorkerDetailDialog row={drill} onClose={() => setDrill(null)} />}
    </div>;
  }

  if (tab === 'overview') {
    const k = data.kpis;
    return <div className="space-y-5">
      {k && <StatGrid items={[
        { label: 'Workers', value: k.workers }, { label: 'Active sites', value: k.activeSites },
        { label: 'Contractors', value: k.contractors }, { label: 'Attendance rate', value: `${k.attendanceRate}%` },
        { label: 'Present today', value: k.presentToday }, { label: 'Absent today', value: k.absentToday, tone: 'text-bss-error' },
        { label: 'Payroll processed', value: inr(k.payrollProcessed) }, { label: 'Payroll exceptions', value: k.payrollExceptions, tone: 'text-bss-error' },
        { label: 'Active gate passes', value: k.activeGatePasses }, { label: 'Open grievances', value: k.openGrievances, tone: 'text-bss-orange' },
        { label: 'Documents expiring', value: k.documentsExpiring, tone: 'text-bss-orange' }, { label: 'Records (period)', value: k.period.total },
      ]}/>}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2"><Card title="Attendance — present trend"><BarChart data={(data.trend ?? []).map(t => ({ label: t.label, value: t.value }))} color="#14843C"/></Card></div>
        <Card title="Alerts">
          {data.alerts && data.alerts.length
            ? <ul className="space-y-2">{data.alerts.map((a, i) => <li key={i}><a href={a.href} className="flex items-start gap-2 text-xs text-bss-text-secondary hover:underline"><AlertTriangle size={14} className={a.tone === 'red' ? 'text-bss-error mt-0.5' : 'text-bss-orange mt-0.5'}/>{a.label}</a></li>)}</ul>
            : <p className="text-xs text-bss-green flex items-center gap-1.5"><Activity size={14}/>All clear.</p>}
        </Card>
      </div>
    </div>;
  }

  if (tab === 'attendance') {
    return <div className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2"><Card title="Attendance trend (present)"><BarChart data={(data.trend ?? []).map(t => ({ label: t.label, value: t.present ?? t.value }))} color="#14843C"/></Card></div>
        <Card title="Source mix">{data.sourceMix?.length ? <Donut slices={data.sourceMix.map((s, i) => ({ label: s.source, value: s.value, color: ['#1E3A8A','#14843C','#E45D24','#7C3AED','#0EA5E9'][i % 5] }))}/> : <p className="text-xs text-bss-text-muted">No records.</p>}</Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Attendance rate by site"><HBar data={(data.bySite ?? []).map(s => ({ label: String(s.site), value: Number(s.rate ?? 0) }))} color="#1E3A8A"/></Card>
        <Card title="Summary">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Stat label="Records" value={data.totalRecords ?? 0}/>
            <Stat label="Avg check-in" value={data.avgCheckIn || '—'}/>
            <Stat label="Geo-fence exceptions" value={data.geofenceExceptions ?? 0} tone="text-bss-orange"/>
            <Stat label="Present total" value={(data.trend ?? []).reduce((n, t) => n + (t.present ?? 0), 0)}/>
          </div>
        </Card>
      </div>
    </div>;
  }

  if (tab === 'workforce') {
    return <div className="space-y-5">
      <StatGrid items={[
        { label: 'Total workers', value: data.total ?? 0 }, { label: 'Verified (Aadhaar)', value: data.verified ?? 0, tone: 'text-bss-green' },
        { label: 'Unverified', value: data.unverified ?? 0, tone: 'text-bss-orange' }, { label: 'Joiners (period)', value: data.joiners ?? 0 },
        { label: 'Exits (period)', value: data.exits ?? 0, tone: 'text-bss-error' },
      ]}/>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Headcount by site"><HBar data={(data.bySite ?? []).map(s => ({ label: String(s.site), value: Number(s.value ?? 0) }))}/></Card>
        <Card title="Headcount by contractor"><HBar data={(data.byContractor ?? []).map(c => ({ label: String(c.contractor), value: Number(c.value ?? 0) }))} color="#1E3A8A"/></Card>
        <Card title="Gender split"><Donut slices={(data.gender ?? []).map((g, i) => ({ label: g.label, value: g.value, color: ['#1E3A8A','#E45D24','#14843C','#7C3AED'][i % 4] }))}/></Card>
        <Card title="Age bands"><BarChart data={data.ageBands ?? []} color="#7C3AED"/></Card>
        <Card title="Blood group"><HBar data={data.bloodGroup ?? []} color="#E45D24"/></Card>
        <Card title="Documents"><BarChart data={[
          { label: 'Valid', value: data.documents?.valid ?? 0 },
          { label: 'Expiring', value: data.documents?.expiring ?? 0 },
          { label: 'Missing', value: data.documents?.missing ?? 0 },
        ]} color="#1E3A8A"/></Card>
      </div>
    </div>;
  }

  if (tab === 'compliance') {
    return <div className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Compliance score by site" subtitle="Lowest first"><HBar data={(data.bySite ?? []).map(s => ({ label: String(s.site), value: Number(s.score ?? 0) }))} color="#14843C"/></Card>
        <Card title="Report status">{data.statusMix?.length ? <Donut slices={data.statusMix.map((s, i) => ({ label: s.label, value: s.value, color: ['#14843C','#F59E0B','#DC2626'][i % 3] }))}/> : <p className="text-xs text-bss-text-muted">No reports.</p>}</Card>
        <Card title="Summary"><Stat label="Compliance reports" value={data.reports ?? 0}/></Card>
      </div>
    </div>;
  }

  if (tab === 'contractors') {
    return <Card title="Contractor scorecard" subtitle="Workers and sites per connected contractor">
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-bss-bg text-[11px] uppercase tracking-wider text-bss-text-muted"><tr><th className="text-left px-4 py-2">Contractor</th><th className="text-right px-4 py-2">Workers</th><th className="text-right px-4 py-2">Sites</th></tr></thead>
        <tbody className="divide-y divide-bss-border">{(data.contractors ?? []).map(c => <tr key={c.contractor}><td className="px-4 py-2 font-semibold text-bss-text-primary">{c.contractor}</td><td className="px-4 py-2 text-right">{c.workers}</td><td className="px-4 py-2 text-right">{c.sites}</td></tr>)}</tbody>
      </table></div>
    </Card>;
  }

  if (tab === 'access') {
    return <div className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Gate passes by status">{data.passStatusMix?.length ? <Donut slices={data.passStatusMix.map((s, i) => ({ label: s.label, value: s.value, color: ['#14843C','#F59E0B','#DC2626','#6B7280'][i % 4] }))}/> : <p className="text-xs text-bss-text-muted">No passes.</p>}</Card>
        <Card title="Gate scans (period)"><Donut slices={[
          { label: 'Allow', value: data.scans?.allow ?? 0, color: '#14843C' },
          { label: 'Deny', value: data.scans?.deny ?? 0, color: '#DC2626' },
        ]}/></Card>
        <Card title="Summary"><StatGrid items={[{ label: 'Passes', value: data.passes ?? 0 }, { label: 'Scans', value: data.scans?.total ?? 0 }]}/></Card>
      </div>
    </div>;
  }

  if (tab === 'grievances') {
    return <div className="space-y-5">
      <StatGrid items={[
        { label: 'Open', value: data.open ?? 0, tone: 'text-bss-orange' },
        { label: 'Total', value: data.total ?? 0 },
        { label: 'Avg resolution (h)', value: data.avgResolutionHours ?? 0 },
        { label: 'Overdue (>7d)', value: data.overdue ?? 0, tone: 'text-bss-error' },
      ]}/>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="By status">{data.byStatus?.length ? <Donut slices={data.byStatus.map((s, i) => ({ label: s.label, value: s.value, color: ['#14843C','#F59E0B','#DC2626','#1E3A8A'][i % 4] }))}/> : <p className="text-xs text-bss-text-muted">No grievances.</p>}</Card>
        <Card title="By category"><HBar data={data.byCategory ?? []} color="#E45D24"/></Card>
      </div>
    </div>;
  }

  return null;
}
