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
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/sap/settings', session);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'SAP settings could not be loaded.'); }
}

export async function PUT(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 64_000);
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/sap/settings', session, {
      method: 'PUT', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'SAP settings could not be saved.'); }
}
