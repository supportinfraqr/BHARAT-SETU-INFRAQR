"use client";

import MonthlyAudit from './MonthlyAudit';

export default function EmployerMonthlyAudit() {
  return <MonthlyAudit
    role="employer"
    listEndpoint="/api/employer/audit-jobs"
    sites={[]}
  />;
}
