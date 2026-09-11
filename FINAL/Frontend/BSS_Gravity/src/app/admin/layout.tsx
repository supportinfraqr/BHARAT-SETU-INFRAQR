import AdminShell from '@/components/admin/AdminShell';
import { requireSession } from '@/server/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSession('BSS Admin');
  return <AdminShell>{children}</AdminShell>;
}
