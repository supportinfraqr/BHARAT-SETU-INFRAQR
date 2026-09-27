"use client";

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { openPrintHtml } from '@/lib/documentEngine/render';

type BatchSummary = { state:string; month:string; year:string; employees:number; sites:Array<{ site:string; location:string; employees:number }> };
type SiteDocs = { site:string; siteCode:string; state:string; documents:Array<{ purpose:string; form:string; frequency:string; mandatory:boolean; templateId:number | null; outputFormat?:string }>; templates:Array<{ id:number; formCode:string; title:string; columns:number; hasFile:boolean; outputFormat?:string }> };

/** State/Site drill-down of a generated CLRA batch, shared by the contractor
 *  compliance page and the employer review page. */
export default function BatchDrilldown({ batchId, role, onClose }: { batchId:string; role:'contractor' | 'employer'; onClose:() => void }) {
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [site, setSite] = useState<SiteDocs | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const base = `/api/${role}/compliance-batches/${batchId}`;

  useEffect(() => {
    let active = true;
    void fetch(base, { cache:'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { data?: BatchSummary } | null) => { if (active && body?.data) setSummary(body.data); })
      .catch(() => {});
    return () => { active = false; };
  }, [base]);

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

  async function openRegister(templateId: number, label: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${base}/register/${templateId}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: { html?:string; title?:string }; error?:string };
      if (!response.ok || !body.data?.html) throw new Error(body.error ?? 'The register could not be rendered.');
      openPrintHtml(body.data.html, body.data.title ?? label);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The register could not be rendered.'); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-[95] bg-black/50 flex justify-end" role="presentation"><section role="dialog" aria-modal="true" aria-label="Batch drill-down" className="bg-white w-full max-w-2xl h-full overflow-y-auto">
    <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Generated batch · State / Site</p><h2 className="font-semibold text-gray-950 mt-0.5">{summary ? `${summary.state} · ${summary.month} ${summary.year}` : 'Loading…'}</h2>{summary && <p className="text-xs text-gray-500 mt-0.5">{summary.employees} employee row(s) · {summary.sites.length} site(s)</p>}</div>
      <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
    </header>
    <div className="p-5 space-y-5">
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2.5">{error}</p>}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Sites</p>
        {summary?.sites.length
          ? <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">{summary.sites.map(row => <div key={`${row.site}-${row.location}`} className="flex items-center justify-between px-4 py-2.5"><div><p className="text-sm font-semibold text-gray-800">{row.site || '—'}</p><p className="text-[11px] text-gray-400">{row.location || '—'} · {row.employees} employee(s)</p></div><button disabled={busy} onClick={() => void openSite(row.site)} className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50">View documents</button></div>)}</div>
          : <p className="text-xs text-gray-400">{summary ? 'No site rows in the master file.' : 'Loading…'}</p>}
      </div>

      {site && <div className="space-y-4">
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Applicable documents — {site.site}{site.siteCode ? ` (${site.siteCode})` : ''} · {site.state}</p>
          {site.documents.length
            ? <ul className="space-y-1.5">{site.documents.map((doc, i) => <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-xs"><span className="text-gray-700">{doc.purpose}</span><span className="flex items-center gap-2 text-gray-400">{doc.form}{doc.mandatory ? ' · mandatory' : ''}{doc.templateId ? <><button disabled={busy} onClick={() => void openRegister(doc.templateId as number, doc.purpose)} className="text-blue-700 font-semibold hover:underline disabled:opacity-50">View register</button>{doc.outputFormat === 'xlsx' ? <a href={`${base}/register/${doc.templateId}/xlsx`} className="text-gray-500 font-semibold hover:underline">Excel</a> : <span className="text-gray-400">PDF</span>}</> : <span className="text-gray-300">no template</span>}</span></li>)}</ul>
            : <p className="text-xs text-gray-400">The applicability matrix has no form rows for {site.state}.</p>}
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Register templates ({site.templates.length})</p>
          {site.templates.length
            ? <div className="flex flex-wrap gap-2">{site.templates.map(t => <span key={t.id} className="inline-flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-1.5 text-xs"><strong className="font-mono text-[#073B67]">{t.formCode}</strong><span className="text-gray-400">{t.columns} field(s)</span><button disabled={busy} onClick={() => void openRegister(t.id, t.formCode)} className="text-blue-700 font-semibold hover:underline disabled:opacity-50">View register</button>{t.outputFormat === 'xlsx' ? <a href={`${base}/register/${t.id}/xlsx`} className="text-gray-500 font-semibold hover:underline">Excel</a> : <span className="text-gray-400">PDF</span>}</span>)}</div>
            : <p className="text-xs text-gray-400">No templates configured for {site.state}.</p>}
        </div>
      </div>}
    </div>
  </section></div>;
}
