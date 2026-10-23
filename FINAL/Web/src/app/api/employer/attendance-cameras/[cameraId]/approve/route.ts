import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' } as const;

export async function POST(request: Request, { params }: { params: Promise<{ cameraId: string }> }) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const { cameraId } = await params;
    const body = await readJsonObject(request, 8_000);
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/employer/attendance-cameras/${encodeURIComponent(cameraId)}/approve`, session, {
      method: 'POST', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: noStore });
  } catch (error) { return apiError(error, 'Could not approve the camera.'); }
}
