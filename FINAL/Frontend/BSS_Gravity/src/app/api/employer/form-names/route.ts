import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const state = new URL(request.url).searchParams.get('state');
    const suffix = state ? `?state=${encodeURIComponent(state)}` : '';
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/employer/form-names${suffix}`, session);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Extra forms could not be loaded.'); }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 16_000);
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/form-names', session, {
      method: 'POST', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The form could not be added.'); }
}
