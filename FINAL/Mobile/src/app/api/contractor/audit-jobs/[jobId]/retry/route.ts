import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { jobId } = await context.params;
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/contractor/audit-jobs/${encodeURIComponent(jobId)}/retry`, session, { method: 'POST', body: '{}' });
    return NextResponse.json(result, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The audit could not be retried.'); }
}
