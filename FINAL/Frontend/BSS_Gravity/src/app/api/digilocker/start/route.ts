import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Worker');
    assertRateLimit(`digilocker-start:${session.sessionId}`, 10, 60_000);
    const config = getRuntimeConfig();
    const result = await upstreamRequest<{ authorize_url: string; state: string; session_id: number }>(
      config.apiBaseUrl,
      '/v1/digilocker/start/',
      session,
      { method: 'POST', body: JSON.stringify({}) },
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiError(error, 'DigiLocker linking could not be started.');
  }
}
