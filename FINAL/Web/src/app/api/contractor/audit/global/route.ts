import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Contractor global-compliance AI audits: list (GET) / generate (POST). */
export async function GET() {
  try {
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/contractor/audit/global', session, { method: 'GET' });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'The audit reports could not be loaded.');
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Contractor');
    assertRateLimit(`gaudit:${session.sessionId}`, 10, 60_000);
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/contractor/audit/global', session, { method: 'POST' });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error, 'The audit report could not be generated.');
  }
}
