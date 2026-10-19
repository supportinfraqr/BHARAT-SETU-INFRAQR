import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path?: string[] }> };

function upstreamPath(segments?: string[]) {
  const suffix = (segments ?? []).map(encodeURIComponent).join('/');
  return `/v1/employer/staff${suffix ? `/${suffix}` : ''}`;
}

export async function GET(_request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, upstreamPath(path), session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'Staff accounts could not be loaded.'); }
}

export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { path } = await context.params;
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request).catch(() => ({}));
    const result = await upstreamRequest(config.apiBaseUrl, upstreamPath(path), session, {
      method: 'POST', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The staff account could not be saved.'); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { path } = await context.params;
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request).catch(() => ({}));
    const result = await upstreamRequest(config.apiBaseUrl, upstreamPath(path), session, {
      method: 'PATCH', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The staff account could not be updated.'); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, upstreamPath(path), session, { method: 'DELETE' });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The staff account could not be deactivated.'); }
}
