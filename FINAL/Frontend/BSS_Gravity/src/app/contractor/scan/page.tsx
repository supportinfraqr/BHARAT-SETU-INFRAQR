"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { Building2, Camera, CheckCircle2, Handshake, Home, Link2, ScanLine, ShieldCheck, Upload, UserRound, XCircle } from "lucide-react";
import Link from "next/link";
import { useContractor } from "@/contexts/ContractorContext";
import { type Role } from "@/lib/permissions";

type Payload = { v: number; type: "BSS_WORKER" | "BSS_CONTRACTOR" | "BSS_EMPLOYER"; bssId: string; issuer: string };

type ScannedEntity = { kind: 'worker' | 'employer'; bssId: string; name: string; employer: string; site: string; designation: string };

export default function ContractorScanPage() {
  const { contractor } = useContractor();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewerRole, setViewerRole] = useState<Role>("Contractor Supervisor");
  const [state, setState] = useState<"idle"|"scanning"|"verified"|"error"|"binding">("idle");
  const [message, setMessage] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [entity, setEntity] = useState<ScannedEntity | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => () => controls.current?.stop(), []);

  const verify = (text: string) => {
    try {
      const p = JSON.parse(text) as Payload;
      if (!["BSS_WORKER","BSS_CONTRACTOR","BSS_EMPLOYER"].includes(p.type) || p.v !== 1 || p.issuer !== "Bharat Shram Setu") throw new Error("Unsupported QR credential");
      if (p.type === "BSS_WORKER" || p.bssId.startsWith("BSS")) {
        // Worker QR → identify worker, show relationship, request binding (never auto-bind)
        const known = contractor.workers.find(w => w.bssId === p.bssId);
        setEntity({
          kind: 'worker', bssId: p.bssId,
          name: known?.name ?? 'BSS Worker ' + p.bssId.slice(-4),
          employer: known?.employer ?? contractor.principalEmployer.name,
          site: known?.site ?? contractor.sites[0]?.name ?? 'Unassigned site',
          designation: known?.designation ?? 'Not disclosed',
        });
        setRequestSent(false);
        setState("binding");
        setMessage("Worker identified — review current relationship before requesting binding");
      } else {
        // Employer QR → request employer binding
        const known = contractor.employers.find(e => e.employerId === p.bssId || e.name.includes(p.bssId.slice(-4)));
        setEntity({ kind: 'employer', bssId: p.bssId, name: known?.name ?? 'Principal Employer ' + p.bssId.slice(-4), employer: known?.name ?? 'Principal Employer', site: known?.sites?.[0] ?? 'Site not assigned', designation: 'Billing contractor relationship' });
        setRequestSent(false);
        setState("binding");
        setMessage("Employer QR identified — employer approval is required to bind");
      }
      controls.current?.stop();
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "Invalid QR code");
      controls.current?.stop();
    }
  };

  const sendBinding = () => {
    setRequestSent(true);
    setMessage(entity?.kind === 'worker'
      ? `Binding request sent to ${entity.name}. The worker must approve before binding is complete.`
      : `Binding request sent to ${entity?.name}. The principal employer must approve before binding is complete.`);
  };

  const startCamera = async () => {
    setState("scanning"); setMessage("Point the camera at a BSS Worker or Employer QR code");
    try {
      const reader = new BrowserQRCodeReader();
      controls.current = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, videoRef.current!, r => { if (r) verify(r.getText()); });
    } catch { setState("error"); setMessage("Camera access was unavailable. Allow permission or upload a QR image."); }
  };

  const scanFile = async (file?: File) => {
    if (!file) return;
    setState("scanning"); setMessage("Reading QR image…");
    const url = URL.createObjectURL(file);
    try { verify((await new BrowserQRCodeReader().decodeFromImageUrl(url)).getText()); }
    catch { setState("error"); setMessage("No valid QR code could be read from that image."); }
    finally { URL.revokeObjectURL(url); }
  };

  const reset = () => { controls.current?.stop(); setResult(null); setEntity(null); setRequestSent(false); setMessage(""); setState("idle"); };

  return <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
      <div><h1 className="text-2xl font-bold text-[#062D4F]">QR Scan & Bind</h1><p className="text-sm text-gray-500 mt-1">Scan a Worker QR to request binding · scan an Employer QR to request employer binding.</p></div>
      <div className="flex gap-2"><Link href="/contractor/dashboard" className="p-2.5 rounded-full bg-white border" aria-label="Dashboard"><Home size={18}/></Link><Link href="/contractor/qr/requests" className="bg-[#073B67] text-white px-4 py-2.5 rounded-lg font-bold text-sm">Binding requests</Link></div>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <header className="p-4 border-b bg-gray-50 flex items-center gap-2 font-bold"><Camera size={18}/> Scanner</header>
        <div className="p-5 space-y-4">
          <label className="block text-xs font-bold text-gray-500 uppercase">Viewer relationship<select value={viewerRole} onChange={e=>setViewerRole(e.target.value as Role)} disabled={state==="scanning"} className="mt-2 w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 normal-case font-medium"><option value="Contractor Supervisor">Contractor before binding</option><option value="Contractor-Bound Worker">Bound contractor</option><option value="Employer-Bound Worker">Bound employer</option><option value="Government">Government authorised</option></select></label>
          <div className="relative bg-black rounded-xl h-64 overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className={`w-full h-full object-cover ${state==="scanning"?"block":"hidden"}`} muted playsInline/>
            {state!=="scanning"&&<div className="text-center text-white px-6">{state==="verified"?<CheckCircle2 size={48} className="mx-auto text-green-400"/>:state==="error"?<XCircle size={48} className="mx-auto text-red-400"/>:state==="binding"?<Handshake size={48} className="mx-auto text-orange-300"/>:<ScanLine size={48} className="mx-auto text-gray-400"/>}<p className="mt-3 text-sm font-semibold">{message||"Ready to scan a secure credential"}</p></div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={state==="idle"||state==="error"||state==="verified"||state==="binding"?startCamera:reset} className="bg-[#073B67] text-white py-2.5 rounded-lg font-bold text-sm"><Camera size={16} className="inline mr-2"/>{state==="scanning"?"Reset":"Use camera"}</button>
            <button onClick={()=>fileRef.current?.click()} className="border py-2.5 rounded-lg font-bold text-sm"><Upload size={16} className="inline mr-2"/>Upload image</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>scanFile(e.target.files?.[0])}/>
          <p className="text-xs text-gray-500">Camera permission is requested only while scanning. Scans are processed locally — no scan-to-autobind.</p>
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <header className="p-4 border-b bg-gray-50 flex gap-2 items-center font-bold"><ShieldCheck size={18}/> {state==="binding"?"Binding request":"Identified entity"}</header>
        <div className="p-5">
          {state==="binding"&&entity?(
            <div className="space-y-4">
              <div className="flex items-center gap-4"><span className={`w-14 h-14 rounded-full grid place-items-center ${entity.kind === 'worker' ? 'bg-orange-50 text-[#F47A32]' : 'bg-blue-50 text-blue-700'}`}>{entity.kind === 'worker' ? <UserRound size={26}/> : <Building2 size={26}/>}</span><div><h2 className="font-bold text-lg">{entity.name}</h2><code className="text-xs text-[#073B67]">{entity.bssId}</code><p className="text-xs text-orange-600 mt-1 font-semibold">{entity.kind === 'worker' ? 'Worker QR identified' : 'Employer QR identified'}</p></div></div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div><dt className="text-gray-400">Principal employer</dt><dd className="font-semibold text-gray-800 mt-0.5">{entity.employer}</dd></div>
                <div><dt className="text-gray-400">Site</dt><dd className="font-semibold text-gray-800 mt-0.5">{entity.site}</dd></div>
                <div><dt className="text-gray-400">Designation</dt><dd className="font-semibold text-gray-800 mt-0.5">{entity.designation}</dd></div>
                <div><dt className="text-gray-400">Current relationship</dt><dd className="font-semibold text-gray-800 mt-0.5">{contractor.workers.some(w => w.bssId === entity.bssId) ? 'Already bound' : 'Not bound — request required'}</dd></div>
              </dl>
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">A binding request asks {entity.kind === 'worker' ? 'the worker to accept employment' : 'the principal employer to accept the contractor relationship'}. Binding completes only after both parties approve.</p>
              {requestSent?<p className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>Binding request sent! Track it in <Link href="/contractor/qr/requests" className="underline font-bold">Binding Requests</Link>.</p>:<button onClick={sendBinding} className="w-full h-11 rounded-xl bg-[#073B67] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#062D4F]"><Link2 size={17}/>Send binding request</button>}
            </div>
          ):result?(
            <div className="space-y-5">
              <div className="flex items-center gap-4"><img src={result.identity.photoUrl} alt="Worker" className="w-16 h-16 rounded-full object-cover"/><div><h2 className="font-bold text-lg">{result.identity.name}</h2><code className="text-xs text-[#073B67]">{result.identity.bssId}</code><p className="text-xs text-green-700 mt-1">Verified BSS credential</p></div></div>
              <dl className="grid grid-cols-2 gap-3 text-sm">{result.identity.category&&<><dt className="text-gray-500">Category</dt><dd className="font-semibold">{result.identity.category}</dd></>}{result.employment?.status&&<><dt className="text-gray-500">Employment</dt><dd className="font-semibold">{result.employment.status}</dd></>}{result.employment?.site&&<><dt className="text-gray-500">Site</dt><dd className="font-semibold">{result.employment.site}</dd></>}{result.skills?.primary?.name&&<><dt className="text-gray-500">Primary skill</dt><dd className="font-semibold">{result.skills.primary.name}</dd></>}</dl>
              <p className="p-3 bg-blue-50 rounded-lg text-xs text-blue-900">Sensitive identifiers and banking details are withheld according to the selected relationship.</p>
            </div>
          ):<div className="py-20 text-center text-gray-400"><ScanLine size={44} className="mx-auto mb-3"/><p className="text-sm">Scanned result will appear here.</p></div>}
        </div>
      </section>
    </div>
  </div>;
}
