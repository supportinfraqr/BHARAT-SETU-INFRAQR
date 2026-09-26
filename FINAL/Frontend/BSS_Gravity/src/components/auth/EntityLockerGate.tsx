"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, ShieldCheck, XCircle } from "lucide-react";

/**
 * EntityLocker gate for the contractor / employer dashboard.
 *
 *  - If the browser lands here with `?code&state` (the registered EntityLocker
 *    callback URL), the verification is completed and the page reloads.
 *  - Otherwise it asks the backend whether the account's organisation is
 *    EntityLocker-verified and, if not, blocks the portal with a popup that
 *    starts the EntityLocker consent flow.
 */
export default function EntityLockerGate({ role }: { role: "contractor" | "employer" }) {
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- one-time bootstrap check */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error") || params.get("error_description");

    if (code && state) {
      (async () => {
        try {
          await fetch("/api/entitylocker/callback", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, state }),
          });
        } catch { /* fall through to reload/status */ }
        window.history.replaceState({}, "", window.location.pathname);
        window.location.reload();
      })();
      return;
    }
    if (oauthError) {
      setError(oauthError);
      window.history.replaceState({}, "", window.location.pathname);
    }
    void fetch("/api/entitylocker/status", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then((j: { data?: { applicable?: boolean; verified?: boolean } } | null) => {
        if (j?.data?.applicable && !j.data.verified) setBlocked(true);
      })
      .catch(() => {});
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function verify() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/entitylocker/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = await response.json().catch(() => ({})) as { data?: { url?: string }; error?: string };
      if (!response.ok || !body.data?.url) throw new Error(body.error || "EntityLocker verification could not be started.");
      window.location.href = body.data.url;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "EntityLocker verification failed.");
      setBusy(false);
    }
  }

  if (!blocked) {
    return error ? (
      <p role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
        EntityLocker: {error}
      </p>
    ) : null;
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-label="Verify your organisation"
        className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-[#073B67]">
          <Building2 size={26} />
        </span>
        <h2 className="mt-4 text-lg font-bold text-gray-950">Verify your organisation</h2>
        <p className="mt-1.5 text-sm text-gray-500">
          Your account is locked until your business is verified with the Government
          <strong> Entity Locker</strong> (Meri Pehchaan). Verify once to unlock the portal.
        </p>
        {error && (
          <p role="alert" className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            <XCircle size={13} /> {error}
          </p>
        )}
        <button type="button" onClick={() => void verify()} disabled={busy}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#073B67] text-sm font-bold text-white hover:bg-[#062D4F] disabled:opacity-60">
          {busy ? <><Loader2 size={16} className="animate-spin" /> Redirecting…</> : <><ShieldCheck size={16} /> Verify with EntityLocker</>}
        </button>
        <p className="mt-2 text-[11px] text-gray-400">Powered by DigiLocker · Entity Locker</p>
      </section>
    </div>
  );
}
