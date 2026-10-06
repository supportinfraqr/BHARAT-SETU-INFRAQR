import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession('Contractor');
    const { id } = await context.params;
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(
      config.apiBaseUrl,
      `/v1/contractor/documents/${encodeURIComponent(id)}/file`,
      session,
    );
    const headers = new Headers();
    for (const name of ['Content-Type', 'Content-Length', 'Content-Disposition']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return apiError(error, 'Document could not be retrieved.');
  }
}