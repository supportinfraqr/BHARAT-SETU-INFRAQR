import MedicalSafetyWorkspace from '@/components/employer/MedicalSafetyWorkspace';
import { requireSession } from '@/server/session';

export default async function EmployerWorkerComplianceChecklistsPage() {
  await requireSession('Employer');
  return <MedicalSafetyWorkspace />;
}
