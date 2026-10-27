"use client";

import PayrollEngineApp from '@/components/payroll-engine/PayrollEngineApp';

/** Worker "My Payroll" — payslips, salary statement, claims, tax, Form 16, VPF. */
export default function WorkerPayrollPage() {
  return <div className="mx-auto max-w-7xl px-4 py-6"><PayrollEngineApp mode="employee" /></div>;
}
