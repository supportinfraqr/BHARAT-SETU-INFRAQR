import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

function streamHeaders(upstream: Response): Headers {
  const headers = new Headers();
  for (const name of ['Content-Type', 'Content-Length', 'Content-Disposition']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  return headers;
}

export async function GET(request: Request) {
  try {
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const url = new URL(request.url);
    const batchId = url.searchParams.get('batchId');
    const site = url.searchParams.get('site');
    const year = url.searchParams.get('year');
    const period = url.searchParams.get('period');
    
    const params = new URLSearchParams();
    if (batchId) params.set('batchId', batchId);
    if (site) params.set('site', site);
    if (year) params.set('year', year);
    if (period) params.set('period', period);
    
    const queryString = params.toString();
    const path = `/v1/contractor/compliance-batches/zip${queryString ? `?${queryString}` : ''}`;
    const upstream = await upstreamStream(config.apiBaseUrl, path, session);
    return new Response(upstream.body, { status: 200, headers: streamHeaders(upstream) });
  } catch (error) {
    return apiError(error, 'Download could not be completed.');
  }
}
