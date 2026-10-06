import { NextResponse } from 'next/server';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { apiError, readJsonObject, assertTrustedMutation } from '@/server/api';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Worker').catch(() => null);
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const body = await readJsonObject(request);
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/worker/claim-mobile', session, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'Your mobile number could not be updated.');
  }
}
