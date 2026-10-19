"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileDown, Loader2, Printer, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { BarChart, Donut, HBar, BSS } from '@/components/charts';
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
  bySite: Array<{ label: string; value: number }>;
  byGender: Array<{ label: string; value: number }>;
  byCategory: Array<{ label: string; value: number }>;
  byOccupation: Array<{ label: string; value: number }>;
  byEmployer: Array<{ label: string; value: number }>;
  byContractor: Array<{ label: string; value: number }>;
  attendance: Array<{ label: string; value: number }>;
  grievances: Array<{ label: string; value: number }>;
  gatePasses: Array<{ label: string; value: number }>;
  scans: Array<{ label: string; value: number }>;
  activities: { worker: Array<{ label: string; value: number }>; contractor: Array<{ label: string; value: number }> };
  workerTotal: number; grievanceTotal: number; gatePassTotal: number; scanTotal: number;
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
    p.set('export', 'csv');
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
    <label className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">{label}
      <select value={filters[k]} onChange={e => setFilters(s => ({ ...s, [k]: e.target.value }))}
        className={`mt-1 block h-9 w-full min-w-[130px] border rounded-xl px-2.5 text-xs font-semibold bg-white text-[#01183A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15 ${filters[k] ? 'border-[#1E3A8A]' : 'border-[#DBE3EF]'}`}>
        <option value="">All</option>
        {(opts ?? []).map(o => <option key={o.value} value={o.value}>{o.label}{o.count != null ? ` (${o.count})` : ''}</option>)}
      </select>
    </label>
  );

  const FILTER_LABEL: Record<keyof typeof emptyFilters, string> = { state: 'State', gender: 'Gender', category: 'Category', occupation: 'Occupation', employer: 'Employer', contractor: 'Contractor', q: 'Search' };
  const FACET_KEY: Partial<Record<keyof typeof emptyFilters, keyof Payload['facets']>> = { state: 'states', gender: 'genders', category: 'categories', occupation: 'occupations', employer: 'employers', contractor: 'contractors' };
  const appliedList = (Object.entries(applied) as Array<[keyof typeof emptyFilters, string]>).filter(([, v]) => v);
  const labelFor = (k: keyof typeof emptyFilters, v: string) => {
    const fk = FACET_KEY[k];
    return (fk && f?.[fk]?.find(o => o.value === v)?.label) || v;
  };
  const dropApplied = (k: keyof typeof emptyFilters) => {
    setFilters(s => ({ ...s, [k]: '' }));
    setApplied(s => ({ ...s, [k]: '' }));
    setPage(1);
  };
  const dirty = JSON.stringify(filters) !== JSON.stringify(applied);

  const chart = (title: string, body: React.ReactNode, accent: string = BSS.blue) => (
    <div className="min-w-0 rounded-3xl bg-white border border-[#DBE3EF] p-4 hover:shadow-md transition-shadow">
      <h3 className="text-xs font-extrabold text-[#01183A] mb-3 flex items-center gap-2"><span className="w-1 h-4 rounded-full" style={{ background: accent }} />{title}</h3>
      {body}
    </div>
  );

  return <div className="space-y-4">
    {/* Filter bar (server-side: fetch only on Apply) */}
    <div className="rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden">
      <div className="px-4 py-3 bg-[#01183A] text-white flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-[#E45D24] grid place-items-center"><SlidersHorizontal size={13} /></span>{title}</h2>
        {data && <span className="text-[11px] font-semibold bg-white/10 border border-white/15 rounded-full px-2.5 py-1">{data.total.toLocaleString('en-IN')} workers match</span>}
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {showState && sel('state', 'State', f?.states)}
          {sel('gender', 'Gender', f?.genders)}
          {sel('category', 'Category', f?.categories)}
          {sel('occupation', 'Occupation', f?.occupations)}
          {sel('employer', 'Employer', f?.employers)}
          {sel('contractor', 'Contractor', f?.contractors)}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="relative flex-1 min-w-[200px] text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Search
            <span className="block relative mt-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bss-text-muted" />
            <input value={filters.q} onChange={e => setFilters(s => ({ ...s, q: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') apply(); }} placeholder="Name or BSS ID" className="w-full h-9 rounded-full border border-[#DBE3EF] pl-8 pr-3 text-xs font-normal normal-case tracking-normal text-[#01183A] bg-white focus:outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15" /></span>
          </label>
          <button type="button" onClick={apply} className={`h-9 px-5 rounded-full text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${dirty ? 'bg-[#E45D24] hover:bg-[#C94D18] shadow-[0_6px_14px_-6px_#E45D24]' : 'bg-[#01183A] hover:bg-[#022B5E]'}`}>Apply filters{dirty && <span className="w-1.5 h-1.5 rounded-full bg-white" />}</button>
          <button type="button" onClick={reset} className="h-9 px-4 rounded-full border border-[#DBE3EF] text-xs font-semibold text-bss-text-secondary hover:bg-[#F2F6FC]">Reset</button>
          <button type="button" onClick={() => load()} className="h-9 px-4 rounded-full border border-[#DBE3EF] text-xs font-semibold text-[#01183A] inline-flex items-center gap-1.5 hover:bg-[#F2F6FC]"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} />Refresh</button>
        </div>
        {appliedList.length > 0 && <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="font-semibold text-bss-text-muted">Applied:</span>
          {appliedList.map(([k, v]) => <button key={k} type="button" onClick={() => dropApplied(k)} className="h-7 pl-2.5 pr-1.5 rounded-full bg-[#EEF2FB] text-[#1E3A8A] font-semibold inline-flex items-center gap-1 hover:bg-[#DBE3EF]" title="Remove filter">
            <span className="text-bss-text-muted font-normal">{FILTER_LABEL[k]}:</span>{labelFor(k, v)}<X size={12} />
          </button>)}
        </div>}
      </div>
    </div>

    {error && <p className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-xl px-4 py-3">{error}</p>}

    {/* Plots (from server aggregates) */}
    {data && <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {chart('By state', <HBar data={data.summary.byState} color={BSS.deep} />)}
      {chart('By site', <HBar data={data.summary.bySite} color={BSS.blue} />)}
      {chart('By employer', <HBar data={data.summary.byEmployer} color={BSS.green} />, BSS.green)}
      {chart('By contractor', <HBar data={data.summary.byContractor} color={BSS.orange} />, BSS.orange)}
      {chart('By gender', <Donut slices={data.summary.byGender.map((s, i) => ({ ...s, color: [BSS.blue, BSS.orange, BSS.green, BSS.sky][i % 4] }))} />, BSS.orange)}
      {chart('Attendance status', <Donut slices={data.summary.attendance.map((s, i) => ({ ...s, color: [BSS.green, BSS.orange, BSS.red, BSS.blue][i % 4] }))} />, BSS.green)}
      {chart('By category', <HBar data={data.summary.byCategory} color={BSS.sky} />)}
      {chart('By occupation', <HBar data={data.summary.byOccupation} color={BSS.blue} />)}
      {chart('Gate passes by status', <BarChart data={data.summary.gatePasses} color={BSS.green} />, BSS.green)}
      {chart('Gate scans (allow / deny)', data.summary.scans.length ? <Donut slices={data.summary.scans.map((s, i) => ({ ...s, color: [BSS.green, BSS.red, BSS.orange, BSS.blue][i % 4] }))} /> : <p className="text-xs text-bss-text-muted">No gate scans.</p>, BSS.red)}
      {chart('Worker activity', <HBar data={data.summary.activities.worker} color={BSS.blue} />)}
      {chart('Contractor activity', <HBar data={data.summary.activities.contractor} color={BSS.orange} />, BSS.orange)}
    </div>}

    {/* Table + exports */}
    <div className="rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden">
      <div className="p-3 sm:px-4 border-b border-[#DBE3EF] flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-bss-text-muted">{loading ? 'Loading…' : data ? <>Showing <strong className="text-[#01183A]">{data.workers.length}</strong> of <strong className="text-[#01183A]">{data.total.toLocaleString('en-IN')}</strong> — page {data.page} / {totalPages}</> : ''}</span>
        <div className="flex flex-wrap items-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin text-bss-text-muted" />}
          <button type="button" onClick={exportXlsx} className="h-8 px-3.5 rounded-full border border-[#DBE3EF] text-xs font-semibold text-[#01183A] inline-flex items-center gap-1.5 hover:border-[#14843C] hover:text-[#14843C]"><FileDown size={13} />Export page (XLSX)</button>
          <button type="button" onClick={exportCsv} className="h-8 px-3.5 rounded-full border border-[#DBE3EF] text-xs font-semibold text-[#01183A] inline-flex items-center gap-1.5 hover:border-[#1E3A8A] hover:text-[#1E3A8A]"><Download size={13} />Export all (CSV)</button>
          <button type="button" onClick={() => window.print()} className="h-8 px-3.5 rounded-full bg-[#01183A] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#022B5E]"><Printer size={13} />Print / PDF</button>
        </div>
      </div>
      {/* Phones: one card per worker */}
      <ul className={`md:hidden divide-y divide-[#DBE3EF] transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {data?.workers.map(r => <li key={String(r.id)} className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><span className="block text-sm font-semibold text-[#01183A] truncate">{r.name}</span><span className="block text-[10px] font-mono text-bss-text-muted">{r.bssId}</span></div>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${r.attendance === 'PRESENT' ? 'bg-bss-soft-green text-bss-green' : r.attendance === 'ABSENT' ? 'bg-bss-soft-orange text-bss-error' : 'bg-bss-soft-orange text-bss-orange'}`}>{r.attendance}</span>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div className="min-w-0"><dt className="text-bss-text-muted inline">Site </dt><dd className="inline text-bss-text-secondary">{r.site || '—'}</dd></div>
            <div className="min-w-0"><dt className="text-bss-text-muted inline">State </dt><dd className="inline text-bss-text-secondary">{r.state || '—'}</dd></div>
            <div className="min-w-0 col-span-2 truncate"><dt className="text-bss-text-muted inline">Contractor </dt><dd className="inline text-bss-text-secondary">{r.contractor || '—'}</dd></div>
            <div className="min-w-0 truncate"><dt className="text-bss-text-muted inline">Role </dt><dd className="inline text-bss-text-secondary">{[r.occupation, r.category].filter(Boolean).join(' · ') || '—'}</dd></div>
            <div className="text-right"><dd className="inline font-semibold text-[#01183A] tabular-nums">{r.wage ? money(r.wage) : '—'}</dd></div>
          </dl>
        </li>)}
        {data && data.workers.length === 0 && <li className="py-10 text-center text-xs text-bss-text-muted">No workers match these filters.</li>}
      </ul>
      <div className="hidden md:block overflow-x-auto max-h-[640px] overflow-y-auto">
        <table className="w-full min-w-[900px] text-xs">
          <thead className="bg-[#F2F6FC] text-[10px] uppercase tracking-wider text-bss-text-muted sticky top-0 z-10">
            <tr>
              <th className="text-left px-3 py-2.5 font-bold">Worker</th>
              <th className="text-left px-2 py-2.5 font-bold">State / Site</th>
              <th className="text-left px-2 py-2.5 font-bold">Employer</th>
              <th className="text-left px-2 py-2.5 font-bold">Contractor</th>
              <th className="px-2 py-2.5 font-bold text-center">Gender</th>
              <th className="text-left px-2 py-2.5 font-bold">Category</th>
              <th className="text-left px-2 py-2.5 font-bold">Occupation</th>
              <th className="px-2 py-2.5 font-bold text-center">Attendance</th>
              <th className="px-3 py-2.5 font-bold text-right">Wage</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-[#DBE3EF] transition-opacity ${loading ? 'opacity-50' : ''}`}>
            {data?.workers.map(r => (
              <tr key={String(r.id)} className="hover:bg-[#F2F6FC]/70 transition-colors">
                <td className="px-3 py-2.5"><span className="block font-semibold text-[#01183A] truncate max-w-[150px]">{r.name}</span><span className="block text-[10px] font-mono text-bss-text-muted">{r.bssId}</span></td>
                <td className="px-2 py-2.5 text-bss-text-secondary"><span className="block">{r.state || '—'}</span><span className="block text-[10px] text-bss-text-muted truncate max-w-[120px]">{r.site}</span></td>
                <td className="px-2 py-2.5 text-bss-text-secondary truncate max-w-[150px]">{r.employer || '—'}</td>
                <td className="px-2 py-2.5 text-bss-text-secondary truncate max-w-[150px]">{r.contractor || '—'}</td>
                <td className="px-2 py-2.5 text-center text-bss-text-secondary">{r.gender || '—'}</td>
                <td className="px-2 py-2.5 text-bss-text-secondary truncate max-w-[110px]">{r.category || '—'}</td>
                <td className="px-2 py-2.5 text-bss-text-secondary truncate max-w-[120px]">{r.occupation || '—'}</td>
                <td className="px-2 py-2.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.attendance === 'PRESENT' ? 'bg-bss-soft-green text-bss-green' : r.attendance === 'ABSENT' ? 'bg-bss-soft-orange text-bss-error' : 'bg-bss-soft-orange text-bss-orange'}`}>{r.attendance}</span></td>
                <td className="px-3 py-2.5 text-right text-[#01183A] font-semibold whitespace-nowrap tabular-nums">{r.wage ? money(r.wage) : '—'}</td>
              </tr>
            ))}
            {data && data.workers.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-bss-text-muted">No workers match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="p-3 sm:px-4 border-t border-[#DBE3EF] bg-[#F2F6FC]/50 flex flex-wrap items-center justify-between gap-2 text-xs text-bss-text-muted">
        <label className="flex items-center gap-2">Rows per page
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-8 border border-[#DBE3EF] rounded-full px-2.5 bg-white text-[#01183A] font-semibold">
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-1.5">
          <button type="button" disabled={page <= 1} onClick={() => setPage(1)} className="hidden sm:inline-block h-8 px-2.5 rounded-full border border-[#DBE3EF] bg-white disabled:opacity-40 hover:border-[#1E3A8A]/40">First</button>
          <button type="button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-8 px-2.5 rounded-full border border-[#DBE3EF] bg-white disabled:opacity-40 hover:border-[#1E3A8A]/40 inline-flex items-center gap-1"><ChevronLeft size={13} />Prev</button>
          <span className="px-2">Page <strong className="text-[#01183A]">{data?.page ?? 1}</strong> / {totalPages}</span>
          <button type="button" disabled={(data?.page ?? 1) >= totalPages} onClick={() => setPage(p => p + 1)} className="h-8 px-2.5 rounded-full border border-[#DBE3EF] bg-white disabled:opacity-40 hover:border-[#1E3A8A]/40 inline-flex items-center gap-1">Next<ChevronRight size={13} /></button>
          <button type="button" disabled={(data?.page ?? 1) >= totalPages} onClick={() => setPage(totalPages)} className="hidden sm:inline-block h-8 px-2.5 rounded-full border border-[#DBE3EF] bg-white disabled:opacity-40 hover:border-[#1E3A8A]/40">Last</button>
        </div>
      </div>
    </div>
  </div>;
}
