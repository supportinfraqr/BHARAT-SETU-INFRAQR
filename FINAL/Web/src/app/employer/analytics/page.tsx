"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import { BarChart, HBar, Donut } from '@/components/charts';

type Series = { label: string; value: number };
type Kpis = {
  workers: number; activeSites: number; contractors: number; attendanceRate: number;
  presentToday: number; absentToday: number; payrollProcessed: number; payrollExceptions: number;
  activeGatePasses: number; openGrievances: number; documentsExpiring: number;
  period: { total: number; present: number; absent: number; leave: number };
};
type LiveData = {
  generatedAt: string; onSiteNow: number; boundWorkers: number;
  today: { present: number; onSite: number; checkedOut: number; notArrived: number };
  bySite: Array<{ site: string; workers: number; onSite: number; present: number }>;
  byContractor: Array<{ contractor: string; workers: number; onSite: number; present: number }>;
  hourlyArrivals: Series[];
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
  ['compliance', 'Compliance'], ['payroll', 'Payroll'], ['contractors', 'Contractors'],
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
          <p className="text-sm text-white/70 mt-1 max-w-2xl">Live status and trends across your sites — workforce, attendance, compliance, payroll, access and grievances.</p>
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

function TabBody({ tab, data, inr }: { tab: string; data: AnalyticsData; inr: (n?: number) => string }) {
  if (tab === 'live') {
    const bySite = (data.bySite ?? []) as Array<{ site: string; workers: number; onSite: number; present: number }>;
    const byContractor = (data.byContractor ?? []) as Array<{ contractor: string; workers: number; onSite: number; present: number }>;
    return <div className="space-y-5">
      <StatGrid items={[
        { label: 'On site now', value: data.onSiteNow ?? 0, tone: 'text-bss-green' },
        { label: 'Bound workers', value: data.boundWorkers ?? 0 },
        { label: 'Present today', value: data.today?.present ?? 0 },
        { label: 'Not arrived', value: data.today?.notArrived ?? 0, tone: 'text-bss-orange' },
      ]}/>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="On site now — by site"><HBar data={bySite.map(s => ({ label: s.site, value: s.onSite }))} color="#14843C"/></Card>
        <Card title="On site now — by contractor"><HBar data={byContractor.map(c => ({ label: c.contractor, value: c.onSite }))} color="#1E3A8A"/></Card>
        <Card title="Today's snapshot"><Donut slices={[
          { label: 'On site', value: data.today?.onSite ?? 0, color: '#14843C' },
          { label: 'Checked out', value: data.today?.checkedOut ?? 0, color: '#1E3A8A' },
          { label: 'Not arrived', value: data.today?.notArrived ?? 0, color: '#F59E0B' },
        ]}/></Card>
      </div>
      <Card title="Hourly arrivals (check-ins)" subtitle="Today"><BarChart data={data.hourlyArrivals ?? []} color="#1E3A8A"/></Card>
      <Card title="Live event feed" subtitle="Latest punches — any source">
        {data.recentEvents && data.recentEvents.length
          ? <ul className="divide-y divide-bss-border">{data.recentEvents.map((e, i) => <li key={i} className="py-2 flex items-center justify-between text-xs"><span className="text-bss-text-secondary"><strong>{e.worker}</strong> · <span className="font-mono text-[11px] text-bss-text-muted">{e.bssId}</span> · {e.site}</span><span className="flex items-center gap-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.type === 'IN' ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-blue-tint text-bss-interactive-blue'}`}>{e.source} {e.type}</span><span className="text-bss-text-muted">{e.at ? new Date(e.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span></span></li>)}</ul>
          : <p className="text-xs text-bss-text-muted">No punches yet today.</p>}
      </Card>
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

  if (tab === 'payroll') {
    return <div className="space-y-5">
      <StatGrid items={[
        { label: 'Processed', value: data.processed ?? 0, tone: 'text-bss-green' },
        { label: 'Pending', value: data.pending ?? 0, tone: 'text-bss-orange' },
        { label: 'Exceptions', value: data.exceptions ?? 0, tone: 'text-bss-error' },
        { label: 'Avg net pay', value: inr(data.wageDistribution?.avg) },
      ]}/>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Net pay by period">{data.byPeriod?.length ? <BarChart data={data.byPeriod} color="#1E3A8A"/> : <p className="text-xs text-bss-text-muted">No payroll records.</p>}</Card>
        <Card title="Net pay by contractor"><HBar data={(data.byContractor ?? []).map(c => ({ label: String(c.contractor), value: Number(c.value ?? 0) }))} color="#E45D24"/></Card>
        <Card title="Wage distribution">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Min" value={inr(data.wageDistribution?.min)}/>
            <Stat label="Avg" value={inr(data.wageDistribution?.avg)}/>
            <Stat label="Max" value={inr(data.wageDistribution?.max)}/>
          </div>
        </Card>
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
