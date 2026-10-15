import GlobalComplianceAudit from '@/components/audit/GlobalComplianceAudit';
import { requireSession } from '@/server/session';

export default async function ContractorAuditReportsPage() {
  await requireSession('Contractor');
  return <GlobalComplianceAudit
    endpoint="/api/contractor/audit/global"
    title="Global Compliance AI Audit"
    subtitle="AI audit of your organisation's live compliance data — generated from a private workspace by a multimodal AI agent."
  />;
}
