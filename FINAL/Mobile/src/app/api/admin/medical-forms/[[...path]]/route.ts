import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path?: string[] }> };

function upstreamPath(segments?: string[]) {
  const suffix = (segments ?? []).join('/');
  return `/v1/admin/medical-forms${suffix ? `/${suffix}` : ''}`;
}

export async function GET(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const search = new URL(request.url).search;
    const result = await upstreamRequest(config.apiBaseUrl, `${upstreamPath(path)}${search}`, session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'Medical forms could not be loaded.'); }
}

export async function PUT(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { path } = await context.params;
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request).catch(() => ({}));
    const result = await upstreamRequest(config.apiBaseUrl, upstreamPath(path), session, {
      method: 'PUT', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The form could not be saved.'); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { path } = await context.params;
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const search = new URL(request.url).search;
    const result = await upstreamRequest(config.apiBaseUrl, `${upstreamPath(path)}${search}`, session, { method: 'DELETE' });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The form could not be reset.'); }
}

export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { path } = await context.params;
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request).catch(() => ({}));
    const result = await upstreamRequest(config.apiBaseUrl, upstreamPath(path), session, {
      method: 'POST', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The send could not be completed.'); }
}
