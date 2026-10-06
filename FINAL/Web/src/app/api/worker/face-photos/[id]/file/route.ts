import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const photo = Number(id);
    if (!Number.isInteger(photo)) return new Response('Unknown photo.', { status: 404 });
    const session = await requireApiSession('Worker');
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(
      config.apiBaseUrl,
      `/v1/worker/face-photos/${photo}/file`,
      session,
    );
    const headers = new Headers();
    for (const name of ['Content-Type', 'Content-Length']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('Cache-Control', 'private, no-store');
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) { return apiError(error, 'The photo could not be loaded.'); }
}
