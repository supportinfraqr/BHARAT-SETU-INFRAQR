import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(config.apiBaseUrl, '/v1/employer/sap/bulk-setup-document', session);
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'text/html; charset=utf-8',
        'Content-Disposition': upstream.headers.get('content-disposition') ?? 'attachment; filename="bss-sap-bulk-setup.html"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) { return apiError(error, 'The bulk SAP setup document could not be downloaded.'); }
}
