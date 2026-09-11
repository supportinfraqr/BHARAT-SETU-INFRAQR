"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { Camera, CheckCircle2, Handshake, Home, MapPin, ScanLine, ShieldCheck, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { useWorker } from "@/contexts/WorkerContext";
import { useNotifications } from "@/contexts/NotificationContext";
import RebindAuthModal from "@/components/worker/RebindAuthModal";
import { Role, sanitizeWorkerProfile } from "@/lib/permissions";

type Payload = { v: number; type: "BSS_WORKER" | "BSS_CONTRACTOR"; bssId: string; issuer: string };

type ScanResult = {
  identity: { name: string; bssId: string; photoUrl: string; category?: string };
  employment?: { status?: string; site?: string };
  skills?: { primary?: { name?: string } };
};

export default function QRScannerWorkflow() {
  const { worker, portal } = useWorker();
  const { addNotification } = useNotifications();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewerRole, setViewerRole] = useState<Role>("Guest");
  const [state, setState] = useState<"idle"|"scanning"|"verified"|"error"|"binding">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [contractor, setContractor] = useState<{bssId:string; name:string} | null>(null);
  const [selectedSite, setSelectedSite] = useState("");
  const [siteDraft, setSiteDraft] = useState("");
  const [bindSent, setBindSent] = useState(false);
  // Re-binding authentication gate — a worker already bound to a contractor must
  // authenticate before sending a binding request to a (new) contractor.
  const boundContractor = (worker.employment.status === 'Active' && worker.employment.contractor?.trim()) ? worker.employment.contractor : null;
  const [showAuth, setShowAuth] = useState(false);

  // Site-specific binding (E·C·S·W): a worker binds to a contractor AT a site.
  // Candidate sites come from the employer/contractor job requests already on
  // the worker portal; if none match, the worker types the site explicitly.
  const contractorSites = contractor ? portal.jobRequests
    .filter(request => {
      const token = contractor.name.split(" ")[0].toLowerCase();
      return request.contractor.toLowerCase().includes(token) || request.employer.toLowerCase().includes(token);
    })
    .map(request => ({ id: request.id, label: `${request.site} · ${request.employer}`, site: request.site })) : [];
  const uniqueSites = contractorSites.filter((item, index, all) => all.findIndex(other => other.site === item.site) === index);
  const siteValue = uniqueSites.length ? selectedSite : siteDraft.trim();

  useEffect(() => () => controls.current?.stop(), []);

  const verify = (text: string) => {
    try {
      const p = JSON.parse(text) as Payload;
      if (!["BSS_WORKER","BSS_CONTRACTOR"].includes(p.type) || p.v !== 1 || p.issuer !== "Bharat Shram Setu") throw new Error("Unsupported QR credential");
      if (p.type === "BSS_CONTRACTOR" || p.bssId.startsWith("BSSC")) {
        // Contractor QR → binding request flow (worker binds with contractor at a site)
        setContractor({ bssId:p.bssId, name:p.bssId === "BSSC198200000001" ? "RK Buildcon Pvt. Ltd." : "Contractor " + p.bssId.slice(-4) });
        setSelectedSite(""); setSiteDraft(""); setBindSent(false); setState("binding"); setMessage("Contractor identified — choose the site before sending a binding request");
      } else {
        if (p.bssId !== worker.identity.bssId) throw new Error("Worker record was not found on this device");
        setResult(sanitizeWorkerProfile(worker, viewerRole));
        setState("verified"); setMessage("Credential verified successfully");
      }
      controls.current?.stop();
    } catch (e) {
      setState("error"); setMessage(e instanceof Error ? e.message : "Invalid QR code");
      controls.current?.stop();
    }
  };

  const sendBinding = () => {
    if (!siteValue) { setMessage("Choose the site where you will work before sending the binding request."); return; }
    setBindSent(true);
    addNotification({ id:'bind-scan', entityId:`BIND-${Date.now()}`, category:'Cards', title:'Binding request sent', message:`Binding request sent to ${contractor?.name} for ${siteValue}. Binding is site-specific — the contractor and employer must approve it against this site.`, createdAt:new Date().toISOString(), href:'/worker/binding', actionLabel:'View binding requests', priority:'high', requiresAction:false, read:false, resolved:false });
  };

  const startCamera = async () => {
    setState("scanning"); setMessage("Point the camera at a BSS Worker or Contractor QR code");
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

  const reset = () => { controls.current?.stop(); setResult(null); setContractor(null); setBindSent(false); setShowAuth(false); setMessage(""); setState("idle"); };

  const requestSendBinding = () => {
    if (!siteValue) { setMessage("Choose the site where you will work before sending the binding request."); return; }
    // Worker already bound to a contractor → warn + authenticate before re-binding.
    if (boundContractor) { setShowAuth(true); return; }
    sendBinding();
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
          <label className="block text-xs font-bold text-gray-500 uppercase">Authorised viewer role<select value={viewerRole} onChange={e=>setViewerRole(e.target.value as Role)} disabled={state==="scanning"} className="mt-2 w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 normal-case font-medium"><option value="Guest">Public / unknown scanner</option><option value="Contractor Supervisor">Contractor before binding</option><option value="Contractor-Bound Worker">Bound contractor</option><option value="Employer-Bound Worker">Bound employer</option><option value="Government">Government authorised</option><option value="Worker-Own Profile">Worker — own profile</option></select></label>
          <div className="relative bg-black rounded-xl h-64 overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className={`w-full h-full object-cover ${state==="scanning"?"block":"hidden"}`} muted playsInline/>
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
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">Binding is site-specific (Employer · Contractor · <strong>Site</strong> · Worker). Choose the site where the contractor will employ you — the binding request is sent for this site only.</p>
              {!bindSent && (
                <label className="block text-xs font-semibold text-gray-700">
                  <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-[#073B67]"/>Work site for this binding *</span>
                  {uniqueSites.length ? (
                    <select required value={selectedSite} onChange={event => setSelectedSite(event.target.value)} className="mt-1.5 w-full h-11 border border-gray-200 rounded-xl px-3 text-sm bg-white">
                      <option value="">Select the site for this binding…</option>
                      {uniqueSites.map(item => <option key={item.id} value={item.site}>{item.label}</option>)}
                    </select>
                  ) : (
                    <input required value={siteDraft} onChange={event => setSiteDraft(event.target.value)} placeholder="Type the site name (e.g. Mumbai Metro Line 3)" className="mt-1.5 w-full h-11 border border-gray-200 rounded-xl px-3 text-sm"/>
                  )}
                  {!uniqueSites.length && <span className="mt-1 block text-[10px] text-gray-400">No listed job request matched this contractor on your portal — type the site name so the contractor can confirm it.</span>}
                </label>
              )}
              {bindSent?<p className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>Binding request sent for <strong>{siteValue}</strong>! Track it in <Link href="/worker/binding" className="underline font-bold">Binding Requests</Link>.</p>:<button onClick={requestSendBinding} disabled={!siteValue} className="w-full h-11 rounded-xl bg-[#073B67] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#062D4F] disabled:opacity-50 disabled:cursor-not-allowed"><Handshake size={17}/>Send binding request for this site</button>}
            </div>
          ):result?(
            <div className="space-y-5">
              <div className="flex items-center gap-4"><img src={result.identity.photoUrl} alt="Worker" className="w-16 h-16 rounded-full object-cover"/><div><h2 className="font-bold text-lg">{result.identity.name}</h2><code className="text-xs text-[#073B67]">{result.identity.bssId}</code><p className="text-xs text-green-700 mt-1">Verified BSS credential</p></div></div>
              <dl className="grid grid-cols-2 gap-3 text-sm">{result.identity.category&&<><dt className="text-gray-500">Category</dt><dd className="font-semibold">{result.identity.category}</dd></>}{result.employment?.status&&<><dt className="text-gray-500">Employment</dt><dd className="font-semibold">{result.employment.status}</dd></>}{result.employment?.site&&<><dt className="text-gray-500">Site</dt><dd className="font-semibold">{result.employment.site}</dd></>}{result.skills?.primary?.name&&<><dt className="text-gray-500">Primary skill</dt><dd className="font-semibold">{result.skills.primary.name}</dd></>}</dl>
              <p className="p-3 bg-blue-50 rounded-lg text-xs text-blue-900">Sensitive identifiers, family data and banking details are withheld or masked according to the selected relationship.</p>
            </div>
          ):<div className="py-20 text-center text-gray-400"><ScanLine size={44} className="mx-auto mb-3"/><p className="text-sm">Scanned result will appear here.</p></div>}
        </div>
      </section>
    </div>

    {showAuth && boundContractor && contractor && (
      <RebindAuthModal
        currentContractor={boundContractor}
        targetContractor={contractor.name}
        contextLabel={`Work site: ${siteValue || 'to be chosen'} · scanned contractor code ${contractor.bssId}`}
        onCancel={() => setShowAuth(false)}
        onAuthenticated={() => { setShowAuth(false); sendBinding(); }}
      />
    )}
  </div>;
}
