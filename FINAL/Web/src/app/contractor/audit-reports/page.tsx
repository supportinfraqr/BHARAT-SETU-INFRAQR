import ContractorMonthlyAudit from '@/components/audit/ContractorMonthlyAudit';
import { requireSession } from '@/server/session';

export default async function ContractorAuditReportsPage() {
  await requireSession('Contractor');
  return <ContractorMonthlyAudit />;
}
