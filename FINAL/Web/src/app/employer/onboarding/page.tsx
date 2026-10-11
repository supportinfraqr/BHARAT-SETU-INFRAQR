"use client";

import { useCallback, useEffect, useState } from 'react';
import { formatDate } from '@/lib/date';
import { Building2, CheckCircle2, ChevronRight, Download, FileSpreadsheet, Loader2, ShieldCheck, Upload, XCircle } from 'lucide-react';

type Batch = {
  id: number; source: string; state: string; employer: string; fileName: string;
  consentGiven: boolean; counts: { total?: number; ok?: number; flagged?: number; migrated?: number; byEntity?: Record<string, number> };
  reviewNote: string; employerReviewNote: string; createdAt: string;
};
type Rec = { id: number; entityType: string; rowIndex: number; data: Record<string, unknown>; issues: Array<{ level?: string; message: string }>; status: string };

const STATE_TONE: Record<string, string> = {
  SUBMITTED: 'bg-bss-soft-orange text-bss-orange border-bss-border',
  QUARANTINED: 'bg-bss-blue-tint text-bss-interactive-blue border-bss-border',
  CLEANED: 'bg-bss-blue-tint text-bss-interactive-blue border-bss-border',
  STRUCTURED: 'bg-bss-blue-tint text-bss-interactive-blue border-bss-border',
  APPROVED: 'bg-bss-soft-green text-bss-green border-bss-border',
  MIGRATED: 'bg-bss-soft-green text-bss-green border-bss-border',
  REJECTED: 'bg-bss-soft-orange text-bss-error border-bss-border',
  FAILED: 'bg-bss-soft-orange text-bss-error border-bss-border',
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

  async function downloadTemplate(entity: 'workers' | 'contractors') {
    setError(''); setNotice('');
    try {
      const res = await fetch(`/api/employer/onboarding/template?entity=${entity}`);
      if (!res.ok) throw new Error('The template could not be downloaded.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `bss-onboarding-${entity}.xlsx`;
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
      <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Secure data onboarding</p>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-bss-text-primary mt-1">Onboarding</h1>
      <p className="text-sm text-bss-text-muted mt-1">Submit worker and contractor data over a secure channel. BSS reviews and quarantines it; you then approve the verified data before accounts are created.</p>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    <section className="bss-card rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2"><FileSpreadsheet size={16} className="text-[#01183A]"/>Submit historical data</h2><p className="text-xs text-bss-text-muted mt-0.5">Two templates: <strong>Worker</strong> and <strong>Contractor</strong>. Download, fill the sheet, and submit the .xlsx here.</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void downloadTemplate('workers')} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-bold inline-flex items-center gap-1.5"><Download size={14}/>Worker template</button>
          <button onClick={() => void downloadTemplate('contractors')} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-bold inline-flex items-center gap-1.5"><Download size={14}/>Contractor template</button>
        </div>
      </div>
      <label className="flex items-center gap-2 border border-dashed border-bss-border rounded-xl bg-bss-bg px-3 py-2.5 text-xs font-semibold text-bss-text-secondary cursor-pointer hover:border-[#01183A]">
        <Upload size={16} className="text-[#01183A]"/>{file ? file.name : 'Choose data file (.xlsx)'}
        <input type="file" accept=".xlsx" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)}/>
      </label>
      <label className="flex items-start gap-2 text-xs text-bss-text-primary">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="accent-[#01183A] w-4 h-4 mt-0.5"/>
        <span>I confirm I am authorised to share this data with BSS and that it is accurate. I understand the data stays in quarantine and is not part of BSS data assets until I verify it.</span>
      </label>
      <label className="block text-xs font-semibold text-bss-text-primary">Declaration / note (optional)
        <input value={declaration} onChange={e => setDeclaration(e.target.value)} placeholder="e.g. Historical payroll for FY 2025-26" className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm"/>
      </label>
      <button onClick={() => void submit()} disabled={busy || !file} className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5"><ShieldCheck size={14}/>{busy ? 'Submitting…' : 'Submit securely'}</button>
    </section>

    <div className="grid lg:grid-cols-[360px_1fr] gap-5">
      <section className="bss-card rounded-2xl overflow-hidden h-fit">
        <header className="px-5 py-4 border-b border-bss-border"><h2 className="text-sm font-semibold text-bss-text-primary">Your submissions</h2></header>
        {loading ? <p className="px-5 py-8 text-sm text-bss-text-muted flex items-center gap-2"><Loader2 size={15} className="animate-spin"/>Loading…</p>
          : !batches.length ? <div className="px-5 py-8 text-center"><Building2 size={24} className="mx-auto text-bss-text-muted"/><p className="text-xs text-bss-text-muted mt-2">No submissions yet.</p></div>
          : <div className="divide-y divide-bss-border max-h-[60vh] overflow-y-auto">{batches.map(b => <button key={b.id} onClick={() => void openDetail(b.id)} className={`w-full text-left px-5 py-3 flex items-center justify-between gap-2 hover:bg-bss-bg ${detail?.batch.id === b.id ? 'bg-[#01183A]/5' : ''}`}>
            <div className="min-w-0"><p className="text-sm font-semibold text-bss-text-primary">#{b.id} · {b.fileName || 'file'}</p><p className="text-[11px] text-bss-text-muted">{b.counts?.total ?? 0} rows · {formatDate(b.createdAt)}</p></div>
            <span className="flex items-center gap-2 shrink-0"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATE_TONE[b.state] ?? 'bg-bss-bg text-bss-text-secondary border-bss-border'}`}>{b.state}</span><ChevronRight size={14} className="text-bss-text-muted"/></span>
          </button>)}</div>}
      </section>

      {detail && <section className="bss-card rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-bss-border flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2"><ShieldCheck size={16} className="text-[#01183A]"/>Batch #{detail.batch.id}</h2><p className="text-xs text-bss-text-muted mt-0.5">{detail.batch.fileName} · {detail.batch.counts?.total ?? 0} rows · state <strong>{detail.batch.state}</strong></p></div>
          {detail.batch.state === 'STRUCTURED' && <div className="flex items-center gap-2">
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className="h-9 rounded-lg border border-bss-border px-3 text-xs w-48"/>
            <button disabled={busy} onClick={() => void review(detail.batch.id, 'approve')} className="h-9 px-3 rounded-lg bg-bss-green text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"><CheckCircle2 size={13}/>Approve (verifies authenticity)</button>
            <button disabled={busy} onClick={() => void review(detail.batch.id, 'reject')} className="h-9 px-3 rounded-lg border border-bss-border text-bss-error text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"><XCircle size={13}/>Reject</button>
          </div>}
        </header>
        {detail.batch.state !== 'STRUCTURED' && <p className="px-5 py-3 text-[11px] text-bss-text-muted border-b border-bss-border">
          {detail.batch.state === 'SUBMITTED' ? 'Awaiting BSS review.' : detail.batch.state === 'MIGRATED' || detail.batch.state === 'APPROVED' ? 'Accounts created — the account-created WhatsApp message was sent.' : detail.batch.state === 'REJECTED' ? 'This submission was rejected.' : 'BSS is processing this submission; you will be asked to approve once it is structured.'}
        </p>}
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bss-bg text-bss-text-muted border-b border-bss-border sticky top-0"><tr><th className="px-4 py-2">Entity</th><th className="px-4 py-2">Row</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Details</th></tr></thead>
            <tbody className="divide-y divide-bss-border">{detail.records.map(r => <tr key={r.id} className="align-top"><td className="px-4 py-2 font-semibold text-bss-text-primary">{r.entityType}</td><td className="px-4 py-2 text-bss-text-muted">{r.rowIndex + 1}</td><td className="px-4 py-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bss-bg text-bss-text-secondary">{r.status}</span></td><td className="px-4 py-2 text-bss-text-secondary">{Object.entries(r.data || {}).filter(([k, v]) => ['name','mobile','employer_mobile','contractor_mobile','worker_mobile','site_name'].includes(k) && v).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}{(r.issues ?? []).length ? <span className="text-bss-orange"> · {r.issues.length} issue(s)</span> : null}</td></tr>)}</tbody>
          </table>
        </div>
      </section>}
    </div>
  </div>;
}
