import { requireSession } from '@/server/session';
import AiAuditSettingsPage from '@/components/admin/AiAuditSettingsPage';

export default async function AdminAuditSettingsPage() {
  await requireSession('BSS Admin');
  return <AiAuditSettingsPage />;
}
