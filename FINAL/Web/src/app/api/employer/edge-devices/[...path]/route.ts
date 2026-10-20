import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path: string[] }> };

async function forward(request: Request, ctx: Ctx, method: 'POST' | 'PATCH') {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const { path } = await ctx.params;
    const suffix = (path || []).join('/');
    const body = await readJsonObject(request, 64_000);
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/employer/edge-devices/${suffix}`, session, {
      method,
      body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Edge device request failed.');
  }
}

export const PATCH = (request: Request, ctx: Ctx) => forward(request, ctx, 'PATCH');
export const POST = (request: Request, ctx: Ctx) => forward(request, ctx, 'POST');
