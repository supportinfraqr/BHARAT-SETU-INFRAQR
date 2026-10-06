"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BadgeCheck, Building2, FileUp, Loader2, Send, ShieldCheck, Upload } from "lucide-react";
import GstVerifyCard from "@/components/gst/GstVerifyCard";

type VerificationStatus = {
  applicable: boolean;
  gstVerified: boolean;
  entityLocker: { verified: boolean; declined: boolean };
  manual: { status: string; note: string; documents: Array<{ id: number; docType: string }> };
};

type DocKind = "PAN" | "AADHAAR" | "INCORPORATION" | "OTHER";
const DOC_LABELS: Record<DocKind, string> = {
  PAN: "PAN card",
  AADHAAR: "Aadhaar",
  INCORPORATION: "Incorporation / registration certificate",
  OTHER: "Other supporting document",
};

export default function VerificationGate({ role }: { role: "contractor" | "employer" }) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [askEl, setAskEl] = useState(false);
  const [confirmNotEl, setConfirmNotEl] = useState(false);
  const [docs, setDocs] = useState<Partial<Record<DocKind, File>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/${role}/verification/status`, { cache: "no-store" });
      const body = await response.json().catch(() => ({})) as { data?: VerificationStatus };
      if (response.ok && body.data) setStatus(body.data);
    } catch { /* ignore */ }
  }, [role]);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time bootstrap */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      (async () => {
        try {
          await fetch("/api/entitylocker/callback", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, state }),
          });
        } catch { /* fall through */ }
        window.history.replaceState({}, "", window.location.pathname);
        window.location.reload();
      })();
      return;
    }
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function startEntityLocker() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/entitylocker/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = await response.json().catch(() => ({})) as { data?: { url?: string }; error?: string };
      if (!response.ok || !body.data?.url) throw new Error(body.error || "EntityLocker could not be started.");
      window.location.href = body.data.url;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "EntityLocker could not be started.");
      setBusy(false);
    }
  }

  async function declineEntityLocker() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/${role}/verification/decline-entitylocker`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!response.ok) throw new Error("Could not record your answer.");
      await load();
      setConfirmNotEl(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not record your answer.");
    } finally { setBusy(false); }
  }

  async function submitManual() {
    if (Object.keys(docs).length === 0) { setError("Upload at least one document."); return; }
    setBusy(true); setError("");
    try {
      const form = new FormData();
      (Object.keys(docs) as DocKind[]).forEach(kind => { const f = docs[kind]; if (f) form.append(`file_${kind}`, f); });
      const response = await fetch(`/api/${role}/verification/manual`, { method: "POST", body: form });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "The documents could not be submitted.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The documents could not be submitted.");
    } finally { setBusy(false); }
  }

  if (!status || !status.applicable) return null;
  const { gstVerified, entityLocker, manual } = status;
  const done = entityLocker.verified || manual.status === "VERIFIED";
  if (done) return null;

  let title = "Verify your organisation";
  let body: ReactNode = null;

  if (!gstVerified) {
    title = "Step 1 · GST verification";
    body = <GstVerifyCard role={role} onVerified={() => void load()} />;
  } else if (!entityLocker.verified && !entityLocker.declined) {
    title = "Step 2 · EntityLocker";
    body = askEl ? (
      confirmNotEl ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you <strong>sure</strong> you are <strong>not</strong> registered on EntityLocker (Meri Pehchaan)?
            If so, you&apos;ll need to submit documents (PAN, Aadhaar, …) for manual verification by BSS.
          </p>
          {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setConfirmNotEl(false)} disabled={busy} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600">Back</button>
            <button type="button" onClick={() => void declineEntityLocker()} disabled={busy} className="h-10 px-4 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-60">{busy ? "Saving…" : "Yes, I am not on EntityLocker"}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Is your organisation registered on the Government <strong>EntityLocker</strong> (Meri Pehchaan)?</p>
          {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setAskEl(true); setConfirmNotEl(true); }} disabled={busy} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-700">No, I&apos;m not</button>
            <button type="button" onClick={() => void startEntityLocker()} disabled={busy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin"/> : <ShieldCheck size={14}/>}Yes, verify with EntityLocker
            </button>
          </div>
        </div>
      )
    ) : (
      <div className="space-y-4">
        {manual.status === "REJECTED" && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            Your manual verification was rejected{manual.note ? `: ${manual.note}` : ""}. Choose how to proceed again.
          </p>
        )}
        <p className="text-sm text-gray-600">Your organisation is on EntityLocker? Verify once to unlock the portal.</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => { setAskEl(true); setConfirmNotEl(true); }} disabled={busy} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-700">No, I&apos;m not on EntityLocker</button>
          <button type="button" onClick={() => setAskEl(true)} disabled={busy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60">Yes, I am on EntityLocker</button>
        </div>
        <button type="button" onClick={() => void declineEntityLocker()} disabled={busy} className="text-[11px] text-gray-500 underline hover:text-gray-700">EntityLocker isn&apos;t working? Continue with document verification</button>
      </div>
    );
  } else if (entityLocker.declined && (manual.status === "NOT_SUBMITTED" || manual.status === "REJECTED")) {
    title = "Step 3 · Manual verification documents";
    body = (
      <div className="space-y-4">
        {manual.status === "REJECTED" && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            Your previous submission was rejected{manual.note ? `: ${manual.note}` : ""}. Please re-submit.
          </p>
        )}
        <p className="text-sm text-gray-600">Upload your identity documents (PAN, Aadhaar and any others). A BSS Admin will review and verify them.</p>
        {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          {(Object.keys(DOC_LABELS) as DocKind[]).map(kind => (
            <label key={kind} className="text-xs font-semibold text-gray-700">
              {DOC_LABELS[kind]}
              <span className="mt-1 flex items-center gap-2 h-10 px-3 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50">
                <Upload size={14} className="text-gray-400"/>
                <span className="text-[11px] text-gray-500 truncate">{docs[kind]?.name || "Choose a file (PDF/JPEG/PNG)"}</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setDocs(prev => ({ ...prev, [kind]: f })); }} />
              </span>
            </label>
          ))}
        </div>
        <button type="button" onClick={() => void submitManual()} disabled={busy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60">
          {busy ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}Submit for verification
        </button>
      </div>
    );
  } else {
    title = "Verification submitted";
    body = (
      <div className="space-y-3 text-sm text-gray-600">
        <p className="flex items-center gap-2"><FileUp size={15} className="text-[#073B67]"/>Your documents are with BSS for review. You&apos;ll be notified once verified.</p>
        {manual.status === "REJECTED" && <p className="text-red-700 font-semibold">Rejected{manual.note ? `: ${manual.note}` : ""} — please re-submit.</p>}
      </div>
    );
  }

  const icon = !gstVerified ? <BadgeCheck size={22}/> : <Building2 size={22}/>;

  return (
    <div className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-[var(--color-bss-bg)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        <header className="px-5 py-4 bg-white border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">{icon}{title}</h2>
          <p className="text-xs text-gray-500 mt-1">This step is required to use the portal and can&apos;t be skipped.</p>
        </header>
        <div className="p-5">{body}</div>
      </div>
    </div>
  );
}
