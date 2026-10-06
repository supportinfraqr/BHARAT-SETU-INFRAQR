import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ token: string }> };

// No session: the single-use token IS the credential (5-min expiry, one read).
export async function GET(_request: Request, context: Context) {
  try {
    const { token } = await context.params;
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(config.apiBaseUrl, `/v1/grievances/file/${encodeURIComponent(token)}`, null);
    const headers = new Headers();
    for (const name of ['Content-Type', 'Content-Length', 'Content-Disposition']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return apiError(error, 'The file could not be retrieved.');
  }
}
