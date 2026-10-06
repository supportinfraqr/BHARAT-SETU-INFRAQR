import WorkerComplianceChecklistsPage from '@/components/employer/ComplianceChecklistsPage';
import { requireSession } from '@/server/session';

export default async function EmployerWorkerComplianceChecklistsPage() {
  await requireSession('Employer');
  return <WorkerComplianceChecklistsPage/>;
}
