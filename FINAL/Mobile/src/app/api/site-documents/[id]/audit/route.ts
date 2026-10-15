import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

/** (Re)run the AI audit for a contractor-site document. */
export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession();
    assertRateLimit(`csd-audit:${session.sessionId}`, 20, 60_000);
    const { id } = await context.params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'Invalid document.' }, { status: 400 });
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/site-documents/${id}/audit`, session, {
      method: 'POST',
    }, { timeoutMs: 75_000 });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiError(error, 'The audit could not be run.');
  }
}
