import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Complete EntityLocker from the signed-in dashboard (session forwarded so the
 * verification is linked to the account). */
export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession();
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 8_000);
    const code = typeof body.code === 'string' ? body.code : '';
    const state = typeof body.state === 'string' ? body.state : '';
    const result = await upstreamRequest(
      config.apiBaseUrl,
      `/v1/entitylocker/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      session,
      { method: 'GET' },
    );
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'EntityLocker verification could not be completed.'); }
}
