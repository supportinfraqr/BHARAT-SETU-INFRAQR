"use client";

import PayrollWorkspace from '@/components/payroll/PayrollWorkspace';
import { useEmployer } from '@/contexts/EmployerContext';

/** Employer Payroll — the SAME unified Payroll application at Employer scope
 *  (workforce across sites & contractors, automatic Worker → Contractor routing). */
export default function EmployerPayrollPage() {
  const { employer } = useEmployer();
  return <div className="relative">
    <div aria-hidden className="pointer-events-none select-none absolute inset-0 z-[60] overflow-hidden">
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-x-20 gap-y-28 -rotate-[24deg] scale-[1.6]">
        {Array.from({ length: 14 }).map((_, i) => <span key={i} className="text-2xl sm:text-3xl font-black uppercase tracking-[0.28em] text-black/5 whitespace-nowrap">Under Development</span>)}
      </div>
    </div>
    <PayrollWorkspace role="Employer" portal={employer} />
  </div>;
}
