import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path: string[] }> };

async function forward(request: Request, ctx: Ctx, method: 'GET' | 'POST' | 'PUT' | 'DELETE') {
  try {
    if (method !== 'GET') assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const { path } = await ctx.params;
    const suffix = (path || []).join('/');
    const search = new URL(request.url).search;
    const hasBody = (request.headers.get('content-length') || '0') !== '0' || Boolean(request.headers.get('content-type'));
    const body = (method === 'POST' || method === 'PUT') && hasBody
      ? await readJsonObject(request, 100_000)
      : undefined;
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/admin/ai/${suffix}${search}`, session, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'AI settings request failed.');
  }
}

export const GET = (request: Request, ctx: Ctx) => forward(request, ctx, 'GET');
export const POST = (request: Request, ctx: Ctx) => forward(request, ctx, 'POST');
export const PUT = (request: Request, ctx: Ctx) => forward(request, ctx, 'PUT');
export const DELETE = (request: Request, ctx: Ctx) => forward(request, ctx, 'DELETE');
