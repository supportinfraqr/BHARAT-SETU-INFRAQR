import SupportShell from '@/components/support/SupportShell';
import { requireSession } from '@/server/session';
import type { PortalRole } from '@/types/portal';

// Legacy help-desk route. "IT Help Desk" is no longer an issuable PortalRole
// (the role was consolidated into BSS Staff), so this guard can never match and
// the route redirects to the landing page — the same runtime behaviour as when
// the role was retired. Kept type-safe with an explicit legacy-role cast.
const LEGACY_HELPDESK_ROLE = 'IT Help Desk' as PortalRole;

export default async function ItHelpDeskLayout({ children }: { children: React.ReactNode }) {
  await requireSession(LEGACY_HELPDESK_ROLE);
  return <SupportShell label="IT Help Desk" nav="/it-helpdesk">{children}</SupportShell>;
}
