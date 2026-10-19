"use client";

import { useCallback, useEffect, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, RefreshCw, Save, ShieldCheck } from 'lucide-react';

type JobRow = {
  id: string; contractor: string; site: string; period: string; version: number;
  status: string; error?: string; workerCount: number; summary?: { statusCounts?: Record<string, number>; reportNo?: string };
  hasHtml: boolean; hasPdf: boolean; hasXlsx: boolean; hasJson: boolean; hasEvidence?: boolean;
  progress?: { stage?: string; percent?: number; message?: string; elapsedSeconds?: number; stalled?: boolean };
  artifacts?: Array<{ name: string; path: string; size: number; adminOnly: boolean }>;
};
type ScheduleRow = { contractorId: number; contractor: string; siteId: number; site: string; runsPerMonth: number; isActive: boolean };

function formatSize(value: number) {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

const tone: Record<string, string> = {
  READY: 'bg-emerald-50 text-emerald-700 border-emerald-200', FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  RUNNING: 'bg-blue-50 text-blue-700 border-blue-200', BUILDING: 'bg-blue-50 text-blue-700 border-blue-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function AdminMonthlyAudit() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [j, s] = await Promise.all([
        fetch('/api/admin/audit-jobs', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/admin/audit-schedules', { cache: 'no-store' }).then(r => r.json()),
      ]) as Array<{ data?: unknown; error?: string }>;
      if (j.error) throw new Error(j.error);
      if (s.error) throw new Error(s.error);
      setJobs((j.data || []) as JobRow[]);
      setSchedules((s.data || []) as ScheduleRow[]);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load audit data.'); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!jobs.some(job => ['PENDING', 'BUILDING', 'RUNNING'].includes(job.status))) return;
    const timer = window.setTimeout(() => { void load(); }, 15000);
    return () => window.clearTimeout(timer);
  }, [jobs, load]);

  async function save(row: ScheduleRow) {
    const key = `${row.contractorId}-${row.siteId}`;
    setBusyKey(key); setError(''); setNotice('');
    try {
      const res = await fetch('/api/admin/audit-schedules', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractorId: row.contractorId, siteId: row.siteId, runsPerMonth: row.runsPerMonth, isActive: row.isActive }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error || 'The schedule could not be saved.');
      setNotice(`${row.contractor} · ${row.site} updated.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'The schedule could not be saved.'); }
    finally { setBusyKey(''); }
  }

  const fileUrl = (id: string, kind: string) => `/api/audit-jobs/${encodeURIComponent(id)}/file/${kind}`;

  return <div className="space-y-6 pb-10">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-bss-navy via-bss-deep-navy to-bss-interactive-blue p-5 sm:p-6 text-white shadow-lg">
      <div aria-hidden className="absolute -right-8 -top-10 h-44 w-44 rounded-full bg-white/5 blur-2xl" />
      <p className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">Compliance governance</p>
      <h1 className="relative mt-1 flex items-center gap-2.5 text-2xl font-bold md:text-3xl"><ShieldCheck size={28} className="text-white/80"/>Monthly Contractor Audits</h1>
      <p className="relative mt-1.5 max-w-2xl text-sm text-white/75">Set the monthly run allowance per contractor and site. Contractors run the audits; employers view the reports.</p>
    </header>

    {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
    {notice && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>}

    <section className="overflow-hidden rounded-3xl border border-bss-border bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-bss-border px-5 py-4">
        <div><h2 className="text-sm font-bold text-bss-text-primary">Run limits</h2><p className="mt-0.5 text-[11px] text-bss-text-muted">Default 2 runs per contractor/site per month. No fixed dates.</p></div>
        <button onClick={() => void load()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-bss-border bg-white px-3 text-xs font-bold text-bss-text-primary hover:bg-bss-bg"><RefreshCw size={13}/>Refresh</button>
      </div>
      {loading ? <p className="flex items-center gap-2 p-7 text-sm text-bss-text-muted"><Loader2 size={16} className="animate-spin"/>Loading…</p>
        : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-bss-bg text-[10px] uppercase tracking-wider text-bss-text-muted"><tr><th className="px-5 py-3">Contractor</th><th className="px-5 py-3">Site</th><th className="px-5 py-3">Runs / month</th><th className="px-5 py-3">Enabled</th><th className="px-5 py-3"></th></tr></thead>
            <tbody className="divide-y divide-bss-border">
              {schedules.map(row => <tr key={`${row.contractorId}-${row.siteId}`} className="hover:bg-bss-bg">
                <td className="px-5 py-3 font-semibold text-bss-text-primary">{row.contractor}</td>
                <td className="px-5 py-3 text-bss-text-secondary">{row.site}</td>
                <td className="px-5 py-3"><input type="number" min={0} max={10} value={row.runsPerMonth} onChange={e => setSchedules(rows => rows.map(x => x.contractorId === row.contractorId && x.siteId === row.siteId ? { ...x, runsPerMonth: Number(e.target.value) } : x))} className="h-9 w-20 rounded-lg border border-bss-border px-2 text-sm"/></td>
                <td className="px-5 py-3"><input type="checkbox" checked={row.isActive} onChange={e => setSchedules(rows => rows.map(x => x.contractorId === row.contractorId && x.siteId === row.siteId ? { ...x, isActive: e.target.checked } : x))} className="h-4 w-4 accent-[#01183A]"/></td>
                <td className="px-5 py-3 text-right"><button disabled={busyKey === `${row.contractorId}-${row.siteId}`} onClick={() => void save(row)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#01183A] px-3 text-[11px] font-bold text-white disabled:opacity-50"><Save size={12}/>Save</button></td>
              </tr>)}
              {!schedules.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-bss-text-muted">No contractor/site pairs found.</td></tr>}
            </tbody>
          </table></div>}
    </section>

    <section className="overflow-hidden rounded-3xl border border-bss-border bg-white shadow-sm">
      <div className="border-b border-bss-border px-5 py-4"><h2 className="text-sm font-bold text-bss-text-primary">Recent audits</h2><p className="mt-0.5 text-[11px] text-bss-text-muted">Reports retained for 7 years.</p></div>
      {loading ? <p className="flex items-center gap-2 p-7 text-sm text-bss-text-muted"><Loader2 size={16} className="animate-spin"/>Loading…</p>
        : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-bss-bg text-[10px] uppercase tracking-wider text-bss-text-muted"><tr><th className="px-5 py-3">Period</th><th className="px-5 py-3">Contractor</th><th className="px-5 py-3">Site</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Workers</th><th className="px-5 py-3">Report</th></tr></thead>
            <tbody className="divide-y divide-bss-border">
              {jobs.map(job => <tr key={job.id} className="hover:bg-bss-bg">
                <td className="px-5 py-3 font-semibold text-bss-text-primary">{job.period} <span className="ml-1 text-[10px] font-normal text-bss-text-muted">v{job.version}</span></td>
                <td className="px-5 py-3 text-bss-text-secondary">{job.contractor}</td>
                <td className="px-5 py-3 text-bss-text-secondary">{job.site}</td>
                <td className="px-5 py-3"><span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${tone[job.status] || 'border-bss-border bg-bss-bg text-bss-text-muted'}`}>{job.status}</span>{['PENDING', 'BUILDING', 'RUNNING'].includes(job.status) && <p className="mt-1 text-[10px] text-bss-text-muted">{job.progress?.message || 'Working…'} · {Math.round(Number(job.progress?.percent || 0))}%</p>}</td>
                <td className="px-5 py-3 text-bss-text-secondary">{job.workerCount}</td>
                <td className="px-5 py-3"><div className="flex flex-wrap gap-2">
                  {job.hasHtml && <a href={fileUrl(job.id, 'html')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-bss-interactive-blue hover:underline"><FileText size={12}/>View</a>}
                  {job.hasPdf && <a href={fileUrl(job.id, 'pdf')} className="inline-flex items-center gap-1 text-[11px] font-semibold text-bss-text-secondary hover:underline"><Download size={12}/>PDF</a>}
                  {job.hasXlsx && <a href={fileUrl(job.id, 'xlsx')} className="inline-flex items-center gap-1 text-[11px] font-semibold text-bss-text-secondary hover:underline"><FileSpreadsheet size={12}/>Excel</a>}
                  {job.hasJson && <a href={fileUrl(job.id, 'json')} className="inline-flex items-center gap-1 text-[11px] font-semibold text-bss-text-secondary hover:underline"><FileText size={12}/>JSON</a>}
                  {job.hasEvidence && <a href={fileUrl(job.id, 'evidence')} className="inline-flex items-center gap-1 text-[11px] font-semibold text-bss-text-secondary hover:underline"><FileText size={12}/>Evidence</a>}
                </div>
                {(job.artifacts?.length || 0) > 0 && <details className="mt-2"><summary className="cursor-pointer text-[10px] font-bold text-bss-text-muted">All files ({job.artifacts?.length})</summary><div className="mt-1 flex max-w-[360px] flex-wrap gap-1">{job.artifacts?.map(file => <a key={file.path} href={`/api/audit-jobs/${job.id}/artifact?path=${encodeURIComponent(file.path)}`} target={file.name.endsWith('.html') ? '_blank' : undefined} rel="noopener noreferrer" className="rounded border border-bss-border bg-white px-1.5 py-0.5 text-[9px] font-semibold text-bss-text-secondary hover:bg-bss-bg">{file.name}{file.adminOnly ? ' · admin' : ''} · {formatSize(file.size)}</a>)}</div></details>}
                </td>
              </tr>)}
              {!jobs.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-bss-text-muted">No audits yet.</td></tr>}
            </tbody>
          </table></div>}
    </section>
  </div>;
}
