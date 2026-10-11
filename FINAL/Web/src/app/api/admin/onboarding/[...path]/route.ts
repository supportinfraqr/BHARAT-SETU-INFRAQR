import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };

function query(request: Request): string {
  const search = new URL(request.url).search;
  return search || '';
}

export async function GET(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/admin/onboarding/${path.join('/')}${query(request)}`, session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The onboarding request could not be loaded.'); }
}

export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { path } = await context.params;
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const contentType = request.headers.get('content-type') || '';
    const body = contentType.includes('multipart/form-data')
      ? await request.formData()
      : JSON.stringify(await readJsonObject(request));
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/admin/onboarding/${path.join('/')}`, session, {
      method: 'POST', body,
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The onboarding action failed.'); }
}
