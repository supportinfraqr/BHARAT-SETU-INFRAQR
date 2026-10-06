import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const session = await requireApiSession();
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(config.apiBaseUrl, `/v1/audit-reports/${Number(id)}/file`, session);
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': upstream.headers.get('content-disposition') ?? `attachment; filename="BSS-Audit-Report.xlsx"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) { return apiError(error, 'The audit report file could not be downloaded.'); }
}
