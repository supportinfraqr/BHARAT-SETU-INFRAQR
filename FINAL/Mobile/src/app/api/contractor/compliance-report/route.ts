import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest, upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const search = new URL(request.url).search;
    if (new URL(request.url).searchParams.get('download') === 'pdf') {
      const upstream = await upstreamStream(config.apiBaseUrl, `/v1/contractor/compliance-report${search}`, session);
      const headers = new Headers();
      for (const name of ['Content-Type', 'Content-Length', 'Content-Disposition']) {
        const value = upstream.headers.get(name);
        if (value) headers.set(name, value);
      }
      headers.set('Cache-Control', 'private, no-store');
      return new Response(upstream.body, { status: 200, headers });
    }
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/contractor/compliance-report${search}`, session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'The compliance report could not be generated.');
  }
}
