import ItOperationsDashboard from '@/components/support/ItOperationsDashboard';
import { getOperationsSnapshot } from '@/server/operations';
import { requireSession } from '@/server/session';
import type { PortalRole } from '@/types/portal';

// See layout.tsx — legacy help-desk role guard (retired role, redirect-only).
const LEGACY_HELPDESK_ROLE = 'IT Help Desk' as PortalRole;

export default async function ItHelpDeskPage() {
  const session = await requireSession(LEGACY_HELPDESK_ROLE);
  const snapshot = await getOperationsSnapshot(session);
  return <ItOperationsDashboard initialSnapshot={snapshot}/>;
}
