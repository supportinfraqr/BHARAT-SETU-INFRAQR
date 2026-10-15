import GlobalComplianceAudit from '@/components/audit/GlobalComplianceAudit';
import { requireSession } from '@/server/session';

export default async function EmployerAuditReportsPage() {
  await requireSession('Employer');
  return <GlobalComplianceAudit
    endpoint="/api/employer/audit/global"
    title="Global Compliance AI Audit"
    subtitle="AI audit of your organisation and connected contractors' live compliance data — generated from a private workspace by a multimodal AI agent."
  />;
}
