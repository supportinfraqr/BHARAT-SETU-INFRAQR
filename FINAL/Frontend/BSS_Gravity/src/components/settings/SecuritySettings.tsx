"use client";

import { useState } from "react";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { ResendOtp } from "@/components/auth/ResendOtp";

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as { error?: string; mobile?: string };
  if (!response.ok) throw new Error(result.error || "The update could not be saved.");
  return result;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "mt-1.5 w-full h-11 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20";

/**
 * OTP-gated MPIN + password setup, shared by the worker, contractor and employer
 * portals. Setting either credential first sends an OTP to the account's mobile,
 * which must be entered before the change is saved.
 */
export default function SecuritySettings() {
  const [mpin, setMpin] = useState("");
  const [mpinConfirm, setMpinConfirm] = useState("");
  const [mpinOtp, setMpinOtp] = useState("");
  const [mpinOtpSent, setMpinOtpSent] = useState(false);
  const [mpinBusy, setMpinBusy] = useState(false);
  const [mpinNotice, setMpinNotice] = useState("");
  const [mpinError, setMpinError] = useState("");

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [pwOtp, setPwOtp] = useState("");
  const [pwOtpSent, setPwOtpSent] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNotice, setPwNotice] = useState("");
  const [pwError, setPwError] = useState("");

  const sendMpinOtp = async () => {
    setMpinError(""); setMpinNotice("");
    if (!/^\d{4,6}$/.test(mpin)) return setMpinError("MPIN must be 4-6 digits.");
    if (mpin !== mpinConfirm) return setMpinError("The two MPIN entries do not match.");
    setMpinBusy(true);
    try {
      const result = await postJson("/api/auth/mpin", { action: "request-otp" });
      setMpinOtpSent(true);
      setMpinNotice(`OTP sent to ${result.mobile ?? "your mobile"}. Enter it below to confirm.`);
    } catch (reason) { setMpinError(reason instanceof Error ? reason.message : "OTP could not be sent."); }
    finally { setMpinBusy(false); }
  };

  const saveMpin = async () => {
    setMpinError(""); setMpinNotice("");
    if (!/^\d{4,6}$/.test(mpin)) return setMpinError("MPIN must be 4-6 digits.");
    if (mpin !== mpinConfirm) return setMpinError("The two MPIN entries do not match.");
    if (mpinOtp.length !== 6) return setMpinError("Enter the six-digit OTP sent to your mobile.");
    setMpinBusy(true);
    try {
      await postJson("/api/auth/mpin", { action: "set", mpin, otp: mpinOtp });
      setMpinNotice("MPIN updated. Use your BSS ID / mobile with this MPIN to log in.");
      setMpin(""); setMpinConfirm(""); setMpinOtp(""); setMpinOtpSent(false);
    } catch (reason) { setMpinError(reason instanceof Error ? reason.message : "MPIN could not be saved."); }
    finally { setMpinBusy(false); }
  };

  const sendPwOtp = async () => {
    setPwError(""); setPwNotice("");
    if (password.length < 8) return setPwError("Password must be at least 8 characters.");
    if (password !== passwordConfirm) return setPwError("The two password entries do not match.");
    setPwBusy(true);
    try {
      const result = await postJson("/api/auth/password", { action: "request-otp" });
      setPwOtpSent(true);
      setPwNotice(`OTP sent to ${result.mobile ?? "your mobile"}. Enter it below to confirm.`);
    } catch (reason) { setPwError(reason instanceof Error ? reason.message : "OTP could not be sent."); }
    finally { setPwBusy(false); }
  };

  const savePassword = async () => {
    setPwError(""); setPwNotice("");
    if (password.length < 8) return setPwError("Password must be at least 8 characters.");
    if (password !== passwordConfirm) return setPwError("The two password entries do not match.");
    if (pwOtp.length !== 6) return setPwError("Enter the six-digit OTP sent to your mobile.");
    setPwBusy(true);
    try {
      await postJson("/api/auth/password", { action: "set", password, otp: pwOtp });
      setPwNotice("Password updated. Use it with your BSS ID / mobile to log in.");
      setPassword(""); setPasswordConfirm(""); setPwOtp(""); setPwOtpSent(false);
    } catch (reason) { setPwError(reason instanceof Error ? reason.message : "Password could not be saved."); }
    finally { setPwBusy(false); }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-[#073B67]/5 text-[#073B67] grid place-items-center"><KeyRound size={17} /></span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">MPIN</h2>
            <p className="text-[11px] text-gray-400">Quick 4-6 digit login PIN. An OTP confirms the change.</p>
          </div>
        </div>
        <Field label="New MPIN (4-6 digits)">
          <input type="password" inputMode="numeric" maxLength={6} value={mpin} disabled={mpinOtpSent}
            onChange={(e) => { setMpin(e.target.value.replace(/\D/g, "").slice(0, 6)); setMpinError(""); }}
            placeholder="Enter new MPIN" className={`${inputCls} disabled:bg-gray-50`} />
        </Field>
        <Field label="Confirm MPIN">
          <input type="password" inputMode="numeric" maxLength={6} value={mpinConfirm} disabled={mpinOtpSent}
            onChange={(e) => { setMpinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6)); setMpinError(""); }}
            placeholder="Re-enter MPIN" className={`${inputCls} disabled:bg-gray-50`} />
        </Field>
        {mpinOtpSent && (
          <Field label="OTP">
            <input inputMode="numeric" maxLength={6} value={mpinOtp}
              onChange={(e) => { setMpinOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setMpinError(""); }}
              placeholder="6-digit OTP" className={`${inputCls} tracking-[0.3em]`} />
          </Field>
        )}
        {mpinOtpSent && <ResendOtp onSend={() => postJson("/api/auth/mpin", { action: "request-otp" }).then(() => undefined)} className="mt-1" />}
        {mpinError && <p role="alert" className="text-[11px] text-red-600">{mpinError}</p>}
        {mpinNotice && <p role="status" className="text-[11px] text-green-700">{mpinNotice}</p>}
        {mpinOtpSent
          ? <button onClick={() => void saveMpin()} disabled={mpinBusy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-sm font-semibold disabled:opacity-60">{mpinBusy ? "Saving…" : "Verify & Set MPIN"}</button>
          : <button onClick={() => void sendMpinOtp()} disabled={mpinBusy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-sm font-semibold disabled:opacity-60">{mpinBusy ? "Sending…" : "Send OTP to set MPIN"}</button>}
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-[#073B67]/5 text-[#073B67] grid place-items-center"><Lock size={17} /></span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Password</h2>
            <p className="text-[11px] text-gray-400">Minimum 8 characters. An OTP confirms the change.</p>
          </div>
        </div>
        <Field label="New password">
          <input type="password" value={password} disabled={pwOtpSent}
            onChange={(e) => { setPassword(e.target.value); setPwError(""); }}
            placeholder="At least 8 characters" className={`${inputCls} disabled:bg-gray-50`} />
        </Field>
        <Field label="Confirm password">
          <input type="password" value={passwordConfirm} disabled={pwOtpSent}
            onChange={(e) => { setPasswordConfirm(e.target.value); setPwError(""); }}
            placeholder="Re-enter password" className={`${inputCls} disabled:bg-gray-50`} />
        </Field>
        {pwOtpSent && (
          <Field label="OTP">
            <input inputMode="numeric" maxLength={6} value={pwOtp}
              onChange={(e) => { setPwOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setPwError(""); }}
              placeholder="6-digit OTP" className={`${inputCls} tracking-[0.3em]`} />
          </Field>
        )}
        {pwOtpSent && <ResendOtp onSend={() => postJson("/api/auth/password", { action: "request-otp" }).then(() => undefined)} className="mt-1" />}
        {pwError && <p role="alert" className="text-[11px] text-red-600">{pwError}</p>}
        {pwNotice && <p role="status" className="text-[11px] text-green-700">{pwNotice}</p>}
        {pwOtpSent
          ? <button onClick={() => void savePassword()} disabled={pwBusy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-sm font-semibold disabled:opacity-60">{pwBusy ? "Saving…" : "Verify & Set Password"}</button>
          : <button onClick={() => void sendPwOtp()} disabled={pwBusy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-sm font-semibold disabled:opacity-60">{pwBusy ? "Sending…" : "Send OTP to set Password"}</button>}
      </section>

      <p className="lg:col-span-2 flex items-start gap-2 text-[11px] text-gray-500 bg-blue-50/60 border border-blue-100 rounded-xl px-3 py-2.5">
        <ShieldCheck size={14} className="text-[#073B67] mt-0.5 flex-shrink-0" />
        For your security, the OTP is sent to the mobile number registered on your account. If you no longer have access to it, contact BSS support.
      </p>
    </div>
  );
}
