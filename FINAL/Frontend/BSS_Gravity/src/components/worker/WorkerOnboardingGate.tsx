"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, ShieldCheck } from "lucide-react";

type Status = { mpinSet: boolean; aadhaarVerified: boolean; hasMobile: boolean };

/** Mandatory worker onboarding shown right after signup (and on first login):
 *  Step 1 — set MPIN, Step 2 — verify Aadhaar. Blocks the portal until both are
 *  done. Employer/contractor flows are unaffected. */
export default function WorkerOnboardingGate() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [mpin, setMpin] = useState("");
  const [mpinConfirm, setMpinConfirm] = useState("");
  const [mpinOtp, setMpinOtp] = useState("");
  const [mobileMask, setMobileMask] = useState("");

  const [aadhaar, setAadhaar] = useState("");
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [aadhaarRef, setAadhaarRef] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/security", { cache: "no-store" });
      const body = await response.json().catch(() => ({})) as { data?: Status };
      if (response.ok && body.data) setStatus(body.data);
    } catch { /* ignore */ }
  }, []);
  /* eslint-disable react-hooks/set-state-in-effect -- one-time bootstrap */
  useEffect(() => { void load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!status) return null;
  if (status.mpinSet && status.aadhaarVerified) return null;
  const step: "mpin" | "aadhaar" = !status.mpinSet ? "mpin" : "aadhaar";

  async function sendMpinOtp() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/mpin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request-otp" }) });
      const body = await response.json().catch(() => ({})) as { mobile?: string; error?: string };
      if (!response.ok) throw new Error(body.error || "OTP could not be sent.");
      setMobileMask(body.mobile || ""); setOtpSent(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "OTP could not be sent."); }
    finally { setBusy(false); }
  }
  async function saveMpin() {
    if (!/^\d{4,6}$/.test(mpin)) return setError("MPIN must be 4-6 digits.");
    if (mpin !== mpinConfirm) return setError("The two MPIN entries do not match.");
    if (mpinOtp.length !== 6) return setError("Enter the six-digit OTP.");
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/mpin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set", mpin, otp: mpinOtp }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "MPIN could not be saved.");
      setMpin(""); setMpinConfirm(""); setMpinOtp(""); setOtpSent(false);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "MPIN could not be saved."); }
    finally { setBusy(false); }
  }
  async function sendAadhaarOtp() {
    if (!/^\d{12}$/.test(aadhaar)) return setError("Enter a valid 12-digit Aadhaar number.");
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/aadhaar/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aadhaar }) });
      const body = await response.json().catch(() => ({})) as { referenceId?: string; error?: string };
      if (body.referenceId) setAadhaarRef(body.referenceId);
      if (!response.ok || !body.referenceId) setError(body.error || "OTP already sent — enter it below.");
      setOtpSent(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Aadhaar OTP could not be sent."); setOtpSent(true); }
    finally { setBusy(false); }
  }
  async function verifyAadhaar() {
    if (aadhaarOtp.length !== 6) return setError("Enter the six-digit OTP.");
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/worker/link-aadhaar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aadhaar, referenceId: aadhaarRef, otp: aadhaarOtp }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Aadhaar verification failed.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Aadhaar verification failed."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[96] bg-black/55 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Worker onboarding">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-8">
        <header className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            {step === "mpin" ? <Fingerprint size={18} className="text-[#073B67]" /> : <ShieldCheck size={18} className="text-[#073B67]" />}
            {step === "mpin" ? "Set your MPIN" : "Verify your Aadhaar"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {step === "mpin"
              ? "Create a 4–6 digit MPIN for quick, secure login. This step is required."
              : "Link your Aadhaar to complete onboarding. This step is required and can’t be skipped."}
          </p>
        </header>
        <div className="p-5 space-y-3">
          {step === "mpin" && (
            !otpSent ? (
              <button type="button" onClick={() => void sendMpinOtp()} disabled={busy} className="w-full h-10 rounded-lg bg-[#073B67] text-white text-sm font-bold disabled:opacity-50">{busy ? "Sending…" : "Send OTP to my mobile"}</button>
            ) : (
              <>
                <p className="text-xs text-gray-500">OTP sent to {mobileMask || "your mobile"}. Enter it below and choose an MPIN.</p>
                <input value={mpinOtp} onChange={e => setMpinOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit OTP" className="w-full h-11 rounded-lg border border-gray-200 px-3 text-center tracking-[0.3em] font-bold" />
                <input type="password" value={mpin} onChange={e => setMpin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="New MPIN (4–6 digits)" className="w-full h-11 rounded-lg border border-gray-200 px-3" />
                <input type="password" value={mpinConfirm} onChange={e => setMpinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Confirm MPIN" className="w-full h-11 rounded-lg border border-gray-200 px-3" />
                <button type="button" onClick={() => void saveMpin()} disabled={busy} className="w-full h-10 rounded-lg bg-[#073B67] text-white text-sm font-bold disabled:opacity-50">{busy ? "Saving…" : "Save MPIN"}</button>
              </>
            )
          )}
          {step === "aadhaar" && (
            <>
              <input value={aadhaar} onChange={e => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))} inputMode="numeric" placeholder="12-digit Aadhaar number" disabled={otpSent && !!aadhaarRef} className="w-full h-11 rounded-lg border border-gray-200 px-3 disabled:bg-gray-50" />
              {otpSent && (
                <input value={aadhaarOtp} onChange={e => setAadhaarOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit Aadhaar OTP" className="w-full h-11 rounded-lg border border-gray-200 px-3 text-center tracking-[0.3em] font-bold" />
              )}
              {!otpSent
                ? <button type="button" onClick={() => void sendAadhaarOtp()} disabled={busy || !/^\d{12}$/.test(aadhaar)} className="w-full h-10 rounded-lg bg-[#073B67] text-white text-sm font-bold disabled:opacity-50">{busy ? "Sending…" : "Send OTP to Aadhaar-linked mobile"}</button>
                : <button type="button" onClick={() => void verifyAadhaar()} disabled={busy} className="w-full h-10 rounded-lg bg-[#073B67] text-white text-sm font-bold disabled:opacity-50">{busy ? "Verifying…" : "Verify Aadhaar"}</button>}
            </>
          )}
          {error && <p role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
