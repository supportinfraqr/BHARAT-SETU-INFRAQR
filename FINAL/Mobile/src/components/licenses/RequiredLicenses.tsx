"use client";

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Loader2, ShieldCheck, Upload, X } from 'lucide-react';
import type { PartyLicenseItem, PartyLicenses } from '@/types/portal';

const inputCls = 'mt-1 w-full h-10 rounded-lg border border-bss-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20';

function statusTone(status: string) {
  switch ((status || '').toUpperCase()) {
    case 'VERIFIED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
    case 'UPLOADED': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

/**
 * Lists the licences applicable to the signed-in contractor/employer (from the
 * License master `applies_to`) and prompts them to upload the licence copy.
 */
export default function RequiredLicenses({
  endpoint, title, subtitle,
}: {
  endpoint: string;
  title: string;
  subtitle: string;
}) {
  const [data, setData] = useState<PartyLicenses | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ licenseNumber: '', validFrom: '', validTo: '' });
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { data?: PartyLicenses; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error || 'Licences could not be loaded.');
      setData(body.data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Licences could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
  useEffect(() => { void load(); }, [load]);

  function startUpload(item: PartyLicenseItem) {
    setOpenId(item.id);
    setError('');
    setFile(null);
    setForm({
      licenseNumber: item.record?.licenseNumber || '',
      validFrom: item.record?.validFrom || '',
      validTo: item.record?.validTo || '',
    });
  }

  async function submitUpload(item: PartyLicenseItem) {
    if (!file && !item.record) { setError('Choose the licence document to upload.'); return; }
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('licenseId', String(item.id));
      fd.append('licenseNumber', form.licenseNumber);
      fd.append('validFrom', form.validFrom);
      fd.append('validTo', form.validTo);
      if (file) fd.append('file', file);
      const res = await fetch('/api/party-licenses/upload', { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({})) as { data?: PartyLicenses; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error || 'The licence could not be uploaded.');
      setData(body.data);
      setOpenId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The licence could not be uploaded.');
    } finally {
      setBusy(false);
    }
  }

  const pending = data?.pending ?? 0;

  return (
    <div className="space-y-5 pb-10">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-bss-navy via-bss-deep-navy to-bss-interactive-blue text-white p-5 sm:p-6 shadow-lg">
        <div aria-hidden className="absolute -right-8 -top-10 w-44 h-44 rounded-full bg-white/5 blur-2xl" />
        <div className="relative z-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60 flex items-center gap-1.5"><ShieldCheck size={13}/> Statutory licences</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">{title}</h1>
          <p className="text-sm text-white/75 mt-1 max-w-2xl">{subtitle}</p>
        </div>
      </header>

      {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

      {!loading && pending > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Action required — {pending} licence{pending === 1 ? '' : 's'} pending</p>
            <p className="text-xs text-amber-800 mt-0.5">Upload the applicable licence copy below. The BSS admin verifies it after submission.</p>
          </div>
        </div>
      )}
      {!loading && pending === 0 && (data?.total ?? 0) > 0 && (
        <p className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>All applicable licences are uploaded.</p>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-bss-text-muted py-10"><Loader2 size={16} className="animate-spin"/>Loading licences…</p>
      ) : (data?.licenses.length ?? 0) === 0 ? (
        <p className="rounded-2xl border border-bss-border bg-white p-6 text-sm text-bss-text-muted">No licences apply to you yet.</p>
      ) : (
        <div className="space-y-3">
          {data!.licenses.map(item => {
            const rec = item.record;
            const open = openId === item.id;
            return (
              <section key={item.id} className="rounded-2xl border border-bss-border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-bss-text-primary flex items-center gap-1.5"><FileText size={14}/>{item.name}</p>
                    <p className="text-[11px] text-bss-text-muted mt-0.5">
                      {item.state || '—'} · Applies to {item.appliesTo}
                      {item.govtFee ? ` · Govt fee ₹${item.govtFee}` : ''}
                      {item.effectiveFrom ? ` · ${item.effectiveFrom}${item.effectiveTo ? ` → ${item.effectiveTo}` : ''}` : ''}
                    </p>
                    {rec && (
                      <p className="text-[11px] text-bss-text-secondary mt-1">
                        {rec.fileName}{rec.licenseNumber ? ` · No. ${rec.licenseNumber}` : ''}
                        {rec.validTo ? ` · valid to ${rec.validTo}` : ''}{rec.uploadedAt ? ` · uploaded ${rec.uploadedAt}` : ''}
                      </p>
                    )}
                    {rec?.note && <p className="text-[11px] text-red-600 mt-1">{rec.note}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusTone(rec?.status || (rec ? 'UPLOADED' : 'MISSING'))}`}>
                      {rec ? rec.status : 'Not uploaded'}
                    </span>
                    {rec?.url && <a href={rec.url} target="_blank" rel="noreferrer" className="h-8 px-3 rounded-lg border border-bss-border text-[11px] font-bold text-bss-interactive-blue hover:bg-bss-blue-tint grid place-items-center">View</a>}
                    <button type="button" onClick={() => (open ? setOpenId(null) : startUpload(item))} className="h-8 px-3 rounded-lg bg-[#01183A] text-white text-[11px] font-bold inline-flex items-center gap-1">
                      {open ? <><X size={12}/>Cancel</> : <><Upload size={12}/>{rec ? 'Replace' : 'Upload'}</>}
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3 border-t border-bss-border pt-3">
                    <label className="text-[11px] font-semibold text-bss-text-secondary">Licence Number
                      <input className={inputCls} value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="e.g. CLRA/MH/12345"/>
                    </label>
                    <label className="text-[11px] font-semibold text-bss-text-secondary">Valid From
                      <input type="date" className={inputCls} value={form.validFrom} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}/>
                    </label>
                    <label className="text-[11px] font-semibold text-bss-text-secondary">Valid To
                      <input type="date" className={inputCls} value={form.validTo} onChange={e => setForm(f => ({ ...f, validTo: e.target.value }))}/>
                    </label>
                    <label className="text-[11px] font-semibold text-bss-text-secondary sm:col-span-2">Licence document (PDF / JPEG / PNG, ≤10 MB)
                      <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#0F172A] file:px-3 file:py-1.5 file:text-white file:text-xs file:font-semibold"/>
                    </label>
                    <div className="flex items-end">
                      <button type="button" disabled={busy} onClick={() => void submitUpload(item)} className="h-10 w-full rounded-lg bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                        {busy ? <><Loader2 size={14} className="animate-spin"/>Uploading…</> : 'Save licence'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
