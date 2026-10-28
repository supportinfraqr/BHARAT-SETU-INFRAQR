import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type RouteContext = { params: Promise<{ documentId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession('Employer');
    const { documentId } = await context.params;
    const config = getRuntimeConfig();
    const result = await upstreamRequest<{ token: string; expiresAt: string; error?: string }>(
      config.apiBaseUrl,
      `/v1/employer/worker-documents/${encodeURIComponent(documentId)}/token`,
      session,
      { method: 'POST', body: '{}' },
    );
    return NextResponse.json(result, { status: 200, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'A secure preview link could not be created.'); }
}
