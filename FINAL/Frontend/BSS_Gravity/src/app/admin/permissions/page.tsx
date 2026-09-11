import PermissionsPage from '@/components/admin/PermissionsPage';
import { requireSession } from '@/server/session';

export default async function AdminPermissionsPage() {
  await requireSession('BSS Admin');
  return <PermissionsPage/>;
}
