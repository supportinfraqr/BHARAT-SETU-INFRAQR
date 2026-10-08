"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CheckCircle2, Fingerprint, ShieldCheck, UserCheck } from "lucide-react";

type Status = {
  steps: { consent: boolean; mpin: boolean; integrations: boolean };
  integrations: Record<string, boolean>;
  complete: boolean;
};

const DISMISS_KEY = 'bss_onboarding_integrations_done';

/** Ordered worker onboarding wizard: OTP (already signed in) → Consent → Set
 *  MPIN → Government integrations. Shown as a blocking modal until the consent
 *  and MPIN steps are done; the integrations step is a dismissible nudge. */
export default function WorkerOnboardingWizard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  // MPIN sub-state
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [mpin, setMpin] = useState("");
  const [confirm, setConfirm] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/worker/onboarding/status', { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { data?: Status };
      if (res.ok && body.data) setStatus(body.data);
    } catch { /* ignore */ }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time bootstrap
  useEffect(() => { void load(); }, [load]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- read the persisted preference once
  useEffect(() => { try { setDismissed(localStorage.getItem(DISMISS_KEY) === '1'); } catch { /* ignore */ } }, []);

  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only portal mount
  useEffect(() => { setMounted(true); }, []);

  // While a blocking step (consent / MPIN) is on screen: lock page scroll and
  // hide the floating Scan & Bind / Listen actions so nothing pokes outside the
  // dimmed backdrop.
  const blocking = !!status && (!status.steps.consent || !status.steps.mpin);
  useEffect(() => {
    if (!blocking) return;
    document.body.classList.add('bss-modal-open');
    return () => document.body.classList.remove('bss-modal-open');
  }, [blocking]);

  if (!status || !mounted) return null;
  const { steps } = status;

  const step: 'consent' | 'mpin' | 'integrations' | null =
    !steps.consent ? 'consent'
      : !steps.mpin ? 'mpin'
        : (!steps.integrations && !dismissed) ? 'integrations'
          : null;
  if (!step) return null;

  async function acceptConsent() {
    if (!consentChecked) { setError('Please tick the consent box to continue.'); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/worker/onboarding/consent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; throw new Error(b.error || 'Consent could not be recorded.'); }
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Consent could not be recorded.'); }
    finally { setBusy(false); }
  }

  async function sendOtp() {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/auth/mpin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request-otp' }) });
      if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; throw new Error(b.error || 'OTP could not be sent.'); }
      setOtpSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'OTP could not be sent.'); }
    finally { setBusy(false); }
  }

  async function saveMpin() {
    if (!/^\d{4,6}$/.test(mpin)) { setError('MPIN must be 4-6 digits.'); return; }
    if (mpin !== confirm) { setError('The two MPIN entries do not match.'); return; }
    if (otp.length !== 6) { setError('Enter the six-digit OTP.'); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/auth/mpin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', mpin, otp }) });
      if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; throw new Error(b.error || 'MPIN could not be saved.'); }
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'MPIN could not be saved.'); }
    finally { setBusy(false); }
  }

  function dismissIntegrations() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  }

  const titles: Record<string, string> = {
    consent: 'Step 1 of 3 · Your consent',
    mpin: 'Step 2 of 3 · Set your MPIN',
    integrations: 'Step 3 of 3 · Government integrations',
  };

  return createPortal(
    <div
      className="z-[120] bg-black/70 backdrop-blur-md grid place-items-center p-4 overflow-hidden overscroll-none"
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100dvh', minHeight: '100vh' }}
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding"
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[calc(100dvh-2rem)] flex flex-col">
        <header className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-bold">
              {(['consent', 'mpin', 'integrations'] as const).map(s => <span key={s} className={`w-6 h-1.5 rounded-full ${steps[s] ? 'bg-emerald-500' : s === step ? 'bg-[#073B67]' : 'bg-gray-200'}`}/>)}
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 mt-2 flex items-center gap-2">
            {step === 'consent' ? <UserCheck size={18} className="text-[#073B67]"/> : step === 'mpin' ? <Fingerprint size={18} className="text-[#073B67]"/> : <ShieldCheck size={18} className="text-[#073B67]"/>}
            {titles[step]}
          </h2>
        </header>
        <div className="p-5 space-y-3 overflow-y-auto">
          {step === 'consent' && <>
            <p className="text-xs text-gray-600">Bharat Shram Setu processes your identity, employment and payroll data to run statutory compliance and site access for you. Please read and accept to continue.</p>
            <ul className="text-[11px] text-gray-500 list-disc pl-4 space-y-1">
              <li>Your data is used for compliance, attendance, wage and welfare purposes only.</li>
              <li>You may withdraw consent or update your data from your profile/settings.</li>
              <li>Government integrations (Aadhaar/PAN/Bank/ESIC/UAN) are verified with your consent.</li>
            </ul>
            <label className="flex items-start gap-2 text-xs text-gray-700"><input type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} className="accent-[#073B67] w-4 h-4 mt-0.5"/>I have read and consent to the processing of my data.</label>
            <button onClick={() => void acceptConsent()} disabled={busy} className="w-full h-10 rounded-lg bg-[#073B67] text-white text-sm font-bold disabled:opacity-50">{busy ? 'Saving…' : 'I agree & continue'}</button>
          </>}

          {step === 'mpin' && <>
            <p className="text-xs text-gray-600">Create a 4–6 digit MPIN for quick, secure login. An OTP will be sent to your registered mobile.</p>
            {!otpSent ? <button onClick={() => void sendOtp()} disabled={busy} className="w-full h-10 rounded-lg bg-[#073B67] text-white text-sm font-bold disabled:opacity-50">{busy ? 'Sending…' : 'Send OTP to my mobile'}</button>
              : <>
                <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit OTP" className="w-full h-11 rounded-lg border border-gray-200 px-3 text-center tracking-[0.3em] font-bold" />
                <input type="password" value={mpin} onChange={e => setMpin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="New MPIN (4–6 digits)" className="w-full h-11 rounded-lg border border-gray-200 px-3" />
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Confirm MPIN" className="w-full h-11 rounded-lg border border-gray-200 px-3" />
                <button onClick={() => void saveMpin()} disabled={busy} className="w-full h-10 rounded-lg bg-[#073B67] text-white text-sm font-bold disabled:opacity-50">{busy ? 'Saving…' : 'Save MPIN & continue'}</button>
              </>}
          </>}

          {step === 'integrations' && <>
            <p className="text-xs text-gray-600">Link your government identities so your records verify automatically. You can do this now or later from your profile.</p>
            <ul className="text-xs text-gray-700 space-y-1.5">
              {([['aadhaar', 'Aadhaar (UIDAI)'], ['pan', 'PAN'], ['bank', 'Bank account'], ['uan', 'UAN (EPFO)'], ['esic', 'ESIC IP']] as const).map(([k, label]) => <li key={k} className="flex items-center justify-between"><span>{label}</span>{status.integrations[k] ? <CheckCircle2 size={14} className="text-emerald-600"/> : <span className="text-[10px] font-bold text-amber-600">Pending</span>}</li>)}
            </ul>
            {/* Full navigation is intentional: a router.push to the same route
                would reuse the mounted Profile page and its one-time ?tab=
                deep-link would never re-run, leaving the Worker Identity tab. */}
            {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination */}
            <button onClick={() => { dismissIntegrations(); window.location.assign('/worker/Profile?tab=integrations'); }} className="w-full h-10 rounded-lg bg-[#073B67] text-white text-sm font-bold inline-flex items-center justify-center gap-1.5"><ArrowRight size={14}/>Open integrations</button>
            <button onClick={dismissIntegrations} className="w-full h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600">Do this later</button>
          </>}

          {error && <p role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
