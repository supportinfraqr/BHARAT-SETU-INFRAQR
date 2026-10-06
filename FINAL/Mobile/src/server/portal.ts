import 'server-only';

import { redirect } from 'next/navigation';
import { getRuntimeConfig } from '@/server/config';
import { isStaleSessionError, upstreamRequest } from '@/server/http';
import { portalRolePath } from '@/server/role-path';
import type {
  ContractorPortalData,
  EmployerPortalData,
  GovernmentPortalData,
  PortalSession,
  WorkerPortalData,
} from '@/types/portal';

// Portal layouts load data during the Server Component render. If the session
// went stale (expired/revoked token, or the account was removed) the upstream
// rejects it — send the user to login rather than crashing the render.
async function guarded<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (isStaleSessionError(error)) redirect('/?reason=session');
    throw error;
  }
}

// Portal SSR loads get a longer budget than interactive API calls: a momentary
// backend stall (cold worker, deploy, heavy OCR) must not crash the whole route.
const PORTAL_TIMEOUT_MS = 25_000;

export function getWorkerPortal(session: PortalSession): Promise<WorkerPortalData> {
  return guarded(async () => {
    const config = getRuntimeConfig();
    const portal = await upstreamRequest<Omit<WorkerPortalData, 'dataMode'>>(config.apiBaseUrl, '/v1/worker/portal', session, {}, { timeoutMs: PORTAL_TIMEOUT_MS });
    return { ...portal, dataMode: 'remote' };
  });
}

export function getContractorPortal(session: PortalSession): Promise<ContractorPortalData> {
  return guarded(() => {
    const config = getRuntimeConfig();
    return upstreamRequest<ContractorPortalData>(config.apiBaseUrl, '/v1/contractor/portal', session, {}, { timeoutMs: PORTAL_TIMEOUT_MS });
  });
}

export function getEmployerPortal(session: PortalSession): Promise<EmployerPortalData> {
  return guarded(() => {
    const config = getRuntimeConfig();
    return upstreamRequest<EmployerPortalData>(config.apiBaseUrl, '/v1/employer/portal', session, {}, { timeoutMs: PORTAL_TIMEOUT_MS });
  });
}

export function getGovernmentPortal(session: PortalSession): Promise<GovernmentPortalData> {
  return guarded(async () => {
    const config = getRuntimeConfig();
    const portal = await upstreamRequest<Omit<GovernmentPortalData, 'dataMode'>>(config.apiBaseUrl, '/v1/government/portal', session, {}, { timeoutMs: PORTAL_TIMEOUT_MS });
    return { ...portal, dataMode: 'remote' };
  });
}

export async function mutatePortal<T>(session: PortalSession, resource: string, init: RequestInit, options: { timeoutMs?: number } = {}): Promise<T> {
  const config = getRuntimeConfig();
  return upstreamRequest<T>(config.apiBaseUrl, `/v1/${portalRolePath(session.role)}/${resource}`, session, init, options);
}