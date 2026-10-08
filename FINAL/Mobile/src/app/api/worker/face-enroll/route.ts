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
    // Face enrolment runs face-detection + embedding on all 5 photos in the
    // attendance controller, so allow well beyond the default request timeout.
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/worker/face-enroll', session, {
      method: 'POST',
      body: JSON.stringify(body),
    }, { timeoutMs: 170_000 });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Face photos could not be enrolled.');
  }
}
