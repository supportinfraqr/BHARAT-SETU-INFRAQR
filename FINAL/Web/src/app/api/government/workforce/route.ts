import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest, upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireApiSession('Government');
    const config = getRuntimeConfig();
    const params = new URL(request.url).searchParams;
    const query = params.toString();
    const path = `/v1/government/workforce${query ? `?${query}` : ''}`;
    if (params.get('format') === 'csv') {
      const upstream = await upstreamStream(config.apiBaseUrl, path, session);
      const headers = new Headers();
      for (const name of ['Content-Type', 'Content-Disposition']) {
        const value = upstream.headers.get(name);
        if (value) headers.set(name, value);
      }
      headers.set('Cache-Control', 'private, no-store');
      return new Response(upstream.body, { status: 200, headers });
    }
    const result = await upstreamRequest(config.apiBaseUrl, path, session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'Workforce data could not be loaded.'); }
}
