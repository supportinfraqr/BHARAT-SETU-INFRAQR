import 'server-only';

import type { PortalRole } from '@/types/portal';

const rolePaths: Record<PortalRole, string> = {
  Worker: 'worker',
  Contractor: 'contractor',
  Employer: 'employer',
  'BSS Admin': 'admin',
  'BSS Staff': 'bss-staff',
  Government: 'government',
};

export function portalRolePath(role: PortalRole): string {
  return rolePaths[role];
}
