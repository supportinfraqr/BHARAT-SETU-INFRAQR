import ComplianceChecklistsPage from '@/components/employer/ComplianceChecklistsPage';
import { requireSession } from '@/server/session';

export default async function EmployerComplianceChecklistsPage() {
  await requireSession('Employer');
  return <ComplianceChecklistsPage/>;
}
