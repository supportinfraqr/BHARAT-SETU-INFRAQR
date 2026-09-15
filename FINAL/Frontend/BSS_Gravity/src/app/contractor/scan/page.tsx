"use client";
import { useEffect, useRef, useState } from "react";
import { IScannerControls } from "@zxing/browser";
import { Building2, Camera, CheckCircle2, Handshake, Home, KeyRound, Link2, ScanLine, ShieldCheck, Upload, UserRound, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useContractor } from "@/contexts/ContractorContext";
import ScanFrame from "@/components/qr/ScanFrame";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { playScanBeep, primeAudio } from "@/lib/scanFeedback";
import { createQrReader, QR_VIDEO_CONSTRAINTS, applyContinuousFocus, decodeQrFromImageFile } from "@/lib/qrScanner";

type Payload = { v: number; type: "BSS_WORKER" | "BSS_CONTRACTOR" | "BSS_EMPLOYER" | "BSS_SITE"; bssId?: string; siteToken?: string; siteCode?: string; issuer: string };

type ScannedEntity = { kind: 'worker' | 'employer'; bssId: string; name: string; employer: string; site: string; designation: string };

export default function ContractorScanPage() {
  const { contractor } = useContractor();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle"|"scanning"|"verified"|"error"|"binding">("idle");
  const [message, setMessage] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [entity, setEntity] = useState<ScannedEntity | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [alreadyPending, setAlreadyPending] = useState(false);
  const [sentBssIds, setSentBssIds] = useState<string[]>([]);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [unbindRequested, setUnbindRequested] = useState(false);
  const [scanned, setScanned] = useState<Payload | null>(null);
  const [selectedSite, setSelectedSite] = useState(contractor.defaultSite?.name ?? contractor.sites[0]?.name ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const submitManualBssId = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = manualInput.trim().toUpperCase();
    if (!raw) return;
    const isBssFormat = /^(?:BSS-[WCES][A-Z0-9]+|BSS[WCES]?\d{6,14})$/.test(raw);
    if (!isBssFormat) {
      setState("error");
      setMessage(`"${raw}" is not a valid BSS ID format. Expected format: BSS-W... (Worker), BSS-E... (Employer), or BSS-C... (Contractor).`);
      setManualOpen(false);
      setManualInput('');
      return;
    }
    setManualOpen(false);
    setManualInput('');
    let type: "BSS_WORKER" | "BSS_CONTRACTOR" | "BSS_EMPLOYER" = "BSS_WORKER";
    if (raw.startsWith("BSS-E") || raw.startsWith("BSSE")) type = "BSS_EMPLOYER";
    else if (raw.startsWith("BSS-C") || raw.startsWith("BSSC")) type = "BSS_CONTRACTOR";
    const payload: Payload = { v: 1, type, bssId: raw, issuer: "Bharat Shram Setu" };
    verify(JSON.stringify(payload));
  };

  useEffect(() => () => controls.current?.stop(), []);

  const verify = (text: string) => {
    try {
      const p = JSON.parse(text) as Payload;
      if (p.v !== 1 || p.issuer !== "Bharat Shram Setu") throw new Error("Unsupported QR credential");
      if (p.bssId && p.bssId === contractor.identity.bssId) throw new Error("This is your own QR — scan an employer's or a worker's QR.");
      playScanBeep(true);
      setScanned(p);
      setAlreadyPending(false);
      const bssId = p.bssId ?? "";
      const sentHere = sentBssIds.includes(bssId);
      if (p.type === "BSS_SITE") {
        setEntity({ kind: 'employer', bssId: p.bssId ?? '', name: `Site ${p.siteCode ?? ''}`.trim(), employer: 'Principal Employer', site: p.siteCode ?? '', designation: 'Site binding' });
        setRequestSent(false);
        setAlreadyPending(sentHere);
        setState("binding");
        setMessage("Site QR identified — request a binding. The employer approves the binding, then proposes sites for you to approve.");
        controls.current?.stop();
        return;
      }
      if (p.type === "BSS_EMPLOYER") {
        const known = contractor.employers.find(e => e.employerId === bssId);
        const existing = contractor.bindingRequests.find(b => b.type === 'Employer' && b.bssId === bssId && ['Pending', 'Accepted'].includes(b.status));
        if (!known && !existing) {
          setEntity(null);
          setScanned(null);
          setState("error");
          setMessage(`No principal employer record found with BSS ID "${bssId}". Please check the BSS ID and try again.`);
          controls.current?.stop();
          return;
        }
        setAlreadyPending(Boolean(existing) || sentHere);
        setEntity({ kind: 'employer', bssId, name: known?.name ?? existing?.entityName ?? 'Principal Employer ' + bssId.slice(-4), employer: known?.name ?? existing?.entityName ?? 'Principal Employer', site: known?.sites?.[0] ?? existing?.site ?? 'Sites to be allotted', designation: 'Billing contractor relationship' });
        setRequestSent(false);
        setState("binding");
        setMessage(existing ? `Binding request already ${existing.status.toLowerCase()} with this employer.` : "Employer QR identified — request binding; the employer approves the binding then allots sites.");
        controls.current?.stop();
        return;
      }
      if (p.type === "BSS_WORKER" || bssId.startsWith("BSS-W")) {
        // Worker QR → identify worker, show relationship, request binding (never auto-bind)
        const known = contractor.workers.find(w => w.bssId === bssId);
        const pending = contractor.bindingRequests.find(b => b.bssId === bssId && b.status === 'Pending');
        if (!known && !pending) {
          setEntity(null);
          setScanned(null);
          setState("error");
          setMessage(`No worker record found with BSS ID "${bssId}". Please check the BSS ID and try again.`);
          controls.current?.stop();
          return;
        }
        const resolvedSite = known?.site ?? pending?.site ?? contractor.defaultSite?.name ?? contractor.sites[0]?.name ?? 'Unassigned site';
        setSelectedSite(resolvedSite);
        setEntity({
          kind: 'worker', bssId,
          name: known?.name ?? pending?.entityName ?? 'BSS Worker ' + bssId.slice(-4),
          employer: known?.employer ?? contractor.principalEmployer.name,
          site: resolvedSite,
          designation: known?.designation ?? pending?.designation ?? 'Not disclosed',
        });
        setRequestSent(false);
        setAlreadyPending(Boolean(pending) || sentHere);
        setAttendanceMarked(false);
        setUnbindRequested(false);
        setState("binding");
        setMessage(known ? "Worker is bound to you — mark today's attendance." : pending ? "Binding request already sent — awaiting the worker's approval." : "Worker identified — review current relationship before requesting binding");
      } else {
        // A contractor QR — a contractor cannot bind another contractor.
        setEntity(null);
        setRequestSent(false);
        setState("error");
        setMessage("This is a Contractor QR. A contractor cannot bind another contractor — only a principal employer can engage a contractor.");
      }
      controls.current?.stop();
    } catch (e) {
      playScanBeep(false);
      setState("error");
      setMessage(e instanceof Error ? e.message : "Invalid QR code");
      controls.current?.stop();
    }
  };

  const sendBinding = async () => {
    if (!scanned || !entity) return;
    setRequestSent(true);
    try {
      const response = await fetch('/api/bindings/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: scanned.type, bssId: scanned.bssId, siteToken: scanned.siteToken, site: entity.kind === 'worker' ? (selectedSite || entity.site) : entity.site }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { status?: string } };
      if (!response.ok) throw new Error(result.error || 'Binding request could not be created.');
      const key = scanned.bssId || scanned.siteToken || '';
      if (key) setSentBssIds(current => current.includes(key) ? current : [...current, key]);
      setMessage(entity.kind === 'worker'
        ? `Binding request sent to ${entity.name}. The worker must approve before binding is complete.`
        : `Binding request sent — status ${result.data?.status ?? 'Pending'}. The employer approves the binding, then proposes sites.`);
    } catch (e) {
      setRequestSent(false);
      setMessage(e instanceof Error ? e.message : 'Binding request could not be created.');
    }
  };

  const markAttendance = async () => {
    if (!entity) return;
    try {
      const response = await fetch('/api/portal/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bssId: entity.bssId, status: 'PRESENT' }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Attendance could not be marked.');
      setAttendanceMarked(true);
      setMessage(`Attendance marked for ${entity.name} — it now appears on the worker's Attendance page.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Attendance could not be marked.');
    }
  };

  const requestUnbind = async () => {
    if (!entity) return;
    const row = contractor.bindingRequests.find(b => b.bssId === entity.bssId && b.type === 'Worker' && (b.status === 'Accepted' || b.status === 'Pending'));
    if (!row) { setMessage('No active binding found for this worker.'); return; }
    try {
      const response = await fetch('/api/worker/bindings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, action: 'unbind', side: 'contractor' }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Unbind could not be requested.');
      setUnbindRequested(true);
      setMessage(`Unbind requested for ${entity.name} — the worker must confirm. Once unbound you can bind the worker to a different site.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unbind could not be requested.');
    }
  };

  const startCamera = async () => {
    primeAudio();
    setState("scanning"); setMessage("Point the camera at a BSS Worker or Employer QR code");
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

  const reset = () => { controls.current?.stop(); setResult(null); setEntity(null); setRequestSent(false); setAttendanceMarked(false); setUnbindRequested(false); setConfirmOpen(false); setMessage(""); setState("idle"); };
  // A live binding unlocks the worker's verified identity details for this contractor.
  const boundWorker = entity ? contractor.workers.find(w => w.bssId === entity.bssId) : undefined;

  return <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
      <div><h1 className="text-2xl font-bold text-[#062D4F]">QR Scan & Bind</h1><p className="text-sm text-gray-500 mt-1">Scan a Worker QR to request binding · scan an Employer QR to request employer binding.</p></div>
      <div className="flex gap-2"><Link href="/contractor/dashboard" className="p-2.5 rounded-full bg-white border" aria-label="Dashboard"><Home size={18}/></Link><Link href="/contractor/qr/requests" className="bg-[#073B67] text-white px-4 py-2.5 rounded-lg font-bold text-sm">Binding requests</Link></div>
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
          <button type="button" onClick={() => setManualOpen(true)} className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"><KeyRound size={14}/>Enter BSS ID manually</button>
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
                <div><dt className="text-gray-400">Current relationship</dt><dd className="font-semibold text-gray-800 mt-0.5">{contractor.workers.some(w => w.bssId === entity.bssId) ? 'Already bound' : alreadyPending ? 'Binding request pending' : 'Not bound — request required'}</dd></div>
              </dl>
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">{entity.kind === 'worker' && contractor.workers.some(w => w.bssId === entity.bssId) ? 'This worker is bound to you. Mark attendance for today; it syncs to the worker\u2019s Attendance page.' : entity.kind === 'worker' && alreadyPending ? 'A binding request is already pending with this worker. Binding completes once the worker approves it.' : `A binding request asks ${entity.kind === 'worker' ? 'the worker to accept employment' : 'the principal employer to accept the contractor relationship'}. Binding completes only after both parties approve.`}</p>
              {entity.kind === 'worker' && !contractor.workers.some(w => w.bssId === entity.bssId) && !alreadyPending && contractor.sites.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Site for this binding</label>
                  <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)} className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white">
                    {contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name}{s.employer ? ` — ${s.employer}` : ''}</option>)}
                  </select>
                  {contractor.defaultSite && <p className="text-[11px] text-gray-400 mt-1">Default site: {contractor.defaultSite.name}</p>}
                </div>
              )}
              {entity.kind === 'worker' && contractor.workers.some(w => w.bssId === entity.bssId)
                ? <div className="space-y-3">
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">This worker is bound to you at <strong>{entity.site}</strong>. A worker holds one active site at a time — to move them to a different site, unbind this binding first, then bind again.</p>
                    {boundWorker && (
                      <dl className="grid grid-cols-2 gap-3 text-xs rounded-xl border border-green-100 bg-green-50/40 p-3">
                        <div><dt className="text-gray-400">Aadhaar</dt><dd className="font-mono font-semibold text-gray-800 mt-0.5">{boundWorker.aadhaar || '—'}</dd></div>
                        <div><dt className="text-gray-400">Date of birth</dt><dd className="font-semibold text-gray-800 mt-0.5">{boundWorker.dob || '—'}</dd></div>
                        <div><dt className="text-gray-400">Father&apos;s name</dt><dd className="font-semibold text-gray-800 mt-0.5">{boundWorker.fatherName || '—'}</dd></div>
                        <div><dt className="text-gray-400">Blood group</dt><dd className="font-semibold text-gray-800 mt-0.5">{boundWorker.bloodGroup || '—'}</dd></div>
                        <div className="col-span-2 text-[10px] text-green-700">Verified identity details unlocked because this worker is bound to you.</div>
                      </dl>
                    )}
                    {attendanceMarked
                      ? <p className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>Attendance marked for {entity.name}. It is now visible on the worker&apos;s Attendance page.</p>
                      : <button onClick={markAttendance} className="w-full h-11 rounded-xl bg-green-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700"><CheckCircle2 size={17}/>Mark today&apos;s attendance</button>}
                    {unbindRequested
                      ? <p className="p-3 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-sm font-semibold flex items-center gap-2"><Handshake size={16}/>Unbind requested — awaiting {entity.name}&apos;s confirmation. Track it in <Link href="/contractor/qr/requests" className="underline font-bold">Binding Requests</Link>.</p>
                      : <button onClick={requestUnbind} className="w-full h-11 rounded-xl border border-red-200 text-red-700 text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-50">Unbind to change site</button>}
                  </div>
                : alreadyPending
                  ? <p className="p-3 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-sm font-semibold flex items-center gap-2"><Handshake size={16}/>Binding request already sent — awaiting {entity.name}&apos;s approval. Track it in <Link href="/contractor/qr/requests" className="underline font-bold">Binding Requests</Link>.</p>
                  : requestSent
                    ? <p className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>Binding request sent! Track it in <Link href="/contractor/qr/requests" className="underline font-bold">Binding Requests</Link>.</p>
                    : <button onClick={() => setConfirmOpen(true)} className="w-full h-11 rounded-xl bg-[#073B67] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#062D4F]"><Link2 size={17}/>Send binding request</button>}
            </div>
          ):result?(
            <div className="space-y-5">
              <div className="flex items-center gap-4">{result.identity.photoUrl ? <img src={result.identity.photoUrl} alt="Worker" className="w-16 h-16 rounded-full object-cover"/> : <span className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 grid place-items-center text-gray-400"><UserRound size={26}/></span>}<div><h2 className="font-bold text-lg">{result.identity.name}</h2><code className="text-xs text-[#073B67]">{result.identity.bssId}</code><p className="text-xs text-green-700 mt-1">Verified BSS credential</p></div></div>
              <dl className="grid grid-cols-2 gap-3 text-sm">{result.identity.category&&<><dt className="text-gray-500">Category</dt><dd className="font-semibold">{result.identity.category}</dd></>}{result.employment?.status&&<><dt className="text-gray-500">Employment</dt><dd className="font-semibold">{result.employment.status}</dd></>}{result.employment?.site&&<><dt className="text-gray-500">Site</dt><dd className="font-semibold">{result.employment.site}</dd></>}{result.skills?.primary?.name&&<><dt className="text-gray-500">Primary skill</dt><dd className="font-semibold">{result.skills?.primary?.name}</dd></>}</dl>
              <p className="p-3 bg-blue-50 rounded-lg text-xs text-blue-900">Sensitive identifiers and banking details are withheld according to the selected relationship.</p>
            </div>
          ):<div className="py-20 text-center text-gray-400"><ScanLine size={44} className="mx-auto mb-3"/><p className="text-sm">Scanned result will appear here.</p></div>}
        </div>
      </section>
    </div>

    <ConfirmDialog
      open={confirmOpen && !!entity}
      tone="positive"
      title="Confirm binding request"
      description={entity?.kind === 'worker'
        ? `A binding request will be sent to ${entity.name}. Binding completes only after the worker approves it.`
        : scanned?.type === 'BSS_SITE'
          ? 'A binding request will be sent to this site\u2019s principal employer. The employer approves the binding, then proposes sites for you to approve.'
          : `A binding request will be sent to ${entity?.name ?? 'this employer'}. The employer approves the binding, then proposes sites.`}
      details={entity ? [
        { label: entity.kind === 'worker' ? 'Worker' : scanned?.type === 'BSS_SITE' ? 'Site' : 'Employer', value: entity.name },
        ...(entity.bssId ? [{ label: 'BSS ID', value: entity.bssId }] : []),
        { label: scanned?.type === 'BSS_SITE' ? 'Site code' : 'Site', value: (entity.kind === 'worker' ? (selectedSite || entity.site) : entity.site) || '—' },
        { label: 'Designation', value: entity.designation || '—' },
      ] : []}
      confirmLabel="Send binding request"
      onCancel={() => setConfirmOpen(false)}
      onConfirm={() => { setConfirmOpen(false); void sendBinding(); }}
    />

    {manualOpen && (
      <div className="fixed inset-0 z-50 bg-black/50 p-4 grid place-items-center" role="presentation">
        <section role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
          <header className="p-5 border-b flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-[#062D4F]">Enter BSS ID Manually</h2>
              <p className="text-xs text-gray-500 mt-0.5">Enter a Worker BSS ID (BSS-W...) or Employer BSS ID (BSS-E...)</p>
            </div>
            <button onClick={() => setManualOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close"><X size={18}/></button>
          </header>
          <form onSubmit={submitManualBssId} className="p-5 space-y-4">
            <label className="block text-xs font-semibold text-gray-700">
              BSS ID
              <input
                required
                autoFocus
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="e.g. BSS-W7KQ2M9X4RT or BSS-E12345678"
                className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setManualOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#073B67] text-white text-xs font-bold rounded-lg hover:bg-[#062D4F]">Identify Entity</button>
            </div>
          </form>
        </section>
      </div>
    )}
  </div>;
}
