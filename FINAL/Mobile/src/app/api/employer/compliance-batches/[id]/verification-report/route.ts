import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest, upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const batch = Number(id);
    if (!Number.isInteger(batch)) return new Response('Unknown batch.', { status: 404 });
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const search = new URL(request.url).search;
    const path = `/v1/employer/compliance-batches/${batch}/verification-report${search}`;
    if (new URL(request.url).searchParams.get('download') === 'pdf') {
      const upstream = await upstreamStream(config.apiBaseUrl, path, session);
      const headers = new Headers();
      for (const name of ['Content-Type', 'Content-Length', 'Content-Disposition']) {
        const value = upstream.headers.get(name);
        if (value) headers.set(name, value);
      }
      headers.set('Cache-Control', 'private, no-store');
      return new Response(upstream.body, { status: 200, headers });
    }
    const result = await upstreamRequest(config.apiBaseUrl, path, session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'The verification report could not be generated.');
  }
}
