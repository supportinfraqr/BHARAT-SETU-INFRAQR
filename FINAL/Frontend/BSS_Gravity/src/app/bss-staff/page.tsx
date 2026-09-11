import BssStaffDashboard from '@/components/support/BssStaffDashboard';
import { getOperationsSnapshot } from '@/server/operations';
import { requireSession } from '@/server/session';

export default async function BssStaffPage() {
  const session = await requireSession('BSS Staff');
  const snapshot = await getOperationsSnapshot(session);
  return <BssStaffDashboard initialSnapshot={snapshot}/>;
}
