"use client";

import PayrollWorkspace from '@/components/payroll/PayrollWorkspace';
import { useContractor } from '@/contexts/ContractorContext';

/** Contractor Payroll — the SAME unified Payroll application at Contractor scope. */
export default function ContractorPayrollPage() {
  const { contractor } = useContractor();
  return <PayrollWorkspace role="Contractor" portal={contractor} />;
}
