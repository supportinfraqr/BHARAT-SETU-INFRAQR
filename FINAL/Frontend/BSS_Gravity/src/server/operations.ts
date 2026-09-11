import 'server-only';

import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { portalRolePath } from '@/server/role-path';
import type { PortalSession } from '@/types/portal';
import type {
  OperationsAction,
  OperationsActionResult,
  OperationsSnapshot,
} from '@/types/operations';

function forbidden(message = 'This operation is not permitted for your role.'): never {
  throw Object.assign(new Error(message), { status: 403 });
}

export async function getOperationsSnapshot(session: PortalSession): Promise<OperationsSnapshot> {
  if (session.role !== 'BSS Admin' && session.role !== 'BSS Staff') forbidden();
  const config = getRuntimeConfig();
  return upstreamRequest<OperationsSnapshot>(config.apiBaseUrl, `/v1/${portalRolePath(session.role)}/operations`, session);
}

export async function performOperationsAction(session: PortalSession, action: OperationsAction): Promise<OperationsActionResult> {
  if (session.role !== 'BSS Admin' && session.role !== 'BSS Staff') forbidden();
  const config = getRuntimeConfig();
  return upstreamRequest<OperationsActionResult>(config.apiBaseUrl, `/v1/${portalRolePath(session.role)}/operations/actions`, session, {
    method: 'POST',
    body: JSON.stringify(action),
  });
}