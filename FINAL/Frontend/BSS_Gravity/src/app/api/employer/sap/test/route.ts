import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Employer');
    assertRateLimit(`sap-test:${session.sessionId}`, 20, 60_000);
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 8_000);
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/sap/test', session, {
      method: 'POST', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The SAP connection test failed.'); }
}
