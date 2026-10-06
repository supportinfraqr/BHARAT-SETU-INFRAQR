"use client";

import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import GstVerifyCard from './GstVerifyCard';

export default function GstVerifyGate({ role }: { role: 'contractor' | 'employer' }) {
  const [checked, setChecked] = useState(false);
  const [verified, setVerified] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/${role}/gst/status`, { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { data?: { status?: string } } | null) => {
        if (!active) return;
        const ok = body?.data?.status === 'VERIFIED';
        setVerified(ok);
        setOpen(!ok);
        setChecked(true);
      })
      .catch(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [role]);

  if (!checked || verified || !open) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Verify GST">
      <div className="bg-[var(--color-bss-bg)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        <header className="px-5 py-4 bg-white border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><BadgeCheck size={18} className="text-[#073B67]"/>Verify your GST (identity proof)</h2>
            <p className="text-xs text-gray-500 mt-1">Please confirm your {role === 'employer' ? 'organisation' : 'firm'}&apos;s GSTIN to continue. This step is required and can&apos;t be skipped.</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">Required</span>
        </header>
        <div className="p-5">
          <GstVerifyCard role={role} onVerified={() => setVerified(true)} />
        </div>
      </div>
    </div>
  );
}
