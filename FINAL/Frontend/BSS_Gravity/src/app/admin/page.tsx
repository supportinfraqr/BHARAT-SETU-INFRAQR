import AdminOverview from '@/components/admin/AdminOverview';
import { requireSession } from '@/server/session';

export default async function AdminPage() {
  await requireSession('BSS Admin');
  return <AdminOverview/>;
}
