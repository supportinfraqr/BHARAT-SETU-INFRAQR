"use client";

import { useCallback, useEffect, useState } from 'react';
import { Building2, CheckCircle2, ChevronRight, Download, FileSpreadsheet, Loader2, ShieldCheck, Upload, XCircle } from 'lucide-react';

type Batch = {
  id: number; source: string; state: string; employer: string; fileName: string;
  consentGiven: boolean; counts: { total?: number; ok?: number; flagged?: number; migrated?: number; byEntity?: Record<string, number> };
  reviewNote: string; employerReviewNote: string; createdAt: string;
};
type Rec = { id: number; entityType: string; rowIndex: number; data: Record<string, unknown>; issues: Array<{ level?: string; message: string }>; status: string };

const STATE_TONE: Record<string, string> = {
  SUBMITTED: 'bg-amber-50 text-amber-700 border-amber-200',
  QUARANTINED: 'bg-blue-50 text-blue-700 border-blue-200',
  CLEANED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  STRUCTURED: 'bg-purple-50 text-purple-700 border-purple-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MIGRATED: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
};

export default function EmployerOnboardingPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [detail, setDetail] = useState<{ batch: Batch; records: Rec[] } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [declaration, setDeclaration] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employer/onboarding/batches', { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { data?: Batch[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Submissions could not be loaded.');
      setBatches(body.data ?? []);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Submissions could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  async function downloadTemplate() {
    setError(''); setNotice('');
    try {
      const res = await fetch('/api/employer/onboarding/template');
      if (!res.ok) throw new Error('The template could not be downloaded.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'bss-onboarding-template.xlsx';
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) { setError(e instanceof Error ? e.message : 'The template could not be downloaded.'); }
  }

  async function submit() {
    if (!file) { setError('Choose the filled data file (.xlsx).'); return; }
    if (!consent) { setError('Accept the data-sharing declaration before submitting.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('consent', 'true');
      form.set('declaration', declaration);
      const res = await fetch('/api/employer/onboarding/submit', { method: 'POST', body: form });
      const body = await res.json().catch(() => ({})) as { data?: Batch; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error ?? 'The submission could not be created.');
      setFile(null); setConsent(false); setDeclaration('');
      setNotice(`Submitted batch #${body.data.id}. BSS will review it, then you'll be asked to approve it here.`);
      await load();
      void openDetail(body.data.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'The submission could not be created.'); }
    finally { setBusy(false); }
  }

  async function openDetail(id: number) {
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/employer/onboarding/batches/${id}`, { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { data?: Batch & { records?: Rec[] }; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error ?? 'The submission could not be loaded.');
      const { records, ...batch } = body.data;
      setDetail({ batch, records: records ?? [] });
      setNote('');
    } catch (e) { setError(e instanceof Error ? e.message : 'The submission could not be loaded.'); }
    finally { setBusy(false); }
  }

  async function review(id: number, decision: 'approve' | 'reject') {
    if (decision === 'reject' && !window.confirm('Reject this submission? It will not be onboarded.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/employer/onboarding/batches/${id}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note }),
      });
      const body = await res.json().catch(() => ({})) as { data?: Batch & { records?: Rec[] }; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error ?? 'The review could not be saved.');
      const { records, ...batch } = body.data;
      setDetail({ batch, records: records ?? [] });
      setNotice(`Batch #${id} → ${batch.state}.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'The review could not be saved.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6 pb-12">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Secure data onboarding</p>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Onboarding</h1>
      <p className="text-sm text-gray-500 mt-1">Submit your historical worker, contractor and site data over a secure channel. BSS reviews and quarantines it; you then approve the verified data before accounts are created.</p>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><FileSpreadsheet size={16} className="text-[#073B67]"/>Submit historical data</h2><p className="text-xs text-gray-400 mt-0.5">One workbook with any of the sheets: Employers, Contractors, Workers, Relations.</p></div>
        <button onClick={() => void downloadTemplate()} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-bold inline-flex items-center gap-1.5"><Download size={14}/>Download template</button>
      </div>
      <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold text-gray-600 cursor-pointer hover:border-[#073B67]">
        <Upload size={16} className="text-[#073B67]"/>{file ? file.name : 'Choose data file (.xlsx)'}
        <input type="file" accept=".xlsx" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)}/>
      </label>
      <label className="flex items-start gap-2 text-xs text-gray-700">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="accent-[#073B67] w-4 h-4 mt-0.5"/>
        <span>I confirm I am authorised to share this data with BSS and that it is accurate. I understand the data stays in quarantine and is not part of BSS data assets until I verify it.</span>
      </label>
      <label className="block text-xs font-semibold text-gray-700">Declaration / note (optional)
        <input value={declaration} onChange={e => setDeclaration(e.target.value)} placeholder="e.g. Historical payroll for FY 2025-26" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/>
      </label>
      <button onClick={() => void submit()} disabled={busy || !file} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5"><ShieldCheck size={14}/>{busy ? 'Submitting…' : 'Submit securely'}</button>
    </section>

    <div className="grid lg:grid-cols-[360px_1fr] gap-5">
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden h-fit">
        <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Your submissions</h2></header>
        {loading ? <p className="px-5 py-8 text-sm text-gray-500 flex items-center gap-2"><Loader2 size={15} className="animate-spin"/>Loading…</p>
          : !batches.length ? <div className="px-5 py-8 text-center"><Building2 size={24} className="mx-auto text-gray-300"/><p className="text-xs text-gray-400 mt-2">No submissions yet.</p></div>
          : <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">{batches.map(b => <button key={b.id} onClick={() => void openDetail(b.id)} className={`w-full text-left px-5 py-3 flex items-center justify-between gap-2 hover:bg-gray-50 ${detail?.batch.id === b.id ? 'bg-[#073B67]/5' : ''}`}>
            <div className="min-w-0"><p className="text-sm font-semibold text-gray-800">#{b.id} · {b.fileName || 'file'}</p><p className="text-[11px] text-gray-400">{b.counts?.total ?? 0} rows · {b.createdAt?.slice(0, 10)}</p></div>
            <span className="flex items-center gap-2 shrink-0"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATE_TONE[b.state] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>{b.state}</span><ChevronRight size={14} className="text-gray-300"/></span>
          </button>)}</div>}
      </section>

      {detail && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><ShieldCheck size={16} className="text-[#073B67]"/>Batch #{detail.batch.id}</h2><p className="text-xs text-gray-400 mt-0.5">{detail.batch.fileName} · {detail.batch.counts?.total ?? 0} rows · state <strong>{detail.batch.state}</strong></p></div>
          {detail.batch.state === 'STRUCTURED' && <div className="flex items-center gap-2">
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className="h-9 rounded-lg border border-gray-200 px-3 text-xs w-48"/>
            <button disabled={busy} onClick={() => void review(detail.batch.id, 'approve')} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"><CheckCircle2 size={13}/>Approve (verifies authenticity)</button>
            <button disabled={busy} onClick={() => void review(detail.batch.id, 'reject')} className="h-9 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"><XCircle size={13}/>Reject</button>
          </div>}
        </header>
        {detail.batch.state !== 'STRUCTURED' && <p className="px-5 py-3 text-[11px] text-gray-500 border-b border-gray-100">
          {detail.batch.state === 'SUBMITTED' ? 'Awaiting BSS review.' : detail.batch.state === 'MIGRATED' || detail.batch.state === 'APPROVED' ? 'Accounts created — the introductory SMS was sent to the workers/contractors.' : detail.batch.state === 'REJECTED' ? 'This submission was rejected.' : 'BSS is processing this submission; you will be asked to approve once it is structured.'}
        </p>}
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 sticky top-0"><tr><th className="px-4 py-2">Entity</th><th className="px-4 py-2">Row</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Details</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{detail.records.map(r => <tr key={r.id} className="align-top"><td className="px-4 py-2 font-semibold text-gray-700">{r.entityType}</td><td className="px-4 py-2 text-gray-400">{r.rowIndex + 1}</td><td className="px-4 py-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-600">{r.status}</span></td><td className="px-4 py-2 text-gray-600">{Object.entries(r.data || {}).filter(([k, v]) => ['name','mobile','employer_mobile','contractor_mobile','worker_mobile','site_name'].includes(k) && v).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}{(r.issues ?? []).length ? <span className="text-amber-600"> · {r.issues.length} issue(s)</span> : null}</td></tr>)}</tbody>
          </table>
        </div>
      </section>}
    </div>
  </div>;
}
