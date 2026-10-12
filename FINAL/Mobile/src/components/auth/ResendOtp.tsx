"use client";

import { useCallback, useEffect, useState } from "react";

export type OtpResendState = {
  resend: () => Promise<void>;
  canResend: boolean;
  remaining: number;
  exhausted: boolean;
  cooldown: number;
  busy: boolean;
  error: string;
};

/**
 * Resend-OTP controller shared by every OTP flow: allows at most `maxResends`
 * resends and enforces a `cooldownSeconds` wait between sends. The backend also
 * rate-limits OTP issuance, so this is the client-side guard rail.
 */
export function useOtpResend(
  onSend: () => Promise<void>,
  { maxResends = 3, cooldownSeconds = 30, initialCooldown = 0 }: { maxResends?: number; cooldownSeconds?: number; initialCooldown?: number } = {},
): OtpResendState {
  const [resends, setResends] = useState(0);
  const [cooldown, setCooldown] = useState(Math.max(0, initialCooldown));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(current => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const exhausted = resends >= maxResends;
  const canResend = !exhausted && cooldown === 0 && !busy;

  const resend = useCallback(async () => {
    if (resends >= maxResends || cooldown > 0 || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSend();
      setResends(current => current + 1);
      setCooldown(cooldownSeconds);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "OTP could not be resent.");
    } finally {
      setBusy(false);
    }
  }, [onSend, resends, maxResends, cooldown, busy, cooldownSeconds]);

  return { resend, canResend, remaining: Math.max(0, maxResends - resends), exhausted, cooldown, busy, error };
}

/** Compact "Resend OTP" control with the remaining count + cooldown countdown. */
export function ResendOtp({ onSend, className = "", initialCooldown = 0, cooldownSeconds = 30, maxResends = 3 }: { onSend: () => Promise<void>; className?: string; initialCooldown?: number; cooldownSeconds?: number; maxResends?: number }) {
  const { resend, canResend, remaining, exhausted, cooldown, busy, error } = useOtpResend(onSend, { initialCooldown, cooldownSeconds, maxResends });
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void resend()}
        disabled={!canResend}
        className="text-xs font-semibold text-[#073B67] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
      >
        {busy
          ? "Sending…"
          : cooldown > 0
            ? `Resend OTP in ${cooldown}s`
            : exhausted
              ? "Resend limit reached"
              : `Resend OTP (${remaining} left)`}
      </button>
      {error && <p role="alert" className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
