"use client";

import { useState } from 'react';
import { Phone, ShieldCheck, ArrowRight } from 'lucide-react';
import { useWorker } from '@/contexts/WorkerContext';
import { ResendOtp } from '@/components/auth/ResendOtp';

/**
 * Hard prompt shown to workers who onboarded with Aadhaar and therefore have no
 * mobile number (UIDAI never returns it). The worker must add and verify their
 * mobile with an OTP; it then becomes their login/contact number. There is no
 * dismiss button — the portal stays blocked until a mobile is saved.
 */
export default function MobileClaimModal() {
  const { worker, updateWorker, refresh } = useWorker();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (worker.contact.mobile && worker.contact.mobile.trim()) return null;

  const post = async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/worker/claim-mobile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({})) as { error?: string; mobile?: string };
    if (!response.ok) throw new Error(result.error || 'Could not update your mobile number.');
    return result;
  };

  const sendOtp = async () => {
    setError(''); setNotice('');
    if (!/^[6-9]\d{9}$/.test(mobile)) return setError('Enter a valid 10-digit Indian mobile number.');
    setBusy(true);
    try {
      const result = await post({ action: 'request-otp', mobile });
      setSent(true);
      setNotice(`OTP sent to ${result.mobile ?? mobile}. Enter it below to confirm.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'OTP could not be sent.'); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    setError(''); setNotice('');
    if (otp.length !== 6) return setError('Enter the six-digit OTP.');
    setBusy(true);
    try {
      await post({ action: 'verify', mobile, otp });
      updateWorker({ contact: { ...worker.contact, mobile } });
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'OTP verification failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="claim-mobile-title" className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="bg-[#01183A] text-white px-6 py-5">
          <span className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center"><Phone size={20} /></span>
          <h2 id="claim-mobile-title" className="text-lg font-bold mt-3">Add your mobile number</h2>
          <p className="text-xs text-white/80 mt-1">Your account was created with Aadhaar. Add and verify your mobile number — it becomes your login ID and contact number.</p>
        </div>
        <div className="p-6 space-y-4">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-bss-text-muted">Mobile number</span>
            <div className="mt-1.5 flex">
              <span className="bg-bss-bg border border-bss-border border-r-0 rounded-l-xl px-3 grid place-items-center text-sm font-semibold text-bss-text-muted">+91</span>
              <input type="tel" inputMode="numeric" value={mobile} disabled={sent} onChange={e => { setMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }} placeholder="10-digit mobile number" className="w-full h-11 border border-bss-border rounded-r-xl px-3 text-sm font-medium disabled:bg-bss-bg disabled:text-bss-text-muted" />
            </div>
          </label>
          {sent && (
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-bss-text-muted">OTP</span>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} placeholder="6-digit OTP" className="mt-1.5 w-full h-11 border border-bss-border rounded-xl px-3 text-center tracking-[0.4em] font-bold" />
            </label>
          )}
          {error && <p role="alert" className="text-xs text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg p-2.5">{error}</p>}
          {notice && <p role="status" className="text-xs text-bss-green bg-bss-soft-green border border-bss-border rounded-lg p-2.5">{notice}</p>}
          <button onClick={() => void (sent ? verify() : sendOtp())} disabled={busy} className="w-full h-11 rounded-xl bg-[#01183A] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? 'Please wait…' : sent ? 'Verify & save mobile' : 'Send OTP'} {sent ? <ShieldCheck size={16} /> : <ArrowRight size={16} />}
          </button>
          {sent && <button onClick={() => { setSent(false); setOtp(''); setNotice(''); }} className="w-full text-xs font-semibold text-bss-text-muted hover:text-[#01183A]">Change number</button>}
          {sent && <ResendOtp onSend={() => post({ action: 'request-otp', mobile }).then(() => undefined)} className="text-center" />}
        </div>
      </section>
    </div>
  );
}
