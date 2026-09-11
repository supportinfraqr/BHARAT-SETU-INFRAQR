import 'server-only';

import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { portalRolePath } from '@/server/role-path';
import type {
  ContractorPortalData,
  EmployerPortalData,
  GovernmentPortalData,
  PortalSession,
  WorkerPortalData,
} from '@/types/portal';

export async function getWorkerPortal(session: PortalSession): Promise<WorkerPortalData> {
  const config = getRuntimeConfig();
  const portal = await upstreamRequest<Omit<WorkerPortalData, 'dataMode'>>(config.apiBaseUrl, '/v1/worker/portal', session);
  return { ...portal, dataMode: 'remote' };
}

export async function getContractorPortal(session: PortalSession): Promise<ContractorPortalData> {
  const config = getRuntimeConfig();
  return upstreamRequest<ContractorPortalData>(config.apiBaseUrl, '/v1/contractor/portal', session);
}

export async function getEmployerPortal(session: PortalSession): Promise<EmployerPortalData> {
  const config = getRuntimeConfig();
  return upstreamRequest<EmployerPortalData>(config.apiBaseUrl, '/v1/employer/portal', session);
}

export async function getGovernmentPortal(session: PortalSession): Promise<GovernmentPortalData> {
  const config = getRuntimeConfig();
  const portal = await upstreamRequest<Omit<GovernmentPortalData, 'dataMode'>>(config.apiBaseUrl, '/v1/government/portal', session);
  return { ...portal, dataMode: 'remote' };
}

export async function mutatePortal<T>(session: PortalSession, resource: string, init: RequestInit): Promise<T> {
  const config = getRuntimeConfig();
  return upstreamRequest<T>(config.apiBaseUrl, `/v1/${portalRolePath(session.role)}/${resource}`, session, init);
}