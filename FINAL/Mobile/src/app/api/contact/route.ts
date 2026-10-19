import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { getSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await getSession();
    assertRateLimit(`contact:${session?.sessionId ?? 'public'}`, 6, 10 * 60_000);
    const config = getRuntimeConfig();
    const body = await readJsonObject(request);
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/contact', session, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(result, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Your message could not be sent.');
  }
}
