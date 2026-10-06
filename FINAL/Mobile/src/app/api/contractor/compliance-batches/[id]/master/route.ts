import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const batch = Number(id);
    if (!Number.isInteger(batch)) {
      return new Response('Unknown batch.', { status: 404 });
    }
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(
      config.apiBaseUrl,
      `/v1/contractor/compliance-batches/${batch}/master`,
      session,
    );
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'Content-Disposition': upstream.headers.get('content-disposition') ?? `attachment; filename="master-${batch}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) { return apiError(error, 'The master file could not be downloaded.'); }
}
