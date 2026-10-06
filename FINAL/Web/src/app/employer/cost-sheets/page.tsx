import OrgCostSheetsPage from '@/components/costsheet/OrgCostSheetsPage';
import { requireSession } from '@/server/session';

export default async function EmployerCostSheetsPage() {
  await requireSession('Employer');
  return <OrgCostSheetsPage/>;
}
