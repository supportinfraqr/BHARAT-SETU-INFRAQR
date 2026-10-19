"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, CalendarDays, Clock3, Download, FileSpreadsheet, FileText, Loader2, Play, RefreshCw, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';

type StatusCounts = Record<string, number>;
type JobSummary = {
  statusCounts?: StatusCounts;
  riskCounts?: StatusCounts;
  totalCheckpoints?: number;
  executiveSummary?: string;
  verdict?: string;
  reportNo?: string;
};
type JobArtifact = { name: string; path: string; size: number; contentType: string; adminOnly: boolean };
type JobProgress = { stage?: string; percent?: number; message?: string; elapsedSeconds?: number; stalled?: boolean; done?: number; total?: number };
type JobRow = {
  id: string; site: string; siteId: string; contractor: string; employer: string;
  month: string; year: string; period: string; version: number; status: string;
  error?: string; workerCount: number; queryCount: number; summary?: JobSummary;
  createdAt: string; finishedAt?: string; hasHtml: boolean; hasPdf: boolean; hasXlsx: boolean; hasJson: boolean; hasEvidence?: boolean;
  progress?: JobProgress; lastHeartbeat?: string; attempts?: number; maxAttempts?: number;
  cancelRequested?: boolean; triggerType?: string; artifacts?: JobArtifact[];
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function previousMonths(count = 18) {
  const out: Array<{ value: string; label: string }> = [];
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  for (let i = 0; i < count; i += 1) {
    out.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

const statusTone: Record<string, string> = {
  READY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  RUNNING: 'bg-blue-50 text-blue-700 border-blue-200',
  BUILDING: 'bg-blue-50 text-blue-700 border-blue-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
};

function formatElapsed(value?: number) {
  const total = Math.max(0, Math.round(Number(value || 0)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${sec}s` : `${sec}s`;
}

function formatSize(value: number) {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function statusLabel(value: string) {
  return value === 'READY' ? 'Ready' : value === 'FAILED' ? 'Failed' : value === 'RUNNING' ? 'Running' : value === 'BUILDING' ? 'Preparing' : 'Queued';
}

type SiteOption = { id: string; name: string; code?: string };

export default function MonthlyAudit({ role, listEndpoint, sites, defaultSiteId }: { role: 'contractor' | 'employer'; listEndpoint: string; sites: SiteOption[]; defaultSiteId?: string }) {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const timer = useRef<number | null>(null);

  const months = useMemo(() => previousMonths(18), []);
  const [siteId, setSiteId] = useState(() => defaultSiteId || sites[0]?.id || '');
  const [month, setMonth] = useState(() => months[0]?.value || '');
  const selectedPeriod = months.find(m => m.value === month)?.label || '';
  const auditActiveForSelection = rows.some(job =>
    ['PENDING', 'BUILDING', 'RUNNING'].includes(job.status)
    && job.siteId === String(siteId)
    && job.period === selectedPeriod,
  );
  const auditUsedForSelection = rows.filter(job =>
    (job.triggerType || 'manual') === 'manual'
    && job.siteId === String(siteId)
    && job.period === selectedPeriod,
  ).length;
  const auditRemainingForSelection = Math.max(0, 2 - auditUsedForSelection);
  const auditLimitReached = auditRemainingForSelection === 0;
  const auditLockedForSelection = auditActiveForSelection || auditLimitReached;

  const load = useCallback(async () => {
    try {
      const res = await fetch(listEndpoint, { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { data?: JobRow[]; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error || 'Audit jobs could not be loaded.');
      setRows(body.data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audit jobs could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [listEndpoint]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const active = rows.some(r => ['PENDING', 'BUILDING', 'RUNNING'].includes(r.status));
    if (!active) return;
    timer.current = window.setTimeout(() => { void load(); }, 15000);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [rows, load]);

  const activeKey = rows.filter(r => ['PENDING', 'BUILDING', 'RUNNING'].includes(r.status)).map(r => `${r.id}:${r.status}`).join('|');
  useEffect(() => {
    if (!activeKey) return;
    const active = rows.filter(r => ['PENDING', 'BUILDING', 'RUNNING'].includes(r.status));
    const sources = active.map(job => {
      const source = new EventSource(`/api/audit-jobs/${encodeURIComponent(job.id)}/events`);
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { type?: string; stage?: string; percent?: number; message?: string; elapsedSeconds?: number; stalled?: boolean; done?: number; total?: number };
          if (data.type === 'progress' || data.type === 'queued') {
            setRows(current => current.map(row => row.id === job.id ? { ...row, progress: { ...(row.progress || {}), ...data } } : row));
          } else if (['ready', 'failed', 'cancelled', 'retry'].includes(String(data.type))) {
            void load();
          }
        } catch { /* ignore malformed event */ }
      };
      // EventSource reconnects automatically; the 15s list poll is the fallback.
      return source;
    });
    return () => sources.forEach(source => source.close());
  // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the active set changes
  }, [activeKey, load]);

  async function cancelJob(id: string) {
    setBusyId(id); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/contractor/audit-jobs/${encodeURIComponent(id)}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error || 'The audit could not be cancelled.');
      setNotice('Cancellation requested.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'The audit could not be cancelled.'); }
    finally { setBusyId(''); }
  }

  async function retryJob(id: string) {
    setBusyId(id); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/contractor/audit-jobs/${encodeURIComponent(id)}/retry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error || 'The audit could not be retried.');
      setNotice('Retry started.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'The audit could not be retried.'); }
    finally { setBusyId(''); }
  }

  async function runAudit() {
    if (auditActiveForSelection) {
      setError('An audit is already running for this site and month. Wait for it to finish.');
      return;
    }
    if (auditLimitReached) {
      setError('This site and month has used both monthly audit runs.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch('/api/contractor/audit-jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, month }),
      });
      const body = await res.json().catch(() => ({})) as { data?: JobRow; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error || 'The audit could not be started.');
      setNotice(`Audit ${body.data.period} started for ${body.data.site}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The audit could not be started.');
    } finally { setBusy(false); }
  }

  const fileUrl = (id: string, kind: string) => `/api/audit-jobs/${encodeURIComponent(id)}/file/${kind}`;

  return <div className="space-y-5 pb-10">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-bss-navy via-bss-deep-navy to-bss-interactive-blue p-5 sm:p-6 text-white shadow-lg">
      <div aria-hidden className="absolute -right-8 -top-10 h-44 w-44 rounded-full bg-white/5 blur-2xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">Monthly compliance</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">Contractor Document Audit</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/75">Audit the month&apos;s employer-approved CLRA registers and forms against the workers bound to that contractor and site — with a full evidence trail.</p>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Runs per month</p>
          <p className="text-lg font-bold">Up to 2</p>
          <p className="text-[10px] text-white/60">Admin controlled</p>
        </div>
      </div>
    </header>

    {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
    {notice && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>}

    {role === 'contractor' && (
      <section className="rounded-3xl border border-bss-border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Site</span>
            <select value={siteId} onChange={e => setSiteId(e.target.value)} className="h-11 w-full rounded-xl border border-bss-border bg-white px-3 text-sm">
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` · ${s.code}` : ''}</option>)}
            </select>
          </label>
          <label className="min-w-[180px] flex-1">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Month</span>
            <select value={month} onChange={e => setMonth(e.target.value)} className="h-11 w-full rounded-xl border border-bss-border bg-white px-3 text-sm">
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <button type="button" disabled={busy || !siteId || !month || auditLockedForSelection} onClick={() => void runAudit()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#01183A] px-5 text-sm font-bold text-white shadow-lg shadow-bss-navy/20 transition-all hover:-translate-y-0.5 hover:bg-[#022B5E] disabled:translate-y-0 disabled:opacity-60">
            {busy || auditActiveForSelection
              ? <><Loader2 size={16} className="animate-spin"/>{auditActiveForSelection ? 'Audit running…' : 'Starting…'}</>
              : auditLimitReached
                ? <><ShieldCheck size={16}/>Monthly limit reached</>
                : auditUsedForSelection > 0
                  ? <><Play size={16}/>Run second audit</>
                  : <><Play size={16}/>Run audit</>}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-bss-text-muted">Only an employer-approved month can be audited. <strong>{auditRemainingForSelection} of 2 runs remaining</strong> for this site and month. The next run unlocks after the current one fails or completes.</p>
      </section>
    )}

    <section className="overflow-hidden rounded-3xl border border-bss-border bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-bss-border px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-bss-text-primary">Audit history</h2>
          <p className="mt-0.5 text-[11px] text-bss-text-muted">Newest first · reports and evidence retained for 7 years</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-bss-border bg-white px-3 text-xs font-bold text-bss-text-primary hover:bg-bss-bg"><RefreshCw size={13}/>Refresh</button>
      </div>

      {loading ? <p className="flex items-center gap-2 p-7 text-sm text-bss-text-muted"><Loader2 size={16} className="animate-spin"/>Loading audits…</p>
        : rows.length === 0 ? <div className="p-10 text-center"><ShieldCheck size={28} className="mx-auto text-bss-text-muted"/><p className="mt-3 text-sm font-semibold text-bss-text-primary">No audits yet</p><p className="mt-1 text-xs text-bss-text-muted">{role === 'contractor' ? 'Select a site and an approved month, then run the first audit.' : 'Reports will appear here after your contractor runs an audit.'}</p></div>
        : <div className="divide-y divide-bss-border">
            {rows.map(job => {
              const sc = job.summary?.statusCounts || {};
              const rc = job.summary?.riskCounts || {};
              const active = ['PENDING', 'BUILDING', 'RUNNING'].includes(job.status);
              return <div key={job.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-bss-text-primary">{job.period}</strong>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusTone[job.status] || 'border-bss-border bg-bss-bg text-bss-text-muted'}`}>{statusLabel(job.status)}</span>
                      <span className="rounded-full bg-bss-bg px-2 py-0.5 text-[9px] font-bold text-bss-text-muted">v{job.version}</span>
                      {job.summary?.reportNo && <span className="font-mono text-[10px] text-bss-text-muted">{job.summary.reportNo}</span>}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-bss-text-muted">
                      <span className="inline-flex items-center gap-1"><Building2 size={11}/>{job.site}</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays size={11}/>{job.period}</span>
                      <span>{job.workerCount} workers · {job.queryCount} documents</span>
                    </p>
                    {job.summary?.executiveSummary && <p className="mt-2 line-clamp-2 max-w-3xl text-xs leading-relaxed text-bss-text-secondary">{job.summary.executiveSummary}</p>}
                    {job.error && <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{job.error}</p>}
                    {active && (
                      <div className="mt-3 max-w-2xl">
                        <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-bss-text-secondary">
                          <span className={`inline-flex min-w-0 items-center gap-1.5 ${job.progress?.stalled ? 'text-amber-700' : 'text-blue-700'}`}><Clock3 size={12}/><span className="truncate">{job.progress?.message || (job.status === 'RUNNING' ? 'Working…' : 'Preparing the job folder…')}{job.progress?.stalled ? ' · no progress for a while' : ''}</span></span>
                          <span className="flex-shrink-0">{Math.round(Number(job.progress?.percent || 0))}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-bss-bg"><div className="h-full rounded-full bg-bss-interactive-blue transition-all" style={{ width: `${Math.max(2, Math.min(100, Number(job.progress?.percent || 0)))}%` }} /></div>
                        <p className="mt-1 text-[10px] text-bss-text-muted">Elapsed {formatElapsed(job.progress?.elapsedSeconds)} · You can leave this page — the audit continues.</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {job.hasHtml && <a href={fileUrl(job.id, 'html')} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#01183A] px-3 text-xs font-bold text-white hover:bg-[#022B5E]"><FileText size={13}/>View report</a>}
                    {job.hasPdf && <a href={fileUrl(job.id, 'pdf')} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-bss-border bg-white px-3 text-xs font-bold text-bss-text-primary hover:bg-bss-bg"><Download size={13}/>PDF</a>}
                    {job.hasXlsx && <a href={fileUrl(job.id, 'xlsx')} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-bss-border bg-white px-3 text-xs font-bold text-bss-text-primary hover:bg-bss-bg"><FileSpreadsheet size={13}/>Excel</a>}
                    {job.hasJson && <a href={fileUrl(job.id, 'json')} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-bss-border bg-white px-3 text-xs font-bold text-bss-text-primary hover:bg-bss-bg"><FileText size={13}/>JSON</a>}
                    {job.hasEvidence && <a href={fileUrl(job.id, 'evidence')} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-bss-border bg-white px-3 text-xs font-bold text-bss-text-primary hover:bg-bss-bg"><FileText size={13}/>Evidence</a>}
                    {role === 'contractor' && active && <button type="button" disabled={busyId === job.id} onClick={() => void cancelJob(job.id)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><XCircle size={13}/>Cancel</button>}
                    {role === 'contractor' && ['FAILED', 'CANCELLED'].includes(job.status) && <button type="button" disabled={busyId === job.id} onClick={() => void retryJob(job.id)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#01183A] px-3 text-xs font-bold text-white hover:bg-[#022B5E] disabled:opacity-50"><RotateCcw size={13}/>Retry</button>}
                  </div>
                </div>
                {(Object.keys(sc).length > 0 || Object.keys(rc).length > 0) && <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(sc).map(([k, v]) => <span key={k} className="rounded-full border border-bss-border bg-bss-bg px-2 py-0.5 text-[10px] font-semibold text-bss-text-secondary">{k}: {v}</span>)}
                  {Object.entries(rc).map(([k, v]) => <span key={`r-${k}`} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${k === 'High' ? 'border-rose-200 bg-rose-50 text-rose-700' : k === 'Medium' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{k} risk: {v}</span>)}
                </div>}
                {(job.artifacts?.length || 0) > 0 && (
                  <details className="mt-3 rounded-xl border border-bss-border bg-bss-bg/50 px-3 py-2.5">
                    <summary className="cursor-pointer select-none text-[11px] font-bold text-bss-text-secondary">All generated files ({job.artifacts?.length})</summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.artifacts?.map(file => <a key={file.path} href={`/api/audit-jobs/${job.id}/artifact?path=${encodeURIComponent(file.path)}`} target={file.name.endsWith('.html') ? '_blank' : undefined} rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-bss-border bg-white px-2 py-1 text-[10px] font-semibold text-bss-text-secondary hover:bg-bss-surface">
                        <Download size={10}/>{file.name}{file.adminOnly ? ' · admin' : ''} · {formatSize(file.size)}
                      </a>)}
                    </div>
                  </details>
                )}
              </div>;
            })}
          </div>}
    </section>
  </div>;
}
