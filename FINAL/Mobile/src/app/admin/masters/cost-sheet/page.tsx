import CostSheetTemplatesPage from '@/components/admin/CostSheetTemplatesPage';
import { requireSession } from '@/server/session';

export default async function AdminCostSheetPage() {
  await requireSession('BSS Admin');
  return <CostSheetTemplatesPage/>;
}
