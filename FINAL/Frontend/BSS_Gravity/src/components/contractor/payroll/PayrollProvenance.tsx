"use client";

import { CheckCircle2, Landmark, TriangleAlert, UserRoundCog } from 'lucide-react';
import type { PayrollMatchState, PayrollSource } from '@/types/portal';

/** Shared Payroll provenance badges — used by Employer AND Contractor payroll
 *  so both portals render the exact same source/conflict visual language. */

export function SourceBadge({ source }: { source?: PayrollSource }) {
  if (source === 'Employer') return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5"><Landmark size={10}/>Employer Provided</span>;
  if (source === 'Contractor') return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5"><UserRoundCog size={10}/>Contractor Entered</span>;
  return <span className="text-[10px] font-bold text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">Source —</span>;
}

const matchTone: Record<PayrollMatchState, string> = {
  'Employer Provided': 'text-blue-700 bg-blue-50 border-blue-100',
  'Contractor Entered': 'text-green-700 bg-green-50 border-green-100',
  Matched: 'text-green-700 bg-green-50 border-green-100',
  'Needs Review': 'text-red-600 bg-red-50 border-red-200',
};

export function MatchStateBadge({ state }: { state?: PayrollMatchState }) {
  if (!state) return null;
  const icon = state === 'Needs Review' ? <TriangleAlert size={10}/> : state === 'Matched' ? <CheckCircle2 size={10}/> : undefined;
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold border rounded-full px-2 py-0.5 ${matchTone[state]}`}>{icon}{state === 'Needs Review' ? 'REVIEW REQUIRED' : state}</span>;
}
