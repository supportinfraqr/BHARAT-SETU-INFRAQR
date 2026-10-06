"use client";

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

/** Compact, collapsible explainer of the binding + site-permission rules. */
export default function BindingSitesExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900"><HelpCircle size={16} className="text-[#073B67]" />How binding &amp; sites work</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="mt-3 space-y-1.5 text-xs text-gray-600 list-disc pl-5">
          <li>Scanning a QR is open to everyone, but binding always needs <strong>both parties</strong> to accept — no scan-to-autobind.</li>
          <li>Same-role accounts can&apos;t bind, and an employer can&apos;t bind a worker directly — workers are engaged through a contractor.</li>
          <li>Site access is <strong>two-step and per site</strong>: the employer proposes a site and the contractor approves (or the contractor requests and the employer approves).</li>
          <li>A worker holds <strong>one active site</strong> at a time — to move them to another site, unbind first, then bind again.</li>
          <li>After binding, scanning reveals more: a bound contractor sees the worker&apos;s verified identity, and a bound worker sees the contractor&apos;s business details.</li>
        </ul>
      )}
    </section>
  );
}
