import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession('Contractor');
    const { id } = await context.params;
    const config = getRuntimeConfig();
    const result = await upstreamRequest<{ token: string; expiresAt: string; error?: string }>(
      config.apiBaseUrl,
      `/v1/contractor/documents/${encodeURIComponent(id)}/token`,
      session,
      { method: 'POST', body: '{}' },
    );
    return NextResponse.json(result, { status: 200, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'A secure preview link could not be created.');
  }
}