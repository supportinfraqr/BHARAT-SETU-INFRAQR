import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 32_000);
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/contractor/attendance/camera-punch', session, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Camera attendance punch could not be recorded.');
  }
}
