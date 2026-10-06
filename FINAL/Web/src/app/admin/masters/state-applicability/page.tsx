import StateApplicabilityPage from '@/components/admin/StateApplicabilityPage';
import { requireSession } from '@/server/session';

export default async function AdminStateApplicabilityPage() {
  await requireSession('BSS Admin');
  return <StateApplicabilityPage/>;
}
