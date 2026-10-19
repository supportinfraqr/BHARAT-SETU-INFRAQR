import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path?: string[] }> };

function upstreamPath(segments?: string[]) {
  const suffix = (segments ?? []).join('/');
  return `/v1/contractor/workers${suffix ? `/${suffix}` : ''}`;
}

export async function GET(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const search = new URL(request.url).search;
    const result = await upstreamRequest(config.apiBaseUrl, `${upstreamPath(path)}${search}`, session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The worker details could not be loaded.'); }
}

export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { path } = await context.params;
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const contentType = request.headers.get('content-type') ?? '';
    // Multipart (document upload → OCR) must pass through untouched — never
    // parsed as JSON, or the file is lost before it reaches the backend.
    if (contentType.includes('multipart/form-data')) {
      const body = Buffer.from(await request.arrayBuffer());
      const result = await upstreamRequest(config.apiBaseUrl, upstreamPath(path), session, {
        method: 'POST', body, headers: { 'Content-Type': contentType },
      }, { timeoutMs: 120_000 });
      return NextResponse.json(result, { status: 200, headers: { 'Cache-Control': 'private, no-store' } });
    }
    const body = await readJsonObject(request).catch(() => ({}));
    const result = await upstreamRequest(config.apiBaseUrl, upstreamPath(path), session, {
      method: 'POST', body: JSON.stringify(body),
    }, { timeoutMs: 60_000 });
    return NextResponse.json(result, { status: 200, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The onboarding action failed.'); }
}
