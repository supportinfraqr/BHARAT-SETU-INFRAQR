import 'server-only';

import { redirect } from 'next/navigation';
import { getRuntimeConfig } from '@/server/config';
import { isStaleSessionError, upstreamRequest } from '@/server/http';
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

/**
 * Page-level variant: when the upstream rejects the session (expired/revoked or
 * the account no longer exists), send the user to sign in again instead of
 * letting the Server Component throw a generic render error. Role/permission
 * failures still propagate as real errors.
 */
export async function requireOperationsSnapshot(session: PortalSession): Promise<OperationsSnapshot> {
  try {
    return await getOperationsSnapshot(session);
  } catch (error) {
    if (isStaleSessionError(error)) redirect('/?reason=session');
    throw error;
  }
}

export async function performOperationsAction(session: PortalSession, action: OperationsAction): Promise<OperationsActionResult> {
  if (session.role !== 'BSS Admin' && session.role !== 'BSS Staff') forbidden();
  const config = getRuntimeConfig();
  return upstreamRequest<OperationsActionResult>(config.apiBaseUrl, `/v1/${portalRolePath(session.role)}/operations/actions`, session, {
    method: 'POST',
    body: JSON.stringify(action),
  });
}