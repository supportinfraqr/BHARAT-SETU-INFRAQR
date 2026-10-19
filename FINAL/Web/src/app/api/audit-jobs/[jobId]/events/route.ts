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
    const lastEventId = request.headers.get('last-event-id') ?? '';
    const upstream = await upstreamStream(config.apiBaseUrl, `/v1/audit-jobs/${encodeURIComponent(jobId)}/events`, session, {
      headers: lastEventId ? { 'Last-Event-ID': lastEventId } : undefined,
    });
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) { return apiError(error, 'The audit progress stream could not be opened.'); }
}
