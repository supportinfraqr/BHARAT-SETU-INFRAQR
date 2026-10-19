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
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100 transition-colors">
      <AlertTriangle size={18} className="text-amber-600 shrink-0" />
      <span className="text-sm text-amber-900">
        <strong>{pending}</strong> statutory licence{pending === 1 ? '' : 's'} applicable to you need{pending === 1 ? 's' : ''} to be uploaded.{' '}
        <span className="font-semibold underline">Upload now</span>
      </span>
    </Link>
  );
}
