import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Contractor or employer uploads/replaces a licence copy. */
export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession();
    assertRateLimit(`lic-up:${session.sessionId}`, 30, 60_000);
    const form = await request.formData();
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/party-licenses/upload', session, {
      method: 'POST', body: form,
    }, { timeoutMs: 30_000 });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiError(error, 'The licence could not be uploaded.');
  }
}
