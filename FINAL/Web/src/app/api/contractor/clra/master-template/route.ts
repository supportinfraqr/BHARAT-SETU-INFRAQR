import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(config.apiBaseUrl, '/v1/contractor/clra/master-template', session);
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="clra-master-template.xlsx"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) { return apiError(error, 'The master template could not be downloaded.'); }
}
