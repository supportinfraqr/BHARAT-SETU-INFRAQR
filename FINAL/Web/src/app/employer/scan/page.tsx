"use client";

import { useEffect, useRef, useState } from 'react';
import { IScannerControls } from '@zxing/browser';
import { Building2, CalendarDays, Camera, Check, CheckCircle2, Home, KeyRound, Landmark, Link2, Network, ScanLine, ShieldCheck, Upload, UserRound, X, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEmployer } from '@/contexts/EmployerContext';
import { formatDate } from '@/lib/date';
import ScanIdentityCard, { type ScanVerifyData } from '@/components/scan/ScanIdentityCard';
import ListenButton from '@/components/worker/ListenButton';
import ScanFrame from '@/components/qr/ScanFrame';
import { playScanBeep, primeAudio } from '@/lib/scanFeedback';
import { createQrReader, QR_VIDEO_CONSTRAINTS, applyContinuousFocus, decodeQrFromImageFile } from '@/lib/qrScanner';

type Payload = { v: number; type: 'BSS_WORKER' | 'BSS_CONTRACTOR' | 'BSS_EMPLOYER'; bssId: string; issuer: string };
type ScannedEntity = {
  kind: 'worker' | 'contractor' | 'employer';
  bssId: string;
  name: string;
  site: string;
  contractor: string;
  detail: string;
  bound: boolean;
  status: string;
};

type IdentityLookup = ScanVerifyData;

/** Registry lookup so a scanned credential resolves even when the party is not
 *  yet connected to this employer (worker/contractor BSS IDs both supported). */
async function lookupIdentity(bssId: string): Promise<ScanVerifyData | null> {
  try {
    const res = await fetch(`/api/identity/verify/${encodeURIComponent(bssId)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null) as { data?: IdentityLookup } | null;
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export default function EmployerScanPage() {
  const { employer, refresh } = useEmployer();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'scanning' | 'identified' | 'confirmed' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [entity, setEntity] = useState<ScannedEntity | null>(null);
  const [verifyData, setVerifyData] = useState<ScanVerifyData | null>(null);
  const [scanned, setScanned] = useState<Payload | null>(null);
  const [notice, setNotice] = useState('');
  const [alreadyRequested, setAlreadyRequested] = useState<string | null>(null);
  const [sentContractors, setSentContractors] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [chosenSiteIds, setChosenSiteIds] = useState<number[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const submitManualBssId = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = manualInput.trim().toUpperCase();
    if (!raw) return;
    const isBssFormat = /^(?:BSS-?[WCES][A-Z0-9]+|BSS[WCES]?\d{6,14})$/.test(raw);
    if (!isBssFormat) {
      setState("error");
      setMessage(`"${raw}" is not a valid BSS ID format. Expected format: BSS-C... (Contractor), BSS-W... (Worker), or BSS-E... (Employer).`);
      setManualOpen(false);
      setManualInput('');
      return;
    }
    setManualOpen(false);
    setManualInput('');
    let type: 'BSS_WORKER' | 'BSS_CONTRACTOR' | 'BSS_EMPLOYER' = 'BSS_WORKER';
    if (raw.startsWith('BSS-C') || raw.startsWith('BSSC')) type = 'BSS_CONTRACTOR';
    else if (raw.startsWith('BSS-E') || raw.startsWith('BSSE')) type = 'BSS_EMPLOYER';
    const payload: Payload = { v: 1, type, bssId: raw, issuer: 'Bharat Shram Setu' };
    verify(JSON.stringify(payload));
  };

  useEffect(() => () => controls.current?.stop(), []);

  const verify = async (text: string) => {
    try {
      const p = JSON.parse(text) as Payload;
      if (!['BSS_WORKER', 'BSS_CONTRACTOR', 'BSS_EMPLOYER'].includes(p.type) || p.v !== 1 || p.issuer !== 'Bharat Shram Setu') throw new Error('Unsupported QR credential');
      if (p.bssId && p.bssId === employer.identity.bssId) throw new Error("This is your own QR — scan the other party's QR.");
      playScanBeep(true);
      setScanned(p);
      setVerifyData(null);
      const isContractor = p.type === 'BSS_CONTRACTOR' || p.bssId.startsWith('BSS-C') || p.bssId.startsWith('BSSC');
      const isWorker = p.type === 'BSS_WORKER' || p.bssId.startsWith('BSS-W') || p.bssId.startsWith('BSSW');
      if (isContractor) {
        // Contractor QR → identify contractor, display relationship. The
        // contractor need not be engaged already — look them up in the registry.
        const known = employer.contractors.find(c => c.bssId === p.bssId);
        const existing = employer.approvals.find(a => a.bssId === p.bssId && ['Pending', 'Accepted', 'Approved'].includes(a.status));
        let registryName = '';
        if (!known && !existing) {
          const payload = await lookupIdentity(p.bssId);
          if (!payload) {
            setEntity(null);
            setScanned(null);
            setState('error');
            setMessage(`No contractor record found with BSS ID "${p.bssId}". Please check the BSS ID and try again.`);
            controls.current?.stop();
            return;
          }
          registryName = payload.company || payload.name || '';
        }
        const bound = Boolean(known);
        // A request sent earlier in this session (portal data is not refreshed live).
        const sentHere = sentContractors.includes(p.bssId);
        setAlreadyRequested(sentHere ? 'Pending' : (existing ? existing.status : null));
        setEntity({
          kind: 'contractor',
          bssId: p.bssId,
          name: known?.name ?? existing?.name ?? (registryName || 'Contractor ' + p.bssId.slice(-4)),
          site: known ? (known.siteIds.length + ' site(s) assigned') : (existing?.site ?? 'No site assignment'),
          contractor: known?.name ?? 'Contractor',
          detail: known ? `${known.workers} workers · compliance ${known.compliance}%` : 'No active binding',
          bound,
          status: bound ? (known!.status === 'Active' ? 'Bound · Active' : 'Bound · Pending') : (existing ? `Request ${existing.status.toLowerCase()}` : 'Not bound'),
        });
        setState('identified');
        void lookupIdentity(p.bssId).then(setVerifyData);
        setMessage(existing ? `Binding request already ${existing.status.toLowerCase()} with this contractor.` : bound ? 'Contractor identified — binding details displayed below' : 'Contractor QR identified — this contractor is not connected to your organisation');
      } else if (isWorker) {
        setAlreadyRequested(null);
        // Worker QR → identify worker, display current binding (never auto-bind).
        // The worker need not be in your list — look them up in the registry.
        const known = employer.workers.find(w => w.bssId === p.bssId);
        let registryName = '';
        if (!known) {
          const payload = await lookupIdentity(p.bssId);
          if (!payload?.identity) {
            setEntity(null);
            setScanned(null);
            setState('error');
            setMessage(`No worker record found with BSS ID "${p.bssId}". Please check the BSS ID and try again.`);
            controls.current?.stop();
            return;
          }
          registryName = payload.identity.name ?? '';
        }
        const bound = Boolean(known);
        setEntity({
          kind: 'worker',
          bssId: p.bssId,
          name: known?.name ?? (registryName || 'Worker ' + p.bssId.slice(-4)),
          site: known?.site ?? 'Unassigned site',
          contractor: known?.contractor ?? 'Unmapped',
          detail: known?.designation ?? 'Not disclosed',
          bound,
          status: bound ? (known?.verified ? 'Bound · Verified' : 'Bound · Pending verification') : 'Not bound',
        });
        setState('identified');
        void lookupIdentity(p.bssId).then(setVerifyData);
        setMessage(bound ? 'Worker identified — current binding displayed below' : 'Worker credential verified — not engaged with your organisation');
      } else {
        // Another employer's QR → basic details only (employers don't bind each other).
        setEntity({
          kind: 'employer',
          bssId: p.bssId,
          name: 'Principal Employer ' + p.bssId.slice(-4),
          site: '—',
          contractor: '—',
          detail: 'Principal Employer credential',
          bound: false,
          status: 'No action',
        });
        setState('identified');
        void lookupIdentity(p.bssId).then(setVerifyData);
        setMessage('Principal Employer QR identified — no binding action between employers.');
      }
      controls.current?.stop();
    } catch (e) {
      playScanBeep(false);
      setState('error');
      setMessage(e instanceof Error ? e.message : 'Invalid QR code');
      controls.current?.stop();
    }
  };

  const confirmBinding = async () => {
    if (!entity) return;
    if (entity.kind === 'contractor' && scanned?.type === 'BSS_CONTRACTOR') {
      setConfirmOpen(false);
      try {
        const response = await fetch('/api/bindings/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'BSS_CONTRACTOR', bssId: scanned.bssId, siteIds: chosenSiteIds }),
        });
        const result = await response.json().catch(() => ({})) as { error?: string; data?: { status?: string } };
        if (!response.ok) throw new Error(result.error || 'Binding request could not be created.');
        setState('confirmed');
        setSentContractors(current => current.includes(scanned.bssId) ? current : [...current, scanned.bssId]);
        const siteNote = chosenSiteIds.length ? ' Site(s) proposed for the contractor to approve.' : ' No site proposed — allot sites later from Binding Requests.';
        setNotice(`Binding request sent to ${entity.name} — status ${result.data?.status ?? 'Pending'}. The contractor approves from their portal, then you allot sites in Binding Requests.${siteNote}`);
        setMessage('Binding request sent');
        void refresh();
      } catch (e) {
        setState('error');
        setMessage(e instanceof Error ? e.message : 'Binding request could not be created.');
      }
      return;
    }
    if (entity.kind === 'worker') {
      // Employers don't bind workers directly — the worker is engaged through a contractor.
      setState('error');
      setMessage('Employers can’t bind a worker directly — a worker is engaged through their contractor. Ask the contractor to scan the worker’s QR.');
      return;
    }
    setState('confirmed');
    setNotice(`Contractor binding approved for ${entity.name}.`);
    setMessage('Binding confirmed');
  };

  const startCamera = async () => {
    primeAudio();
    setState('scanning'); setMessage('Point the camera at a BSS Worker or Contractor QR code');
    try {
      const reader = createQrReader();
      controls.current = await reader.decodeFromConstraints(QR_VIDEO_CONSTRAINTS, videoRef.current!, r => { if (r) verify(r.getText()); });
      applyContinuousFocus(controls.current);
    } catch { setState('error'); setMessage('Camera access was unavailable. Allow permission or upload a QR image.'); }
  };

  const scanFile = async (file?: File) => {
    if (!file) return;
    setState('scanning'); setMessage('Reading QR image…');
    try { verify(await decodeQrFromImageFile(file)); }
    catch { setState('error'); setMessage('No valid QR code could be read from that image.'); }
  };

  const reset = () => { controls.current?.stop(); setEntity(null); setScanned(null); setVerifyData(null); setNotice(''); setMessage(''); setAlreadyRequested(null); setConfirmOpen(false); setChosenSiteIds([]); setState('idle'); };

  const allSiteIds = employer.sites.map(s => Number(s.id));
  const allSitesSelected = allSiteIds.length > 0 && allSiteIds.every(id => chosenSiteIds.includes(id));
  const selectedSiteNames = employer.sites.filter(s => chosenSiteIds.includes(Number(s.id))).map(s => s.name);

  return <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
      <div><p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">QR system</p><h1 className="text-2xl font-bold text-[#022B5E] mt-1">QR Scan & Verify</h1><p className="text-sm text-bss-text-muted mt-1">Scan a Worker QR to verify identity and binding · scan a Contractor QR to review the binding. Binding always requires review and confirmation — never scan-to-auto-bind.</p></div>
      <div className="flex gap-2"><ListenButton /><Link href="/employer/dashboard" className="p-2.5 rounded-full bg-white border" aria-label="Dashboard"><Home size={18}/></Link><Link href="/employer/qr/requests" className="bg-[#01183A] text-white px-4 py-2.5 rounded-lg font-bold text-sm">Binding requests</Link></div>
    </div>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    <div className="grid md:grid-cols-2 gap-6">
      <section className="bss-3d bss-scroll-rise bg-white rounded-2xl border shadow-sm overflow-hidden">
        <header className="p-4 border-b border-bss-border bg-gradient-to-r from-bss-navy/5 to-transparent flex items-center gap-2 font-bold text-bss-text-primary"><span className="w-8 h-8 rounded-lg bg-bss-blue-tint text-bss-interactive-blue grid place-items-center"><Camera size={16}/></span> Scanner</header>
        <div className="p-5 space-y-4">
          <div className="relative bg-black rounded-2xl h-64 overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className={`w-full h-full object-cover ${state === 'scanning' ? 'block' : 'hidden'}`} muted playsInline/>
            <ScanFrame active={state === 'scanning'} />
            {state !== 'scanning' && <div className="text-center text-white px-6">{state === 'identified' || state === 'confirmed' ? <ShieldCheck size={48} className="mx-auto text-bss-soft-green bss-pulse-halo"/> : state === 'error' ? <XCircle size={48} className="mx-auto text-bss-orange"/> : <ScanLine size={48} className="mx-auto text-bss-text-muted bss-pulse-halo"/>}<p className="mt-3 text-sm font-semibold">{message || 'Ready to scan a secure credential'}</p></div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={state === 'idle' || state === 'error' || state === 'identified' || state === 'confirmed' ? startCamera : reset} className="bg-[#01183A] text-white py-2.5 rounded-lg font-bold text-sm"><Camera size={16} className="inline mr-2"/>{state === 'scanning' ? 'Reset' : 'Use camera'}</button>
            <button onClick={() => fileRef.current?.click()} className="border py-2.5 rounded-lg font-bold text-sm"><Upload size={16} className="inline mr-2"/>Upload image</button>
          </div>
          <button type="button" onClick={() => setManualOpen(true)} className="w-full py-2 bg-bss-bg hover:bg-bss-bg border border-bss-border text-bss-text-primary rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"><KeyRound size={14}/>Enter BSS ID manually</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => scanFile(e.target.files?.[0])}/>
          <p className="text-xs text-bss-text-muted">Camera permission is requested only while scanning. Scans are processed locally — no scan-to-auto-bind.</p>
        </div>
      </section>

      <section className="bss-3d bss-scroll-rise bg-white rounded-2xl border shadow-sm overflow-hidden">
        <header className="p-4 border-b border-bss-border bg-gradient-to-r from-bss-navy/5 to-transparent flex gap-2 items-center font-bold text-bss-text-primary"><span className="w-8 h-8 rounded-lg bg-bss-soft-green text-bss-green grid place-items-center"><ShieldCheck size={16}/></span> {state === 'identified' || state === 'confirmed' ? 'Identified entity' : 'Scan result'}</header>
        <div className="p-5">
          {entity && (state === 'identified' || state === 'confirmed') ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className={`w-14 h-14 rounded-full grid place-items-center ${entity.kind === 'contractor' ? 'bg-bss-blue-tint text-bss-interactive-blue' : entity.kind === 'worker' ? 'bg-bss-soft-orange text-[#E45D24]' : 'bg-bss-bg text-bss-text-secondary'}`}>{entity.kind === 'contractor' ? <Building2 size={26}/> : entity.kind === 'worker' ? <UserRound size={26}/> : <Landmark size={26}/>}</span>
                <div><h2 className="font-bold text-lg">{entity.name}</h2><code className="text-xs text-[#01183A]">{entity.bssId}</code><p className="text-xs text-bss-orange mt-1 font-semibold">{entity.kind === 'contractor' ? 'Contractor QR identified' : entity.kind === 'worker' ? 'Worker QR identified' : 'Principal Employer QR identified'}</p></div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                {entity.kind === 'worker' && <><div><dt className="text-bss-text-muted flex items-center gap-1"><Network size={11}/>Contractor</dt><dd className="font-semibold text-bss-text-primary mt-0.5">{entity.contractor}</dd></div><div><dt className="text-bss-text-muted flex items-center gap-1"><Landmark size={11}/>Site</dt><dd className="font-semibold text-bss-text-primary mt-0.5">{entity.site}</dd></div><div><dt className="text-bss-text-muted">Designation</dt><dd className="font-semibold text-bss-text-primary mt-0.5">{entity.detail}</dd></div></>}
                {entity.kind === 'contractor' && <><div><dt className="text-bss-text-muted flex items-center gap-1"><Network size={11}/>Binding</dt><dd className="font-semibold text-bss-text-primary mt-0.5">{entity.site}</dd></div><div><dt className="text-bss-text-muted flex items-center gap-1"><UserRound size={11}/>Workforce</dt><dd className="font-semibold text-bss-text-primary mt-0.5">{entity.detail}</dd></div>{(verifyData?.bssMemberSince || verifyData?.identity?.bssMemberSince) && <div><dt className="text-bss-text-muted flex items-center gap-1"><CalendarDays size={11}/>BSS Member Since</dt><dd className="font-semibold text-bss-text-primary mt-0.5">{formatDate(verifyData.bssMemberSince || verifyData.identity?.bssMemberSince)}</dd></div>}{(verifyData?.consentDate || verifyData?.identity?.consentDate) && <div><dt className="text-bss-text-muted flex items-center gap-1"><CalendarDays size={11}/>Consent Accepted</dt><dd className="font-semibold text-bss-text-primary mt-0.5">{formatDate(verifyData.consentDate || verifyData.identity?.consentDate)}</dd></div>}{(verifyData?.bindingDate || verifyData?.identity?.bindingDate) && <div><dt className="text-bss-text-muted flex items-center gap-1"><CalendarDays size={11}/>Bound To You Since</dt><dd className="font-semibold text-bss-text-primary mt-0.5">{formatDate(verifyData.bindingDate || verifyData.identity?.bindingDate)}</dd></div>}</>}
                {entity.kind === 'employer' && <div className="col-span-2"><dt className="text-bss-text-muted">Credential</dt><dd className="font-semibold text-bss-text-primary mt-0.5">Principal Employer organisation</dd></div>}
                {entity.kind !== 'employer' && <div className="col-span-2"><dt className="text-bss-text-muted">Current binding</dt><dd className="mt-1"><span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${entity.bound ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-soft-orange text-bss-orange'}`}>{entity.bound ? <CheckCircle2 size={11}/> : <Link2 size={11}/>}{entity.status}</span></dd></div>}
              </dl>
              {verifyData && <ScanIdentityCard data={verifyData} />}
              <p className="text-xs text-bss-text-muted bg-bss-bg rounded-xl p-3">{entity.kind === 'contractor'
                ? 'A binding request connects this contractor to your organisation. The contractor must accept from their portal, then you allot sites.'
                : entity.kind === 'worker'
                  ? 'Worker identity details. Workers are engaged through their contractor — no binding action is available here.'
                  : 'Principal Employer identity details. Employers don’t bind to each other.'}</p>
              {entity.kind === 'contractor' ? (
                state === 'confirmed' || alreadyRequested ? (
                  <p className="p-3 bg-bss-soft-orange border border-bss-border text-bss-orange rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>Binding request already {alreadyRequested ? alreadyRequested.toLowerCase() : 'sent'} — track it in <Link href="/employer/qr/requests" className="underline font-bold">Binding Requests</Link>.</p>
                ) : (
                  <button onClick={() => { setChosenSiteIds(employer.defaultSite ? [Number(employer.defaultSite.id)] : []); setConfirmOpen(true); }} className="w-full h-11 rounded-xl bg-[#01183A] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#022B5E]"><Link2 size={17}/>Send binding request</button>
                )
              ) : (
                <p className="p-3 bg-bss-bg border border-bss-border text-bss-text-secondary rounded-xl text-sm font-semibold flex items-center gap-2"><ShieldCheck size={16}/>{entity.kind === 'worker' ? 'No binding action for workers here.' : 'No binding action between employers.'}</p>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-bss-text-muted"><ScanLine size={44} className="mx-auto mb-3"/><p className="text-sm">Scanned result will appear here.</p></div>
          )}
        </div>
      </section>
    </div>

    {confirmOpen && entity && (
      <div className="fixed inset-0 z-[95] grid place-items-center p-4 bg-bss-navy/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirm binding request" onClick={() => setConfirmOpen(false)}>
        <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl ring-1 ring-black/5 overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="p-6 pb-4 border-b border-bss-border flex-shrink-0">
            <h2 className="text-lg font-bold text-bss-text-primary">Confirm binding request</h2>
            <p className="text-xs text-bss-text-muted mt-1">Sending a binding request to <span className="font-semibold text-bss-text-primary">{entity.name}</span> <span className="font-mono text-bss-text-muted">{entity.bssId}</span></p>
          </div>
          <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-bss-text-muted">Site for this binding{employer.sites.length > 0 && <span className="text-bss-text-muted normal-case tracking-normal"> · {chosenSiteIds.length} of {employer.sites.length} selected</span>}</p>
                {employer.sites.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setChosenSiteIds(allSitesSelected ? [] : allSiteIds)}
                    className="text-[11px] font-bold text-[#01183A] hover:underline whitespace-nowrap"
                  >
                    {allSitesSelected ? 'Clear all' : 'Select all'}
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 rounded-xl border border-bss-border p-1.5">
                {employer.sites.map(site => {
                  const id = Number(site.id);
                  const on = chosenSiteIds.includes(id);
                  const isDefault = employer.defaultSite?.id === site.id;
                  return (
                    <button key={site.id} type="button" onClick={() => setChosenSiteIds(current => on ? current.filter(x => x !== id) : [...current, id])} className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${on ? 'border-[#01183A] bg-[#01183A]/5' : 'border-bss-border hover:bg-bss-bg'}`}>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-bss-text-primary truncate">{site.name}{isDefault && <span className="ml-1.5 text-[10px] font-bold text-[#E45D24]">Default</span>}</span>
                        <span className="block text-[11px] text-bss-text-muted font-mono truncate">{site.code}{site.location ? ` · ${site.location}` : ''}</span>
                      </span>
                      <span className={`w-5 h-5 rounded-md border grid place-items-center flex-shrink-0 ${on ? 'bg-[#01183A] border-[#01183A] text-white' : 'border-bss-border'}`}>{on && <Check size={13}/>}</span>
                    </button>
                  );
                })}
                {!employer.sites.length && <p className="text-xs text-bss-text-muted">No sites yet — you can still send the request without a site and allot later.</p>}
              </div>
            </div>
            <p className={`text-xs rounded-xl px-3 py-2.5 border leading-5 ${chosenSiteIds.length ? 'bg-bss-blue-tint/60 border-bss-border text-[#01183A]' : 'bg-bss-soft-orange border-bss-border text-bss-orange'}`}>
              {chosenSiteIds.length
                ? `Binding request for ${selectedSiteNames.slice(0, 3).join(', ')}${selectedSiteNames.length > 3 ? ` +${selectedSiteNames.length - 3} more` : ''} — the contractor must approve each site.`
                : 'Binding request without a site — no site will be proposed. You can allot sites later from Binding Requests.'}
            </p>
          </div>
          <div className="p-6 pt-0 flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button type="button" onClick={() => setConfirmOpen(false)} className="h-11 px-5 rounded-xl border border-bss-border text-sm font-bold text-bss-text-secondary hover:bg-bss-bg">Cancel</button>
            <button type="button" onClick={() => void confirmBinding()} className="h-11 px-6 rounded-xl bg-[#01183A] text-white text-sm font-bold hover:bg-[#022B5E]">Send binding request</button>
          </div>
        </div>
      </div>
    )}

    {manualOpen && (
      <div className="fixed inset-0 z-50 bg-black/50 p-4 grid place-items-center" role="presentation">
        <section role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
          <header className="p-5 border-b flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-[#022B5E]">Enter BSS ID Manually</h2>
              <p className="text-xs text-bss-text-muted mt-0.5">Enter a Contractor BSS ID (BSS-C...) or Worker BSS ID (BSS-W...)</p>
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
                placeholder="e.g. BSS-C12345678 or BSS-W7KQ2M9X4RT"
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
