"use client";
import { useEffect, useRef, useState } from "react";
import { IScannerControls } from "@zxing/browser";
import { Camera, CheckCircle2, Handshake, Home, ScanLine, ShieldCheck, Upload, UserRound, XCircle } from "lucide-react";
import Link from "next/link";
import { useWorker } from "@/contexts/WorkerContext";
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
  const { worker, portal } = useWorker();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const viewerRole: Role = "Guest";
  const [state, setState] = useState<"idle"|"scanning"|"verified"|"error"|"binding">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [contractor, setContractor] = useState<{bssId:string; name:string} | null>(null);
  const [contractorSite, setContractorSite] = useState("");
  const [siteCheck, setSiteCheck] = useState<'idle' | 'loading' | 'ok' | 'none'>('idle');
  const [bindSent, setBindSent] = useState(false);
  const [sentSite, setSentSite] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
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

  useEffect(() => () => controls.current?.stop(), []);

  const verify = (text: string) => {
    try {
      const p = JSON.parse(text) as Payload;
      if (!["BSS_WORKER","BSS_CONTRACTOR","BSS_EMPLOYER"].includes(p.type) || p.v !== 1 || p.issuer !== "Bharat Shram Setu") throw new Error("Unsupported QR credential");
      const isContractor = p.type === "BSS_CONTRACTOR" || p.bssId.startsWith("BSS-C") || p.bssId.startsWith("BSSC");
      const isEmployer = p.type === "BSS_EMPLOYER" || p.bssId.startsWith("BSS-E");
      if (isContractor) {
        // Contractor QR → binding request. The worker never picks a site: the
        // request always targets the contractor's default (or first) site.
        setContractor({ bssId:p.bssId, name:p.name || "Contractor " + p.bssId.slice(-4) });
        setBindSent(false); setSentSite(""); setError(""); setContractorSite(""); setSiteCheck("loading");
        setState("binding");
        setMessage("Contractor identified — checking their default site…");
        void checkContractorSite(p.bssId);
      } else if (isEmployer) {
        // Principal Employer QR → informational only for workers
        setState("error"); setMessage(`Principal Employer credential (${p.bssId}). No binding action is available for workers here.`);
      } else {
        if (p.bssId !== worker.identity.bssId) throw new Error("Worker record was not found on this device");
        setResult(sanitizeWorkerProfile(worker, viewerRole));
        setState("verified"); setMessage("Credential verified successfully");
      }
      playScanBeep(true);
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

  const reset = () => { controls.current?.stop(); setResult(null); setContractor(null); setBindSent(false); setSentSite(""); setError(""); setContractorSite(""); setSiteCheck("idle"); setConfirmOpen(false); setMessage(""); setState("idle"); };

  const requestSendBinding = () => {
    if (existingBinding) { setError(existingBinding.status === 'Accepted' ? `You are already bound to ${contractor?.name}.` : `A binding request is already pending with ${contractor?.name}.`); return; }
    if (boundContractor) { setState("error"); setMessage(`You are already bound to ${boundContractor}. Unbind first before binding with another contractor.`); return; }
    if (siteCheck !== 'ok') { setError('This contractor has no site allotted yet, so a binding cannot be requested.'); return; }
    setError("");
    setConfirmOpen(true);
  };

  return <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
      <div><h1 className="text-2xl font-bold text-[#062D4F]">QR Scan & Bind</h1><p className="text-sm text-gray-500 mt-1">Scan a Contractor QR to request binding · scan a Worker QR to verify identity.</p></div>
      <div className="flex gap-2"><Link href="/worker" className="p-2.5 rounded-full bg-white border" aria-label="Dashboard"><Home size={18}/></Link><Link href="/worker/binding" className="bg-[#073B67] text-white px-4 py-2.5 rounded-lg font-bold text-sm">My binding requests</Link></div>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <header className="p-4 border-b bg-gray-50 flex items-center gap-2 font-bold"><Camera size={18}/> Scanner</header>
        <div className="p-5 space-y-4">
          <div className="relative bg-black rounded-xl h-64 overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className={`w-full h-full object-cover ${state==="scanning"?"block":"hidden"}`} muted playsInline/>
            <ScanFrame active={state==="scanning"} />
            {state!=="scanning"&&<div className="text-center text-white px-6">{state==="verified"?<CheckCircle2 size={48} className="mx-auto text-green-400"/>:state==="error"?<XCircle size={48} className="mx-auto text-red-400"/>:state==="binding"?<Handshake size={48} className="mx-auto text-orange-300"/>:<ScanLine size={48} className="mx-auto text-gray-400"/>}<p className="mt-3 text-sm font-semibold">{message||"Ready to scan a secure credential"}</p></div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={state==="idle"||state==="error"||state==="verified"||state==="binding"?startCamera:reset} className="bg-[#073B67] text-white py-2.5 rounded-lg font-bold text-sm"><Camera size={16} className="inline mr-2"/>{state==="scanning"?"Reset":"Use camera"}</button>
            <button onClick={()=>fileRef.current?.click()} className="border py-2.5 rounded-lg font-bold text-sm"><Upload size={16} className="inline mr-2"/>Upload image</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>scanFile(e.target.files?.[0])}/>
          <p className="text-xs text-gray-500">Camera permission is requested only while scanning. Scans are processed locally.</p>
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <header className="p-4 border-b bg-gray-50 flex gap-2 items-center font-bold"><ShieldCheck size={18}/> {state==="binding"?"Contractor binding request":"Role-filtered result"}</header>
        <div className="p-5">
          {state==="binding"&&contractor?(
            <div className="space-y-4">
              <div className="flex items-center gap-4"><span className="w-14 h-14 rounded-full bg-orange-50 text-[#F47A32] grid place-items-center"><Handshake size={26}/></span><div><h2 className="font-bold text-lg">{contractor.name}</h2><code className="text-xs text-[#073B67]">{contractor.bssId}</code><p className="text-xs text-orange-600 mt-1 font-semibold">Contractor QR identified</p></div></div>
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                {siteCheck === 'loading'
                  ? 'Checking the contractor\u2019s default site…'
                  : siteCheck === 'none'
                    ? 'This contractor has no site allotted yet, so a binding cannot be requested. Ask the contractor to get a site allotted first.'
                    : <>Your request will be created at <strong>{contractorSite}</strong> — the contractor&apos;s default site. You never choose a site; binding completes only after the contractor approves.</>}
              </p>
              {error && <p role="alert" className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">{error}</p>}
              {existingBinding
                ? <p className="p-3 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-sm font-semibold flex items-center gap-2"><Handshake size={16}/>{existingBinding.status === 'Accepted' ? `You are already bound to ${contractor.name}${existingBinding.site ? ` at ${existingBinding.site}` : ''}.` : `A binding request is already pending with ${contractor.name}.`} Track it in <Link href="/worker/binding" className="underline font-bold">Binding Requests</Link>.</p>
                : bindSent
                  ? <p className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>Binding request sent{sentSite ? ` for ${sentSite}` : ''}! Track it in <Link href="/worker/binding" className="underline font-bold">Binding Requests</Link>.</p>
                  : <button onClick={requestSendBinding} disabled={busy || siteCheck !== 'ok'} className="w-full h-11 rounded-xl bg-[#073B67] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#062D4F] disabled:opacity-50 disabled:cursor-not-allowed"><Handshake size={17}/>{busy ? 'Sending…' : siteCheck === 'loading' ? 'Checking site…' : 'Send binding request'}</button>}
            </div>
          ):result?(
            <div className="space-y-5">
              <div className="flex items-center gap-4">{result.identity.photoUrl ? <img src={result.identity.photoUrl} alt="Worker" className="w-16 h-16 rounded-full object-cover"/> : <span className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 grid place-items-center text-gray-400"><UserRound size={26}/></span>}<div><h2 className="font-bold text-lg">{result.identity.name}</h2><code className="text-xs text-[#073B67]">{result.identity.bssId}</code><p className="text-xs text-green-700 mt-1">Verified BSS credential</p></div></div>
              <dl className="grid grid-cols-2 gap-3 text-sm">{result.identity.category&&<><dt className="text-gray-500">Category</dt><dd className="font-semibold">{result.identity.category}</dd></>}{result.employment?.status&&<><dt className="text-gray-500">Employment</dt><dd className="font-semibold">{result.employment.status}</dd></>}{result.employment?.site&&<><dt className="text-gray-500">Site</dt><dd className="font-semibold">{result.employment.site}</dd></>}{result.skills?.primary?.name&&<><dt className="text-gray-500">Primary skill</dt><dd className="font-semibold">{result.skills?.primary?.name}</dd></>}</dl>
              <p className="p-3 bg-blue-50 rounded-lg text-xs text-blue-900">Sensitive identifiers, family data and banking details are withheld or masked according to the selected relationship.</p>
            </div>
          ):<div className="py-20 text-center text-gray-400"><ScanLine size={44} className="mx-auto mb-3"/><p className="text-sm">Scanned result will appear here.</p></div>}
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
  </div>;
}
