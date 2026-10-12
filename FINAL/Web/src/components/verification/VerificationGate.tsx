"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BadgeCheck, Building2, CheckCircle2, Clock3, Loader2, Send, ShieldCheck, Upload } from "lucide-react";
import GstVerifyCard from "@/components/gst/GstVerifyCard";

type VerificationStatus = {
  applicable: boolean;
  approved: boolean;
  gstVerified: boolean;
  gstStatus?: string;
  entityLocker: { verified: boolean; declined: boolean };
  manual: { status: string; note: string; documents: Array<{ id: number; docType: string; ocrVerified?: boolean; ocrNote?: string; detectedType?: string }> };
};

type DocKind = "PAN" | "AADHAAR" | "INCORPORATION" | "OTHER";
const DOC_LABELS: Record<DocKind, string> = {
  PAN: "PAN card",
  AADHAAR: "Aadhaar",
  INCORPORATION: "Incorporation / registration certificate",
  OTHER: "Other supporting document",
};
// Minimum documents required before the verification submission is allowed.
const REQUIRED_DOCS = 3;

export default function VerificationGate({ role }: { role: "contractor" | "employer" }) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [askEl, setAskEl] = useState(false);
  const [confirmNotEl, setConfirmNotEl] = useState(false);
  const [docs, setDocs] = useState<Partial<Record<DocKind, File>>>({});
  const [checks, setChecks] = useState<Partial<Record<DocKind, { busy?: boolean; verified?: boolean | null; note?: string }>>>({});
  const [askGst, setAskGst] = useState(false);
  const [showIncorp, setShowIncorp] = useState(false);
  const [incorpDate, setIncorpDate] = useState("");
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

  async function continueWithoutGst() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/${role}/gst/not-applicable`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incorporationDate: incorpDate }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "Could not continue.");
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not continue.");
    } finally { setBusy(false); }
  }

  async function checkFile(kind: DocKind, f: File) {
    setChecks(prev => ({ ...prev, [kind]: { busy: true } }));
    try {
      const form = new FormData();
      form.set("file", f);
      form.set("docType", kind);
      const response = await fetch(`/api/${role}/verification/check-document`, { method: "POST", body: form });
      const body = await response.json().catch(() => ({})) as { data?: { verified?: boolean | null; note?: string }; error?: string };
      const d = body.data ?? {};
      setChecks(prev => ({ ...prev, [kind]: { verified: d.verified ?? null, note: d.note || body.error || "" } }));
    } catch {
      setChecks(prev => ({ ...prev, [kind]: { verified: null, note: "OCR check failed" } }));
    }
  }

  async function submitManual() {
    if (Object.keys(docs).length < REQUIRED_DOCS) { setError(`Upload at least ${REQUIRED_DOCS} documents.`); return; }
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
  const { gstVerified, gstStatus, entityLocker, manual } = status;
  const gstNotApplicable = (gstStatus || "").toUpperCase() === "NOT_APPLICABLE";
  const gstCleared = gstVerified || gstNotApplicable;
  // The portal stays locked until Admin Approval is on (the single approval
  // switch), regardless of any earlier verification snapshot.
  if (status.approved) return null;

  let title = "Verify your organisation";
  let subtitle = "This step is required to use the portal and can't be skipped.";
  let body: ReactNode = null;

  if (!gstCleared) {
    title = "Step 1 · GST verification";
    if (role === "contractor") {
      // GST is optional for contractors — ask first, and route a "no GST"
      // answer straight to document submission (the admin fills the GST /
      // registration fields at approval).
      subtitle = "GST is optional for contractors. Tell us whether you have one to continue.";
      body = askGst ? (
        <GstVerifyCard role={role} onVerified={() => void load()} />
      ) : showIncorp ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">No problem — GST is optional for contractors. When was your firm incorporated?</p>
          {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
          <label className="block text-xs font-semibold text-gray-700 max-w-xs">
            Date of incorporation
            <input type="date" value={incorpDate} max={new Date().toISOString().slice(0, 10)} onChange={e => setIncorpDate(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white" />
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowIncorp(false)} disabled={busy} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600">Back</button>
            <button type="button" onClick={() => void continueWithoutGst()} disabled={busy || !incorpDate} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}Continue
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Do you have a GST number?</p>
          {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowIncorp(true)} disabled={busy} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 disabled:opacity-60">No, I don&apos;t have a GST</button>
            <button type="button" onClick={() => setAskGst(true)} disabled={busy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60"><BadgeCheck size={14}/>Yes, I have a GST</button>
          </div>
        </div>
      );
    } else {
      body = <GstVerifyCard role={role} onVerified={() => void load()} />;
    }
  } else if (gstVerified && !entityLocker.verified && !entityLocker.declined) {
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
  } else if ((entityLocker.declined || gstNotApplicable) && (manual.status === "NOT_SUBMITTED" || manual.status === "REJECTED")) {
    title = gstNotApplicable ? "Step 2 · Verification documents" : "Step 3 · Manual verification documents";
    body = (
      <div className="space-y-4">
        {manual.status === "REJECTED" && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            Your previous submission was rejected{manual.note ? `: ${manual.note}` : ""}. Please re-submit.
          </p>
        )}
        <p className="text-sm text-gray-600">Upload your identity documents (PAN, Aadhaar and any others). <strong>At least {REQUIRED_DOCS} documents are required.</strong> A BSS Admin will review and verify them.</p>
        {manual.documents.length > 0 && (
          <ul className="space-y-1.5">
            {manual.documents.map(doc => (
              <li key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border border-bss-border bg-white px-3 py-2">
                <span className="text-xs font-semibold text-bss-text-primary">{DOC_LABELS[doc.docType as DocKind] ?? doc.docType}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${doc.ocrVerified ? 'text-bss-green bg-bss-soft-green border-bss-border' : 'text-bss-orange bg-bss-soft-orange border-bss-border'}`}>
                  {doc.ocrVerified ? 'OCR verified' : `OCR: ${doc.ocrNote || 'not readable'}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          {(Object.keys(DOC_LABELS) as DocKind[]).map(kind => {
            const chk = checks[kind];
            return (
              <label key={kind} className="text-xs font-semibold text-gray-700">
                {DOC_LABELS[kind]}
                <span className="mt-1 flex items-center gap-2 h-10 px-3 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50">
                  <Upload size={14} className="text-gray-400"/>
                  <span className="text-[11px] text-gray-500 truncate">{docs[kind]?.name || "Choose a file (PDF/JPEG/PNG)"}</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setDocs(prev => ({ ...prev, [kind]: f })); void checkFile(kind, f); } }} />
                </span>
                {chk && (
                  <span className={`mt-1 flex items-center gap-1 text-[10px] font-bold ${chk.busy ? 'text-gray-400' : chk.verified === false ? 'text-bss-error' : chk.verified === true ? 'text-bss-green' : 'text-bss-orange'}`}>
                    {chk.busy ? <Loader2 size={11} className="animate-spin"/> : <CheckCircle2 size={11}/>}
                    {chk.busy ? 'Checking document…' : chk.verified === true ? 'OCR verified' : (chk.note || 'OCR not verified')}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className={`text-[11px] font-semibold ${Object.keys(docs).length >= REQUIRED_DOCS ? 'text-bss-green' : 'text-bss-orange'}`}>
            {Object.keys(docs).length}/{REQUIRED_DOCS} documents attached
            {(Object.values(checks).some(c => c?.verified === false)) && <span className="ml-2 text-bss-error">— remove unverified documents</span>}
          </span>
          <button type="button" onClick={() => void submitManual()} disabled={busy || Object.keys(docs).length < REQUIRED_DOCS || Object.values(checks).some(c => c?.busy || c?.verified === false)} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}Submit for verification
          </button>
        </div>
      </div>
    );
  } else {
    title = "Pending Admin Approval";
    body = (
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <Clock3 size={18} className="text-amber-600 mt-0.5 flex-shrink-0"/>
          <div>
            <p className="text-sm font-bold text-amber-800">Pending Admin Approval</p>
            <p className="text-xs text-amber-700 mt-0.5">Your account is with BSS for review. You&apos;ll get access once Admin Approval is on.</p>
          </div>
        </div>
        {manual.status === "REJECTED" && <p className="text-red-700 font-semibold">Rejected{manual.note ? `: ${manual.note}` : ""} — please re-submit.</p>}
        {manual.documents.length > 0 && (
          <ul className="space-y-1.5">
            {manual.documents.map(doc => (
              <li key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border border-bss-border bg-white px-3 py-2">
                <span className="text-xs font-semibold text-bss-text-primary">{DOC_LABELS[doc.docType as DocKind] ?? doc.docType}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${doc.ocrVerified ? 'text-bss-green bg-bss-soft-green border-bss-border' : 'text-bss-orange bg-bss-soft-orange border-bss-border'}`}>
                  {doc.ocrVerified ? 'OCR verified' : `OCR: ${doc.ocrNote || 'not readable'}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const icon = !gstCleared ? <BadgeCheck size={22}/> : <Building2 size={22}/>;

  return (
    <div className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-[var(--color-bss-bg)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        <header className="px-5 py-4 bg-white border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">{icon}{title}</h2>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </header>
        <div className="p-5">{body}</div>
      </div>
    </div>
  );
}
