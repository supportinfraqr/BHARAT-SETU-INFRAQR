import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    const { id } = await context.params;
    const body = await readJsonObject(request, 32_000);
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/admin/cost-sheets/${encodeURIComponent(id)}/transition`, session, {
      method: 'POST', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The template workflow could not be updated.'); }
}
