"use client";

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, FileText, Loader2, Send } from 'lucide-react';

type GstStatus = {
  gstin: string; status: string; verifiedAt: string | null;
  legalName: string; tradeName: string; constitution: string; hasCertificate: boolean;
  gstnStatus?: string; registrationDate?: string; taxpayerType?: string;
};

export default function GstVerifyCard({ role, defaultGstin = '', defaultEmail = '', onVerified }: {
  role: 'contractor' | 'employer';
  defaultGstin?: string;
  defaultEmail?: string;
  onVerified?: () => void;
}) {
  const base = `/api/${role}/gst`;
  const [status, setStatus] = useState<GstStatus | null>(null);
  const [gstin, setGstin] = useState(defaultGstin);
  const [legalName, setLegalName] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [txnId, setTxnId] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState<'details' | 'otp'>('details');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${base}/status`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: GstStatus };
      if (response.ok && body.data) {
        setStatus(body.data);
        if (body.data.gstin) setGstin(prev => prev || body.data!.gstin);
        if (body.data.legalName) setLegalName(prev => prev || body.data!.legalName);
      }
    } catch { /* ignore */ }
  }, [base]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial status load
  useEffect(() => { void load(); }, [load]);

  const verifyDetails = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${base}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin }),
      });
      const body = await response.json().catch(() => ({})) as { data?: GstStatus; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'GST lookup failed.');
      setStatus(body.data);
      setNotice(body.data.status === 'VERIFIED'
        ? `GST verified — ${body.data.legalName || body.data.gstin}.`
        : `GSTIN status: ${body.data.gstnStatus || body.data.status}. Not verified.`);
      if (body.data.status === 'VERIFIED') onVerified?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'GST lookup failed.');
    } finally { setBusy(false); }
  };

  const initiate = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${base}/initiate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin, legalName, email }),
      });
      const body = await response.json().catch(() => ({})) as { data?: { txnId?: string; message?: string }; error?: string };
      if (!response.ok || !body.data?.txnId) throw new Error(body.error ?? 'Could not send the OTP.');
      setTxnId(body.data.txnId);
      setNotice(body.data.message || 'OTP sent to the GST primary authorized signatory.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not send the OTP.');
    } finally { setBusy(false); }
  };

  const validate = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${base}/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin, otp, txnId }),
      });
      const body = await response.json().catch(() => ({})) as { data?: GstStatus; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'GST verification failed.');
      setStatus(body.data);
      setNotice('GST verified successfully.');
      if (body.data.status === 'VERIFIED') onVerified?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'GST verification failed.');
    } finally { setBusy(false); }
  };

  const verified = status?.status === 'VERIFIED';

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><BadgeCheck size={16} className="text-[#073B67]"/>GST identity verification</h2>
          <p className="text-xs text-gray-500 mt-1">Prove your entity through the GSTN Registration Certificate (API Setu). Enter your GSTIN and the primary authorized signatory receives an OTP.</p>
        </div>
        {verified && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">Verified</span>}
      </header>

      {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}
      {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

      {verified ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="GSTIN" value={status?.gstin || '—'}/>
          <Field label="Legal name" value={status?.legalName || '—'}/>
          <Field label="Trade name" value={status?.tradeName || '—'}/>
          <Field label="Constitution" value={status?.constitution || '—'}/>
          {status?.hasCertificate && (
            <a href={`${base}/certificate`} target="_blank" rel="noreferrer" className="sm:col-span-2 inline-flex items-center gap-1.5 text-[#073B67] text-xs font-semibold hover:underline"><FileText size={14}/>Download GST Registration Certificate (PDF)</a>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-[11px] font-bold">
            <button type="button" onClick={() => setMode('details')} className={`h-8 px-3 ${mode === 'details' ? 'bg-[#073B67] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>GSTIN lookup (instant)</button>
            <button type="button" onClick={() => setMode('otp')} className={`h-8 px-3 border-l border-gray-200 ${mode === 'otp' ? 'bg-[#073B67] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>OTP (Registration Certificate)</button>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-xs font-semibold text-gray-700">GSTIN
              <input value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} maxLength={15} placeholder="15-character GSTIN" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white" />
            </label>
            {mode === 'otp' && <>
              <label className="text-xs font-semibold text-gray-700">Legal name (as per GST)
                <input value={legalName} onChange={e => setLegalName(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white" />
              </label>
              <label className="text-xs font-semibold text-gray-700">Signatory email
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white" />
              </label>
            </>}
          </div>

          {mode === 'details' ? (
            <button type="button" disabled={busy || gstin.length !== 15} onClick={() => void verifyDetails()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin"/> : <BadgeCheck size={14}/>}Verify with GSTN
            </button>
          ) : !txnId ? (
            <button type="button" disabled={busy || gstin.length !== 15 || !legalName || !email} onClick={() => void initiate()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}Send OTP
            </button>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold text-gray-700">OTP
                <input value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} inputMode="numeric" className="mt-1 block w-40 h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white" />
              </label>
              <button type="button" disabled={busy || otp.length < 4} onClick={() => void validate()} className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">Verify GST</button>
              <button type="button" disabled={busy} onClick={() => { setTxnId(''); setOtp(''); }} className="h-10 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600">Resend</button>
            </div>
          )}
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
