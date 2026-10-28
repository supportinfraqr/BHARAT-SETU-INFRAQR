import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const status = new URL(request.url).searchParams.get('status');
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/admin/support-tickets${query}`, session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Support tickets could not be loaded.');
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 12_000);
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/admin/support-tickets', session, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'The support ticket could not be updated.');
  }
}
