import EmployerMonthlyAudit from '@/components/audit/EmployerMonthlyAudit';
import { requireSession } from '@/server/session';

export default async function EmployerAuditReportsPage() {
  await requireSession('Employer');
  return <EmployerMonthlyAudit />;
}
