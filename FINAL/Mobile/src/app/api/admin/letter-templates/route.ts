import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { UpstreamError, upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const result = await upstreamRequest<{ rows?: unknown[] }>(config.apiBaseUrl, '/v1/admin/letter-templates', session);
    return NextResponse.json({ rows: result?.rows ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'Letter templates could not be loaded.'); }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`letter-templates:${session.sessionId}`, 60, 60_000);
    const body = await readJsonObject(request, 512_000);
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/admin/letter-templates', session, {
      method: 'POST', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof UpstreamError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400, headers: { 'Cache-Control': 'private, no-store' } });
    }
    return apiError(error, 'The letter template could not be saved.');
  }
}
