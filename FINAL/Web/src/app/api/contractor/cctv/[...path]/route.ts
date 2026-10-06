import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
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
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/contractor/cctv/${suffix}${search}`, session, { method });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'CCTV request failed.');
  }
}

export const GET = (request: Request, ctx: Ctx) => forward(request, ctx, 'GET');
