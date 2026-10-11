"use client";

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, FileSpreadsheet, Loader2, RefreshCw, ShieldCheck, Sparkles, Upload, X, XCircle } from 'lucide-react';

type Batch = {
  id: number; source: string; state: string; employer: string; employerId: number | null;
  submittedBy: string; fileName: string; consentGiven: boolean;
  counts: { total?: number; ok?: number; failed?: number; rejected?: number; flagged?: number; migrated?: number; byEntity?: Record<string, number> };
  reviewNote: string; employerReviewNote: string; createdAt: string;
};
type Row = { id: number; entityType: string; rowIndex: number; data: Record<string, unknown>; issues: Array<{ field?: string; level?: string; message: string }>; status: string; result: Record<string, unknown> };

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

export default function AdminOnboardingPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [detail, setDetail] = useState<{ batch: Batch; records: Row[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [note, setNote] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/onboarding/batches', { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { data?: Batch[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Batches could not be loaded.');
      setBatches(body.data ?? []);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Batches could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  async function openDetail(id: number) {
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/admin/onboarding/batches/${id}`, { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { data?: Batch & { records?: Row[] }; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error ?? 'Batch could not be loaded.');
      const { records, ...batch } = body.data;
      setDetail({ batch, records: records ?? [] });
      setNote('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Batch could not be loaded.'); }
    finally { setBusy(false); }
  }

  async function act(id: number, action: string, payload: Record<string, unknown> = {}) {
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/admin/onboarding/batches/${id}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, ...payload }),
      });
      const body = await res.json().catch(() => ({})) as { data?: Batch & { records?: Row[] }; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error ?? `The ${action} action failed.`);
      const { records, ...batch } = body.data;
      setDetail({ batch, records: records ?? [] });
      setNotice(`Batch #${id} → ${batch.state}.`);
      void load();
    } catch (e) { setError(e instanceof Error ? e.message : `The ${action} action failed.`); }
    finally { setBusy(false); }
  }

  async function importRows() {
    if (!importFile) { setError('Choose the .xlsx file to import.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.set('file', importFile);
      const res = await fetch('/api/admin/onboarding/import', { method: 'POST', body: form });
      const body = await res.json().catch(() => ({})) as { data?: Batch & { records?: Row[] }; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error ?? 'The import failed.');
      const { records, ...batch } = body.data;
      setDetail({ batch, records: records ?? [] });
      setImportFile(null);
      setNotice(`Imported submission #${batch.id} — ${batch.counts?.total ?? 0} row(s).`);
      void load();
    } catch (e) { setError(e instanceof Error ? e.message : 'The import failed.'); }
    finally { setBusy(false); }
  }

  const counts = (b: Batch) => b.counts?.byEntity ?? {};

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Data governance</p>
        <h1 className="text-2xl font-bold mt-1">Onboarding — Quarantine</h1>
        <p className="text-sm text-gray-500 mt-1">Employer submissions held in quarantine. Review → clean → structure → the employer approves → accounts are created and the WhatsApp “account created” message is sent.</p>
      </div>
      <button onClick={() => void load()} disabled={busy} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold inline-flex items-center gap-1.5 self-start disabled:opacity-60"><RefreshCw size={14}/>Refresh</button>
    </header>

    <section className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><FileSpreadsheet size={16} className="text-[#073B67]"/>Import rows</h2><p className="text-xs text-gray-400 mt-0.5">Upload a Workers / Contractors workbook. Each upload is a new submission with its own records, successes and failures.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 h-10 px-3 rounded-lg border border-dashed border-gray-300 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50">
            <Upload size={14} className="text-[#073B67]"/>{importFile ? importFile.name : 'Choose file (.xlsx)'}
            <input type="file" accept=".xlsx" className="hidden" onChange={e => setImportFile(e.target.files?.[0] ?? null)}/>
          </label>
          <button onClick={() => void importRows()} disabled={busy || !importFile} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5">{busy ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}Import rows</button>
        </div>
      </div>
    </section>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    <div className="grid lg:grid-cols-[380px_1fr] gap-5">
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden h-fit">
        <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Submissions</h2><p className="text-xs text-gray-400 mt-0.5">{batches.length} batch(es)</p></header>
        {loading ? <p className="px-5 py-8 text-sm text-gray-500 flex items-center gap-2"><Loader2 size={15} className="animate-spin"/>Loading…</p>
          : !batches.length ? <p className="px-5 py-8 text-xs text-gray-400">No onboarding submissions yet.</p>
          : <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">{batches.map(b => <button key={b.id} onClick={() => void openDetail(b.id)} className={`w-full text-left px-5 py-3 flex items-center justify-between gap-2 hover:bg-gray-50 ${detail?.batch.id === b.id ? 'bg-[#073B67]/5' : ''}`}>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">#{b.id} · {b.employer || b.submittedBy || '—'}</p>
              <p className="text-[11px] text-gray-400">{b.fileName || 'file'} · {b.counts?.total ?? 0} rows · {Object.entries(counts(b)).map(([k, v]) => `${k[0]}${v}`).join(' ')}</p>
            </div>
            <span className="flex items-center gap-2 shrink-0"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATE_TONE[b.state] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>{b.state}</span><ChevronRight size={14} className="text-gray-300"/></span>
          </button>)}</div>}
      </section>

      {detail && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><ShieldCheck size={16} className="text-[#073B67]"/>Batch #{detail.batch.id} · {detail.batch.employer || '—'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{detail.batch.fileName} · {detail.batch.counts?.total ?? 0} rows · <span className="text-emerald-700 font-semibold">{detail.batch.counts?.ok ?? 0} ok</span> · <span className="text-red-600 font-semibold">{detail.batch.counts?.failed ?? 0} failed</span> · {detail.batch.counts?.migrated ?? 0} migrated · state <strong>{detail.batch.state}</strong>{detail.batch.consentGiven ? ' · consent recorded' : ''}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Review note (optional)" className="h-9 rounded-lg border border-gray-200 px-3 text-xs w-56"/>
            {detail.batch.state === 'SUBMITTED' && <>
              <button disabled={busy} onClick={() => void act(detail.batch.id, 'review', { decision: 'approve' })} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">Approve → Quarantine</button>
              <button disabled={busy} onClick={() => void act(detail.batch.id, 'review', { decision: 'reject' })} className="h-9 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-bold disabled:opacity-50">Reject</button>
            </>}
            <button disabled={busy || !['QUARANTINED', 'CLEANED'].includes(detail.batch.state)} onClick={() => void act(detail.batch.id, 'clean')} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-bold disabled:opacity-40">Re-run cleaning</button>
            <button disabled={busy || !['CLEANED', 'STRUCTURED'].includes(detail.batch.state)} onClick={() => void act(detail.batch.id, 'structure')} className="h-9 px-3 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5"><Sparkles size={13}/>Structure</button>
            <button disabled={busy || !['STRUCTURED', 'CLEANED'].includes(detail.batch.state)} onClick={() => void act(detail.batch.id, 'approve')} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-40 inline-flex items-center gap-1.5"><CheckCircle2 size={13}/>Approve</button>
            <button disabled={busy || detail.batch.state !== 'APPROVED'} onClick={() => void act(detail.batch.id, 'migrate')} className="h-9 px-3 rounded-lg bg-green-700 text-white text-xs font-bold disabled:opacity-40">Migrate</button>
          </div>
        </header>

        <div className="px-5 py-3 text-[11px] text-gray-500 border-b border-gray-100">
          Flow: Submitted → Admin review → Quarantine → Cleaned → Structured → Employer approval → Accounts + WhatsApp message. Migration runs automatically when the employer approves.
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100"><tr><th className="px-4 py-2">Entity</th><th className="px-4 py-2">Row</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Key fields</th><th className="px-4 py-2">Result</th><th className="px-4 py-2">Issues</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{detail.records.map(r => <tr key={r.id} className="align-top hover:bg-gray-50">
              <td className="px-4 py-2 font-semibold text-gray-700">{r.entityType}</td>
              <td className="px-4 py-2 text-gray-400">{r.rowIndex + 1}</td>
              <td className="px-4 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'OK' ? 'bg-emerald-50 text-emerald-700' : r.status === 'FLAGGED' ? 'bg-amber-50 text-amber-700' : r.status === 'MIGRATED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{r.status}</span></td>
              <td className="px-4 py-2 text-gray-600">{Object.entries(r.data || {}).filter(([k, v]) => ['name','mobile','employer_mobile','contractor_mobile','worker_mobile','site_name','gstin','pan','aadhaar'].includes(k) && v).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}</td>
              <td className={`px-4 py-2 ${r.status === 'REJECTED' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{String((r.result as Record<string, unknown>)?.detail ?? '') || (r.status === 'MIGRATED' ? 'Account created' : '—')}</td>
              <td className="px-4 py-2">{(r.issues ?? []).length ? <ul className="space-y-0.5">{(r.issues ?? []).slice(0, 4).map((i, k) => <li key={k} className={i.level === 'error' ? 'text-red-600' : 'text-amber-600'}>{i.message}</li>)}</ul> : <span className="text-gray-300">—</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>}
    </div>
  </div>;
}
