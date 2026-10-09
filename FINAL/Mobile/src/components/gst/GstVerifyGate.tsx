"use client";

import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import GstVerifyCard from './GstVerifyCard';

export default function GstVerifyGate({ role }: { role: 'contractor' | 'employer' }) {
  const [checked, setChecked] = useState(false);
  const [verified, setVerified] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void fetch(`/api/${role}/gst/status`, { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { data?: { status?: string } } | null) => {
        if (!active) return;
        // GST is optional for contractors: a "not applicable" answer also clears the gate.
        const status = body?.data?.status;
        const ok = status === 'VERIFIED' || status === 'NOT_APPLICABLE';
        setVerified(ok);
        setOpen(!ok);
        setChecked(true);
      })
      .catch(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [role]);

  const noGst = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/${role}/gst/not-applicable`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Could not continue.');
      }
      setVerified(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not continue.');
    } finally { setBusy(false); }
  };

  if (!checked || verified || !open) return null;

  const hasGst = role === 'employer';
  return (
    <div className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Verify GST">
      <div className="bg-[var(--color-bss-bg)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        <header className="px-5 py-4 bg-white border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><BadgeCheck size={18} className="text-[#073B67]"/>Do you have a GST number?</h2>
            <p className="text-xs text-gray-500 mt-1">{hasGst
              ? `Confirm your organisation's GSTIN to continue, or continue without it (your details are completed at approval).`
              : `Confirm your firm's GSTIN to auto-fill your details, or continue without GST — provide your other documents and the remaining details are completed by the admin at approval.`}</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">Optional</span>
        </header>
        <div className="p-5 space-y-4">
          <GstVerifyCard role={role} onVerified={() => setVerified(true)} />
          <div className="border-t border-gray-100 pt-4">
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
            <button type="button" onClick={() => void noGst()} disabled={busy} className="w-full h-11 rounded-xl border border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
              {busy ? 'Please wait…' : "I don't have a GST — continue and provide documents"}
            </button>
            <p className="text-[11px] text-gray-400 mt-2 text-center">The admin completes your GST / registration fields when your account is approved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
