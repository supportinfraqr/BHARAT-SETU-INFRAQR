import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ jobId: string; kind: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { jobId, kind } = await context.params;
    const session = await requireApiSession();
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(config.apiBaseUrl, `/v1/audit-jobs/${encodeURIComponent(jobId)}/file/${encodeURIComponent(kind)}`, session);
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'Content-Disposition': upstream.headers.get('content-disposition') ?? 'inline',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) { return apiError(error, 'The audit file could not be downloaded.'); }
}
