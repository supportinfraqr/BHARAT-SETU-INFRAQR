"use client";
import { useEffect, useRef, useState } from "react";
import { IScannerControls } from "@zxing/browser";
import { Camera, CheckCircle2, Handshake, KeyRound, ScanLine, ShieldCheck, Upload, UserRound, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useWorker } from "@/contexts/WorkerContext";
import PageHero from "@/components/portal/PageHero";
import ScanIdentityCard, { type ScanVerifyData } from "@/components/scan/ScanIdentityCard";
import ListenButton from "@/components/worker/ListenButton";
import { Role, sanitizeWorkerProfile } from "@/lib/permissions";
import ScanFrame from "@/components/qr/ScanFrame";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { playScanBeep, primeAudio } from "@/lib/scanFeedback";
import { createQrReader, QR_VIDEO_CONSTRAINTS, applyContinuousFocus, decodeQrFromImageFile } from "@/lib/qrScanner";

type Payload = { v: number; type: "BSS_WORKER" | "BSS_CONTRACTOR" | "BSS_EMPLOYER"; bssId: string; issuer: string; name?: string };

type ScanResult = {
  identity: { name: string; bssId: string; photoUrl: string; category?: string };
  employment?: { status?: string; site?: string };
  skills?: { primary?: { name?: string } };
};

export default function QRScannerWorkflow() {
  const { worker, portal, refresh } = useWorker();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const viewerRole: Role = "Guest";
  const [state, setState] = useState<"idle"|"scanning"|"verified"|"error"|"binding">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [verifyData, setVerifyData] = useState<ScanVerifyData | null>(null);
  const [contractor, setContractor] = useState<{bssId:string; name:string} | null>(null);
  const [contractorSite, setContractorSite] = useState("");
  const [siteCheck, setSiteCheck] = useState<'idle' | 'loading' | 'ok' | 'none'>('idle');
  const [bindSent, setBindSent] = useState(false);
  const [sentContractors, setSentContractors] = useState<string[]>([]);
  const [sentSite, setSentSite] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // A worker can only be bound to one contractor at a time — while bound, a new
  // binding request is blocked until they unbind.
  const boundContractor = (worker.employment.status === 'Active' && worker.employment.contractor?.trim()) ? worker.employment.contractor : null;
  // An existing live request/binding with the scanned contractor — never offer to
  // send another request while one is already pending or active.
  const existingBinding = contractor
    ? portal.bindings.find(b => b.contractorCode === contractor.bssId && (b.status === 'Pending' || b.status === 'Accepted'))
    : undefined;
  const alreadySentToContractor = !!contractor && sentContractors.includes(contractor.bssId);

  useEffect(() => () => controls.current?.stop(), []);

  const submitManualBssId = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = manualInput.trim().toUpperCase();
    if (!raw) return;
    const isBssFormat = /^(?:BSS-?[WCES][A-Z0-9]+|BSS[WCES]?\d{6,14})$/.test(raw);
    if (!isBssFormat) {
      setState("error");
      setMessage(`"${raw}" is not a valid BSS ID format. Expected format: BSS-C... (Contractor), BSS-E... (Employer), or BSS-W... (Worker).`);
      setManualOpen(false);
      setManualInput('');
      return;
    }
    setManualOpen(false);
    setManualInput('');
    let type: "BSS_WORKER" | "BSS_CONTRACTOR" | "BSS_EMPLOYER" = "BSS_WORKER";
    if (raw.startsWith("BSS-C") || raw.startsWith("BSSC")) type = "BSS_CONTRACTOR";
    else if (raw.startsWith("BSS-E") || raw.startsWith("BSSE")) type = "BSS_EMPLOYER";
    const payload: Payload = { v: 1, type, bssId: raw, issuer: "Bharat Shram Setu" };
    void verify(JSON.stringify(payload));
  };

  const verify = async (text: string) => {
    try {
      const p = JSON.parse(text) as Payload;
      if (!["BSS_WORKER","BSS_CONTRACTOR","BSS_EMPLOYER"].includes(p.type) || p.v !== 1 || p.issuer !== "Bharat Shram Setu") throw new Error("Unsupported QR credential");
      const isContractor = p.type === "BSS_CONTRACTOR" || p.bssId.startsWith("BSS-C") || p.bssId.startsWith("BSSC");
      const isEmployer = p.type === "BSS_EMPLOYER" || p.bssId.startsWith("BSS-E") || p.bssId.startsWith("BSSE");
      playScanBeep(true);
      setVerifyData(null);
      if (isContractor) {
        // Contractor QR → binding request. The worker never picks a site: the
        // request always targets the contractor's default (or first) site.
        setContractor({ bssId:p.bssId, name:p.name || "Contractor " + p.bssId.slice(-4) });
        setBindSent(false); setSentSite(""); setError(""); setContractorSite(""); setSiteCheck("loading");
        setState("binding");
        setMessage("Contractor identified — checking their default site…");
        void checkContractorSite(p.bssId);
        // Resolve the contractor's registered name (the QR payload carries none).
        void fetch(`/api/identity/verify/${encodeURIComponent(p.bssId)}`, { cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null))
          .then((j: { data?: ScanVerifyData } | null) => {
            if (!j?.data) return;
            setVerifyData(j.data);
            const name = j.data.company || j.data.name;
            if (name) setContractor(current => current && current.bssId === p.bssId ? { ...current, name } : current);
          })
          .catch(() => {});
      } else if (isEmployer) {
        // Principal Employer QR → informational only for workers
        setState("error"); setMessage(`Principal Employer credential (${p.bssId}). No binding action is available for workers here.`);
      } else if (p.bssId === worker.identity.bssId) {
        setResult(sanitizeWorkerProfile(worker, viewerRole));
        setState("verified"); setMessage("Credential verified successfully");
        void fetch(`/api/identity/verify/${encodeURIComponent(p.bssId)}`, { cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null))
          .then((j: { data?: ScanVerifyData } | null) => { if (j?.data) setVerifyData(j.data); })
          .catch(() => {});
      } else {
        // Another worker's credential — verify it against the registry instead of
        // assuming it is "not found on this device".
        const lookup = await fetch(`/api/identity/verify/${encodeURIComponent(p.bssId)}`, { cache: 'no-store' }).catch(() => null);
        const payload = lookup && lookup.ok ? await lookup.json().catch(() => null) as { data?: ScanResult } | null : null;
        if (!payload?.data?.identity) throw new Error(`No worker record found with BSS ID "${p.bssId}".`);
        setResult(payload.data);
        setVerifyData(payload.data);
        setState("verified"); setMessage("Credential verified successfully");
      }
      controls.current?.stop();
    } catch (e) {
      playScanBeep(false);
      setState("error"); setMessage(e instanceof Error ? e.message : "Invalid QR code");
      controls.current?.stop();
    }
  };

  const checkContractorSite = async (bssId: string) => {
    try {
      const response = await fetch('/api/bindings/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'BSS_CONTRACTOR', bssId, preview: true }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { site?: string } };
      if (!response.ok) {
        setContractorSite("");
        setSiteCheck("none");
        setError(result.error || 'This contractor has no site allotted yet.');
      } else {
        setContractorSite(result.data?.site ?? "");
        setSiteCheck("ok");
      }
    } catch {
      setContractorSite("");
      setSiteCheck("none");
      setError('The contractor\u2019s default site could not be verified.');
    }
  };

  const sendBinding = async () => {
    if (!contractor) return;
    setBusy(true); setError("");
    try {
      const response = await fetch('/api/bindings/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'BSS_CONTRACTOR', bssId: contractor.bssId }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { site?: string } };
      if (!response.ok) throw new Error(result.error || 'Binding request could not be created.');
      setBindSent(true);
      setSentSite(result.data?.site ?? "");
      setSentContractors(current => current.includes(contractor.bssId) ? current : [...current, contractor.bssId]);
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Binding request could not be created.');
    } finally { setBusy(false); }
  };

  const startCamera = async () => {
    primeAudio();
    setState("scanning"); setMessage("Point the camera at a BSS Worker or Contractor QR code");
    try {
      const reader = createQrReader();
      controls.current = await reader.decodeFromConstraints(QR_VIDEO_CONSTRAINTS, videoRef.current!, r => { if (r) verify(r.getText()); });
      applyContinuousFocus(controls.current);
    } catch { setState("error"); setMessage("Camera access was unavailable. Allow permission or upload a QR image."); }
  };

  const scanFile = async (file?: File) => {
    if (!file) return;
    setState("scanning"); setMessage("Reading QR image…");
    try { verify(await decodeQrFromImageFile(file)); }
    catch { setState("error"); setMessage("No valid QR code could be read from that image."); }
  };

  const reset = () => { controls.current?.stop(); setResult(null); setVerifyData(null); setContractor(null); setBindSent(false); setSentSite(""); setError(""); setContractorSite(""); setSiteCheck("idle"); setConfirmOpen(false); setMessage(""); setState("idle"); };

  const requestSendBinding = () => {
    if (existingBinding || alreadySentToContractor) { setError(existingBinding?.status === 'Accepted' ? `You are already bound to ${contractor?.name}.` : `A binding request is already pending with ${contractor?.name}.`); return; }
    if (boundContractor) { setState("error"); setMessage(`You are already bound to ${boundContractor}. Unbind first before binding with another contractor.`); return; }
    if (siteCheck !== 'ok') { setError('This contractor has no site allotted yet, so a binding cannot be requested.'); return; }
    setError("");
    setConfirmOpen(true);
  };

  return <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
    <PageHero
      title="QR Scan & Bind"
      subtitle="Scan a Contractor QR to request binding · scan a Worker QR to verify identity."
      actions={<><ListenButton /><Link href="/worker/binding" className="bg-white text-bss-navy px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-white/90 transition-colors">My binding requests</Link></>}
    />

    <div className="grid md:grid-cols-2 gap-6">
      <section className="bss-3d bss-scroll-rise bg-white rounded-2xl border shadow-sm overflow-hidden">
        <header className="p-4 border-b border-bss-border bg-gradient-to-r from-bss-navy/5 to-transparent flex items-center gap-2 font-bold text-bss-text-primary"><span className="w-8 h-8 rounded-lg bg-bss-blue-tint text-bss-interactive-blue grid place-items-center"><Camera size={16}/></span> Scanner</header>
        <div className="p-5 space-y-4">
          <div className="relative bg-black rounded-xl h-64 overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className={`w-full h-full object-cover ${state==="scanning"?"block":"hidden"}`} muted playsInline/>
            <ScanFrame active={state==="scanning"} />
            {state!=="scanning"&&<div className="text-center text-white px-6">{state==="verified"?<CheckCircle2 size={48} className="mx-auto text-green-400 bss-pulse-halo"/>:state==="error"?<XCircle size={48} className="mx-auto text-red-400"/>:state==="binding"?<Handshake size={48} className="mx-auto text-orange-300"/>:<ScanLine size={48} className="mx-auto text-bss-text-muted bss-pulse-halo"/>}<p className="mt-3 text-sm font-semibold">{message||"Ready to scan a secure credential"}</p></div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={state==="idle"||state==="error"||state==="verified"||state==="binding"?startCamera:reset} className="bg-[#073B67] text-white py-2.5 rounded-lg font-bold text-sm"><Camera size={16} className="inline mr-2"/>{state==="scanning"?"Reset":"Use camera"}</button>
            <button onClick={()=>fileRef.current?.click()} className="border py-2.5 rounded-lg font-bold text-sm"><Upload size={16} className="inline mr-2"/>Upload image</button>
          </div>
          <button type="button" onClick={() => setManualOpen(true)} className="w-full py-2 bg-bss-bg hover:bg-bss-bg border border-bss-border text-bss-text-secondary rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"><KeyRound size={14}/>Enter BSS ID manually</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>scanFile(e.target.files?.[0])}/>
          <p className="text-xs text-bss-text-muted">Camera permission is requested only while scanning. Scans are processed locally.</p>
        </div>
      </section>

      <section className="bss-3d bss-scroll-rise bg-white rounded-2xl border shadow-sm overflow-hidden">
        <header className="p-4 border-b border-bss-border bg-gradient-to-r from-bss-navy/5 to-transparent flex gap-2 items-center font-bold text-bss-text-primary"><span className="w-8 h-8 rounded-lg bg-bss-soft-green text-bss-green grid place-items-center"><ShieldCheck size={16}/></span> {state==="binding"?"Contractor binding request":"Role-filtered result"}</header>
        <div className="p-5">
          {state==="binding"&&contractor?(
            <div className="space-y-4">
              <div className="flex items-center gap-4"><span className="w-14 h-14 rounded-full bg-orange-50 text-[#F47A32] grid place-items-center"><Handshake size={26}/></span><div><h2 className="font-bold text-lg">{contractor.name}</h2><code className="text-xs text-[#073B67]">{contractor.bssId}</code><p className="text-xs text-orange-600 mt-1 font-semibold">Contractor QR identified</p></div></div>
              {verifyData && <ScanIdentityCard data={verifyData} />}
              <p className="text-xs text-bss-text-muted bg-bss-bg rounded-xl p-3">
                {siteCheck === 'loading'
                  ? 'Checking the contractor\u2019s default site…'
                  : siteCheck === 'none'
                    ? 'This contractor has no site allotted yet, so a binding cannot be requested. Ask the contractor to get a site allotted first.'
                    : <>Your request will be created at <strong>{contractorSite}</strong> — the contractor&apos;s default site. You never choose a site; binding completes only after the contractor approves.</>}
              </p>
              {error && <p role="alert" className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">{error}</p>}
              {existingBinding || alreadySentToContractor
                ? <p className="p-3 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-sm font-semibold flex items-center gap-2"><Handshake size={16}/>{existingBinding?.status === 'Accepted' ? `You are already bound to ${contractor.name}${existingBinding.site ? ` at ${existingBinding.site}` : ''}.` : `A binding request is already pending with ${contractor.name}.`} Track it in <Link href="/worker/binding" className="underline font-bold">Binding Requests</Link>.</p>
                : bindSent
                  ? <p className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>Binding request sent{sentSite ? ` for ${sentSite}` : ''}! Track it in <Link href="/worker/binding" className="underline font-bold">Binding Requests</Link>.</p>
                  : <button onClick={requestSendBinding} disabled={busy || siteCheck !== 'ok'} className="w-full h-11 rounded-xl bg-[#073B67] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#062D4F] disabled:opacity-50 disabled:cursor-not-allowed"><Handshake size={17}/>{busy ? 'Sending…' : siteCheck === 'loading' ? 'Checking site…' : 'Send binding request'}</button>}
            </div>
          ):result?(
            <div className="space-y-5">
              {verifyData
                ? <ScanIdentityCard data={verifyData} />
                : <div className="flex items-center gap-4"><span className="w-16 h-16 rounded-full bg-bss-bg border border-bss-border grid place-items-center text-bss-text-muted"><UserRound size={26}/></span><div><h2 className="font-bold text-lg">{result.identity.name}</h2><code className="text-xs text-[#073B67]">{result.identity.bssId}</code><p className="text-xs text-green-700 mt-1">Verified BSS credential</p></div></div>}
            </div>
          ):<div className="py-20 text-center text-bss-text-muted"><ScanLine size={44} className="mx-auto mb-3"/><p className="text-sm">Scanned result will appear here.</p></div>}
        </div>
      </section>
    </div>

    <ConfirmDialog
      open={confirmOpen && !!contractor}
      tone="positive"
      title="Confirm binding request"
      description={`A binding request will be sent to ${contractor?.name ?? 'this contractor'}${contractorSite ? ` at ${contractorSite}` : ''}. Binding completes only after the contractor approves.`}
      details={contractor ? [
        { label: 'Contractor', value: contractor.name },
        { label: 'Contractor ID', value: contractor.bssId },
        { label: 'Site', value: contractorSite || '—' },
      ] : []}
      confirmLabel="Send binding request"
      busy={busy}
      onCancel={() => setConfirmOpen(false)}
      onConfirm={() => { setConfirmOpen(false); void sendBinding(); }}
    />

    {manualOpen && (
      <div className="fixed inset-0 z-50 bg-black/50 p-4 grid place-items-center" role="presentation">
        <section role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
          <header className="p-5 border-b flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-[#062D4F]">Enter BSS ID Manually</h2>
              <p className="text-xs text-bss-text-muted mt-0.5">Enter a Contractor BSS ID (BSS-C...) to request binding, or a Worker BSS ID (BSS-W...) to verify.</p>
            </div>
            <button onClick={() => setManualOpen(false)} className="text-bss-text-muted hover:text-bss-text-secondary" aria-label="Close"><X size={18}/></button>
          </header>
          <form onSubmit={submitManualBssId} className="p-5 space-y-4">
            <label className="block text-xs font-semibold text-bss-text-secondary">
              BSS ID
              <input
                required
                autoFocus
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="e.g. BSS-C12345678 or BSS-W7KQ2M9X4RT"
                className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setManualOpen(false)} className="px-4 py-2 text-xs font-semibold text-bss-text-secondary hover:bg-bss-bg rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#073B67] text-white text-xs font-bold rounded-lg hover:bg-[#062D4F]">Identify Entity</button>
            </div>
          </form>
        </section>
      </div>
    )}
  </div>;
}
