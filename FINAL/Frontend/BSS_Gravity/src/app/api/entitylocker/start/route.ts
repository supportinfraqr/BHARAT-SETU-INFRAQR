import { NextResponse } from 'next/server';
import { apiError, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { getSession } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Begin the EntityLocker OAuth2 consent flow. Works signed-in (dashboard) and
 * signed-out (registration); the session, when present, is forwarded so the
 * backend can link the verification to the account. */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 8_000);
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/entitylocker/start', session, {
      method: 'POST', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'EntityLocker verification could not be started.'); }
}
