import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation } from '@/server/api';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { UpstreamError, upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    const { id } = await context.params;
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/admin/letter-templates/${encodeURIComponent(id)}/copy-all-states`, session, {
      method: 'POST',
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof UpstreamError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400, headers: { 'Cache-Control': 'private, no-store' } });
    }
    return apiError(error, 'The letter template could not be copied to all states.');
  }
}
