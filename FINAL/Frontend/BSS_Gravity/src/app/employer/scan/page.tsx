"use client";

import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Building2, Camera, CheckCircle2, Home, Landmark, Link2, Network, ScanLine, ShieldCheck, Upload, UserRound, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEmployer } from '@/contexts/EmployerContext';

type Payload = { v: number; type: 'BSS_WORKER' | 'BSS_CONTRACTOR'; bssId: string; issuer: string };

type ScannedEntity = {
  kind: 'worker' | 'contractor';
  bssId: string;
  name: string;
  site: string;
  contractor: string;
  detail: string;
  bound: boolean;
  status: string;
};

export default function EmployerScanPage() {
  const { employer } = useEmployer();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'scanning' | 'identified' | 'confirmed' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [entity, setEntity] = useState<ScannedEntity | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => () => controls.current?.stop(), []);

  const verify = (text: string) => {
    try {
      const p = JSON.parse(text) as Payload;
      if (!['BSS_WORKER', 'BSS_CONTRACTOR'].includes(p.type) || p.v !== 1 || p.issuer !== 'Bharat Shram Setu') throw new Error('Unsupported QR credential');
      // Demo QRs share one payload generator, so resolve by BSS ID prefix first.
      if (p.bssId.startsWith('BSSC')) {
        // Contractor QR → identify contractor, display relationship
        const known = employer.workers.find(w => w.bssId === p.bssId);
        const bound = Boolean(known);
        setEntity({
          kind: 'worker',
          bssId: p.bssId,
          name: known?.name ?? 'BSS Worker ' + p.bssId.slice(-4),
          site: known?.site ?? 'Unassigned site',
          contractor: known?.contractor ?? 'Unmapped',
          detail: known?.designation ?? 'Not disclosed',
          bound,
          status: bound ? (known!.verified ? 'Bound · Verified' : 'Bound · Pending verification') : 'Not bound',
        });
        setState('identified');
        setMessage(bound ? 'Worker identified — current binding displayed below' : 'Worker QR identified — this worker is not bound to any of your contractors');
      } else if (p.type === 'BSS_WORKER' || p.bssId.startsWith('BSS89')) {
        // Worker QR → identify worker, display current binding (never auto-bind)
        const known = employer.contractors.find(c => c.bssId === p.bssId);
        const bound = Boolean(known);
        setEntity({
          kind: 'contractor',
          bssId: p.bssId,
          name: known?.name ?? 'Contractor ' + p.bssId.slice(-4),
          site: known ? (known.siteIds.length + ' site(s) assigned') : 'No site assignment',
          contractor: known?.name ?? 'Contractor',
          detail: known ? `${known.workers} workers · compliance ${known.compliance}%` : 'No active engagement',
          bound,
          status: bound ? (known!.status === 'Active' ? 'Bound · Active' : 'Bound · Pending') : 'Not bound',
        });
        setState('identified');
        setMessage(bound ? 'Contractor identified — engagement details displayed below' : 'Contractor QR identified — this contractor is not connected to your organisation');
      }
      controls.current?.stop();
    } catch (e) {
      setState('error');
      setMessage(e instanceof Error ? e.message : 'Invalid QR code');
      controls.current?.stop();
    }
  };

  const confirmBinding = () => {
    if (!entity) return;
    setState('confirmed');
    setNotice(entity.kind === 'worker'
      ? `Binding approved for ${entity.name} — the worker is now bound at ${entity.site} under ${entity.contractor}.`
      : `Contractor engagement approved for ${entity.name}.`);
    setMessage('Binding confirmed');
  };

  const startCamera = async () => {
    setState('scanning'); setMessage('Point the camera at a BSS Worker or Contractor QR code');
    try {
      const reader = new BrowserQRCodeReader();
      controls.current = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, videoRef.current!, r => { if (r) verify(r.getText()); });
    } catch { setState('error'); setMessage('Camera access was unavailable. Allow permission or upload a QR image.'); }
  };

  const scanFile = async (file?: File) => {
    if (!file) return;
    setState('scanning'); setMessage('Reading QR image…');
    const url = URL.createObjectURL(file);
    try { verify((await new BrowserQRCodeReader().decodeFromImageUrl(url)).getText()); }
    catch { setState('error'); setMessage('No valid QR code could be read from that image.'); }
    finally { URL.revokeObjectURL(url); }
  };

  const reset = () => { controls.current?.stop(); setEntity(null); setNotice(''); setMessage(''); setState('idle'); };

  return <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">QR system</p><h1 className="text-2xl font-bold text-[#062D4F] mt-1">QR Scan & Verify</h1><p className="text-sm text-gray-500 mt-1">Scan a Worker QR to verify identity and binding · scan a Contractor QR to review the engagement. Binding always requires review and confirmation — never scan-to-auto-bind.</p></div>
      <div className="flex gap-2"><Link href="/employer/dashboard" className="p-2.5 rounded-full bg-white border" aria-label="Dashboard"><Home size={18}/></Link><Link href="/employer/approvals" className="bg-[#073B67] text-white px-4 py-2.5 rounded-lg font-bold text-sm">Approvals</Link></div>
    </div>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    <div className="grid md:grid-cols-2 gap-6">
      <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <header className="p-4 border-b bg-gray-50 flex items-center gap-2 font-bold"><Camera size={18}/> Scanner</header>
        <div className="p-5 space-y-4">
          <div className="relative bg-black rounded-xl h-64 overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className={`w-full h-full object-cover ${state === 'scanning' ? 'block' : 'hidden'}`} muted playsInline/>
            {state !== 'scanning' && <div className="text-center text-white px-6">{state === 'identified' || state === 'confirmed' ? <ShieldCheck size={48} className="mx-auto text-green-400"/> : state === 'error' ? <XCircle size={48} className="mx-auto text-red-400"/> : <ScanLine size={48} className="mx-auto text-gray-400"/>}<p className="mt-3 text-sm font-semibold">{message || 'Ready to scan a secure credential'}</p></div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={state === 'idle' || state === 'error' || state === 'identified' || state === 'confirmed' ? startCamera : reset} className="bg-[#073B67] text-white py-2.5 rounded-lg font-bold text-sm"><Camera size={16} className="inline mr-2"/>{state === 'scanning' ? 'Reset' : 'Use camera'}</button>
            <button onClick={() => fileRef.current?.click()} className="border py-2.5 rounded-lg font-bold text-sm"><Upload size={16} className="inline mr-2"/>Upload image</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => scanFile(e.target.files?.[0])}/>
          <p className="text-xs text-gray-500">Camera permission is requested only while scanning. Scans are processed locally — no scan-to-auto-bind.</p>
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <header className="p-4 border-b bg-gray-50 flex gap-2 items-center font-bold"><ShieldCheck size={18}/> {state === 'identified' || state === 'confirmed' ? 'Identified entity' : 'Scan result'}</header>
        <div className="p-5">
          {entity && (state === 'identified' || state === 'confirmed') ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className={`w-14 h-14 rounded-full grid place-items-center ${entity.kind === 'worker' ? 'bg-orange-50 text-[#F47A32]' : 'bg-blue-50 text-blue-700'}`}>{entity.kind === 'worker' ? <UserRound size={26}/> : <Building2 size={26}/>}</span>
                <div><h2 className="font-bold text-lg">{entity.name}</h2><code className="text-xs text-[#073B67]">{entity.bssId}</code><p className="text-xs text-orange-600 mt-1 font-semibold">{entity.kind === 'worker' ? 'Worker QR identified' : 'Contractor QR identified'}</p></div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                {entity.kind === 'worker' && <><div><dt className="text-gray-400 flex items-center gap-1"><Network size={11}/>Contractor</dt><dd className="font-semibold text-gray-800 mt-0.5">{entity.contractor}</dd></div><div><dt className="text-gray-400 flex items-center gap-1"><Landmark size={11}/>Site</dt><dd className="font-semibold text-gray-800 mt-0.5">{entity.site}</dd></div><div><dt className="text-gray-400">Designation</dt><dd className="font-semibold text-gray-800 mt-0.5">{entity.detail}</dd></div></>}
                {entity.kind === 'contractor' && <><div><dt className="text-gray-400 flex items-center gap-1"><Network size={11}/>Engagement</dt><dd className="font-semibold text-gray-800 mt-0.5">{entity.site}</dd></div><div><dt className="text-gray-400 flex items-center gap-1"><UserRound size={11}/>Workforce</dt><dd className="font-semibold text-gray-800 mt-0.5">{entity.detail}</dd></div></>}
                <div className="col-span-2"><dt className="text-gray-400">Current binding</dt><dd className="mt-1"><span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${entity.bound ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>{entity.bound ? <CheckCircle2 size={11}/> : <Link2 size={11}/>}{entity.status}</span></dd></div>
              </dl>
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">{entity.kind === 'worker'
                ? 'The worker binds to your organisation through their contractor at the site shown. Confirming approves the binding — no automatic assignment.'
                : 'The contractor operates under your organisation across the assigned sites. Confirming approves the engagement — the contractor must accept from their portal.'}</p>
              {state === 'confirmed' ? (
                <p className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>{entity.kind === 'worker' ? 'Binding approved — bound.' : 'Engagement approved — connected.'}</p>
              ) : (
                <button onClick={confirmBinding} className="w-full h-11 rounded-xl bg-[#073B67] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#062D4F]"><Link2 size={17}/>{entity.kind === 'worker' ? 'Approve binding' : 'Approve engagement'}</button>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400"><ScanLine size={44} className="mx-auto mb-3"/><p className="text-sm">Scanned result will appear here.</p></div>
          )}
        </div>
      </section>
    </div>
  </div>;
}
