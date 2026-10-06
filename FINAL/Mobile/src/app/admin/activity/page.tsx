import ActivityReportPage from '@/components/admin/ActivityReportPage';
import { requireSession } from '@/server/session';

export default async function AdminActivityPage() {
  await requireSession('BSS Admin');
  return <ActivityReportPage/>;
}
