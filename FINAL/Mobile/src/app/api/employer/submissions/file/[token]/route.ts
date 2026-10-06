import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(
      config.apiBaseUrl,
      `/v1/submissions/file/${encodeURIComponent(token)}`,
      null,
    );
    const headers = new Headers();
    const contentType = upstream.headers.get('Content-Type') ?? 'application/octet-stream';
    const isHtml = contentType.includes('text/html');
    headers.set('Content-Type', contentType);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set(
      'Content-Security-Policy',
      isHtml
        ? "default-src 'none'; style-src 'unsafe-inline'; img-src 'unsafe-inline'; sandbox"
        : "default-src 'none'; sandbox",
    );
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    headers.set('Content-Disposition', upstream.headers.get('Content-Disposition') ?? 'inline');
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return apiError(error, 'Evidence could not be retrieved.');
  }
}