import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ action: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { action } = await context.params;
    if (action !== 'status') return NextResponse.json({ error: 'Unknown action.' }, { status: 404 });
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/verification/status', session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Verification status could not be loaded.');
  }
}

export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { action } = await context.params;
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    if (action === 'decline-entitylocker') {
      const body = await readJsonObject(request, 8_000);
      const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/verification/decline-entitylocker', session, {
        method: 'POST', body: JSON.stringify(body),
      });
      return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (action === 'manual') {
      const contentType = request.headers.get('content-type') ?? 'multipart/form-data';
      const body = Buffer.from(await request.arrayBuffer());
      const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/verification/manual', session, {
        method: 'POST', body, headers: { 'Content-Type': contentType },
      }, { timeoutMs: 60_000 });
      return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (action === 'check-document') {
      const contentType = request.headers.get('content-type') ?? 'multipart/form-data';
      const body = Buffer.from(await request.arrayBuffer());
      const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/verification/check-document', session, {
        method: 'POST', body, headers: { 'Content-Type': contentType },
      }, { timeoutMs: 60_000 });
      return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 404 });
  } catch (error) {
    return apiError(error, 'Verification could not be completed.');
  }
}
