import RequiredLicenses from '@/components/licenses/RequiredLicenses';
import { requireSession } from '@/server/session';

export default async function EmployerLicensesPage() {
  await requireSession('Employer');
  return <RequiredLicenses
    endpoint="/api/employer/licenses"
    title="Licences"
    subtitle="Statutory licences applicable to your organisation. Upload the licence copy when prompted — BSS verifies it."
  />;
}
