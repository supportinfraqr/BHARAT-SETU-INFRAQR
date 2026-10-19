"use client";

import { forwardRef, Fragment, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Loader2, ChevronDown, X, Radio, LayoutGrid, CalendarCheck, Users, ShieldCheck, Building2, DoorOpen, MessageSquareWarning, CalendarRange, MapPin, HardHat, RotateCcw } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import { BarChart, HBar, Donut, BSS } from '@/components/charts';
import { EmptyFiltered, FilterChips, InlineBar, Pager, SearchBox, SortTh, TABLE_HEAD, TABLE_ROW, useSort } from '@/components/employer/DashboardUI';
import { exportMatrixToXlsx } from '@/lib/exportXlsx';
import { openPrintHtml } from '@/lib/documentEngine/render';
import AttendanceDetailDialog from '@/components/attendance/AttendanceDetailDialog';
import WorkforceExplorer from '@/components/analytics/WorkforceExplorer';
import type { AttendanceRecord } from '@/types/portal';

export type EmployerAnalyticsHandle = {
  exportExcel: () => void;
  printPdf: () => void;
  refresh: () => void;
};

type Series = { label: string; value: number };
export type WorkerRow = { worker: string; bssId: string; site: string; siteId?: number; contractor: string; status: 'on_site' | 'checked_out' | 'not_arrived'; checkIn?: string; checkOut?: string; lastSource?: string; lastType?: string; lastAt?: string; punches?: number };
export const STATUS_META: Record<WorkerRow['status'], { label: string; cls: string }> = {
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
export type LiveData = {
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

const EmployerAnalytics = forwardRef<EmployerAnalyticsHandle>(function EmployerAnalytics(_props, ref) {
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

  function exportExcel() {
    if (!data) return;
    const rows: (string | number)[][] = [];
    const walk = (value: unknown, label: string) => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${label} ${index + 1}`.trim()));
      else if (typeof value === 'object') Object.entries(value as Record<string, unknown>).forEach(([k, v]) => walk(v, `${label ? `${label} · ` : ''}${k}`));
      else rows.push([label, String(value)]);
    };
    walk(data, '');
    exportMatrixToXlsx({ filename: `employer-analytics-${tab}-${new Date().toISOString().slice(0, 10)}`, head: ['Metric', 'Value'], rows, sheetName: tab.slice(0, 31) });
  }

  function printPdf() {
    if (!data) return;
    const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
    const sections: string[] = [];
    const bars = (label: string, arr: Array<Record<string, unknown>>) => {
      const pairs = arr.map(i => ({ label: String(i.label ?? i.site ?? i.contractor ?? i.name ?? ''), value: Number(i.value ?? i.count ?? i.n ?? 0) }));
      const max = Math.max(1, ...pairs.map(p => p.value));
      sections.push(`<section><h3>${esc(label)}</h3>${pairs.map(p => `<div class="bar"><span>${esc(p.label)}</span><span class="track"><i style="width:${Math.round(p.value / max * 100)}%"></i></span><b>${p.value.toLocaleString('en-IN')}</b></div>`).join('')}</section>`);
    };
    const walk = (label: string, val: unknown) => {
      if (val === null || val === undefined || val === '') return;
      if (Array.isArray(val)) {
        if (!val.length) return;
        const first = val[0];
        if (first && typeof first === 'object' && ('value' in first || 'count' in first)) { bars(label, val as Array<Record<string, unknown>>); return; }
        const keys = Object.keys(first ?? {});
        sections.push(`<section><h3>${esc(label)}</h3><table><thead><tr>${keys.map(k => `<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${val.slice(0, 300).map(r => `<tr>${keys.map(k => `<td>${esc((r as Record<string, unknown>)[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`);
        return;
      }
      if (typeof val === 'object') { Object.entries(val as Record<string, unknown>).forEach(([k, v]) => walk(`${label ? `${label} · ` : ''}${k}`, v)); return; }
      sections.push(`<div class="kv"><span>${esc(label)}</span><b>${esc(val)}</b></div>`);
    };
    Object.entries(data).forEach(([k, v]) => walk(k, v));
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Workforce Analytics</title><style>
    @page { size:A4; margin:12mm; }
    body{font-family:Arial,Segoe UI,sans-serif;color:#111827;font-size:11px;}
    h1{font-size:18px;color:#01183A;margin:0 0 2px;} .sub{color:#6b7280;font-size:11px;margin-bottom:12px;}
    h3{font-size:11px;margin:10px 0 4px;color:#1E3A8A;text-transform:capitalize;}
    .kv{display:flex;justify-content:space-between;border:1px solid #e5e7eb;padding:3px 6px;margin:2px 0;}
    .bar{display:flex;align-items:center;gap:6px;margin:2px 0;} .bar>span{width:38%;} .bar .track{flex:1;height:9px;background:#eef2f7;border-radius:4px;overflow:hidden;} .bar .track>i{display:block;height:100%;background:#1E3A8A;} .bar>b{width:72px;text-align:right;}
    table{width:100%;border-collapse:collapse;font-size:10px;} th,td{border:1px solid #cbd5e1;padding:3px 5px;text-align:left;}
    section{page-break-inside:avoid;}</style></head><body>
    <h1>Workforce Analytics</h1>
    <div class="sub">${esc(employer.identity.company)} · ${esc(tab)} tab · generated ${new Date().toLocaleString('en-IN')}</div>
    ${sections.join('')}</body></html>`;
    openPrintHtml(html, 'Workforce Analytics');
  }

  useImperativeHandle(ref, () => ({ exportExcel, printPdf, refresh: () => void load() }));


  const siteName = sites.find(s => s.id === siteId)?.name;
  const contractorName = contractors.find(c => c.id === contractorId)?.name;
  const hasScope = !!siteId || !!contractorId;
  const selectCls = 'flex-1 sm:flex-none min-w-0 h-10 sm:h-9 rounded-full border border-[#DBE3EF] bg-white pl-3 pr-8 text-xs font-semibold text-[#01183A] focus:outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15';

  return <div id="workforce-analytics" className="space-y-5 pb-12 scroll-mt-24">
    <div className="bss-reveal rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden relative" style={{ ['--bss-delay' as string]: '60ms' }}>
      {loading && data && <span className="absolute inset-x-0 top-0 h-0.5 overflow-hidden" aria-hidden><span className="block h-full w-1/3 bg-[#E45D24] animate-pulse" /></span>}
      {/* Tabs — navy rail like the deck's dark slides */}
      <div className="p-2 bg-[#01183A]">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Analytics views">
          {TABS.map(([v, l]) => {
            const Icon = TAB_ICON[v] ?? Activity;
            const on = tab === v;
            return <button key={v} role="tab" aria-selected={on} onClick={() => setTab(v)} className={`h-10 sm:h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 touch-manipulation inline-flex items-center gap-1.5 transition-all ${on ? 'bg-white text-[#01183A] shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
              <Icon size={13} className={on ? 'text-[#E45D24]' : ''} />{l}
              {v === 'live' && <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-[#14843C] animate-ping opacity-70" /><span className="relative w-1.5 h-1.5 rounded-full bg-[#14843C]" /></span>}
            </button>;
          })}
        </div>
      </div>
      {/* Filters */}
      <div className="p-3 sm:p-4 flex flex-wrap items-center gap-2.5">
        <label className="w-full sm:w-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-bss-text-muted"><CalendarRange size={13} className="text-[#1E3A8A]" /><span className="sr-only sm:not-sr-only">Period</span>
          <select value={effectivePeriod} onChange={e => { const v = e.target.value; setPeriod(v); if (tab === 'live' && v !== 'live') setTab('overview'); }} className={selectCls}>
            {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        {effectivePeriod === 'custom' && <span className="w-full sm:w-auto flex items-center gap-1.5">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="From date" className={selectCls.replace('pr-8', 'pr-3')}/>
          <span className="text-bss-text-muted text-xs">→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="To date" className={selectCls.replace('pr-8', 'pr-3')}/>
        </span>}
        <label className="w-full sm:w-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-bss-text-muted"><MapPin size={13} className="text-[#E45D24]" /><span className="sr-only sm:not-sr-only">Site</span>
          <select value={siteId} onChange={e => setSiteId(e.target.value)} className={selectCls}>
            <option value="">All sites</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="w-full sm:w-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-bss-text-muted"><HardHat size={13} className="text-[#14843C]" /><span className="sr-only sm:not-sr-only">Contractor</span>
          <select value={contractorId} onChange={e => setContractorId(e.target.value)} className={selectCls}>
            <option value="">All contractors</option>{contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <span className="w-full sm:w-auto sm:ml-auto flex items-center justify-end gap-2 text-[11px] text-bss-text-muted">
          {loading && <Loader2 size={12} className="animate-spin" />}
          {tab === 'live' && <span className="hidden sm:inline">Auto-refresh 30s ·</span>}
          {updatedAt && <span>Updated {updatedAt}</span>}
        </span>
      </div>
      {hasScope && <div className="px-4 pb-3 -mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-bss-text-muted font-semibold">Scoped to:</span>
        {siteName && <button type="button" onClick={() => setSiteId('')} className="h-7 pl-2.5 pr-1.5 rounded-full bg-[#FDF0EA] text-[#E45D24] font-semibold inline-flex items-center gap-1 hover:bg-[#F5C6B2]/60">{siteName}<X size={12} /></button>}
        {contractorName && <button type="button" onClick={() => setContractorId('')} className="h-7 pl-2.5 pr-1.5 rounded-full bg-[#EAF5EE] text-[#14843C] font-semibold inline-flex items-center gap-1 hover:bg-[#ACD4BA]/60">{contractorName}<X size={12} /></button>}
        <button type="button" onClick={() => { setSiteId(''); setContractorId(''); }} className="h-7 px-2 rounded-full text-[#1E3A8A] font-semibold inline-flex items-center gap-1 hover:underline"><RotateCcw size={11} />Clear</button>
      </div>}
    </div>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    {loading && !data ? <AnalyticsSkeleton />
      : data && <div className="bss-reveal" style={{ ['--bss-delay' as string]: '140ms' }}><TabBody tab={tab} data={data} inr={inr}/></div>}
  </div>;
});
export default EmployerAnalytics;

const TAB_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  live: Radio, overview: LayoutGrid, attendance: CalendarCheck, workforce: Users,
  compliance: ShieldCheck, contractors: Building2, access: DoorOpen, grievances: MessageSquareWarning,
};

function AnalyticsSkeleton() {
  return <div className="space-y-4" aria-busy="true">
    <p className="flex items-center gap-2 text-sm text-bss-text-muted"><Loader2 size={15} className="animate-spin"/>Loading analytics…</p>
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
      {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="h-[84px] rounded-2xl bg-[#F2F6FC] animate-pulse" />)}
    </div>
    <div className="grid lg:grid-cols-2 gap-5">{[0, 1].map(i => <div key={i} className="h-56 rounded-3xl bg-[#F2F6FC] animate-pulse" />)}</div>
  </div>;
}

function Card({ title, subtitle, children, accent = BSS.blue }: { title: string; subtitle?: string; children: React.ReactNode; accent?: string }) {
  return <section className="min-w-0 rounded-3xl bg-white border border-[#DBE3EF] p-4 sm:p-5 h-full hover:shadow-lg hover:shadow-[#01183A]/5 transition-shadow">
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 w-1 h-8 rounded-full shrink-0" style={{ background: accent }} />
      <div className="min-w-0">
        <h2 className="text-sm font-extrabold text-[#01183A]">{title}</h2>
        {subtitle && <p className="text-[11px] text-bss-text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="mt-4">{children}</div>
  </section>;
}

const TONE_ACCENT: Record<string, string> = {
  'text-bss-green': BSS.green, 'text-bss-interactive-blue': BSS.blue, 'text-bss-orange': BSS.orange,
  'text-bss-error': BSS.red, 'text-bss-text-primary': BSS.navy,
};

function Stat({ label, value, tone = 'text-bss-text-primary' }: { label: string; value: string | number; tone?: string }) {
  const accent = TONE_ACCENT[tone] ?? BSS.navy;
  return <div className="relative rounded-2xl bg-white border border-[#DBE3EF] p-4 overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all">
    <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
    <span className="absolute -right-5 -bottom-5 w-16 h-16 rounded-full opacity-[0.07]" style={{ background: accent }} />
    <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">{label}</p>
    <strong className="block text-2xl font-extrabold mt-1.5 tabular-nums" style={{ color: tone === 'text-bss-text-primary' ? BSS.navy : accent }}>{value}</strong>
  </div>;
}

function StatGrid({ items }: { items: Array<{ label: string; value: string | number; tone?: string }> }) {
  return <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>{items.map(i => <Stat key={i.label} {...i}/>)}</div>;
}

type WKey = 'worker' | 'site' | 'contractor' | 'checkIn' | 'status';
const STATUS_RANK: Record<WorkerRow['status'], number> = { on_site: 0, checked_out: 1, not_arrived: 2 };
const STATUS_DOT: Record<WorkerRow['status'], string> = { on_site: BSS.green, checked_out: BSS.blue, not_arrived: BSS.orange };

export function WorkersTable({ workers, onWorker, pageSize = 10 }: { workers: WorkerRow[]; onWorker: (w: WorkerRow) => void; pageSize?: number }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | WorkerRow['status']>('all');
  const [page, setPage] = useState(1);
  const counts = {
    all: workers.length,
    on_site: workers.filter(w => w.status === 'on_site').length,
    checked_out: workers.filter(w => w.status === 'checked_out').length,
    not_arrived: workers.filter(w => w.status === 'not_arrived').length,
  };
  const filtered = useMemo(() => workers.filter(w =>
    (status === 'all' || w.status === status) &&
    (!q || `${w.worker} ${w.bssId}`.toLowerCase().includes(q.toLowerCase()))), [workers, status, q]);
  const { sorted, sort, toggle } = useSort<WorkerRow, WKey>(filtered, {
    worker: w => w.worker || '', site: w => w.site || '', contractor: w => w.contractor || '',
    checkIn: w => (w.checkIn ? new Date(w.checkIn).getTime() : Number.MAX_SAFE_INTEGER), status: w => STATUS_RANK[w.status],
  });
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const cur = Math.min(page, pages);
  const slice = sorted.slice((cur - 1) * pageSize, cur * pageSize);
  const t = (v?: string) => (v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');
  const chips: Array<{ value: 'all' | WorkerRow['status']; label: string; count: number; dot?: string }> = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'on_site', label: 'On site', count: counts.on_site, dot: BSS.green },
    { value: 'checked_out', label: 'Checked out', count: counts.checked_out, dot: BSS.blue },
    { value: 'not_arrived', label: 'Not arrived', count: counts.not_arrived, dot: BSS.orange },
  ];
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <SearchBox value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search worker or BSS ID" className="flex-1 min-w-[170px]" />
      <FilterChips options={chips} value={status} onChange={v => { setStatus(v); setPage(1); }} />
    </div>
    {slice.length ? <div className="overflow-hidden rounded-2xl border border-[#DBE3EF] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className={TABLE_HEAD}><tr>
            <SortTh k="worker" label="Worker" sort={sort} onSort={toggle} />
            <SortTh k="site" label="Site" sort={sort} onSort={toggle} className="hidden sm:table-cell" />
            <SortTh k="contractor" label="Contractor" sort={sort} onSort={toggle} className="hidden md:table-cell" />
            <SortTh k="checkIn" label="In–Out" sort={sort} onSort={toggle} align="center" className="hidden sm:table-cell" />
            <SortTh k="status" label="Status" sort={sort} onSort={toggle} align="center" />
          </tr></thead>
          <tbody className="divide-y divide-[#DBE3EF]">
            {slice.map((w, i) => {
              const m = STATUS_META[w.status];
              return <tr key={i} onClick={() => onWorker(w)} className={`cursor-pointer ${TABLE_ROW}`}>
                <td className="px-3 py-2.5"><span className="flex items-center gap-2 min-w-0">
                  <span className="relative w-7 h-7 rounded-full bg-[#01183A] text-white grid place-items-center text-[9px] font-bold shrink-0">{initialsOf(w.worker)}<span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white" style={{ background: STATUS_DOT[w.status] }} /></span>
                  <span className="min-w-0"><span className="block font-semibold text-[#01183A] truncate max-w-[140px] sm:max-w-[150px]">{w.worker}</span><span className="block text-[10px] font-mono text-bss-text-muted truncate">{w.bssId}</span><span className="sm:hidden block text-[10px] text-bss-text-secondary tabular-nums">{t(w.checkIn)} – {t(w.checkOut)}</span></span>
                </span></td>
                <td className="px-3 py-2.5 text-bss-text-secondary truncate max-w-[120px] hidden sm:table-cell">{w.site || '—'}</td>
                <td className="px-3 py-2.5 text-bss-text-secondary truncate max-w-[150px] hidden md:table-cell">{w.contractor || '—'}</td>
                <td className="px-3 py-2.5 text-center text-bss-text-secondary whitespace-nowrap tabular-nums hidden sm:table-cell">{t(w.checkIn)} – {t(w.checkOut)}</td>
                <td className="px-3 py-2.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${m.cls}`}>{m.label}</span></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div> : workers.length ? <EmptyFiltered label="No workers match." onReset={() => { setQ(''); setStatus('all'); setPage(1); }} /> : <p className="text-xs text-bss-text-muted px-1 py-3">No workers match.</p>}
    {slice.length > 0 && <Pager page={cur} pages={pages} total={sorted.length} noun="worker" onPage={setPage} />}
  </div>;
}

function initialsOf(name?: string) {
  return (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '•';
}

type LRow = { label: string; workers: number; onSite: number; present: number };
type LKey = 'label' | 'workers' | 'onSite' | 'present';
function LiveByTable({ rows, firstLabel, matchKey, allWorkers, onWorker }: { rows: Array<LRow>; firstLabel: string; matchKey: 'site' | 'contractor'; allWorkers: WorkerRow[]; onWorker: (w: WorkerRow) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const m = new Map<string, WorkerRow[]>();
    for (const w of allWorkers) {
      const k = (matchKey === 'site' ? w.site : w.contractor) || '';
      const arr = m.get(k);
      if (arr) arr.push(w); else m.set(k, [w]);
    }
    return m;
  }, [allWorkers, matchKey]);
  const filtered = useMemo(() => (q ? rows.filter(r => r.label.toLowerCase().includes(q.toLowerCase())) : rows), [rows, q]);
  const { sorted, sort, toggle } = useSort<LRow, LKey>(filtered, { label: r => r.label, workers: r => r.workers, onSite: r => r.onSite, present: r => r.present });
  if (!rows.length) return <p className="text-xs text-bss-text-muted">Nothing in scope.</p>;
  return <div className="space-y-3">
    <SearchBox value={q} onChange={setQ} placeholder={`Search ${firstLabel.toLowerCase()}`} />
    <div className="overflow-hidden rounded-2xl border border-[#DBE3EF]">
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-xs">
          <thead className={`${TABLE_HEAD} sticky top-0 z-10`}><tr>
            <SortTh k="label" label={firstLabel} sort={sort} onSort={toggle} />
            <SortTh k="workers" label="Workers" sort={sort} onSort={toggle} align="center" />
            <SortTh k="onSite" label={<span className="text-[#14843C]">On site</span>} sort={sort} onSort={toggle} align="center" />
            <SortTh k="present" label="Present" sort={sort} onSort={toggle} align="center" />
          </tr></thead>
          <tbody className="divide-y divide-[#DBE3EF]">
            {sorted.length === 0 && <tr><td colSpan={4}><EmptyFiltered label={`No ${firstLabel.toLowerCase()} matches.`} onReset={() => setQ('')} /></td></tr>}
            {sorted.map((r, i) => {
              const isOpen = open === r.label;
              const members = isOpen ? (groups.get(r.label) ?? []) : [];
              return <Fragment key={i}>
                <tr onClick={() => setOpen(isOpen ? null : r.label)} className={`cursor-pointer ${isOpen ? 'bg-[#F2F6FC]' : TABLE_ROW}`}>
                  <td className="px-2 sm:px-3 py-2.5 font-semibold text-[#01183A] truncate max-w-[130px] sm:max-w-[180px]"><span className="inline-flex items-center gap-1.5"><span className={`w-5 h-5 rounded-full grid place-items-center transition-colors ${isOpen ? 'bg-[#01183A] text-white' : 'bg-[#F2F6FC] text-bss-text-muted'}`}><ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} /></span>{r.label}</span></td>
                  <td className="px-2 sm:px-3 py-2.5 text-center text-bss-text-secondary tabular-nums">{r.workers}</td>
                  <td className="px-2 sm:px-3 py-2.5"><span className="flex items-center gap-2 justify-center"><strong className="text-[#14843C] tabular-nums w-6 text-center sm:text-right">{r.onSite}</strong><span className="w-14 hidden sm:block"><InlineBar value={r.onSite} max={r.workers} color={BSS.green} /></span></span></td>
                  <td className="px-2 sm:px-3 py-2.5 text-center text-bss-text-secondary tabular-nums">{r.present}</td>
                </tr>
                {isOpen && <tr><td colSpan={4} className="p-3 bg-[#F2F6FC]"><WorkersTable workers={members} onWorker={onWorker} pageSize={6} /></td></tr>}
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
    <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2F6FC] px-3 py-1 text-bss-text-secondary">Total check-ins <strong className="text-[#01183A] tabular-nums">{total}</strong></span>
      {total > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF5EE] px-3 py-1 text-bss-text-secondary">Busiest hour <strong className="text-[#14843C]">{peak.label}</strong> ({peak.value})</span>}
      <span className="text-bss-text-muted text-[11px]">Tap a bar for who checked in</span>
    </div>
    <div className="relative h-40">
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" aria-hidden>
        {[0, 1, 2, 3].map(i => <span key={i} className="block border-t border-dashed border-[#DBE3EF]" />)}
      </div>
      <div className="relative flex items-end gap-0.5 h-full">
        {data.map((d, i) => {
          const active = sel === d.label;
          return <button key={i} type="button" onClick={() => setSel(active ? null : d.label)} title={`${d.label} · ${d.value} check-in(s)`} className="group flex-1 flex flex-col items-center justify-end h-full">
            {d.value > 0 && <span className={`hidden sm:block text-[9px] font-bold leading-none mb-0.5 ${active ? 'text-[#E45D24]' : 'text-[#01183A]'}`}>{d.value}</span>}
            <span className="w-full rounded-t-[3px] transition-all group-hover:opacity-80" style={{ height: `${Math.max(3, (d.value / max) * 88)}%`, background: d.value === 0 ? BSS.mist : active ? BSS.orange : d.value === max ? BSS.green : BSS.blue }} />
          </button>;
        })}
      </div>
    </div>
    <div className="flex gap-0.5 mt-1 border-t border-[#DBE3EF] pt-1">
      {data.map((d, i) => <span key={i} className="flex-1 text-center text-[8px] text-bss-text-muted">{i % 3 === 0 ? d.label.slice(0, 2) : ''}</span>)}
    </div>
    {selected && <div className="mt-3 rounded-2xl border border-[#F5C6B2] bg-[#FDF0EA] p-3 text-xs">
      <p className="font-bold text-[#01183A]">{selected.label} — {selected.value} check-in{selected.value === 1 ? '' : 's'}</p>
      {selected.workers?.filter(Boolean).length
        ? <div className="mt-2 flex flex-wrap gap-1">{selected.workers.filter(Boolean).map((n, i) => <span key={i} className="rounded-full bg-white border border-[#DBE3EF] px-2 py-0.5 text-[11px] text-bss-text-secondary">{n}</span>)}</div>
        : <p className="text-bss-text-muted mt-1">No check-ins in this hour.</p>}
    </div>}
  </div>;
}

export function WorkerDetailDialog({ row, onClose }: { row: WorkerRow; onClose: () => void }) {
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
  return <div className="fixed inset-0 z-[130] grid items-end sm:place-items-center bg-[#01183A]/50 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
    <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
      <header className="relative overflow-hidden text-white px-5 pt-5 pb-4 flex items-start justify-between gap-3" style={{ background: 'linear-gradient(135deg, #01183A 0%, #022B5E 70%, #1E3A8A 130%)' }}>
        <div className="relative z-10 flex items-center gap-3 min-w-0">
          <span className="w-11 h-11 rounded-full bg-white text-[#01183A] grid place-items-center text-sm font-extrabold shrink-0">{initialsOf(row.worker)}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">Worker</p>
            <h3 className="text-lg font-extrabold truncate">{row.worker}</h3>
            <p className="text-[11px] text-white/70 mt-0.5 truncate"><span className="font-mono">{row.bssId}</span>{row.site ? ` · ${row.site}` : ''}{row.contractor ? ` · ${row.contractor}` : ''}</p>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-2 flex-shrink-0">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full bg-white/10 hover:bg-white/20"><X size={18}/></button>
        </div>
        <span className="absolute inset-x-0 bottom-0 flex h-1" aria-hidden><span className="flex-1 bg-[#E45D24]"/><span className="flex-1 bg-white/80"/><span className="flex-1 bg-[#14843C]"/></span>
      </header>
      <div className="p-5 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <DialogTile label="Today in – out" value={`${t(row.checkIn)} – ${t(row.checkOut)}`} accent={BSS.green} />
          <DialogTile label="Punches today" value={String(row.punches ?? 0)} accent={BSS.blue} />
          <DialogTile label="Last source" value={`${row.lastSource || '—'}${row.lastType ? ` ${row.lastType}` : ''}`} accent={BSS.orange} />
          <DialogTile label="Last punch" value={t(row.lastAt)} accent={BSS.navy} />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-bss-text-muted mb-2">Attendance history this month</p>
          {busy ? <p className="text-xs text-bss-text-muted flex items-center gap-2"><Loader2 size={13} className="animate-spin" />Loading…</p>
            : rows.length ? <ul className="divide-y divide-[#DBE3EF] rounded-2xl border border-[#DBE3EF] overflow-hidden">{rows.map((r, i) => {
                const s = r.statusCode || r.status || '';
                return <li key={i}><button type="button" onClick={() => setSel(toAttendanceRecord(r))} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs hover:bg-[#F2F6FC]">
                  <span className="font-semibold text-[#01183A] w-24 text-left">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                  <span className="text-bss-text-secondary flex-1 text-left tabular-nums">{r.checkIn || '—'} – {r.checkOut || '—'}</span>
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

function DialogTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div className="relative p-3 pl-4 rounded-2xl bg-[#F2F6FC] border border-[#DBE3EF] overflow-hidden">
    <span className="absolute left-0 inset-y-0 w-1" style={{ background: accent }} />
    <span className="text-[10px] uppercase font-bold text-bss-text-muted block">{label}</span>
    <span className="text-sm font-bold text-[#01183A]">{value}</span>
  </div>;
}

type CRow = { contractor: string; workers: number; sites: number };
type CKey = 'contractor' | 'workers' | 'sites';
function ContractorScorecard({ rows }: { rows: CRow[] }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => (q ? rows.filter(r => r.contractor.toLowerCase().includes(q.toLowerCase())) : rows), [rows, q]);
  const { sorted, sort, toggle } = useSort<CRow, CKey>(filtered, { contractor: r => r.contractor, workers: r => r.workers, sites: r => r.sites });
  const maxW = Math.max(1, ...rows.map(r => r.workers));
  const maxS = Math.max(1, ...rows.map(r => r.sites));
  return <div className="space-y-3">
    {rows.length > 0 && <SearchBox value={q} onChange={setQ} placeholder="Search contractor" className="max-w-sm" />}
    <div className="overflow-x-auto rounded-2xl border border-[#DBE3EF]"><table className="w-full text-sm">
      <thead className={TABLE_HEAD}><tr>
        <SortTh k="contractor" label="Contractor" sort={sort} onSort={toggle} className="pl-4" />
        <SortTh k="workers" label="Workers" sort={sort} onSort={toggle} align="right" />
        <SortTh k="sites" label="Sites" sort={sort} onSort={toggle} align="right" className="pr-4" />
      </tr></thead>
      <tbody className="divide-y divide-[#DBE3EF]">
        {sorted.map(c => <tr key={c.contractor} className={TABLE_ROW}>
          <td className="pl-4 pr-3 py-2.5"><span className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-full bg-[#01183A] text-white grid place-items-center text-[10px] font-bold shrink-0">{initialsOf(c.contractor)}</span><span className="font-semibold text-[#01183A]">{c.contractor}</span></span></td>
          <td className="px-3 py-2.5"><span className="flex items-center gap-2 justify-end"><span className="w-24 hidden sm:block"><InlineBar value={c.workers} max={maxW} color={BSS.blue} /></span><strong className="tabular-nums w-10 text-right text-[#01183A]">{c.workers}</strong></span></td>
          <td className="pl-3 pr-4 py-2.5"><span className="flex items-center gap-2 justify-end"><span className="w-16 hidden sm:block"><InlineBar value={c.sites} max={maxS} color={BSS.green} /></span><strong className="tabular-nums w-8 text-right text-[#01183A]">{c.sites}</strong></span></td>
        </tr>)}
        {rows.length > 0 && sorted.length === 0 && <tr><td colSpan={3}><EmptyFiltered label="No contractors match." onReset={() => setQ('')} /></td></tr>}
      </tbody>
    </table></div>
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
      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Today's snapshot" subtitle="Real-time attendance ratio" accent={BSS.green}>
          <Donut slices={[
            { label: 'On site', value: data.today?.onSite ?? 0, color: BSS.green },
            { label: 'Checked out', value: data.today?.checkedOut ?? 0, color: BSS.blue },
            { label: 'Not arrived', value: data.today?.notArrived ?? 0, color: BSS.orange },
          ]}/>
        </Card>
        <div className="lg:col-span-2 min-w-0">
          <Card title="Hourly arrivals (check-ins)" subtitle="Today — tap a bar to see who checked in" accent={BSS.orange}>
            <HourlyChart data={data.hourlyArrivals ?? []} />
          </Card>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="By site" subtitle="Search · sort · tap a site to see its workers"><LiveByTable firstLabel="Site" matchKey="site" allWorkers={data.workers ?? []} rows={bySite.map(s => ({ label: s.site, workers: s.workers, onSite: s.onSite, present: s.present }))} onWorker={setDrill}/></Card>
        <Card title="By contractor" subtitle="Search · sort · tap a contractor to see its workers" accent={BSS.green}><LiveByTable firstLabel="Contractor" matchKey="contractor" allWorkers={data.workers ?? []} rows={byContractor.map(c => ({ label: c.contractor, workers: c.workers, onSite: c.onSite, present: c.present }))} onWorker={setDrill}/></Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 min-w-0">
          <Card title={`All workers (${(data.workers ?? []).length})`} subtitle="Search, filter by status, sort columns, page through — tap a worker for full details" accent={BSS.navy}>
            <WorkersTable workers={data.workers ?? []} onWorker={setDrill} pageSize={12} />
          </Card>
        </div>
        <div className="min-w-0">
          <Card title="Live event feed" subtitle="Latest punches — any source · tap to open" accent={BSS.orange}>
            {data.recentEvents && data.recentEvents.length
              ? <ol className="space-y-1 max-h-[520px] overflow-y-auto pr-1">{data.recentEvents.map((e, i) => <li key={i} className="relative pl-6">
                  <span className="absolute left-[5px] top-0 bottom-0 border-l-2 border-dashed border-[#DBE3EF]" aria-hidden />
                  <span className="absolute left-0 top-3.5 w-3 h-3 rounded-full ring-2 ring-white" style={{ background: e.type === 'IN' ? BSS.green : BSS.blue }} />
                  <button type="button" onClick={() => setDrill({ worker: e.worker, bssId: e.bssId, site: e.site, contractor: '', status: e.type === 'IN' ? 'on_site' : 'checked_out', lastSource: e.source, lastType: e.type, lastAt: e.at })} className="w-full py-2 px-2 flex items-start justify-between gap-2 text-xs text-left hover:bg-[#F2F6FC] rounded-xl transition-colors">
                    <span className="min-w-0">
                      <strong className="block text-[#01183A] truncate">{e.worker}</strong>
                      <span className="block text-[10px] text-bss-text-muted truncate"><span className="font-mono">{e.bssId}</span> · {e.site}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1 flex-shrink-0"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.type === 'IN' ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-blue-tint text-bss-interactive-blue'}`}>{e.source} {e.type}</span><span className="text-[10px] text-bss-text-muted tabular-nums">{e.at ? new Date(e.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span></span>
                  </button>
                </li>)}</ol>
              : <p className="text-xs text-bss-text-muted py-6 text-center">No punches recorded yet today.</p>}
          </Card>
        </div>
      </div>
      {drill && <WorkerDetailDialog row={drill} onClose={() => setDrill(null)} />}
    </div>;
  }

  if (tab === 'overview') {
    const k = data.kpis;
    return <div className="space-y-5">
      {k && <StatGrid items={[
        { label: 'Workers', value: k.workers }, { label: 'Active sites', value: k.activeSites },
        { label: 'Contractors', value: k.contractors }, { label: 'Attendance rate', value: `${k.attendanceRate}%`, tone: 'text-bss-green' },
        { label: 'Present today', value: k.presentToday }, { label: 'Absent today', value: k.absentToday, tone: 'text-bss-error' },
        { label: 'Payroll processed', value: inr(k.payrollProcessed) }, { label: 'Payroll exceptions', value: k.payrollExceptions, tone: 'text-bss-error' },
        { label: 'Active gate passes', value: k.activeGatePasses }, { label: 'Open grievances', value: k.openGrievances, tone: 'text-bss-orange' },
        { label: 'Documents expiring', value: k.documentsExpiring, tone: 'text-bss-orange' }, { label: 'Records (period)', value: k.period.total },
      ]}/>}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 min-w-0"><Card title="Attendance — present trend" accent={BSS.green}><BarChart data={(data.trend ?? []).map(t => ({ label: t.label, value: t.value }))} color={BSS.green}/></Card></div>
        <Card title="Alerts" accent={BSS.orange}>
          {data.alerts && data.alerts.length
            ? <ul className="space-y-2">{data.alerts.map((a, i) => <li key={i}><a href={a.href} className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-xs text-bss-text-secondary hover:shadow-sm transition-all ${a.tone === 'red' ? 'border-[#F5C2C2] bg-[#FDECEC]/60' : 'border-[#F5C6B2] bg-[#FDF0EA]/60'}`}><span className={`w-6 h-6 rounded-full grid place-items-center shrink-0 text-white ${a.tone === 'red' ? 'bg-[#DC2626]' : 'bg-[#E45D24]'}`}><AlertTriangle size={12}/></span><span className="pt-0.5">{a.label}</span></a></li>)}</ul>
            : <p className="text-xs text-bss-green flex items-center gap-1.5"><Activity size={14}/>All clear.</p>}
        </Card>
      </div>
    </div>;
  }

  if (tab === 'attendance') {
    return <div className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 min-w-0"><Card title="Attendance trend (present)" accent={BSS.green}><BarChart data={(data.trend ?? []).map(t => ({ label: t.label, value: t.present ?? t.value }))} color={BSS.green}/></Card></div>
        <Card title="Source mix" accent={BSS.orange}>{data.sourceMix?.length ? <Donut slices={data.sourceMix.map((s, i) => ({ label: s.source, value: s.value, color: PALETTE[i % PALETTE.length] }))}/> : <p className="text-xs text-bss-text-muted">No records.</p>}</Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Attendance rate by site"><HBar data={(data.bySite ?? []).map(s => ({ label: String(s.site), value: Number(s.rate ?? 0) }))} color={BSS.blue}/></Card>
        <Card title="Summary" accent={BSS.navy}>
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
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5">
        <Card title="Headcount by site"><HBar data={(data.bySite ?? []).map(s => ({ label: String(s.site), value: Number(s.value ?? 0) }))} color={BSS.deep}/></Card>
        <Card title="Headcount by contractor" accent={BSS.green}><HBar data={(data.byContractor ?? []).map(c => ({ label: String(c.contractor), value: Number(c.value ?? 0) }))} color={BSS.green}/></Card>
        <Card title="Gender split" accent={BSS.orange}><Donut slices={(data.gender ?? []).map((g, i) => ({ label: g.label, value: g.value, color: PALETTE[i % PALETTE.length] }))}/></Card>
        <Card title="Age bands"><BarChart data={data.ageBands ?? []} color={BSS.blue}/></Card>
        <Card title="Blood group" accent={BSS.orange}><HBar data={data.bloodGroup ?? []} color={BSS.orange}/></Card>
        <Card title="Documents" accent={BSS.green}><Donut slices={[
          { label: 'Valid', value: data.documents?.valid ?? 0, color: BSS.green },
          { label: 'Expiring', value: data.documents?.expiring ?? 0, color: BSS.orange },
          { label: 'Missing', value: data.documents?.missing ?? 0, color: BSS.red },
        ]}/></Card>
      </div>
      <WorkforceExplorer endpoint="/api/employer/workforce" showState={false} title="Workforce explorer" />
    </div>;
  }

  if (tab === 'compliance') {
    return <div className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Compliance score by site" subtitle="Lowest first" accent={BSS.green}><HBar data={(data.bySite ?? []).map(s => ({ label: String(s.site), value: Number(s.score ?? 0) }))} color={BSS.green}/></Card>
        <Card title="Report status" accent={BSS.orange}>{data.statusMix?.length ? <Donut slices={data.statusMix.map((s, i) => ({ label: s.label, value: s.value, color: [BSS.green, BSS.amber, BSS.red][i % 3] }))}/> : <p className="text-xs text-bss-text-muted">No reports.</p>}</Card>
        <Card title="Summary" accent={BSS.navy}><Stat label="Compliance reports" value={data.reports ?? 0}/></Card>
      </div>
    </div>;
  }

  if (tab === 'contractors') {
    return <Card title="Contractor scorecard" subtitle="Workers and sites per connected contractor · search and sort" accent={BSS.navy}>
      <ContractorScorecard rows={data.contractors ?? []} />
    </Card>;
  }

  if (tab === 'access') {
    return <div className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Gate passes by status" accent={BSS.orange}>{data.passStatusMix?.length ? <Donut slices={data.passStatusMix.map((s, i) => ({ label: s.label, value: s.value, color: [BSS.green, BSS.amber, BSS.red, BSS.slate][i % 4] }))}/> : <p className="text-xs text-bss-text-muted">No passes.</p>}</Card>
        <Card title="Gate scans (period)" accent={BSS.green}><Donut slices={[
          { label: 'Allow', value: data.scans?.allow ?? 0, color: BSS.green },
          { label: 'Deny', value: data.scans?.deny ?? 0, color: BSS.red },
        ]}/></Card>
        <Card title="Summary" accent={BSS.navy}><StatGrid items={[{ label: 'Passes', value: data.passes ?? 0 }, { label: 'Scans', value: data.scans?.total ?? 0 }]}/></Card>
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
        <Card title="By status" accent={BSS.orange}>{data.byStatus?.length ? <Donut slices={data.byStatus.map((s, i) => ({ label: s.label, value: s.value, color: [BSS.green, BSS.amber, BSS.red, BSS.blue][i % 4] }))}/> : <p className="text-xs text-bss-text-muted">No grievances.</p>}</Card>
        <Card title="By category"><HBar data={data.byCategory ?? []} color={BSS.orange}/></Card>
      </div>
    </div>;
  }

  return null;
}

/** Categorical order from the deck: navy-blue, saffron, green, sky, deep navy. */
const PALETTE = [BSS.blue, BSS.orange, BSS.green, BSS.sky, BSS.deep, BSS.slate];
