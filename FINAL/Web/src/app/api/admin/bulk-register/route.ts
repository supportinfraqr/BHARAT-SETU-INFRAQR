import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest, upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const params = new URL(request.url).searchParams;
    const entity = params.get('entity') ?? 'employers';
    const password = params.get('password') ?? '';
    const upstream = await upstreamStream(
      config.apiBaseUrl,
      `/v1/admin/bulk-register/${encodeURIComponent(entity)}?password=${encodeURIComponent(password)}`,
      session,
    );
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': upstream.headers.get('content-disposition') ?? `attachment; filename="bss-bulk-${entity}.xlsx"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) { return apiError(error, 'The bulk template could not be downloaded.'); }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`bulk-register:${session.sessionId}`, 20, 60_000);
    const entity = new URL(request.url).searchParams.get('entity') ?? 'employers';
    const data = await request.formData();
    const config = getRuntimeConfig();
    const result = await upstreamRequest(
      config.apiBaseUrl,
      `/v1/admin/bulk-register/${encodeURIComponent(entity)}`,
      session,
      { method: 'POST', body: data },
    );
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The bulk registration could not be completed.'); }
}
