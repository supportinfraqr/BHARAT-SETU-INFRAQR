import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store' } as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`admin-site-cctv:${session.sessionId}`, 60, 60_000);
    const { id } = await params;
    const body = await readJsonObject(request, 8_000);
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/admin/sites/${encodeURIComponent(id)}/camera-limit`, session,
      { method: 'POST', body: JSON.stringify(body) });
    return NextResponse.json(result, { headers: noStore });
  } catch (error) { return apiError(error, 'Site CCTV settings could not be saved.'); }
}
