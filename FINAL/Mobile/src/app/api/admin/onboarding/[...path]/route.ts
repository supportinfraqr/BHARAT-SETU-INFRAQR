import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest, upstreamStream } from '@/server/http';
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
    const upstream = await upstreamStream(config.apiBaseUrl, `/v1/admin/onboarding/${path.join('/')}${query(request)}`, session);
    const contentType = upstream.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const text = await upstream.text();
      const json = text ? JSON.parse(text) : {};
      return NextResponse.json(json, { status: upstream.status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    // Binary/file download (e.g. an onboarding template .xlsx) — stream it through.
    const headers = new Headers();
    for (const name of ['Content-Type', 'Content-Length', 'Content-Disposition']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('Cache-Control', 'private, no-store');
    return new Response(upstream.body, { status: upstream.status, headers });
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
