"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { PartyLicenses } from '@/types/portal';

/** Compact dashboard prompt: shows when the signed-in party has licences to upload. */
export default function LicensesPrompt({ endpoint, href }: { endpoint: string; href: string }) {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch(endpoint, { cache: 'no-store' })
      .then(r => r.json())
      .then((body: { data?: PartyLicenses }) => { if (alive) setPending(body.data?.pending ?? 0); })
      .catch(() => {});
    return () => { alive = false; };
  }, [endpoint]);

  if (pending <= 0) return null;
  return (
    <Link href={href} className="group relative flex items-center gap-3 rounded-2xl border border-[#F5C6B2] bg-[#FDF0EA] pl-5 pr-4 py-3 overflow-hidden hover:shadow-md transition-all">
      <span className="absolute left-0 inset-y-0 w-1 bg-[#E45D24]" />
      <span className="w-9 h-9 rounded-full bg-[#E45D24] text-white grid place-items-center shrink-0"><AlertTriangle size={16} /></span>
      <span className="text-sm text-[#01183A] flex-1">
        <strong>{pending}</strong> statutory licence{pending === 1 ? '' : 's'} applicable to you need{pending === 1 ? 's' : ''} to be uploaded.{' '}
      </span>
      <span className="shrink-0 h-8 px-3.5 rounded-full bg-[#01183A] text-white text-xs font-bold inline-flex items-center group-hover:bg-[#E45D24] transition-colors">Upload now</span>
    </Link>
  );
}
