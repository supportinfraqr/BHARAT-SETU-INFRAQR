"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";

/** Mandatory MPIN setup for EVERY role. Shown as a blocking modal until the
 *  account has an MPIN; role-specific verification (Aadhaar / EntityLocker)
 *  runs after this. Rendered at a higher z-index so it comes first. */
export default function MpinSetupGate() {
  const [status, setStatus] = useState<{ mpinSet: boolean; hasMobile: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [mpin, setMpin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [mobileMask, setMobileMask] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/security", { cache: "no-store" });
      const body = await response.json().catch(() => ({})) as { data?: { mpinSet: boolean; hasMobile: boolean } };
      if (response.ok && body.data) setStatus(body.data);
    } catch { /* ignore */ }
  }, []);
  /* eslint-disable react-hooks/set-state-in-effect -- one-time bootstrap */
  useEffect(() => { void load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!status || status.mpinSet) return null;

  async function sendOtp() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/mpin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request-otp" }) });
      const body = await response.json().catch(() => ({})) as { mobile?: string; error?: string };
      if (!response.ok) throw new Error(body.error || "OTP could not be sent.");
      setMobileMask(body.mobile || ""); setOtpSent(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "OTP could not be sent."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!/^\d{4,6}$/.test(mpin)) return setError("MPIN must be 4-6 digits.");
    if (mpin !== confirm) return setError("The two MPIN entries do not match.");
    if (otp.length !== 6) return setError("Enter the six-digit OTP.");
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/mpin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set", mpin, otp }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "MPIN could not be saved.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "MPIN could not be saved."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[98] bg-black/60 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Set your MPIN">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-8">
        <header className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><Fingerprint size={18} className="text-[#073B67]" />Set your MPIN</h2>
          <p className="text-xs text-gray-500 mt-1">Create a 4–6 digit MPIN for quick, secure login. This step is required before you can use the portal.</p>
        </header>
        <div className="p-5 space-y-3">
          {!otpSent ? (
            <button type="button" onClick={() => void sendOtp()} disabled={busy || !status.hasMobile} title={status.hasMobile ? "" : "No mobile number on your account"} className="w-full h-10 rounded-lg bg-[#073B67] text-white text-sm font-bold disabled:opacity-50">{busy ? "Sending…" : "Send OTP to my mobile"}</button>
          ) : (
            <>
              <p className="text-xs text-gray-500">OTP sent to {mobileMask || "your mobile"}. Enter it below and choose an MPIN.</p>
              <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit OTP" className="w-full h-11 rounded-lg border border-gray-200 px-3 text-center tracking-[0.3em] font-bold" />
              <input type="password" value={mpin} onChange={e => setMpin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="New MPIN (4–6 digits)" className="w-full h-11 rounded-lg border border-gray-200 px-3" />
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Confirm MPIN" className="w-full h-11 rounded-lg border border-gray-200 px-3" />
              <button type="button" onClick={() => void save()} disabled={busy} className="w-full h-10 rounded-lg bg-[#073B67] text-white text-sm font-bold disabled:opacity-50">{busy ? "Saving…" : "Save MPIN"}</button>
            </>
          )}
          {!status.hasMobile && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">No mobile number is linked to this account, so an MPIN can’t be set here. Contact BSS support.</p>}
          {error && <p role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
