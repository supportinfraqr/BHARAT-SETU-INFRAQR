import OrgCostSheetsPage from '@/components/costsheet/OrgCostSheetsPage';
import { requireSession } from '@/server/session';

export default async function ContractorCostSheetsPage() {
  await requireSession('Contractor');
  return <OrgCostSheetsPage/>;
}
