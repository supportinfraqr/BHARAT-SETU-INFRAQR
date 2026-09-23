"use client";

import { useState } from 'react';
import { CheckCircle2, Database, Download, FileSpreadsheet, KeyRound, Loader2, Upload } from 'lucide-react';

type Entity = 'employers' | 'contractors' | 'workers' | 'relations';
type ResultRow = { row: string; status: string; detail: string };

const TABS: Array<[Entity, string, string]> = [
  ['employers', 'Bulk register employers', 'Employer name, mobile, CIN/GSTIN/PAN, address…'],
  ['contractors', 'Bulk register contractors', 'Contractor name, mobile, trade, CLRA licence…'],
  ['workers', 'Bulk register workers', 'Worker name, mobile, DOB, Aadhaar, UAN/ESIC…'],
  ['relations', 'Master relations', 'Link Employer ↔ Contractor ↔ Worker + Site'],
];

export default function AdminBulkRegisterPage() {
  const [password, setPassword] = useState('');
  const [entity, setEntity] = useState<Entity>('employers');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);

  function pick(next: Entity) { setEntity(next); setFile(null); setResults(null); setSummary(null); setError(''); setNotice(''); }

  async function download() {
    setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/bulk-register?entity=${entity}&password=${encodeURIComponent(password)}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Template could not be downloaded.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `bss-bulk-${entity}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Template could not be downloaded.'); }
  }

  async function upload() {
    if (!file) { setError('Choose the filled .xlsx file.'); return; }
    setBusy(true); setError(''); setNotice(''); setResults(null); setSummary(null);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('password', password);
      const response = await fetch(`/api/admin/bulk-register?entity=${entity}`, { method: 'POST', body: form });
      const body = await response.json().catch(() => ({})) as { data?: { results: ResultRow[]; summary: Record<string, number> }; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Bulk registration failed.');
      setResults(body.data.results); setSummary(body.data.summary);
      setNotice(`Done — ${body.data.summary.ok} ok · ${body.data.summary.failed} failed.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Bulk registration failed.'); }
    finally { setBusy(false); }
  }

  const activeTab = TABS.find(t => t[0] === entity)!;

  return <div className="space-y-6">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin</p>
      <h1 className="text-2xl font-bold mt-1 flex items-center gap-2"><Database size={22} className="text-[#073B67]"/>Bulk Registration</h1>
      <p className="text-sm text-gray-500 mt-1">Password-protected bulk import of employers, contractors, workers, and the relations master table that links them.</p>
    </header>

    <section className="bg-white border border-gray-200 rounded-2xl p-5">
      <label className="text-xs font-semibold text-gray-700 flex items-center gap-2"><KeyRound size={14} className="text-[#073B67]"/>Bulk-registration password
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter the bulk password" className="ml-auto h-10 w-64 border border-gray-200 rounded-lg px-3 text-sm"/>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => pick(id)} className={`px-3.5 py-2 rounded-full text-xs font-bold transition ${entity === id ? 'bg-[#0F172A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>
    </section>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><FileSpreadsheet size={16} className="text-[#073B67]"/><div><h2 className="text-sm font-semibold text-gray-950">{activeTab[1]}</h2><p className="text-xs text-gray-400">{activeTab[2]}</p></div></div>
        <button onClick={() => void download()} disabled={!password} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50"><Download size={14}/>Download template</button>
      </header>
      <div className="p-5 space-y-4">
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="text-xs font-semibold text-gray-700">Filled template (.xlsx)
            <span className="mt-1 flex items-center justify-center gap-2 h-10 border border-dashed border-gray-300 rounded-lg text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50">{file ? <FileSpreadsheet size={14}/> : <Upload size={14}/>}{file ? file.name : 'Choose file'}<input type="file" accept=".xlsx" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)}/></span>
          </label>
          <button onClick={() => void upload()} disabled={busy || !file || !password} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5">{busy ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}{busy ? 'Importing…' : 'Upload & register'}</button>
        </div>

        {results && summary && <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 text-[11px] font-semibold text-gray-600">Result — {summary.total} row(s): {summary.ok} ok · {summary.failed} failed</div>
          <div className="max-h-72 overflow-y-auto"><table className="w-full text-[11px] text-left"><thead className="bg-gray-50 text-gray-500"><tr><th className="px-3 py-1.5">Row</th><th className="px-3 py-1.5">Status</th><th className="px-3 py-1.5">Detail</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{results.map((r, i) => <tr key={i}><td className="px-3 py-1.5 font-medium text-gray-800">{r.row}</td><td className="px-3 py-1.5"><span className={r.status === 'ok' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>{r.status}</span></td><td className="px-3 py-1.5 text-gray-500">{r.detail}</td></tr>)}</tbody></table></div>
        </div>}
      </div>
    </section>
  </div>;
}
