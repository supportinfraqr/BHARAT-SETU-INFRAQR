import AdminMonthlyAudit from '@/components/audit/AdminMonthlyAudit';
import { requireSession } from '@/server/session';

export default async function AdminAuditReportsPage() {
  await requireSession('BSS Admin');
  return <AdminMonthlyAudit />;
}
