"use client";

import { History, Landmark, UserRoundCog } from 'lucide-react';
import type { EmployerPortalData } from '@/types/portal';
import { formatInr } from '@/components/contractor/payroll/PayrollCalculator';
import { MatchStateBadge } from '@/components/contractor/payroll/PayrollProvenance';

/** Payroll History — source-traceable audit of who entered each record. */
export default function PayrollHistory({ portal }: { portal: EmployerPortalData }) {
  const { payroll } = portal;
  const sorted = [...payroll.records].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
    <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Payroll History · Source traceability</h2><p className="text-xs text-gray-400 mt-0.5">Every record shows who entered it (Employer or Contractor), the worker, period, contractor destination and current match state.</p></header>
    <div className="divide-y divide-gray-100">
      {sorted.map(record => (
        <div key={record.id} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 ${record.source === 'Employer' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>{record.source === 'Employer' ? <Landmark size={15}/> : <UserRoundCog size={15}/>}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{record.workerName} · {record.period}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{record.updatedBy} · {new Date(record.updatedAt).toLocaleString('en-IN')} · → {record.contractor ?? 'Unmapped'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-800">{formatInr(record.netPay)}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${record.source === 'Employer' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>{record.source === 'Employer' ? 'Employer Provided' : 'Contractor Entered'}</span>
            <MatchStateBadge state={record.matchState}/>
          </div>
        </div>
      ))}
    </div>
    <footer className="px-5 py-3 border-t border-gray-100 text-[11px] text-gray-400 flex items-center gap-1.5"><History size={12}/>Audit trail reflects frontend demo state — backend reconciliation can be wired later.</footer>
  </section>;
}
