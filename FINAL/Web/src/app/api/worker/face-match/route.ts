import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Worker');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 3_000_000);
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/worker/face-match', session, {
      method: 'POST',
      body: JSON.stringify(body),
    }, { timeoutMs: 60_000 });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'The photo could not be matched against your Aadhaar photo.');
  }
}
