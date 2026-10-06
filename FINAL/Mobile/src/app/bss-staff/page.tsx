import BssStaffDashboard from '@/components/support/BssStaffDashboard';
import { requireOperationsSnapshot } from '@/server/operations';
import { requireSession } from '@/server/session';

export default async function BssStaffPage() {
  const session = await requireSession('BSS Staff');
  const snapshot = await requireOperationsSnapshot(session);
  return <BssStaffDashboard initialSnapshot={snapshot}/>;
}
