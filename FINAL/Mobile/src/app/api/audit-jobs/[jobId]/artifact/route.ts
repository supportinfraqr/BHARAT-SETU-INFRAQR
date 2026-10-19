import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ jobId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { jobId } = await context.params;
    const session = await requireApiSession();
    const config = getRuntimeConfig();
    const path = new URL(request.url).searchParams.get('path') ?? '';
    const upstream = await upstreamStream(config.apiBaseUrl, `/v1/audit-jobs/${encodeURIComponent(jobId)}/artifact?path=${encodeURIComponent(path)}`, session);
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'Content-Disposition': upstream.headers.get('content-disposition') ?? 'attachment',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) { return apiError(error, 'The audit file could not be downloaded.'); }
}
