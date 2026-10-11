"use client";

import { useEffect, useState } from 'react';
import { CheckCircle2, Download, TriangleAlert, X } from 'lucide-react';

type RegisterAudit = { status?:string; valid?:boolean; confidence?:number; summary?:string; findings?:string[]; matchedColumns?:string[]; missing?:string[]; issues?:string[]; providerLabel?:string; model?:string; message?:string };
type DocRow = { purpose:string; form:string; frequency:string; mandatory:boolean; templateId:number | null; outputFormat?:string; audit?:RegisterAudit | null };
type TemplateRow = { id:number; formCode:string; title:string; columns:number; hasFile:boolean; outputFormat?:string; audit?:RegisterAudit | null };
type BatchSummary = { state:string; month:string; year:string; employees:number; site?:string; siteCode?:string; locations?:number; sites:Array<{ site:string; location:string; employees:number }> };
type SiteDocs = { site:string; siteCode:string; state:string; documents:DocRow[]; templates:TemplateRow[] };

function AuditBadge({ audit }: { audit?: RegisterAudit | null }) {
  const status = audit?.status;
  const tone = status === 'passed' ? 'bg-bss-soft-green text-bss-green border-bss-border'
    : status === 'failed' ? 'bg-bss-soft-orange text-bss-error border-bss-border'
    : status === 'review' ? 'bg-bss-soft-orange text-bss-orange border-bss-border'
    : status === 'error' ? 'bg-bss-soft-orange text-bss-error border-bss-border'
    : 'bg-bss-bg text-bss-text-muted border-bss-border';
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
  return <span title={detail || 'AI audit'} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-help ${tone}`}>{status === 'passed' ? <CheckCircle2 size={11}/> : status === 'failed' || status === 'error' ? <TriangleAlert size={11}/> : null}{label}{audit?.confidence != null ? ` ${audit.confidence}%` : ''}</span>;
}

/** State/Site drill-down of a generated CLRA batch, shared by the contractor
 *  compliance page and the employer review page. */
export default function BatchDrilldown({ batchId, role, onClose }: { batchId:string; role:'contractor' | 'employer'; onClose:() => void }) {
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [site, setSite] = useState<SiteDocs | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const base = `/api/${role}/compliance-batches/${batchId}`;
  // A batch is always generated for a single site, so there is nothing to pick
  // from a list — the site's documents are shown directly.
  const singleSite = !!summary && summary.sites.length === 1;
  const siteLabel = summary ? [summary.site, summary.siteCode ? `(${summary.siteCode})` : ''].filter(Boolean).join(' ') : '';
  const placeCount = summary ? (singleSite ? (summary.locations ?? 0) : summary.sites.length) : 0;
  const placeLabel = singleSite ? 'location(s)' : 'site(s)';

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
  }, [siteName, base]);

  // Auto-open the single site's documents so there is no redundant "Sites" list.
  useEffect(() => {
    if (summary && summary.sites.length === 1 && !site) void openSite(summary.sites[0].site);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

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

  return <div className="fixed inset-0 z-[95] bg-bss-navy/50 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-200" role="presentation" onClick={onClose}><section role="dialog" aria-modal="true" aria-label="Batch drill-down" onClick={e => e.stopPropagation()} className="bg-white w-full max-w-2xl max-h-[88vh] rounded-3xl overflow-hidden shadow-2xl border border-bss-border flex flex-col animate-in fade-in zoom-in-95 duration-200">
    <header className="flex items-start justify-between gap-3 px-5 py-4 bg-gradient-to-r from-bss-navy to-bss-deep-navy text-white flex-shrink-0">
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Generated batch · {siteLabel || 'State / Site'}</p><h2 className="font-semibold mt-0.5">{summary ? `${summary.state} · ${summary.month} ${summary.year}` : 'Loading…'}</h2>{summary && <p className="text-xs text-white/70 mt-0.5">{summary.employees} employee row(s) · {placeCount} {placeLabel}</p>}</div>
      <button onClick={onClose} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/15 text-white flex-shrink-0 transition-colors"><X size={18}/></button>
    </header>
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {error && <p role="alert" className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg p-2.5">{error}</p>}
      <div className="rounded-xl border border-bss-border bg-bss-bg p-4" title={summary ? `${summary.employees} worker row(s) · ${placeCount} ${placeLabel} · ${summary.state} · ${summary.month} ${summary.year}` : ''}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Master file (source data)</p>
            {summary
              ? <p className="text-sm text-bss-text-secondary mt-1"><strong className="text-bss-text-primary">{summary.employees}</strong> worker row(s) · <strong className="text-bss-text-primary">{placeCount}</strong> {placeLabel} · <span className="text-bss-text-muted">{summary.state} · {summary.month} {summary.year}</span></p>
              : <p className="text-xs text-bss-text-muted mt-1">Loading…</p>}
            <p className="text-[11px] text-bss-text-muted mt-0.5">The uploaded workbook these registers were generated from.</p>
          </div>
          <a href={`${base}/master`} download className="h-9 px-3 rounded-lg border border-bss-border bg-white text-xs font-semibold text-bss-text-primary inline-flex items-center gap-1.5 hover:bg-bss-bg flex-shrink-0"><Download size={14}/>Download master file</a>
        </div>
      </div>
      {!singleSite && <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Sites</p>
        {summary?.sites.length
          ? <div className="divide-y divide-bss-border rounded-xl border border-bss-border overflow-hidden">{summary.sites.map(row => <div key={`${row.site}-${row.location}`} className="flex items-center justify-between px-4 py-2.5"><div><p className="text-sm font-semibold text-bss-text-primary">{row.site || '—'}</p><p className="text-[11px] text-bss-text-muted">{row.location || '—'} · {row.employees} employee(s)</p></div><button disabled={busy} onClick={() => void openSite(row.site)} className="text-xs font-semibold text-bss-interactive-blue hover:underline disabled:opacity-50">View documents</button></div>)}</div>
          : <p className="text-xs text-bss-text-muted">{summary ? 'No site rows in the master file.' : 'Loading…'}</p>}
      </div>}

      {site && <div className="space-y-4">
        <div className="rounded-xl border border-bss-border p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Applicable documents — {site.site}{site.siteCode ? ` (${site.siteCode})` : ''} · {site.state}</p>
          </div>
          {site.documents.length
            ? <ul className="space-y-1.5">{site.documents.map((doc, i) => <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-bss-border px-3 py-2 text-xs"><span className="text-bss-text-secondary">{doc.purpose}</span><span className="flex items-center gap-2 text-bss-text-muted">{doc.form}{doc.mandatory ? ' · mandatory' : ''}{doc.templateId ? <><AuditBadge audit={doc.audit}/><a href={`${base}/register/${doc.templateId}/${doc.outputFormat === 'xlsx' ? 'xlsx' : 'pdf'}`} className="text-bss-interactive-blue font-semibold hover:underline">{doc.outputFormat === 'xlsx' ? 'Download Excel' : 'Download PDF'}</a><a href={`${base}/register/${doc.templateId}/issues`} className="text-bss-error font-semibold hover:underline inline-flex items-center gap-1"><Download size={11}/>Issues</a></> : <span className="text-bss-text-muted">no template</span>}</span></li>)}</ul>
            : <p className="text-xs text-bss-text-muted">The applicability matrix has no form rows for {site.state}.</p>}
        </div>
      </div>}
    </div>
    </section>
  </div>;
}

function hasPendingAudit(data: SiteDocs): boolean {
  return data.documents.some(doc => doc.templateId != null && !doc.audit);
}
