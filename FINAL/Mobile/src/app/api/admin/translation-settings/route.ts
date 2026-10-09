import { NextResponse } from 'next/server';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { apiError, readJsonObject, assertTrustedMutation, assertRateLimit } from '@/server/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const result = await upstreamRequest<Record<string, unknown>>(config.apiBaseUrl, '/v1/admin/translation-settings/', session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Translation settings could not be loaded.');
  }
}

export async function PUT(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`translation-settings:${session.subject}`, 30, 60_000);
    const body = await readJsonObject(request);
    const config = getRuntimeConfig();
    const result = await upstreamRequest<Record<string, unknown>>(config.apiBaseUrl, '/v1/admin/translation-settings/', session, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'Translation settings could not be saved.');
  }
}
