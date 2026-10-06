import 'server-only';

import type { AdminPayrollSnapshot } from '@/lib/payroll/types';
import type { PortalSession } from '@/types/portal';

/**
 * BSS Admin Payroll snapshot — READ-ONLY supervisory projection of the SAME
 * Worker payroll records the Employer and Contractor portals operate on.
 * Data comes from the live /v1/admin/payroll endpoint (DB-driven).
 */
export async function getAdminPayrollSnapshot(session: PortalSession): Promise<AdminPayrollSnapshot> {
  const { getRuntimeConfig } = await import('@/server/config');
  const { upstreamRequest } = await import('@/server/http');
  const config = getRuntimeConfig();
  const snapshot = await upstreamRequest<AdminPayrollSnapshot>(config.apiBaseUrl, '/v1/admin/payroll', session);
  return {
    ...snapshot,
    dataMode: snapshot.dataMode === 'remote' ? snapshot.dataMode : 'remote',
  };
}