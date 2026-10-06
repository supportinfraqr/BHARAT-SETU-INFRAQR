import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation } from '@/server/api';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/admin/register-templates/reset-defaults', session, {
      method: 'POST', body: JSON.stringify({}),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The register templates could not be reset to default.'); }
}
