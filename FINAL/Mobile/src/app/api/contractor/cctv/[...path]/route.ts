import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest, upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path: string[] }> };

async function forward(request: Request, ctx: Ctx, method: 'GET') {
  try {
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const { path } = await ctx.params;
    const suffix = (path || []).join('/');
    const search = new URL(request.url).search;
    if (method === 'GET' && suffix.endsWith('/snapshot')) {
      const upstream = await upstreamStream(config.apiBaseUrl, `/v1/contractor/cctv/${suffix}${search}`, session);
      return new Response(upstream.body, {
        status: 200,
        headers: {
          'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
          'Cache-Control': 'no-store',
        },
      });
    }
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/contractor/cctv/${suffix}${search}`, session, { method });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'CCTV request failed.');
  }
}

export const GET = (request: Request, ctx: Ctx) => forward(request, ctx, 'GET');
