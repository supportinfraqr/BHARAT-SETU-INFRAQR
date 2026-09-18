import DeliveryPlanPage from '@/components/admin/DeliveryPlanPage';
import { requireSession } from '@/server/session';

export default async function AdminDeliveryPlanPage() {
  await requireSession('BSS Admin');
  return <DeliveryPlanPage/>;
}
