"use client";

import { useEffect, useRef, useState } from 'react';
import { Check, Eye, Mic, Phone, PhoneCall, Radio, ShieldCheck, Timer, X } from 'lucide-react';
import { advanceConsent, tupleLabel, type EcsBinding } from '@/lib/ecsw';
import { sanitizeForBinding } from '@/lib/permissions';
import type { WorkerRecord } from '@/types/portal';

type Flow = 'topdown' | 'bottomup';
type Step = 'idle' | 'scan' | 'consent' | 'fallback' | 'done';
type Fallback = 'ivr' | 'sms' | 'voice' | null;

export interface BindingParty { key: string; name: string; id: string; }

export default function BindingConsole({ parties, worker, onResolve, open, onClose }: {
  parties: { e: BindingParty; c: BindingParty; s: BindingParty; w: BindingParty };
  worker?: WorkerRecord;
  onResolve?: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const [flow, setFlow] = useState<Flow>('topdown');
  const [step, setStep] = useState<Step>('idle');
  const [binding, setBinding] = useState<EcsBinding | null>(null);
  const [source, setSource] = useState<BindingParty | null>(null);
  const [target, setTarget] = useState<BindingParty | null>(null);
  const [fallback, setFallback] = useState<Fallback>(null);
  const [seconds, setSeconds] = useState(60);
  const [otp, setOtp] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (step !== 'consent' || seconds <= 0) return;
    timer.current = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [step, seconds]);

  useEffect(() => { if (step === 'consent' && seconds <= 0) triggerFallback(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [seconds]);

  const partiesFor = (flow: Flow): { source: BindingParty; target: BindingParty; site: BindingParty } => (
    flow === 'topdown'
      ? { source: parties.e, target: parties.c, site: parties.s }
      : { source: parties.w, target: parties.c, site: parties.s }
  );

  function start(which: Flow) {
    setFlow(which); setStep('scan'); setLog([]); setResolved(false); setFallback(null); setOtp('');
    const { source, target } = partiesFor(which);
    setSource(source); setTarget(target); setBinding(null);
    pushLog(`${source.name} scans ${target.name}'s QR… system identifies the entity.`);
  }

  function pushLog(text: string) { setLog(current => [...current, text]); }

  function approve() {
    if (!binding) return;
    const next = advanceConsent(binding, true);
    setBinding(next);
    pushLog(`${target?.name} approved. Binding recorded → ${tupleLabel({ employerId:'E', contractorId:'C', siteId:'S', workerId:'W' })}`);
    setStep('done'); setResolved(true);
  }
  function decline() {
    if (!binding) return;
    setBinding(advanceConsent(binding, false));
    pushLog(`${target?.name} disapproved. Binding rejected.`);
    setStep('done'); setResolved(true);
  }

  function triggerFallback() {
    setStep('fallback');
    // Fallback selection mirrors the spec: physical-card (C scans W) → IVR; app-to-app timeout → SMS OTP + voice.
    const physicalCard = flow === 'topdown';
    setFallback(physicalCard ? 'ivr' : 'sms');
    pushLog(physicalCard ? '60s elapsed — Worker likely on a physical card. Initiating 1-minute IVR call…' : '60s elapsed — app-to-app handshake timed out. Sending SMS OTP…');
  }

  function confirmIvr(accept: boolean) {
    pushLog(`IVR DTMF received: Pressed ${accept ? '1 (accept)' : '0 (decline)'}.`);
    if (accept) approve(); else { setStep('done'); setResolved(true); }
  }
  function confirmOtp(value: string) {
    if (value.trim().length !== 6) return;
    pushLog('SMS OTP validated.'); approve();
  }
  function voiceCall() {
    setFallback('voice');
    pushLog('Initiating voice call to the pending party for keypad confirmation…');
  }

  const preview = worker ? sanitizeForBinding(worker, resolved ? 'post' : 'pre') : null;
  const previewRows = preview ? [
    ['Name', preview.identity.name], ['Age', preview.identity.age ?? 'Not disclosed'], ['Sex', preview.identity.gender],
    ['Company', preview.company], ['Blood group', preview.bloodGroup],
    ...(preview.full ? [['Record', 'FULL PROFILE UNLOCKED (post-binding)'] as [string, string]] : [['Record', 'Minimal pre-binding profile'] as [string, string]]),
  ] : [];

  if (!open) return null;
  return <div className="fixed inset-0 z-[90] bg-black/50 p-4 grid place-items-center">
    <section role="dialog" aria-modal="true" className="w-full max-w-xl bg-white rounded-2xl overflow-hidden">
      <header className="p-5 border-b border-gray-100 flex justify-between items-center">
        <div><h2 className="text-sm font-semibold text-gray-900">QR Binding & Consent Handshake</h2><p className="text-xs text-gray-500 mt-1">Dual-consent E-C-S-W with a 60-second fallback (IVR · SMS OTP · voice).</p></div>
        <button onClick={onClose} aria-label="Close"><X/></button>
      </header>

      <div className="p-5 space-y-4">
        {/* Flow selection */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => start('topdown')} className={`p-3 rounded-xl border text-left ${flow === 'topdown' && step !== 'idle' ? 'border-blue-700 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}><p className="text-xs font-bold text-gray-900">Flow 1 · Top-down</p><p className="text-[11px] text-gray-500 mt-1">Employer → Contractor → Worker</p></button>
          <button onClick={() => start('bottomup')} className={`p-3 rounded-xl border text-left ${flow === 'bottomup' && step !== 'idle' ? 'border-blue-700 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}><p className="text-xs font-bold text-gray-900">Flow 2 · Bottom-up</p><p className="text-[11px] text-gray-500 mt-1">Worker → Contractor → Employer</p></button>
        </div>

        {/* Step: idle hint */}
        {step === 'idle' && <p className="text-xs text-gray-500 text-center py-6">Choose a flow to begin the consent handshake.</p>}

        {/* Step: scan */}
        {step === 'scan' && source && target && <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
            <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 grid place-items-center"><ShieldCheck size={17}/></span>
            <div className="flex-1"><p className="text-xs font-semibold text-gray-900">Step 1 · Identify entity</p><p className="text-[11px] text-gray-500 mt-0.5">{source.name} scans {target.name}&apos;s QR code at {parties.s.name}.</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setBinding(blank()); setStep('consent'); setSeconds(60); setFallback(null); pushLog(`Handshake triggered. ${target.name} receives an approve/disapprove prompt.`); }} className="flex-1 h-10 rounded-lg bg-gray-950 text-white text-xs font-semibold">Scan → trigger handshake</button>
            <button onClick={() => setStep('idle')} className="h-10 px-4 rounded-lg border text-xs font-semibold">Reset</button>
          </div>
        </div>}

        {/* Step: consent — dual popup + 60s timer */}
        {step === 'consent' && target && <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 text-xs"><Timer size={15} className="text-orange-500"/><span className="font-semibold text-gray-900">{target.name} must approve</span></div>
            <span className={`font-mono text-sm font-bold ${seconds <= 10 ? 'text-red-600' : 'text-gray-700'}`}>{seconds}s</span>
          </div>
          <div className="text-center py-3"><p className="text-sm font-semibold text-gray-900">Approve binding request?</p><p className="text-xs text-gray-500 mt-1">{source?.name} → {target.name} at {parties.s.name}</p></div>
          <div className="flex gap-2"><button onClick={approve} className="flex-1 h-10 rounded-lg bg-green-700 text-white text-xs font-semibold flex items-center justify-center gap-1"><Check size={15}/>Approve</button><button onClick={decline} className="flex-1 h-10 rounded-lg border text-red-700 text-xs font-semibold flex items-center justify-center gap-1"><X size={15}/>Disapprove</button></div>
        </div>}

        {/* Step: fallback */}
        {step === 'fallback' && <div className="space-y-3">
          <div className="p-3 border border-orange-100 bg-orange-50 rounded-xl text-xs text-orange-900 flex items-center gap-2"><PhoneCall size={16}/>The 60-second window elapsed. Fallback initiated (demo simulation):</div>
          {fallback === 'ivr' && <div className="space-y-3">
            <div className="p-3 border border-gray-200 rounded-xl"><p className="text-[11px] uppercase font-bold text-gray-500 flex items-center gap-1"><Phone size={13}/>1-Minute IVR Rule (physical card)</p><p className="text-sm text-gray-800 mt-2">{'"Press 1 to accept binding to ' + (source?.name ?? '') + '. Press 0 to decline."'}</p><p className="text-[11px] text-gray-400 mt-1">Automated call to the Worker&apos;s registered keypad phone.</p></div>
            <div className="grid grid-cols-2 gap-2"><button onClick={() => confirmIvr(true)} className="h-10 rounded-lg bg-green-700 text-white text-xs font-semibold">Press 1 · Accept</button><button onClick={() => confirmIvr(false)} className="h-10 rounded-lg border text-red-700 text-xs font-semibold">Press 0 · Decline</button></div>
          </div>}
          {fallback === 'sms' && <div className="space-y-3">
            <div className="p-3 border border-gray-200 rounded-xl"><p className="text-[11px] uppercase font-bold text-gray-500 flex items-center gap-1"><Radio size={13}/>SMS OTP fallback (network delay)</p><p className="text-sm text-gray-800 mt-1">An SMS OTP was sent to {target?.name}. Enter it below, or use the voice prompt.</p><div className="flex gap-2 mt-3"><input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" inputMode="numeric" className="h-10 flex-1 border border-gray-200 rounded-lg px-3 text-sm text-center tracking-widest"/><button onClick={() => confirmOtp(otp)} className="h-10 px-4 rounded-lg bg-blue-700 text-white text-xs font-semibold">Verify</button></div></div>
            <button onClick={voiceCall} className="w-full h-10 rounded-lg border text-blue-700 text-xs font-semibold flex items-center justify-center gap-1"><PhoneCall size={15}/>Fallback to voice call</button>
          </div>}
          {fallback === 'voice' && <div className="space-y-3"><div className="p-3 border border-gray-200 rounded-xl"><p className="text-[11px] uppercase font-bold text-gray-500 flex items-center gap-1"><Mic size={13}/>Voice prompt</p><p className="text-sm text-gray-800 mt-1">Calling {target?.name} to confirm consent via keypad press…</p></div><div className="flex gap-2"><button onClick={() => confirmIvr(true)} className="flex-1 h-10 rounded-lg bg-green-700 text-white text-xs font-semibold">Confirm (press 1)</button><button onClick={() => confirmIvr(false)} className="flex-1 h-10 rounded-lg border text-red-700 text-xs font-semibold">Decline</button></div></div>}
        </div>}

        {/* Step: done / result + data visibility */}
        {step === 'done' && <div className="space-y-3">
          <div className={`p-3 border rounded-xl text-xs font-semibold ${resolved && binding?.state === 'bound' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{binding?.state === 'bound' ? 'Binding confirmed — E-C-S-W recorded (unique constant tuple).' : 'Binding disapproved — no hierarchy was created.'}</div>
          {worker && <div className="p-3 border border-gray-200 rounded-xl">
            <p className="text-[11px] uppercase font-bold text-gray-500 flex items-center gap-1 mb-2"><Eye size={13}/>Data visibility ({resolved ? 'POST-binding' : 'PRE-binding'})</p>
            <dl className="grid grid-cols-2 gap-2">{previewRows.map(([label, value]) => <div key={label}><dt className="text-[10px] uppercase text-gray-400">{label}</dt><dd className="text-xs font-semibold text-gray-800 mt-0.5">{value}</dd></div>)}</dl>
          </div>}
          <button onClick={() => { onResolve?.(); onClose(); }} className="w-full h-10 rounded-lg bg-gray-950 text-white text-xs font-semibold">Done</button>
        </div>}

        {/* Activity log */}
        {log.length > 0 && <div className="border-t border-gray-100 pt-3"><p className="text-[11px] uppercase font-bold text-gray-400 mb-1">Handshake log</p><ul className="space-y-1">{log.map((line, i) => <li key={i} className="text-[11px] text-gray-600 flex gap-2"><span className="text-gray-300">▸</span>{line}</li>)}</ul></div>}
      </div>
    </section>
  </div>;
}

function blank(): EcsBinding { return { id:'temp', employerId:'E', contractorId:'C', siteId:'S', workerId:'W', tuple:'E|C|S|W', state:'unbound', consent:{ employer:false, contractor:false, worker:false }, requestedBy:'employer', requestedAt:new Date().toISOString().slice(0,10), boundAt:null }; }
