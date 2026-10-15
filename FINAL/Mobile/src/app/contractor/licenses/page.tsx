import RequiredLicenses from '@/components/licenses/RequiredLicenses';
import { requireSession } from '@/server/session';

export default async function ContractorLicensesPage() {
  await requireSession('Contractor');
  return <RequiredLicenses
    endpoint="/api/contractor/licenses"
    title="Licences"
    subtitle="Statutory licences applicable to your organisation. Upload the licence copy when prompted — BSS verifies it."
  />;
}
