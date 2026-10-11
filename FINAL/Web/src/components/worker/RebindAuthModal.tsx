"use client";

import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, Loader2, ShieldAlert, X } from 'lucide-react';

type Props = {
  /** Currently bound contractor shown in the warning (worker.employment.contractor). */
  currentContractor: string;
  /** The contractor the worker is trying to bind with (QR scan / incoming request). */
  targetContractor: string;
  /** Short context line such as the site or request reference. */
  contextLabel?: string;
  onCancel: () => void;
  onAuthenticated: () => void;
};

/**
 * Re-binding authentication gate. When a worker is already bound to one
 * contractor and attempts to bind with another (via QR scan or an incoming
 * binding request), they must confirm with their MPIN before the request is
 * accepted or sent. The worker's existing employment is never changed here —
 * this screen only authenticates the intent.
 */
export default function RebindAuthModal({ currentContractor, targetContractor, contextLabel, onCancel, onAuthenticated }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const confirm = () => {
    if (verifying) return;
    if (!/^\d{4}$/.test(pin)) { setError('Enter the 4-digit MPIN used for this account.'); return; }
    setError(''); setVerifying(true);
    // Simulated re-authentication — in production this is validated by the identity provider.
    window.setTimeout(() => { onAuthenticated(); }, 900);
  };

  const sameContractor = currentContractor.trim().toLowerCase() === targetContractor.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Re-authentication required to change binding">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="bg-[#7A1F1F] p-5 text-white flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl bg-white/10 grid place-items-center flex-shrink-0"><ShieldAlert size={22}/></span>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-bss-soft-orange">Active binding detected</p>
            <h2 className="text-base font-bold mt-0.5">Authenticate to bind with a new contractor</h2>
          </div>
          <button onClick={onCancel} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/10"><X size={16}/></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-bss-border bg-bss-soft-orange/60 p-3.5 space-y-2 text-xs">
            <p className="flex items-start gap-2"><span className="text-bss-orange font-black mt-0.5">!</span><span className="text-bss-text-primary leading-5">You are currently <strong>bound to {currentContractor}</strong>{sameContractor ? ' — an active binding already exists for this contractor.' : '. Binding with a new contractor switches your employment after both parties approve.'}</span></p>
            <p className="flex items-start gap-2"><span className="text-bss-orange font-black mt-0.5">!</span><span className="text-bss-text-primary leading-5">Attendance, wages and compliance records follow the contractor you are bound to. Re-binding is a controlled action — please authenticate to continue.</span></p>
            {contextLabel && <p className="text-[11px] font-semibold text-bss-text-muted pl-5">{contextLabel}</p>}
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#01183A] mb-2">Confirm with 4-digit MPIN</label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') confirm(); }}
              placeholder="• • • •"
              className="w-full bg-white border border-bss-border rounded-xl px-4 py-3 text-[16px] font-mono font-semibold tracking-[0.5em] text-center focus:outline-none focus:border-[#01183A] focus:ring-1 focus:ring-[#01183A]/30 disabled:opacity-60"
              disabled={verifying}
            />
            {error && <p role="alert" className="text-xs text-bss-error mt-1.5">{error}</p>}
            <p className="text-[11px] text-bss-text-muted mt-2 flex items-center gap-1.5"><KeyRound size={12}/>MPIN is verified before the binding action is allowed. (Demo environment: any 4-digit MPIN is accepted.)</p>
          </div>

          <div className="flex gap-2">
            <button onClick={confirm} disabled={verifying} className="flex-1 h-11 rounded-xl bg-[#7A1F1F] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#5f1818] disabled:opacity-60">
              {verifying ? <Loader2 size={17} className="animate-spin"/> : <KeyRound size={16}/>}
              {verifying ? 'Authenticating…' : 'Authenticate & continue'}
            </button>
            <button onClick={onCancel} disabled={verifying} className="flex-1 h-11 rounded-xl border border-bss-border text-bss-text-secondary text-sm font-bold hover:bg-bss-bg disabled:opacity-60">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
