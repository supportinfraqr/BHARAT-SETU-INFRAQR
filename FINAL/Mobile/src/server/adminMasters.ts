import 'server-only';

import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

/** Master keys the admin portal exposes (mirrors api/v1_bridge/admin_masters.py). */
export const ADMIN_MASTER_KEYS = new Set([
  'party', 'statutory', 'professional-tax', 'lwf', 'license', 'minimum-wage',
  'register-doc', 'compliance', 'employer-document', 'employer-register', 'employer-act',
  'users',
]);

export async function adminMastersUpstream(key: string, method: string, body?: unknown, id?: number) {
  const session = await requireApiSession('BSS Admin');
  const config = getRuntimeConfig();
  const base = key ? `/v1/admin/masters/${encodeURIComponent(key)}` : '/v1/admin/masters';
  const path = id ? `${base}/${id}` : base;
  return upstreamRequest(config.apiBaseUrl, path, session, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** The PAN-India register template library (State + Form). */
export async function registerTemplatesUpstream(query: string) {
  const session = await requireApiSession('BSS Admin');
  const config = getRuntimeConfig();
  return upstreamRequest(config.apiBaseUrl, `/v1/admin/register-templates${query}`, session);
}

/** The CLRA applicability matrix (state × purpose → form). */
export async function stateApplicabilityUpstream(query: string) {
  const session = await requireApiSession('BSS Admin');
  const config = getRuntimeConfig();
  return upstreamRequest(config.apiBaseUrl, `/v1/admin/state-applicability${query}`, session);
}

/** The system-wide audit trail. */
export async function adminActivityUpstream(query: string) {
  const session = await requireApiSession('BSS Admin');
  const config = getRuntimeConfig();
  return upstreamRequest(config.apiBaseUrl, `/v1/admin/activity${query}`, session);
}

/** Per-user module permission grants. */
export async function adminPermissionsUpstream(method: 'GET' | 'POST', body?: unknown) {
  const session = await requireApiSession('BSS Admin');
  const config = getRuntimeConfig();
  return upstreamRequest(config.apiBaseUrl, '/v1/admin/permissions', session, {
    method, body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Universal worker cost sheet templates. */
export async function costSheetsUpstream(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown, id?: number) {
  const session = await requireApiSession('BSS Admin');
  const config = getRuntimeConfig();
  const path = `/v1/admin/cost-sheets${id ? `/${id}` : ''}`;
  return upstreamRequest(config.apiBaseUrl, path, session, {
    method, body: body === undefined ? undefined : JSON.stringify(body),
  });
}
