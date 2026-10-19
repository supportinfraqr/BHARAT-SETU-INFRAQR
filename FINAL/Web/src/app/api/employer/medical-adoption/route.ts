import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/medical-adoption', session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'Medical form adoption could not be loaded.'); }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request).catch(() => ({}));
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/medical-adoption', session, {
      method: 'POST', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { status: 200, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The adoption could not be saved.'); }
}
