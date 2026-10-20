import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' } as const;

export async function GET() {
  try {
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/attendance-cameras', session, { method: 'GET' });
    return NextResponse.json(result, { headers: noStore });
  } catch (error) { return apiError(error, 'Could not load attendance cameras.'); }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 32_000);
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/attendance-cameras', session, {
      method: 'POST', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: noStore });
  } catch (error) { return apiError(error, 'Could not add the camera.'); }
}
