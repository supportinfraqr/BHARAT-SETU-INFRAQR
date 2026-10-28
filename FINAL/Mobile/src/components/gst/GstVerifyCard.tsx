"use client";

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, FileText, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/date';

type GstStatus = {
  gstin: string; status: string; verifiedAt: string | null;
  legalName: string; tradeName: string; constitution: string; hasCertificate: boolean;
  gstnStatus?: string; registrationDate?: string; taxpayerType?: string;
  incorporationDate?: string; memberSince?: string;
  address?: string; city?: string; district?: string; state?: string; pincode?: string;
};

function fmtDate(value?: string | null) {
  return formatDate(value);
}

export default function GstVerifyCard({ role, defaultGstin = '', onVerified }: {
  role: 'contractor' | 'employer';
  defaultGstin?: string;
  onVerified?: () => void;
}) {
  const base = `/api/${role}/gst`;
  const [status, setStatus] = useState<GstStatus | null>(null);
  const [gstin, setGstin] = useState(defaultGstin);
  const [override, setOverride] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // GST ownership claim (raised when the GSTIN is already held by another active account).
  const [conflictGstin, setConflictGstin] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimSent, setClaimSent] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${base}/status`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: GstStatus };
      if (response.ok && body.data) {
        setStatus(body.data);
        if (body.data.gstin) setGstin(prev => prev || body.data!.gstin);
      }
    } catch { /* ignore */ }
  }, [base]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial status load
  useEffect(() => { void load(); }, [load]);

  const verify = async () => {
    setBusy(true); setError(''); setNotice(''); setConflictGstin(''); setClaimSent('');
    try {
      const response = await fetch(`${base}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin }),
      });
      const body = await response.json().catch(() => ({})) as { data?: GstStatus; error?: string };
      if (!response.ok || !body.data) {
        // 409 = GSTIN already held by another active account → offer a claim.
        if (response.status === 409) setConflictGstin(gstin);
        throw new Error(body.error ?? 'GST lookup failed.');
      }
      setStatus(body.data);
      setNotice(body.data.status === 'VERIFIED'
        ? `Verified — ${body.data.legalName || body.data.gstin} (${body.data.gstnStatus || 'Active'}).`
        : `GSTIN status: ${body.data.gstnStatus || body.data.status}. Not verified.`);
      if (body.data.status === 'VERIFIED') onVerified?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'GST lookup failed.');
    } finally { setBusy(false); }
  };

  const raiseClaim = async () => {
    if (!conflictGstin) return;
    setClaimBusy(true); setError('');
    try {
      const response = await fetch(`${base}/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin: conflictGstin, note: claimNote }),
      });
      const body = await response.json().catch(() => ({})) as { data?: { id?: number }; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'The claim could not be submitted.');
      setClaimSent(conflictGstin);
      setConflictGstin('');
      setClaimNote('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The claim could not be submitted.');
    } finally { setClaimBusy(false); }
  };

  const verified = status?.status === 'VERIFIED';
  const notApplicable = status?.status === 'NOT_APPLICABLE';

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><BadgeCheck size={16} className="text-[#073B67]"/>GST identity verification</h2>
          <p className="text-xs text-gray-500 mt-1">Confirm your entity from your GSTIN (GSTN tax-payer details). No OTP needed.</p>
        </div>
        {verified && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">Verified</span>}
        {notApplicable && !override && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">Not applicable</span>}
      </header>

      {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}
      {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

      {conflictGstin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-900">GSTIN {conflictGstin} is already used by another active account</p>
          <p className="text-xs text-amber-800">If this GSTIN is actually yours, raise a claim. A BSS admin will review who should own it and deactivate the other account.</p>
          <textarea value={claimNote} onChange={e => setClaimNote(e.target.value)} rows={2} placeholder="Add a note (optional) — e.g. your legal name / reason" className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"/>
          <button type="button" disabled={claimBusy} onClick={() => void raiseClaim()} className="h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-50">{claimBusy ? 'Submitting…' : 'Raise claim on this GSTIN'}</button>
        </div>
      )}
      {claimSent && (
        <p role="status" className="bss-alert bss-alert-success">Claim submitted for GSTIN {claimSent}. A BSS admin will review it.</p>
      )}

      {verified ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="GSTIN" value={status?.gstin || '—'}/>
          <Field label="Legal name" value={status?.legalName || '—'}/>
          <Field label="Trade name" value={status?.tradeName || '—'}/>
          <div className="sm:col-span-2">
            <Field label="Registered address" value={[status?.address, status?.city, status?.district, status?.state, status?.pincode].filter(Boolean).join(', ') || '—'}/>
          </div>
          <Field label="Constitution" value={status?.constitution || '—'}/>
          <Field label="GSTN status" value={status?.gstnStatus || 'Active'}/>
          <Field label="GST registered on" value={fmtDate(status?.registrationDate)}/>
          <Field label="BSS member since" value={fmtDate(status?.memberSince)}/>
          {status?.hasCertificate && (
            <a href={`${base}/certificate`} target="_blank" rel="noreferrer" className="sm:col-span-2 inline-flex items-center gap-1.5 text-[#073B67] text-xs font-semibold hover:underline"><FileText size={14}/>Download GST Registration Certificate (PDF)</a>
          )}
        </div>
      ) : notApplicable && !override ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">No GST</p>
            <p className="text-xs text-gray-500 mt-0.5">You&apos;ve declared that your firm is not GST-registered, so your GST / registration status is recorded as Not&nbsp;applicable. Submit your documents and a BSS admin will review and approve your account.</p>
          </div>
          <button type="button" onClick={() => setOverride(true)} className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50">I do have a GSTIN — add it</button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-gray-700 max-w-xs">GSTIN
            <input value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} maxLength={15} placeholder="15-character GSTIN" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white" />
          </label>
          <button type="button" disabled={busy || gstin.length !== 15} onClick={() => void verify()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin"/> : <BadgeCheck size={14}/>}Verify with GSTN
          </button>
        </div>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
