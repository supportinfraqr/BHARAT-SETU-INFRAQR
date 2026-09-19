"use client";

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Pencil, Search, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';

type TemplateRow = {
  id: number; state: string; formCode: string; title: string; sourceFormat: string;
  columns: string[]; meta: { lines?: string[]; file?: string }; html: string; active: boolean;
  formatAvailable?: boolean;
  version: number; fileName: string; hasFile: boolean;
};

const REGISTER_TOKENS = [
  'TITLE', 'FORM_CODE', 'STATE', 'CONTRACTOR_NAME', 'EMPLOYER_NAME', 'SITE_NAME', 'SITE_CODE',
  'MONTH', 'YEAR', 'FINANCIAL_YEAR', 'GENERATED_ON', 'RECORD_COUNT', 'HEAD', 'ROWS',
];

export default function RegisterTemplatesPage() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [state, setState] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<TemplateRow | null>(null);
  const [htmlFor, setHtmlFor] = useState<TemplateRow | null>(null);
  const [htmlDraft, setHtmlDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (state !== 'all') params.set('state', state);
      if (query.trim()) params.set('q', query.trim());
      const response = await fetch(`/api/admin/register-templates${params.toString() ? `?${params}` : ''}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { rows?:TemplateRow[]; states?:string[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'Templates could not be loaded.');
      setRows(body.rows ?? []);
      if (body.states) setStates(body.states);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Templates could not be loaded.'); }
    finally { setLoading(false); }
  }, [state, query]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + filter reload
  useEffect(() => { void load(); }, [load]);

  async function saveHtml() {
    if (!htmlFor) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/register-templates/${htmlFor.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlDraft }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Save failed.');
      setRows(current => current.map(r => r.id === htmlFor.id ? { ...r, html: htmlDraft } : r));
      setHtmlFor(null); setNotice('Register HTML saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Save failed.'); }
    finally { setBusy(false); }
  }

  const columns: DataColumn<TemplateRow>[] = [
    { id:'state', header:'State / Region', value:r => r.state },
    { id:'form', header:'Form', value:r => r.formCode, render:r => <div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold text-gray-800">{r.formCode}</span>{r.formatAvailable === false && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700" title="The source matrix lists no official register format for this state">No format</span>}</div> },
    { id:'title', header:'Title', value:r => r.title || '—' },
    { id:'format', header:'Source', value:r => r.sourceFormat.toUpperCase() },
    { id:'cols', header:'Columns', value:r => r.columns.length, render:r => <span className={r.columns.length ? 'font-semibold text-green-700' : 'text-gray-400'}>{r.columns.length}</span> },
    { id:'version', header:'Version', value:r => r.version },
    { id:'actions', header:'Actions', filterable:false, value:r => r.id, render:r => (
      <div className="flex items-center gap-2">
        <button onClick={() => { setHtmlFor(r); setHtmlDraft(r.html || ''); setError(''); }} className="inline-flex items-center gap-1 text-xs font-semibold text-[#073B67] hover:underline"><Pencil size={13}/>{r.html ? 'Edit HTML' : 'Add HTML'}</button>
        <button onClick={() => setView(r)} className="text-xs font-semibold text-blue-700 hover:underline">View fields</button>
        {r.hasFile && <a href={`/api/register-templates/${r.id}/file`} download className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-[#073B67]"><Download size={13}/>Source</a>}
      </div>
    ) },
  ];

  return <div className="space-y-6 pb-10">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin · Masters</p>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Register Templates</h1>
      <p className="text-sm text-gray-500 mt-1">The PAN-India statutory register library — one template per State + Form, with the parsed column schema used to render the contractor&apos;s registers.</p>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    <div className="flex flex-wrap items-center gap-3">
      <label className="text-xs font-semibold text-gray-600">State
        <select value={state} onChange={e => setState(e.target.value)} className="ml-2 h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white"><option value="all">All states / regions</option>{states.map(s => <option key={s} value={s}>{s}</option>)}</select>
      </label>
      <label className="relative"><Search size={14} className="absolute left-3 top-2.5 text-gray-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search form or title…" className="h-9 rounded-lg border border-gray-200 pl-9 pr-3 text-xs w-64"/></label>
      <span className="text-xs text-gray-400">{rows.length} template{rows.length === 1 ? '' : 's'}</span>
    </div>

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading templates…</p>
      : <EnterpriseDataTable title="Register templates" rows={rows} columns={columns} rowKey={r => String(r.id)} filename="register-templates"/>}

    {view && <div className="fixed inset-0 z-[95] bg-black/50 flex justify-end" role="presentation"><section role="dialog" aria-modal="true" aria-label="Register template fields" className="bg-white w-full max-w-lg h-full overflow-y-auto">
      <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Register template</p><h2 className="font-semibold text-gray-950 mt-0.5 flex items-center gap-2"><FileSpreadsheet size={16} className="text-[#073B67]"/>{view.state} · {view.formCode}</h2>{view.title && <p className="text-xs text-gray-500 mt-0.5">{view.title}</p>}</div>
        <button onClick={() => setView(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
      </header>
      <div className="p-5 space-y-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Columns ({view.columns.length})</p>
          {view.columns.length
            ? <ol className="space-y-1.5">{view.columns.map((col, i) => <li key={`${col}-${i}`} className="flex gap-3 rounded-lg border border-gray-100 px-3 py-2 text-xs"><span className="text-gray-400 w-6">{i + 1}</span><span className="text-gray-800 font-medium">{col}</span></li>)}</ol>
            : <p className="text-xs text-gray-400">No tabular columns parsed — this is a form-style register (see the source file).</p>}
        </div>
        {view.meta?.lines && view.meta.lines.length > 0 && <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Header / form fields</p>
          <ul className="space-y-1 text-xs text-gray-600">{view.meta.lines.map((line, i) => <li key={i} className="rounded-lg bg-gray-50 px-3 py-1.5">{line}</li>)}</ul>
        </div>}
        {view.hasFile && <a href={`/api/register-templates/${view.id}/file`} download className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold"><Download size={14}/>Download source ({view.sourceFormat.toUpperCase()})</a>}
      </div>
    </section></div>}

    {htmlFor && <div className="fixed inset-0 z-[96] bg-black/50 grid place-items-center p-4">
      <section role="dialog" aria-modal="true" aria-label="Register HTML template" className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div><h2 className="text-sm font-semibold">Register HTML · {htmlFor.state} · {htmlFor.formCode}</h2><p className="text-[11px] text-gray-500 mt-0.5">Authors the register layout. When blank, the register renders from the parsed columns.</p></div>
          <button onClick={() => setHtmlFor(null)} aria-label="Close"><X size={16}/></button>
        </header>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            {REGISTER_TOKENS.map(tok => <button key={tok} type="button" onClick={() => setHtmlDraft(d => d + `{{${tok}}}`)} className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">{`{{${tok}}}`}</button>)}
          </div>
          <textarea value={htmlDraft} onChange={e => setHtmlDraft(e.target.value)} rows={18} spellCheck={false} placeholder="<!doctype html>… <table><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table> …" className="w-full rounded-lg border border-gray-200 p-3 font-mono text-[11px] leading-relaxed" />
          <p className="text-[11px] text-gray-400">Tokens: header/meta values plus <code>{'{{HEAD}}'}</code> (table header cells) and <code>{'{{ROWS}}'}</code> (data rows) from the uploaded master file.</p>
        </div>
        <footer className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={() => setHtmlFor(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button>
          <button disabled={busy} onClick={() => void saveHtml()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><CheckCircle2 size={14}/>{busy ? 'Saving…' : 'Save HTML'}</button>
        </footer>
      </section>
    </div>}
  </div>;
}
