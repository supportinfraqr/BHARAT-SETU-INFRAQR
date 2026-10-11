"use client";

import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { CheckCircle2, ChevronRight, Download, FileSpreadsheet, Loader2, Pencil, RefreshCw, ShieldCheck, Sparkles, Upload, X, XCircle } from 'lucide-react';
import AdminPageHero from '@/components/admin/AdminPageHero';

type Batch = {
  id: number; source: string; state: string; employer: string; employerId: number | null;
  submittedBy: string; fileName: string; consentGiven: boolean;
  counts: { total?: number; ok?: number; failed?: number; rejected?: number; flagged?: number; migrated?: number; byEntity?: Record<string, number> };
  reviewNote: string; employerReviewNote: string; declaration?: string; createdAt: string;
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
  const [importPreview, setImportPreview] = useState<{ employers: number; workers: number; contractors: number; sheets: string[] } | null>(null);
  const [onboardPassword, setOnboardPassword] = useState('');
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});

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
      setImportFile(null); setImportPreview(null);
      setNotice(`Imported submission #${batch.id} — ${batch.counts?.total ?? 0} row(s).`);
      void load();
    } catch (e) { setError(e instanceof Error ? e.message : 'The import failed.'); }
    finally { setBusy(false); }
  }

  async function downloadTemplate(entity: 'employers' | 'workers' | 'contractors') {
    setError(''); setNotice('');
    try {
      const res = await fetch(`/api/admin/onboarding/template?entity=${entity}`);
      if (!res.ok) throw new Error('The template could not be downloaded.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `bss-onboarding-${entity}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) { setError(e instanceof Error ? e.message : 'The template could not be downloaded.'); }
  }

  function openEdit(r: Row) {
    setEditRow(r);
    const c: Record<string, string> = {};
    Object.entries(r.data || {}).forEach(([k, v]) => { if (k !== 'plan') c[k] = v == null ? '' : String(v); });
    setEditData(c);
  }

  async function saveEdit() {
    if (!editRow || !detail) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/admin/onboarding/batches/${detail.batch.id}/records/${editRow.id}/edit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: editData }),
      });
      const body = await res.json().catch(() => ({})) as { data?: Batch & { records?: Row[] }; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error ?? 'The edit failed.');
      const { records, ...batch } = body.data;
      setDetail({ batch, records: records ?? [] });
      setEditRow(null);
      setNotice('Record updated.');
    } catch (e) { setError(e instanceof Error ? e.message : 'The edit failed.'); }
    finally { setBusy(false); }
  }

  async function onImportFile(f: File | null) {
    setImportFile(f);
    setImportPreview(null);
    if (!f) return;
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const count = (name: string) => {
        const ws = wb.Sheets[name];
        if (!ws) return 0;
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }) as unknown[][];
        return aoa.slice(1).filter(r => Array.isArray(r) && r.some(c => String(c ?? '').trim() !== '')).length;
      };
      setImportPreview({ employers: count('Employers'), workers: count('Workers'), contractors: count('Contractors'), sheets: wb.SheetNames });
    } catch { setImportPreview({ employers: 0, workers: 0, contractors: 0, sheets: [] }); }
  }

  const counts = (b: Batch) => b.counts?.byEntity ?? {};

  return <div className="space-y-6 pb-12">
    <AdminPageHero
      eyebrow="Data governance"
      title="Onboarding"
      description="Employer submissions held in quarantine. Accept → Structure → edit a record if needed → Run onboarding (creates accounts + WhatsApp message)."
      icon={<FileSpreadsheet size={14}/>}
      actions={<button onClick={() => void load()} disabled={busy} className="h-10 px-4 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/20 transition-colors backdrop-blur-sm disabled:opacity-60"><RefreshCw size={14}/>Refresh</button>}
    />

    <section className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><FileSpreadsheet size={16} className="text-[#073B67]"/>Import rows</h2><p className="text-xs text-gray-400 mt-0.5">Templates ask only the mobile number. Upload an Employers / Workers / Contractors workbook — each upload is a new submission.</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void downloadTemplate('employers')} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-bold inline-flex items-center gap-1.5"><Download size={14}/>Employer template</button>
          <button onClick={() => void downloadTemplate('workers')} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-bold inline-flex items-center gap-1.5"><Download size={14}/>Worker template</button>
          <button onClick={() => void downloadTemplate('contractors')} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-bold inline-flex items-center gap-1.5"><Download size={14}/>Contractor template</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 h-10 px-3 rounded-lg border border-dashed border-gray-300 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50">
          <Upload size={14} className="text-[#073B67]"/>{importFile ? importFile.name : 'Choose file (.xlsx)'}
          <input type="file" accept=".xlsx" className="hidden" onChange={e => void onImportFile(e.target.files?.[0] ?? null)}/>
        </label>
        <button onClick={() => void importRows()} disabled={busy || !importFile || (importPreview ? importPreview.employers + importPreview.workers + importPreview.contractors === 0 : false)} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5">{busy ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}Import rows</button>
      </div>
      {importPreview && <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">This file will create</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${importPreview.employers ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200'}`}>Employers × {importPreview.employers}</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${importPreview.workers ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200'}`}>Workers × {importPreview.workers}</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${importPreview.contractors ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200'}`}>Contractors × {importPreview.contractors}</span>
        </div>
        {importPreview.employers + importPreview.workers + importPreview.contractors === 0
          ? <p className="text-[11px] text-red-600 mt-2">No recognised sheet — name the tabs exactly <strong>Employers</strong>, <strong>Workers</strong> and/or <strong>Contractors</strong>.</p>
          : <p className="text-[11px] text-gray-500 mt-2">Recognised: {importPreview.sheets.filter(s => ['Employers', 'Workers', 'Contractors'].includes(s)).join(', ')}.{importPreview.sheets.some(s => !['Employers', 'Workers', 'Contractors'].includes(s)) ? ` Ignored: ${importPreview.sheets.filter(s => !['Employers', 'Workers', 'Contractors'].includes(s)).join(', ')}.` : ''}</p>}
      </div>}
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
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className="h-9 rounded-lg border border-gray-200 px-3 text-xs w-56"/>
            {detail.batch.state === 'SUBMITTED' && <>
              <button disabled={busy} onClick={() => void act(detail.batch.id, 'review', { decision: 'approve' })} className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">Accept</button>
              <button disabled={busy} onClick={() => void act(detail.batch.id, 'review', { decision: 'reject' })} className="h-9 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-bold disabled:opacity-50">Reject</button>
            </>}
            <button disabled={busy || !['CLEANED', 'STRUCTURED'].includes(detail.batch.state)} onClick={() => void act(detail.batch.id, 'structure')} className="h-9 px-3 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5"><Sparkles size={13}/>Structure</button>
            <input type="password" value={onboardPassword} onChange={e => setOnboardPassword(e.target.value)} placeholder="Admin password" className="h-9 w-44 rounded-lg border border-gray-200 px-3 text-xs bg-white"/>
            <button disabled={busy || !onboardPassword || !['CLEANED', 'STRUCTURED'].includes(detail.batch.state)} onClick={() => void act(detail.batch.id, 'migrate', { password: onboardPassword })} className="h-9 px-4 rounded-lg bg-green-700 text-white text-xs font-bold disabled:opacity-40">Run onboarding</button>
          </div>
        </header>

        <div className="px-5 py-3 text-[11px] text-gray-500 border-b border-gray-100">
          Flow: Accept → Structure (cleans phone numbers etc.) → edit any record if needed → Run onboarding (creates accounts + WhatsApp message).
        </div>

        {detail.batch.declaration && <div className="px-5 py-3 text-[11px] text-gray-700 border-b border-gray-100 bg-gray-50/60"><strong>Declaration / note:</strong> {detail.batch.declaration}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100"><tr><th className="px-4 py-2">Entity</th><th className="px-4 py-2">Row</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Key fields</th><th className="px-4 py-2">Result</th><th className="px-4 py-2">BSS ID</th><th className="px-4 py-2">Issues</th><th className="px-4 py-2">Edit</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{detail.records.map(r => <tr key={r.id} className="align-top hover:bg-gray-50">
              <td className="px-4 py-2 font-semibold text-gray-700">{r.entityType}</td>
              <td className="px-4 py-2 text-gray-400">{r.rowIndex + 1}</td>
              <td className="px-4 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'OK' ? 'bg-emerald-50 text-emerald-700' : r.status === 'FLAGGED' ? 'bg-amber-50 text-amber-700' : r.status === 'MIGRATED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{r.status}</span></td>
              <td className="px-4 py-2 text-gray-600">{Object.entries(r.data || {}).filter(([k, v]) => ['name','mobile','employer_mobile','contractor_mobile','worker_mobile','site_name','gstin','pan','aadhaar'].includes(k) && v).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}</td>
              <td className={`px-4 py-2 ${r.status === 'REJECTED' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{String((r.result as Record<string, unknown>)?.detail ?? '') || (r.status === 'MIGRATED' ? 'Account created' : '—')}</td>
              <td className="px-4 py-2 font-mono text-[11px] text-gray-700">{String((r.result as Record<string, unknown>)?.bssId ?? '') || '—'}</td>
              <td className="px-4 py-2">{(r.issues ?? []).length ? <ul className="space-y-0.5">{(r.issues ?? []).slice(0, 4).map((i, k) => <li key={k} className={i.level === 'error' ? 'text-red-600' : 'text-amber-600'}>{i.message}</li>)}</ul> : <span className="text-gray-300">—</span>}</td>
              <td className="px-4 py-2">{['SUBMITTED', 'CLEANED', 'STRUCTURED'].includes(detail.batch.state) ? <button type="button" disabled={busy} onClick={() => openEdit(r)} className="h-7 px-2.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 inline-flex items-center gap-1"><Pencil size={11}/>Edit</button> : <span className="text-gray-300">—</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>}
    </div>

    {editRow && <div className="fixed inset-0 z-[90] bg-black/50 grid place-items-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setEditRow(null); }}>
      <section role="dialog" aria-modal="true" aria-label="Edit record" className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
        <header className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div><h2 className="font-semibold text-gray-950 flex items-center gap-2"><Pencil size={16} className="text-[#073B67]"/>Edit {editRow.entityType} record</h2><p className="text-xs text-gray-500 mt-1">Fix a value (e.g. a phone number with a stray digit) before running onboarding.</p></div>
          <button onClick={() => setEditRow(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
        </header>
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {Object.keys(editData).length === 0 ? <p className="text-xs text-gray-400">No fields to edit.</p>
            : Object.entries(editData).map(([key, value]) => (
              <label key={key} className="block text-xs font-semibold text-gray-700 capitalize">{key.replace(/_/g, ' ')}
                <input value={value} onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white"/>
              </label>
            ))}
        </div>
        <footer className="p-5 pt-0 flex justify-end gap-2">
          <button onClick={() => setEditRow(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
          <button onClick={() => void saveEdit()} disabled={busy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-sm font-bold disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
        </footer>
      </section>
    </div>}
  </div>;
}
