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
    const batchId = new URL(request.url).searchParams.get('batchId');
    const path = `/v1/contractor/compliance-batches/zip${batchId ? `?batchId=${encodeURIComponent(batchId)}` : ''}`;
    const upstream = await upstreamStream(config.apiBaseUrl, path, session);
    return new Response(upstream.body, { status: 200, headers: streamHeaders(upstream) });
  } catch (error) {
    return apiError(error, 'Download could not be completed.');
  }
}
