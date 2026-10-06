import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const params = new URL(request.url).searchParams;
    const query = new URLSearchParams();
    for (const key of ['start', 'end', 'site']) {
      const value = params.get(key);
      if (value) query.set(key, value);
    }
    const upstream = await upstreamStream(config.apiBaseUrl, `/v1/contractor/attendance/template${query.size ? `?${query}` : ''}`, session);
    const filename = `attendance-${params.get('start') ?? 'start'}-to-${params.get('end') ?? 'end'}.csv`;
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) { return apiError(error, 'The attendance template could not be downloaded.'); }
}
