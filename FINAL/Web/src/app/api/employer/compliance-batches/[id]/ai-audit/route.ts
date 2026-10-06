import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const batch = Number(id);
    if (!Number.isInteger(batch)) {
      return new Response('Unknown batch.', { status: 404 });
    }
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const result = await upstreamRequest<{ data?: { status?: string }; error?: string }>(
      config.apiBaseUrl,
      `/v1/employer/compliance-batches/${batch}/ai-audit`,
      session,
      { method: 'POST', body: '{}' },
    );
    return NextResponse.json(result, { status: 202, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'AI audit could not be started.'); }
}
