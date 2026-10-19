"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IScannerControls } from "@zxing/browser";
import { Briefcase, Building2, Camera, Check, CheckCircle2, Handshake, KeyRound, Link2, MapPin, ScanLine, ShieldCheck, TriangleAlert, Upload, UserRound, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useContractor } from "@/contexts/ContractorContext";
import ScanIdentityCard, { type ScanVerifyData } from "@/components/scan/ScanIdentityCard";
import ListenButton from "@/components/worker/ListenButton";
import ScanFrame from "@/components/qr/ScanFrame";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { playScanBeep, primeAudio } from "@/lib/scanFeedback";
import { createQrReader, QR_VIDEO_CONSTRAINTS, applyContinuousFocus, decodeQrFromImageFile } from "@/lib/qrScanner";

type Payload = { v: number; type: "BSS_WORKER" | "BSS_CONTRACTOR" | "BSS_EMPLOYER" | "BSS_SITE"; bssId?: string; siteToken?: string; siteCode?: string; issuer: string };

type ScannedEntity = { kind: 'worker' | 'employer'; bssId: string; name: string; employer: string; site: string; designation: string };

/** Today's date as YYYY-MM-DD (local), for the date-input max and DOJ validation. */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Stat({ icon, label, value, full }: { icon: ReactNode; label: string; value: ReactNode; full?: boolean }) {
  return (
    <div className={`min-w-0 rounded-xl border border-bss-border bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${full ? 'col-span-2' : ''}`}>
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">{icon}{label}</p>
      <p className="mt-1 text-xs font-semibold text-bss-text-primary break-words">{value}</p>
    </div>
  );
}

export default function ContractorScanPage() {
  const { contractor, refresh } = useContractor();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle"|"scanning"|"verified"|"error"|"binding">("idle");
  const [message, setMessage] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [verifyData, setVerifyData] = useState<ScanVerifyData | null>(null);
  const [entity, setEntity] = useState<ScannedEntity | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [alreadyPending, setAlreadyPending] = useState(false);
  const [sentBssIds, setSentBssIds] = useState<string[]>([]);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [workerToday, setWorkerToday] = useState<{ nextAction?: 'IN' | 'OUT'; checkIn?: string; checkOut?: string; site?: string } | null>(null);
  const [scanned, setScanned] = useState<Payload | null>(null);
  const [selectedSite, setSelectedSite] = useState(contractor.defaultSite?.name ?? contractor.sites[0]?.name ?? '');
  const [costSheets, setCostSheets] = useState<Array<{ id:number; name:string; code:string; designation?:string; status?:string; ownerId?:number|null; siteId?:number|null; siteName?:string }>>([]);
  const [costSheetId, setCostSheetId] = useState('');
  const [wageMode, setWageMode] = useState<'sheet' | 'manual'>('sheet');
  const [offeredWage, setOfferedWage] = useState('');
  const [wageError, setWageError] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [dojError, setDojError] = useState('');
  const [sendError, setSendError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const submitManualBssId = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = manualInput.trim().toUpperCase();
    if (!raw) return;
    const isBssFormat = /^(?:BSS-?[WCES][A-Z0-9]+|BSS[WCES]?\d{6,14})$/.test(raw);
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

  useEffect(() => {
    let active = true;
    fetch('/api/contractor/cost-sheets', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((j: { rows?: Array<{ id:number; name:string; code:string; designation?:string; status?:string; ownerId?:number|null; siteId?:number|null; siteName?:string }> } | null) => {
        if (active && j?.rows) setCostSheets(j.rows.filter(t => t.id >= 0));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Only the contractor's own employer-accepted (PUBLISHED) sheets for the
  // selected site are usable at binding — platform masters must be adopted,
  // submitted and accepted first.
  const selectedSiteObj = contractor.sites.find(s => s.name === selectedSite);
  const availableCostSheets = costSheets.filter(s =>
    s.status === "PUBLISHED" && !!s.ownerId &&
    (!s.siteId || String(s.siteId) === selectedSiteObj?.id));

  // A site change invalidates a previously picked sheet.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset selection on site change
  useEffect(() => { setCostSheetId(''); }, [selectedSite]);

  // The already-bound worker's live binding — used to show its cost sheet.
  const boundWorker = entity?.kind === 'worker'
    ? contractor.bindingRequests.find(b => b.type === 'Worker' && b.bssId === entity.bssId && (b.status === 'Accepted' || b.status === 'Pending'))
    : undefined;
  const isBoundWorker = entity?.kind === 'worker'
    ? contractor.workers.some(w => w.bssId === entity.bssId)
    : false;
  const relationshipLabel = entity
    ? contractor.workers.some(w => w.bssId === entity.bssId)
      ? 'Already bound'
      : alreadyPending
        ? 'Binding request pending'
        : 'Not bound — request required'
    : '';

  const verify = async (text: string) => {
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
        // Always resolve the registry record so the permission-gated detail card
        // can render (public tier when not engaged, full details once bound).
        const lookup = await fetch(`/api/identity/verify/${encodeURIComponent(bssId)}`, { cache: 'no-store' }).catch(() => null);
        const payload = lookup && lookup.ok ? await lookup.json().catch(() => null) : null;
        if (!known && !existing && !payload?.data) {
          setEntity(null);
          setScanned(null);
          setState("error");
          setMessage(`No principal employer record found with BSS ID "${bssId}". Please check the BSS ID and try again.`);
          controls.current?.stop();
          return;
        }
        if (payload?.data) setVerifyData(payload.data);
        const registryName = payload?.data?.company || payload?.data?.name || '';
        const employerName = known?.name ?? existing?.entityName ?? registryName ?? '';
        setAlreadyPending(Boolean(existing) || sentHere);
        setEntity({ kind: 'employer', bssId, name: employerName || ('Principal Employer ' + bssId.slice(-4)), employer: employerName || 'Principal Employer', site: known?.sites?.[0] ?? existing?.site ?? 'Sites to be allotted', designation: 'Billing contractor relationship' });
        setRequestSent(false);
        setState("binding");
        setMessage(existing ? `Binding request already ${existing.status.toLowerCase()} with this employer.` : "Employer QR identified — request binding; the employer approves the binding then allots sites.");
        controls.current?.stop();
        return;
      }
      if (p.type === "BSS_WORKER" || bssId.startsWith("BSS-W") || bssId.startsWith("BSSW")) {
        // Worker QR → identify worker, show relationship, request binding (never auto-bind)
        const known = contractor.workers.find(w => w.bssId === bssId);
        const pending = contractor.bindingRequests.find(b => b.bssId === bssId && b.status === 'Pending');
        let registryName = '';
        if (!known && !pending) {
          // The worker does not have to be bound already — a contractor may bind
          // any worker who exists in the BSS registry. Confirm the credential is
          // real before offering the binding request.
          const lookup = await fetch(`/api/identity/verify/${encodeURIComponent(bssId)}`, { cache: 'no-store' }).catch(() => null);
          const payload = lookup && lookup.ok ? await lookup.json().catch(() => null) : null;
          if (!payload?.data?.identity) {
            setEntity(null);
            setScanned(null);
            setState("error");
            setMessage(`No worker record found with BSS ID "${bssId}". Please check the BSS ID and try again.`);
            controls.current?.stop();
            return;
          }
          registryName = payload.data.identity.name ?? '';
        }
        const resolvedSite = known?.site ?? pending?.site ?? contractor.defaultSite?.name ?? contractor.sites[0]?.name ?? 'Unassigned site';
        setSelectedSite(resolvedSite);
        setEntity({
          kind: 'worker', bssId,
          name: (known?.name ?? pending?.entityName ?? registryName) || ('BSS Worker ' + bssId.slice(-4)),
          employer: known?.employer ?? contractor.principalEmployer.name,
          site: resolvedSite,
          designation: known?.designation ?? pending?.designation ?? 'Not disclosed',
        });
        setRequestSent(false);
        setAlreadyPending(Boolean(pending) || sentHere);
        setAttendanceMarked(false);
        setWorkerToday(null);
        setState("binding");
        setMessage(known ? "Worker is bound to you — mark today's attendance." : pending ? "Binding request already sent — awaiting the worker's approval." : "Worker identified — review current relationship before requesting binding");
        // For a bound worker, look up today's attendance so we know whether they
        // are already in the premises (so we prompt check-out instead of check-in).
        if (known) {
          const today = new Date().toISOString().slice(0, 10);
          void fetch(`/api/contractor/attendance/records?start=${today}&end=${today}`, { cache: 'no-store' })
            .then(r => (r.ok ? r.json() : null))
            .then((j: { data?: Array<{ bssId?: string; nextAction?: 'IN' | 'OUT'; checkIn?: string; checkOut?: string; site?: string }> } | null) => {
              const row = (j?.data ?? []).find(x => x.bssId === bssId);
              setWorkerToday(row ? { nextAction: row.nextAction, checkIn: row.checkIn, checkOut: row.checkOut, site: row.site } : null);
              if (row?.nextAction === 'OUT') setMessage(`${known.name} is currently in the premises — mark check-out when they leave.`);
              else if (row?.nextAction === 'IN') setMessage(`${known.name} checked out earlier — mark check-in to log their return.`);
            })
            .catch(() => setWorkerToday(null));
        }
        // Load the tiered identity record: public-safe now, extensive when bound.
        void fetch(`/api/identity/verify/${encodeURIComponent(bssId)}`, { cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null))
          .then((j: { data?: ScanVerifyData } | null) => { if (j?.data) setVerifyData(j.data); })
          .catch(() => {});
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
    const isWorkerBinding = entity.kind === 'worker';
    if (isWorkerBinding && wageMode === 'sheet' && !costSheetId) {
      setConfirmOpen(false);
      setWageError('Pick an employer-accepted cost sheet, or switch to entering a monthly wage.');
      return;
    }
    if (isWorkerBinding && wageMode === 'manual' && !(Number(offeredWage) > 0)) {
      setConfirmOpen(false);
      setWageError('Enter a valid monthly gross wage (₹).');
      return;
    }
    if (isWorkerBinding && dateOfJoining && dateOfJoining > todayIso()) {
      setConfirmOpen(false);
      setDojError('Date of joining cannot be in the future.');
      return;
    }
    setRequestSent(true);
    setSendError('');
    try {
      const response = await fetch('/api/bindings/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: scanned.type, bssId: scanned.bssId, siteToken: scanned.siteToken, site: entity.kind === 'worker' ? (selectedSite || entity.site) : entity.site, costSheetId: isWorkerBinding && wageMode === 'sheet' ? Number(costSheetId) : undefined, offeredWage: isWorkerBinding && wageMode === 'manual' && Number(offeredWage) > 0 ? Number(offeredWage) : undefined, dateOfJoining: isWorkerBinding && dateOfJoining ? dateOfJoining : undefined }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { status?: string } };
      if (!response.ok) throw new Error(result.error || 'Binding request could not be created.');
      const key = scanned.bssId || scanned.siteToken || '';
      if (key) setSentBssIds(current => current.includes(key) ? current : [...current, key]);
      setMessage(entity.kind === 'worker'
        ? `Binding request sent to ${entity.name}. The worker must approve before binding is complete.`
        : `Binding request sent — status ${result.data?.status ?? 'Pending'}. The employer approves the binding, then proposes sites.`);
      void refresh();
    } catch (e) {
      setRequestSent(false);
      setSendError(e instanceof Error ? e.message : 'Binding request could not be created.');
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
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { action?: 'IN' | 'OUT'; site?: string } };
      if (!response.ok) throw new Error(result.error || 'Attendance could not be marked.');
      setAttendanceMarked(true);
      setWorkerToday(prev => ({ nextAction: result.data?.action === 'OUT' ? 'IN' : 'OUT', checkIn: prev?.checkIn, checkOut: prev?.checkOut, site: result.data?.site ?? prev?.site }));
      setMessage(`${entity.name} — ${result.data?.action === 'OUT' ? 'checked out (final checkout)' : 'checked in'}${result.data?.site ? ` at ${result.data.site}` : ''}.`);
      void refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Attendance could not be marked.');
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

  const reset = () => { controls.current?.stop(); setResult(null); setVerifyData(null); setEntity(null); setRequestSent(false); setAttendanceMarked(false); setWorkerToday(null); setConfirmOpen(false); setMessage(""); setState("idle"); };
  // A live binding unlocks the worker's verified identity details for this contractor.

  return <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:h-[calc(100vh-3.5rem)] md:overflow-hidden lg:gap-5 lg:p-6">
    <header className="relative shrink-0 overflow-hidden rounded-3xl bss-anim-gradient bg-gradient-to-br from-bss-navy via-bss-deep-navy to-bss-interactive-blue text-white p-4 sm:p-5 shadow-lg">
      <div aria-hidden className="absolute -right-8 -top-10 w-44 h-44 rounded-full bg-white/5 blur-2xl" />
      <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">One QR · Bind · Verify</p>
          <h1 className="text-xl md:text-2xl font-bold mt-1">QR Scan &amp; Bind</h1>
          <p className="text-xs sm:text-sm text-white/75 mt-1 max-w-xl">Scan a Worker QR to request binding · scan an Employer QR to request employer binding. Identity is verified before anything is committed.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ListenButton />
          <Link href="/contractor/qr/requests" className="bg-white text-bss-navy px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-white/90 transition-colors">Binding requests</Link>
        </div>
      </div>
    </header>

    <div className="grid gap-4 md:min-h-0 md:flex-1 md:grid-cols-2 md:items-stretch lg:gap-5">
      <section className="bss-3d bss-scroll-rise bg-white rounded-3xl border border-bss-border shadow-[0_18px_50px_-32px_rgba(1,24,58,0.5)] overflow-hidden md:overflow-y-auto">
        <header className="flex items-center gap-3 border-b border-bss-border bg-gradient-to-r from-bss-navy/5 via-white to-transparent px-5 py-4"><span className="w-9 h-9 rounded-xl bg-bss-blue-tint text-bss-interactive-blue grid place-items-center flex-shrink-0"><Camera size={17}/></span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-bss-text-muted">Secure capture</p><p className="text-sm font-bold text-bss-text-primary">Scan credential</p></div></header>
        <div className="p-5 space-y-4">
          <div className="relative bg-black rounded-2xl h-64 overflow-hidden flex items-center justify-center ring-1 ring-black/5">
            <video ref={videoRef} className={`w-full h-full object-cover ${state==="scanning"?"block":"hidden"}`} muted playsInline/>
            <ScanFrame active={state==="scanning"} />
            {state!=="scanning"&&<div className="text-center text-white px-6">{state==="verified"?<CheckCircle2 size={48} className="mx-auto text-bss-soft-green bss-pulse-halo"/>:state==="error"?<XCircle size={48} className="mx-auto text-bss-orange"/>:state==="binding"?<Handshake size={48} className="mx-auto text-bss-soft-orange"/>:<ScanLine size={48} className="mx-auto text-bss-text-muted bss-pulse-halo"/>}<p className="mt-3 text-sm font-semibold">{message||"Ready to scan a secure credential"}</p></div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={state==="idle"||state==="error"||state==="verified"||state==="binding"?startCamera:reset} className="bg-[#01183A] text-white h-11 rounded-xl font-bold text-sm transition-colors hover:bg-[#022B5E]"><Camera size={16} className="inline mr-2"/>{state==="scanning"?"Reset":"Use camera"}</button>
            <button onClick={()=>fileRef.current?.click()} className="h-11 rounded-xl border border-bss-border bg-white font-bold text-sm text-bss-text-primary transition-colors hover:bg-bss-bg"><Upload size={16} className="inline mr-2"/>Upload image</button>
          </div>
          <button type="button" onClick={() => setManualOpen(true)} className="w-full h-10 bg-bss-bg hover:bg-bss-surface border border-bss-border text-bss-text-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"><KeyRound size={14}/>Enter BSS ID manually</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>scanFile(e.target.files?.[0])}/>
          <p className="text-xs text-bss-text-muted">Camera permission is requested only while scanning. Scans are processed locally — no scan-to-autobind.</p>
        </div>
      </section>

      <section className="bss-3d bss-scroll-rise flex h-[86vh] min-h-0 flex-col overflow-hidden rounded-3xl border border-bss-border bg-white shadow-[0_18px_50px_-32px_rgba(1,24,58,0.5)] md:h-full">
        <header className="relative overflow-hidden bg-gradient-to-br from-bss-navy via-bss-deep-navy to-bss-interactive-blue px-5 py-4 text-white">
          <div aria-hidden className="absolute -right-8 -top-10 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/15 text-white grid place-items-center flex-shrink-0"><ShieldCheck size={17}/></span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Scan result</p>
              <p className="text-sm font-bold truncate">{state==="binding" ? "Identity verified" : "Identified entity"}</p>
            </div>
            {isBoundWorker && <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-bold">Bound</span>}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {state==="binding"&&entity?(
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-bss-border bg-gradient-to-br from-bss-bg via-white to-bss-blue-tint/40 p-4">
                <div aria-hidden className="absolute -right-6 -bottom-8 w-28 h-28 rounded-full bg-bss-interactive-blue/5 blur-xl" />
                <div className="relative flex items-start gap-3.5">
                  <span className={`relative w-16 h-16 rounded-2xl grid place-items-center flex-shrink-0 shadow-sm ${entity.kind === 'worker' ? 'bg-bss-soft-orange text-[#E45D24]' : 'bg-bss-blue-tint text-bss-interactive-blue'}`}>
                    {entity.kind === 'worker' ? <UserRound size={28}/> : <Building2 size={28}/>}
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-bss-green ring-2 ring-white grid place-items-center"><Check size={11} strokeWidth={3} className="text-white"/></span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold leading-tight text-bss-text-primary break-words">{entity.name}</h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <code className="rounded-full border border-bss-border bg-white px-2 py-0.5 text-[11px] font-semibold text-[#01183A]">{entity.bssId}</code>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${isBoundWorker ? 'border-bss-green/20 bg-bss-soft-green text-bss-green' : alreadyPending ? 'border-bss-orange/20 bg-bss-soft-orange text-bss-orange' : 'border-bss-border bg-bss-bg text-bss-text-secondary'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isBoundWorker ? 'bg-bss-green' : alreadyPending ? 'bg-bss-orange' : 'bg-bss-text-muted'}`} />
                        {relationshipLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold text-bss-text-muted">{entity.kind === 'worker' ? 'Worker QR identified' : 'Employer QR identified'}</p>
                  </div>
                </div>
              </div>
              {isBoundWorker && entity && (
                <div className="space-y-2.5">
                  <div className="rounded-2xl border border-bss-border bg-bss-bg/60 p-3.5">
                    <div className="flex items-start gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-white border border-bss-border text-bss-interactive-blue grid place-items-center flex-shrink-0"><MapPin size={15}/></span>
                      <p className="text-xs leading-relaxed text-bss-text-secondary">Bound at <strong className="text-bss-text-primary">{entity.site}</strong>. A worker holds one active site at a time — bind this worker at another site to move them there directly; no unbind needed.</p>
                    </div>
                    {boundWorker?.costSheetName && (
                      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-bss-blue-tint px-2.5 py-1.5 text-[11px] font-semibold text-[#01183A]">
                        <Link2 size={12} className="flex-shrink-0" />
                        <span className="truncate">Cost sheet: {boundWorker.costSheetName}{boundWorker.costSheet ? <span className="font-normal text-bss-text-muted"> · {boundWorker.costSheet}</span> : null}</span>
                      </div>
                    )}
                  </div>
                  {!attendanceMarked && workerToday?.nextAction === 'OUT' && (
                    <div className="flex items-center gap-2 rounded-2xl border border-bss-green/20 bg-bss-soft-green px-3.5 py-3 text-xs font-semibold text-bss-green"><span className="w-2 h-2 rounded-full bg-bss-green animate-pulse"/> Currently in the premises{workerToday.checkIn ? ` — checked in at ${workerToday.checkIn}` : ''}.</div>
                  )}
                  {!attendanceMarked && workerToday?.nextAction === 'IN' && (
                    <div className="flex items-center gap-2 rounded-2xl border border-bss-orange/20 bg-bss-soft-orange px-3.5 py-3 text-xs font-semibold text-bss-orange"><span className="w-2 h-2 rounded-full bg-bss-orange"/> Checked out{workerToday.checkOut ? ` at ${workerToday.checkOut}` : ''}.</div>
                  )}
                  {attendanceMarked
                    ? <div className="flex items-center gap-2.5 rounded-2xl border border-bss-green/20 bg-bss-soft-green px-3.5 py-3 text-xs font-semibold text-bss-green"><CheckCircle2 size={17} className="flex-shrink-0"/>Attendance marked for {entity.name}. It is now visible on the worker&apos;s Attendance page.</div>
                    : <button onClick={markAttendance} className={`w-full h-12 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 ${workerToday?.nextAction === 'OUT' ? 'bg-bss-navy hover:bg-bss-deep-navy shadow-bss-navy/25' : 'bg-bss-green shadow-bss-green/25'}`}><CheckCircle2 size={18}/>{workerToday?.nextAction === 'OUT' ? 'Mark check-out' : workerToday?.nextAction === 'IN' ? 'Mark check-in again' : "Mark today's attendance"}</button>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <Stat icon={<Building2 size={11}/>} label="Principal employer" value={entity.employer} full />
                <Stat icon={<MapPin size={11}/>} label="Site" value={entity.site} />
                <Stat icon={<Briefcase size={11}/>} label="Designation" value={entity.designation} />
              </div>
              {verifyData && <ScanIdentityCard data={verifyData} />}
              {!isBoundWorker && <p className="rounded-2xl border border-bss-border bg-bss-bg px-3.5 py-3 text-xs leading-relaxed text-bss-text-muted">{entity.kind === 'worker' && alreadyPending ? 'A binding request is already pending with this worker. Binding completes once the worker approves it.' : `A binding request asks ${entity.kind === 'worker' ? 'the worker to accept employment' : 'the principal employer to accept the contractor relationship'}. Binding completes only after both parties approve.`}</p>}
              {entity.kind === 'worker' && !contractor.workers.some(w => w.bssId === entity.bssId) && !alreadyPending && contractor.sites.length > 0 && (
                <div className="rounded-2xl border border-bss-border bg-bss-bg/50 p-3.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-bss-text-muted mb-1.5">Site for this binding</label>
                  <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)} className="w-full h-11 rounded-xl border border-bss-border px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20">
                    {contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name}{s.employer ? ` — ${s.employer}` : ''}</option>)}
                  </select>
                  {contractor.defaultSite && <p className="text-[11px] text-bss-text-muted mt-1.5">Default site: {contractor.defaultSite.name}</p>}
                </div>
              )}
              {entity.kind === 'worker' && !contractor.workers.some(w => w.bssId === entity.bssId) && !alreadyPending && contractor.sites.length === 0 && (
                <div className="rounded-2xl border border-bss-orange/20 bg-bss-soft-orange p-3.5 text-xs text-bss-orange flex items-start gap-2">
                  <TriangleAlert size={15} className="mt-0.5 flex-shrink-0"/>
                  <div>
                    <p className="font-bold">No site available for this binding.</p>
                    <p className="mt-0.5">Ask the principal employer to allot a site to you first — you can only bind a worker to a site allotted to you.</p>
                    <Link href="/contractor/qr/requests" className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1.5 font-bold text-bss-orange">Open Binding Requests</Link>
                  </div>
                </div>
              )}
              {entity.kind === 'worker' && !contractor.workers.some(w => w.bssId === entity.bssId) && !alreadyPending && (
                <div className="space-y-3.5 rounded-2xl border border-bss-border bg-bss-bg/40 p-3.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-bss-text-muted mb-1.5">Wage terms (required)</label>
                    <div className="inline-flex rounded-xl border border-bss-border bg-bss-bg p-1 text-xs font-semibold">
                      <button type="button" onClick={() => { setWageMode('sheet'); setWageError(''); }} className={`px-3.5 py-1.5 rounded-lg transition-all ${wageMode === 'sheet' ? 'bg-white text-[#01183A] shadow-sm' : 'text-bss-text-muted hover:text-bss-text-secondary'}`}>Cost sheet</button>
                      <button type="button" onClick={() => { setWageMode('manual'); setWageError(''); }} className={`px-3.5 py-1.5 rounded-lg transition-all ${wageMode === 'manual' ? 'bg-white text-[#01183A] shadow-sm' : 'text-bss-text-muted hover:text-bss-text-secondary'}`}>Enter wage</button>
                    </div>
                    {wageMode === 'sheet' ? (
                      <>
                        <select value={costSheetId} onChange={e => { setCostSheetId(e.target.value); setWageError(''); }} disabled={!availableCostSheets.length} className="mt-2 w-full h-11 rounded-xl border border-bss-border px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20 disabled:bg-bss-bg disabled:text-bss-text-muted">
                          <option value="">{availableCostSheets.length ? "Select an employer-accepted cost sheet…" : "No accepted cost sheet for this site"}</option>
                          {availableCostSheets.map(s => <option key={s.id} value={s.id}>{s.name}{s.siteName ? ` · ${s.siteName}` : ""} · {s.code}</option>)}
                        </select>
                        {costSheetId ? (
                          <p className="text-[11px] text-[#01183A] font-semibold mt-1">Wage, statutory, custom costs and CTC are auto-computed from the cost sheet.</p>
                        ) : (
                          <p className="text-[11px] text-bss-text-muted mt-1">{availableCostSheets.length ? "Only employer-accepted cost sheets for this site can be used." : "No accepted cost sheet — switch to “Enter wage” to set a monthly wage directly."}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <input inputMode="numeric" value={offeredWage} onChange={e => { setOfferedWage(e.target.value.replace(/[^0-9]/g, '')); setWageError(''); }} placeholder="Monthly gross wage (₹)" className="mt-2 w-full h-11 rounded-xl border border-bss-border px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20" />
                        <p className="text-[11px] text-bss-text-muted mt-1">The agreed monthly gross wage. It is printed on the worker&apos;s appointment letter.</p>
                      </>
                    )}
                    {wageError && <p className="text-[11px] text-bss-error font-semibold mt-1">{wageError}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-bss-text-muted mb-1.5">Date of joining (optional)</label>
                    <input type="date" value={dateOfJoining} max={todayIso()} onChange={e => { setDateOfJoining(e.target.value); setDojError(''); }} className="w-full h-11 rounded-xl border border-bss-border px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20" />
                    <p className="text-[11px] text-bss-text-muted mt-1">The worker&apos;s real employment start date. Leave blank to use the binding date. Must be today or earlier.</p>
                    {dojError && <p className="text-[11px] text-bss-error font-semibold mt-1">{dojError}</p>}
                  </div>
                </div>
              )}
              {alreadyPending
                  ? <p className="p-3 bg-bss-soft-orange border border-bss-border text-bss-orange rounded-xl text-sm font-semibold flex items-center gap-2"><Handshake size={16}/>Binding request already sent — awaiting {entity.name}&apos;s approval. Track it in <Link href="/contractor/qr/requests" className="underline font-bold">Binding Requests</Link>.</p>
                  : requestSent
                    ? <p className="p-3 bg-bss-soft-green border border-bss-border text-bss-green rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>Binding request sent! Track it in <Link href="/contractor/qr/requests" className="underline font-bold">Binding Requests</Link>.</p>
                    : <div className="space-y-3">
                        {sendError && <p role="alert" className="p-3.5 bg-bss-soft-orange border border-bss-orange/20 text-bss-error rounded-2xl text-xs font-semibold flex items-start gap-2"><XCircle size={14} className="mt-0.5 flex-shrink-0"/><span>{sendError}</span></p>}
                        {entity.kind === 'worker' && (contractor.sites.length === 0 || (wageMode === 'sheet' ? !costSheetId : !(Number(offeredWage) > 0)))
                          ? <button type="button" disabled className="w-full h-12 rounded-2xl bg-bss-surface text-bss-text-muted text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed"><TriangleAlert size={17}/>{contractor.sites.length === 0 ? 'No site allotted — cannot bind' : wageMode === 'sheet' ? 'Pick an accepted cost sheet to bind' : 'Enter a monthly wage to bind'}</button>
                          : <button onClick={() => { setWageError(''); setDojError(''); setConfirmOpen(true); }} className="w-full h-12 rounded-2xl bg-[#01183A] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-bss-navy/20 transition-all hover:-translate-y-0.5 hover:bg-[#022B5E] active:translate-y-0"><Link2 size={17}/>Send binding request</button>}
                      </div>}
            </div>
          ):result?(
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-bss-border bg-gradient-to-br from-bss-bg via-white to-bss-blue-tint/40 p-4">
                <div aria-hidden className="absolute -right-6 -bottom-8 w-28 h-28 rounded-full bg-bss-interactive-blue/5 blur-xl" />
                <div className="relative flex items-center gap-3.5">
                  {result.identity.photoUrl
                    ? <img src={result.identity.photoUrl} alt="Worker" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow-sm"/>
                    : <span className="w-16 h-16 rounded-2xl bg-bss-bg border border-bss-border grid place-items-center text-bss-text-muted flex-shrink-0"><UserRound size={26}/></span>}
                  <div className="min-w-0">
                    <h2 className="font-bold text-lg leading-tight text-bss-text-primary break-words">{result.identity.name}</h2>
                    <code className="mt-1 inline-block rounded-full border border-bss-border bg-white px-2 py-0.5 text-[11px] font-semibold text-[#01183A]">{result.identity.bssId}</code>
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-bss-green"><CheckCircle2 size={12}/>Verified BSS credential</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {result.identity.category && <Stat label="Category" value={result.identity.category} icon={<UserRound size={11}/>} />}
                {result.employment?.status && <Stat label="Employment" value={result.employment.status} icon={<Briefcase size={11}/>} />}
                {result.employment?.site && <Stat label="Site" value={result.employment.site} icon={<MapPin size={11}/>} />}
                {result.skills?.primary?.name && <Stat label="Primary skill" value={result.skills.primary.name} icon={<ShieldCheck size={11}/>} />}
              </div>
              <p className="rounded-2xl border border-bss-blue-tint bg-bss-blue-tint/60 px-3.5 py-3 text-xs leading-relaxed text-bss-text-primary">Sensitive identifiers and banking details are withheld according to the selected relationship.</p>
            </div>
          ):(
            <div className="py-16 text-center text-bss-text-muted">
              <span className="mx-auto w-16 h-16 rounded-2xl border border-dashed border-bss-border bg-bss-bg grid place-items-center"><ScanLine size={30}/></span>
              <p className="mt-4 text-sm font-semibold text-bss-text-secondary">Scanned result will appear here</p>
              <p className="mt-1 text-xs">Scan a Worker or Employer QR to review the identity before binding.</p>
            </div>
          )}
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
        ...(entity.kind === 'worker' && wageMode === 'sheet' && costSheetId
          ? [{ label: 'Cost sheet', value: availableCostSheets.find(s => String(s.id) === costSheetId)?.name ?? 'Selected cost sheet' }]
          : []),
        ...(entity.kind === 'worker' && wageMode === 'manual' && Number(offeredWage) > 0
          ? [{ label: 'Monthly wage', value: `₹${Number(offeredWage).toLocaleString('en-IN')}` }]
          : []),
        ...(entity.kind === 'worker' ? [{ label: 'Date of joining', value: dateOfJoining || 'Binding date' }] : []),
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
              <h2 className="font-semibold text-[#022B5E]">Enter BSS ID Manually</h2>
              <p className="text-xs text-bss-text-muted mt-0.5">Enter a Worker BSS ID (BSS-W...) or Employer BSS ID (BSS-E...)</p>
            </div>
            <button onClick={() => setManualOpen(false)} className="text-bss-text-muted hover:text-bss-text-secondary" aria-label="Close"><X size={18}/></button>
          </header>
          <form onSubmit={submitManualBssId} className="p-5 space-y-4">
            <label className="block text-xs font-semibold text-bss-text-primary">
              BSS ID
              <input
                required
                autoFocus
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="e.g. BSS-W7KQ2M9X4RT or BSS-E12345678"
                className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setManualOpen(false)} className="px-4 py-2 text-xs font-semibold text-bss-text-secondary hover:bg-bss-bg rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#01183A] text-white text-xs font-bold rounded-lg hover:bg-[#022B5E]">Identify Entity</button>
            </div>
          </form>
        </section>
      </div>
    )}
  </div>;
}
