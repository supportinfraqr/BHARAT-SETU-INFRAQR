import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest, upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ action: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { action } = await context.params;
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    if (action === 'certificate') {
      const upstream = await upstreamStream(config.apiBaseUrl, '/v1/employer/gst/certificate', session);
      return new Response(upstream.body, {
        headers: {
          'Content-Type': upstream.headers.get('content-type') ?? 'application/pdf',
          'Content-Disposition': 'attachment; filename="gst-certificate.pdf"',
          'Cache-Control': 'private, no-store',
        },
      });
    }
    if (action !== 'status') return NextResponse.json({ error: 'Unknown GST action.' }, { status: 404 });
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/gst/status', session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'GST verification status could not be loaded.');
  }
}

export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { action } = await context.params;
    if (action !== 'initiate' && action !== 'validate') {
      return NextResponse.json({ error: 'Unknown GST action.' }, { status: 404 });
    }
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 16_000);
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/employer/gst/${action}`, session, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'GST verification could not be completed.');
  }
}
