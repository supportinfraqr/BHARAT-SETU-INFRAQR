import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 16_000);
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/admin/form-names/copy-all-states', session, {
      method: 'POST', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Form names could not be copied to all states.'); }
}
