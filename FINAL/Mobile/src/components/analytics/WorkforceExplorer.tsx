"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileDown, Loader2, Printer, RefreshCw, Search } from 'lucide-react';
import { BarChart, Donut, HBar } from '@/components/government/Charts';
import { exportRowsToXlsx } from '@/lib/exportXlsx';

type Row = {
  id: string | number; bssId: string; name: string; state: string; district: string; city: string;
  age: number | null; gender: string; category: string; occupation: string; site: string; siteType: string;
  employer: string; contractor: string; migrant: boolean; stateOfOrigin: string;
  attendance: string; epfoLinked: boolean; esicLinked: boolean; wage: number;
};
type Facet = { value: string; label: string; count: number };
type Summary = {
  byState: Array<{ label: string; value: number }>;
  byGender: Array<{ label: string; value: number }>;
  byCategory: Array<{ label: string; value: number }>;
  byOccupation: Array<{ label: string; value: number }>;
  byEmployer: Array<{ label: string; value: number }>;
  byContractor: Array<{ label: string; value: number }>;
  attendance: Array<{ label: string; value: number }>;
  grievances: Array<{ label: string; value: number }>;
  gatePasses: Array<{ label: string; value: number }>;
  workerTotal: number; grievanceTotal: number; gatePassTotal: number;
};
type Payload = {
  total: number; page: number; pageSize: number;
  facets: { states: Facet[]; genders: Facet[]; categories: Facet[]; occupations: Facet[]; employers: Facet[]; contractors: Facet[] };
  summary: Summary;
  workers: Row[];
};

const money = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);
const emptyFilters = { state: '', gender: '', category: '', occupation: '', employer: '', contractor: '', q: '' };

export default function WorkforceExplorer({ endpoint, showState = true, title = 'Workforce explorer' }: { endpoint: string; showState?: boolean; title?: string }) {
  const [filters, setFilters] = useState({ ...emptyFilters });
  const [applied, setApplied] = useState({ ...emptyFilters });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const query = useMemo(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(applied)) if (v) p.set(k, v);
    p.set('page', String(page));
    p.set('pageSize', String(pageSize));
    return p.toString();
  }, [applied, page, pageSize]);

  const load = useCallback(() => {
    let active = true;
    setLoading(true); setError('');
    fetch(`${endpoint}?${query}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Could not load workforce data.'))))
      .then((b: { data?: Payload } | Payload) => { if (active) setData((b as { data?: Payload }).data ?? (b as Payload)); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Load failed.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint, query]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on applied filters / page change
  useEffect(() => load(), [load]);

  const apply = () => { setPage(1); setApplied({ ...filters }); };
  const reset = () => { setFilters({ ...emptyFilters }); setApplied({ ...emptyFilters }); setPage(1); };

  const f = data?.facets;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const exportCsv = () => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(applied)) if (v) p.set(k, v);
    p.set('format', 'csv');
    window.open(`${endpoint}?${p.toString()}`, '_blank');
  };

  const exportXlsx = () => {
    if (!data) return;
    exportRowsToXlsx({
      filename: 'workforce', sheetName: 'Workforce',
      rows: data.workers,
      columns: [
        { header: 'Name', value: r => r.name }, { header: 'BSS ID', value: r => r.bssId },
        { header: 'State', value: r => r.state }, { header: 'District', value: r => r.district },
        { header: 'Site', value: r => r.site }, { header: 'Employer', value: r => r.employer },
        { header: 'Contractor', value: r => r.contractor }, { header: 'Gender', value: r => r.gender },
        { header: 'Category', value: r => r.category }, { header: 'Occupation', value: r => r.occupation },
        { header: 'Attendance', value: r => r.attendance }, { header: 'Migrant', value: r => (r.migrant ? 'Yes' : 'No') },
        { header: 'State of origin', value: r => r.stateOfOrigin }, { header: 'EPFO', value: r => (r.epfoLinked ? 'Yes' : 'No') },
        { header: 'ESIC', value: r => (r.esicLinked ? 'Yes' : 'No') }, { header: 'Wage', value: r => r.wage },
      ],
    });
  };

  const sel = (k: keyof typeof emptyFilters, label: string, opts: Facet[] | undefined) => (
    <label className="text-[11px] font-semibold text-bss-text-secondary">{label}
      <select value={filters[k]} onChange={e => setFilters(s => ({ ...s, [k]: e.target.value }))}
        className="mt-1 block h-9 w-full min-w-[130px] border border-bss-border rounded-lg px-2 text-sm bg-white text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30">
        <option value="">All</option>
        {(opts ?? []).map(o => <option key={o.value} value={o.value}>{o.label}{o.count != null ? ` (${o.count})` : ''}</option>)}
      </select>
    </label>
  );

  return <div className="space-y-4">
    {/* Filter bar (server-side: fetch only on Apply) */}
    <div className="bss-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-bss-text-primary">{title}</h2>
        {data && <span className="text-[11px] text-bss-text-muted">{data.total.toLocaleString('en-IN')} workers match</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        {showState && sel('state', 'State', f?.states)}
        {sel('gender', 'Gender', f?.genders)}
        {sel('category', 'Category', f?.categories)}
        {sel('occupation', 'Occupation', f?.occupations)}
        {sel('employer', 'Employer', f?.employers)}
        {sel('contractor', 'Contractor', f?.contractors)}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="relative flex-1 min-w-[200px] text-[11px] font-semibold text-bss-text-secondary">Search
          <span className="block relative mt-1"><Search size={14} className="absolute left-2.5 top-2.5 text-bss-text-muted" />
          <input value={filters.q} onChange={e => setFilters(s => ({ ...s, q: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') apply(); }} placeholder="Name or BSS ID" className="w-full h-9 rounded-lg border border-bss-border pl-8 pr-3 text-sm bg-white" /></span>
        </label>
        <button type="button" onClick={apply} className="h-9 px-4 rounded-lg bg-bss-navy text-white text-xs font-bold hover:bg-bss-deep-navy transition-colors">Apply filters</button>
        <button type="button" onClick={reset} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold text-bss-text-secondary hover:bg-bss-bg">Reset</button>
        <button type="button" onClick={() => load()} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-bss-bg"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </div>
    </div>

    {error && <p className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-xl px-4 py-3">{error}</p>}

    {/* Plots (from server aggregates) */}
    {data && <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
      <div className="bss-card p-4"><h3 className="text-xs font-semibold text-bss-text-secondary mb-3">By state</h3><HBar data={data.summary.byState} color="#1E3A8A" /></div>
      <div className="bss-card p-4"><h3 className="text-xs font-semibold text-bss-text-secondary mb-3">By employer</h3><HBar data={data.summary.byEmployer} color="#14843C" /></div>
      <div className="bss-card p-4"><h3 className="text-xs font-semibold text-bss-text-secondary mb-3">By contractor</h3><HBar data={data.summary.byContractor} color="#E45D24" /></div>
      <div className="bss-card p-4"><h3 className="text-xs font-semibold text-bss-text-secondary mb-3">By gender</h3><Donut slices={data.summary.byGender.map((s, i) => ({ ...s, color: ['#1E3A8A', '#14843C', '#E45D24', '#7C3AED'][i % 4] }))} /></div>
      <div className="bss-card p-4"><h3 className="text-xs font-semibold text-bss-text-secondary mb-3">Attendance status</h3><Donut slices={data.summary.attendance.map((s, i) => ({ ...s, color: ['#14843C', '#E45D24', '#DC2626', '#1E3A8A'][i % 4] }))} /></div>
      <div className="bss-card p-4"><h3 className="text-xs font-semibold text-bss-text-secondary mb-3">Grievances by status</h3><BarChart data={data.summary.grievances} color="#E45D24" /></div>
    </div>}

    {/* Table + exports */}
    <div className="bss-card overflow-hidden">
      <div className="p-3 border-b border-bss-border flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-bss-text-muted">{loading ? 'Loading…' : data ? `Showing ${data.workers.length} of ${data.total.toLocaleString('en-IN')} — page ${data.page} / ${totalPages}` : ''}</span>
        <div className="flex items-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin text-bss-text-muted" />}
          <button type="button" onClick={exportXlsx} className="h-8 px-3 rounded-lg border border-bss-border text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-bss-bg"><FileDown size={13} />Export page (XLSX)</button>
          <button type="button" onClick={exportCsv} className="h-8 px-3 rounded-lg border border-bss-border text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-bss-bg"><Download size={13} />Export all (CSV)</button>
          <button type="button" onClick={() => window.print()} className="h-8 px-3 rounded-lg border border-bss-border text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-bss-bg"><Printer size={13} />Print / PDF</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-xs">
          <thead className="bg-bss-bg text-[10px] uppercase tracking-wide text-bss-text-muted">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Worker</th>
              <th className="text-left px-2 py-2 font-semibold">State / Site</th>
              <th className="text-left px-2 py-2 font-semibold">Employer</th>
              <th className="text-left px-2 py-2 font-semibold">Contractor</th>
              <th className="px-2 py-2 font-semibold text-center">Gender</th>
              <th className="text-left px-2 py-2 font-semibold">Category</th>
              <th className="text-left px-2 py-2 font-semibold">Occupation</th>
              <th className="px-2 py-2 font-semibold text-center">Attendance</th>
              <th className="px-2 py-2 font-semibold text-right">Wage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bss-border">
            {data?.workers.map(r => (
              <tr key={String(r.id)} className="hover:bg-bss-bg/60">
                <td className="px-3 py-2"><span className="block font-semibold text-bss-text-primary truncate max-w-[150px]">{r.name}</span><span className="block text-[10px] font-mono text-bss-text-muted">{r.bssId}</span></td>
                <td className="px-2 py-2 text-bss-text-secondary"><span className="block">{r.state || '—'}</span><span className="block text-[10px] text-bss-text-muted truncate max-w-[120px]">{r.site}</span></td>
                <td className="px-2 py-2 text-bss-text-secondary truncate max-w-[150px]">{r.employer || '—'}</td>
                <td className="px-2 py-2 text-bss-text-secondary truncate max-w-[150px]">{r.contractor || '—'}</td>
                <td className="px-2 py-2 text-center text-bss-text-secondary">{r.gender || '—'}</td>
                <td className="px-2 py-2 text-bss-text-secondary truncate max-w-[110px]">{r.category || '—'}</td>
                <td className="px-2 py-2 text-bss-text-secondary truncate max-w-[120px]">{r.occupation || '—'}</td>
                <td className="px-2 py-2 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.attendance === 'PRESENT' ? 'bg-bss-soft-green text-bss-green' : r.attendance === 'ABSENT' ? 'bg-bss-soft-orange text-bss-error' : 'bg-bss-soft-orange text-bss-orange'}`}>{r.attendance}</span></td>
                <td className="px-2 py-2 text-right text-bss-text-secondary whitespace-nowrap">{r.wage ? money(r.wage) : '—'}</td>
              </tr>
            ))}
            {data && data.workers.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-bss-text-muted">No workers match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-bss-border flex items-center justify-between gap-2 text-xs text-bss-text-muted">
        <label className="flex items-center gap-2">Rows per page
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-8 border border-bss-border rounded-lg px-2 bg-white">
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-8 px-2 rounded-lg border border-bss-border disabled:opacity-40 hover:bg-bss-bg inline-flex items-center gap-1"><ChevronLeft size={13} />Prev</button>
          <span>Page {data?.page ?? 1} / {totalPages}</span>
          <button type="button" disabled={(data?.page ?? 1) >= totalPages} onClick={() => setPage(p => p + 1)} className="h-8 px-2 rounded-lg border border-bss-border disabled:opacity-40 hover:bg-bss-bg inline-flex items-center gap-1">Next<ChevronRight size={13} /></button>
        </div>
      </div>
    </div>
  </div>;
}
