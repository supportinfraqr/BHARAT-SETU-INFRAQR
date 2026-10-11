"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

/** Mandatory worker Aadhaar verification — runs AFTER the MPIN gate. Blocks the
 *  worker portal until Aadhaar is linked. */
export default function WorkerOnboardingGate() {
  const [status, setStatus] = useState<{ aadhaarVerified: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [aadhaar, setAadhaar] = useState("");
  const [otp, setOtp] = useState("");
  const [reference, setReference] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/security", { cache: "no-store" });
      const body = await response.json().catch(() => ({})) as { data?: { aadhaarVerified: boolean } };
      if (response.ok && body.data) setStatus(body.data);
    } catch { /* ignore */ }
  }, []);
  /* eslint-disable react-hooks/set-state-in-effect -- one-time bootstrap */
  useEffect(() => { void load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!status || status.aadhaarVerified) return null;

  async function sendOtp() {
    if (!/^\d{12}$/.test(aadhaar)) return setError("Enter a valid 12-digit Aadhaar number.");
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/aadhaar/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aadhaar }) });
      const body = await response.json().catch(() => ({})) as { referenceId?: string; error?: string };
      if (body.referenceId) setReference(body.referenceId);
      if (!response.ok || !body.referenceId) setError(body.error || "OTP already sent — enter it below.");
      setOtpSent(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Aadhaar OTP could not be sent."); setOtpSent(true); }
    finally { setBusy(false); }
  }
  async function verify() {
    if (otp.length !== 6) return setError("Enter the six-digit OTP.");
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/worker/link-aadhaar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aadhaar, referenceId: reference, otp }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Aadhaar verification failed.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Aadhaar verification failed."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[96] bg-black/55 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Verify your Aadhaar">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-8">
        <header className="px-5 py-4 border-b border-bss-border">
          <h2 className="text-base font-bold text-bss-text-primary flex items-center gap-2"><ShieldCheck size={18} className="text-[#01183A]" />Verify your Aadhaar</h2>
          <p className="text-xs text-bss-text-muted mt-1">Link your Aadhaar to complete onboarding. This step is required and can’t be skipped.</p>
        </header>
        <div className="p-5 space-y-3">
          <input value={aadhaar} onChange={e => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))} inputMode="numeric" placeholder="12-digit Aadhaar number" disabled={otpSent && !!reference} className="w-full h-11 rounded-lg border border-bss-border px-3 disabled:bg-bss-bg" />
          {otpSent && <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit Aadhaar OTP" className="w-full h-11 rounded-lg border border-bss-border px-3 text-center tracking-[0.3em] font-bold" />}
          {!otpSent
            ? <button type="button" onClick={() => void sendOtp()} disabled={busy || !/^\d{12}$/.test(aadhaar)} className="w-full h-10 rounded-lg bg-[#01183A] text-white text-sm font-bold disabled:opacity-50">{busy ? "Sending…" : "Send OTP to Aadhaar-linked mobile"}</button>
            : <button type="button" onClick={() => void verify()} disabled={busy} className="w-full h-10 rounded-lg bg-[#01183A] text-white text-sm font-bold disabled:opacity-50">{busy ? "Verifying…" : "Verify Aadhaar"}</button>}
          {error && <p role="alert" className="text-xs font-semibold text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg px-3 py-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
