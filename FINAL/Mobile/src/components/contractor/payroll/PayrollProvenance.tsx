"use client";

import { CheckCircle2, Landmark, TriangleAlert, UserRoundCog } from 'lucide-react';
import type { PayrollMatchState, PayrollSource } from '@/types/portal';

/** Shared Payroll provenance badges — used by Employer AND Contractor payroll
 *  so both portals render the exact same source/conflict visual language. */

export function SourceBadge({ source }: { source?: PayrollSource }) {
  if (source === 'Employer') return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-bss-interactive-blue bg-bss-blue-tint border border-bss-border rounded-full px-2 py-0.5"><Landmark size={10}/>Employer Provided</span>;
  if (source === 'Contractor') return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-bss-green bg-bss-soft-green border border-bss-border rounded-full px-2 py-0.5"><UserRoundCog size={10}/>Contractor Entered</span>;
  return <span className="text-[10px] font-bold text-bss-text-muted border border-bss-border rounded-full px-2 py-0.5">Source —</span>;
}

const matchTone: Record<PayrollMatchState, string> = {
  'Employer Provided': 'text-bss-interactive-blue bg-bss-blue-tint border-bss-border',
  'Contractor Entered': 'text-bss-green bg-bss-soft-green border-bss-border',
  Matched: 'text-bss-green bg-bss-soft-green border-bss-border',
  'Needs Review': 'text-bss-error bg-bss-soft-orange border-bss-border',
};

export function MatchStateBadge({ state }: { state?: PayrollMatchState }) {
  if (!state) return null;
  const icon = state === 'Needs Review' ? <TriangleAlert size={10}/> : state === 'Matched' ? <CheckCircle2 size={10}/> : undefined;
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold border rounded-full px-2 py-0.5 ${matchTone[state]}`}>{icon}{state === 'Needs Review' ? 'REVIEW REQUIRED' : state}</span>;
}
