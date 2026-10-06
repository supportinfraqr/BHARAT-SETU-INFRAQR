import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// Issue a single-use, 5-minute token to read a grievance file (audio/attachment).
export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession();
    const { id } = await context.params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'Invalid grievance.' }, { status: 400 });
    assertRateLimit(`grievance-token:${session.sessionId}:${id}`, 60, 60_000);
    const body = await readJsonObject(request);
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/grievances/${id}/file-token`, session, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'A secure link could not be created.');
  }
}
