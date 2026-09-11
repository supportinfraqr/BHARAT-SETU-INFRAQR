"use client";

import PayrollWorkspace from '@/components/payroll/PayrollWorkspace';
import { useEmployer } from '@/contexts/EmployerContext';

/** Employer Payroll — the SAME unified Payroll application at Employer scope
 *  (workforce across sites & contractors, automatic Worker → Contractor routing). */
export default function EmployerPayrollPage() {
  const { employer } = useEmployer();
  return <PayrollWorkspace role="Employer" portal={employer} />;
}
