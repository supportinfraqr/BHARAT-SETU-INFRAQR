"use client";

import { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';

type RegisterAudit = { status?:string; valid?:boolean; confidence?:number; summary?:string; findings?:string[]; matchedColumns?:string[]; missing?:string[]; issues?:string[]; providerLabel?:string; model?:string; message?:string };
type DocRow = { purpose:string; form:string; frequency:string; mandatory:boolean; templateId:number | null; outputFormat?:string; audit?:RegisterAudit | null };
type TemplateRow = { id:number; formCode:string; title:string; columns:number; hasFile:boolean; outputFormat?:string; audit?:RegisterAudit | null };
type BatchSummary = { state:string; month:string; year:string; employees:number; sites:Array<{ site:string; location:string; employees:number }> };
type SiteDocs = { site:string; siteCode:string; state:string; documents:DocRow[]; templates:TemplateRow[] };

function AuditBadge({ audit }: { audit?: RegisterAudit | null }) {
  const status = audit?.status;
  const tone = status === 'passed' ? 'bg-green-50 text-green-700 border-green-200'
    : status === 'failed' ? 'bg-red-50 text-red-700 border-red-200'
    : status === 'review' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : status === 'error' ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-gray-50 text-gray-500 border-gray-200';
  const label = status === 'passed' ? 'AI · Passed'
    : status === 'failed' ? 'AI · Issues'
    : status === 'review' ? 'AI · Review'
    : status === 'error' ? 'AI · Error'
    : status === 'unavailable' ? 'AI · N/A'
    : 'AI audit…';
  const detail = audit
    ? [audit.summary, ...(audit.findings ?? []), ...(audit.missing ?? []).map(m => `Missing: ${m}`),
       ...(audit.issues ?? []).map(x => `Issue: ${x}`), audit.message].filter(Boolean).join('\n')
    : 'AI audit is running…';
  return <span title={detail || 'AI audit'} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-help ${tone}`}>{label}{audit?.confidence != null ? ` ${audit.confidence}%` : ''}</span>;
}

/** State/Site drill-down of a generated CLRA batch, shared by the contractor
 *  compliance page and the employer review page. */
export default function BatchDrilldown({ batchId, role, onClose }: { batchId:string; role:'contractor' | 'employer'; onClose:() => void }) {
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [site, setSite] = useState<SiteDocs | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [auditNonce, setAuditNonce] = useState(0);
  const base = `/api/${role}/compliance-batches/${batchId}`;

  useEffect(() => {
    let active = true;
    void fetch(base, { cache:'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { data?: BatchSummary } | null) => { if (active && body?.data) setSummary(body.data); })
      .catch(() => {});
    return () => { active = false; };
  }, [base]);

  // Poll while the AI audits of the site's registers are still being produced.
  const siteName = site?.site;
  useEffect(() => {
    if (!siteName) return;
    let cancelled = false;
    let tries = 0;
    const timer = window.setInterval(async () => {
      if (cancelled) return;
      tries += 1;
      const body = await fetch(`${base}?site=${encodeURIComponent(siteName)}`, { cache:'no-store' })
        .then(r => (r.ok ? r.json() : null)).catch(() => null) as { data?: SiteDocs } | null;
      if (cancelled) return;
      if (body?.data) {
        setSite(body.data);
        if (!hasPendingAudit(body.data) || tries >= 24) window.clearInterval(timer);
      } else if (tries >= 24) {
        window.clearInterval(timer);
      }
    }, 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [siteName, base, auditNonce]);

  async function openSite(name: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${base}?site=${encodeURIComponent(name)}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: SiteDocs; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Site documents could not be loaded.');
      setSite(body.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Site documents could not be loaded.'); }
    finally { setBusy(false); }
  }

  async function rerunAudits() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${base}/ai-audit`, { method: 'POST' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?:string };
        throw new Error(body.error ?? 'AI audit could not be started.');
      }
      setAuditNonce(n => n + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'AI audit could not be started.'); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-[95] bg-black/50 flex justify-end" role="presentation"><section role="dialog" aria-modal="true" aria-label="Batch drill-down" className="bg-white w-full max-w-2xl h-full overflow-y-auto">
    <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Generated batch · State / Site</p><h2 className="font-semibold text-gray-950 mt-0.5">{summary ? `${summary.state} · ${summary.month} ${summary.year}` : 'Loading…'}</h2>{summary && <p className="text-xs text-gray-500 mt-0.5">{summary.employees} employee row(s) · {summary.sites.length} site(s)</p>}</div>
      <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
    </header>
    <div className="p-5 space-y-5">
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2.5">{error}</p>}
      <div className="rounded-xl border border-gray-100 bg-slate-50/60 p-4" title={summary ? `${summary.employees} worker row(s) · ${summary.sites.length} site(s) · ${summary.state} · ${summary.month} ${summary.year}` : ''}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Master file (source data)</p>
            {summary
              ? <p className="text-sm text-gray-800 mt-1"><strong className="text-gray-950">{summary.employees}</strong> worker row(s) · <strong className="text-gray-950">{summary.sites.length}</strong> site(s) · <span className="text-gray-500">{summary.state} · {summary.month} {summary.year}</span></p>
              : <p className="text-xs text-gray-400 mt-1">Loading…</p>}
            <p className="text-[11px] text-gray-400 mt-0.5">The uploaded workbook these registers were generated from.</p>
          </div>
          <a href={`${base}/master`} download className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 inline-flex items-center gap-1.5 hover:bg-gray-50 flex-shrink-0"><Download size={14}/>Download master file</a>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Sites</p>
        {summary?.sites.length
          ? <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">{summary.sites.map(row => <div key={`${row.site}-${row.location}`} className="flex items-center justify-between px-4 py-2.5"><div><p className="text-sm font-semibold text-gray-800">{row.site || '—'}</p><p className="text-[11px] text-gray-400">{row.location || '—'} · {row.employees} employee(s)</p></div><button disabled={busy} onClick={() => void openSite(row.site)} className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50">View documents</button></div>)}</div>
          : <p className="text-xs text-gray-400">{summary ? 'No site rows in the master file.' : 'Loading…'}</p>}
      </div>

      {site && <div className="space-y-4">
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Applicable documents — {site.site}{site.siteCode ? ` (${site.siteCode})` : ''} · {site.state}</p>
            <button type="button" disabled={busy} onClick={() => void rerunAudits()} className="text-[11px] font-semibold text-blue-700 hover:underline disabled:opacity-50 inline-flex items-center gap-1"><RefreshCw size={11}/>Re-run AI audit</button>
          </div>
          {site.documents.length
            ? <ul className="space-y-1.5">{site.documents.map((doc, i) => <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-xs"><span className="text-gray-700">{doc.purpose}</span><span className="flex items-center gap-2 text-gray-400">{doc.form}{doc.mandatory ? ' · mandatory' : ''}{doc.templateId ? <><AuditBadge audit={doc.audit}/>{doc.outputFormat === 'xlsx' ? <a href={`${base}/register/${doc.templateId}/xlsx`} className="text-blue-700 font-semibold hover:underline">Download Excel</a> : <span className="text-gray-400">PDF</span>}</> : <span className="text-gray-300">no template</span>}</span></li>)}</ul>
            : <p className="text-xs text-gray-400">The applicability matrix has no form rows for {site.state}.</p>}
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Register templates ({site.templates.length})</p>
          {site.templates.length
            ? <div className="flex flex-wrap gap-2">{site.templates.map(t => <span key={t.id} className="inline-flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-1.5 text-xs"><strong className="font-mono text-[#073B67]">{t.formCode}</strong><span className="text-gray-400">{t.columns} field(s)</span><AuditBadge audit={t.audit}/>{t.outputFormat === 'xlsx' ? <a href={`${base}/register/${t.id}/xlsx`} className="text-blue-700 font-semibold hover:underline">Download Excel</a> : <span className="text-gray-400">PDF</span>}</span>)}</div>
            : <p className="text-xs text-gray-400">No templates configured for {site.state}.</p>}
        </div>
      </div>}
    </div>
  </section></div>;
}

function hasPendingAudit(data: SiteDocs): boolean {
  const pendingDoc = data.documents.some(doc => doc.templateId != null && !doc.audit);
  const pendingTemplate = data.templates.some(tpl => !tpl.audit);
  return pendingDoc || pendingTemplate;
}
