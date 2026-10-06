import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id:string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return apiError(Object.assign(new Error('Unknown template.'), { status:404 }));
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(config.apiBaseUrl, `/v1/register-templates/${pk}/file`, session);
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'Content-Disposition': upstream.headers.get('content-disposition') ?? `attachment; filename="register-template-${pk}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) { return apiError(error, 'The template file could not be downloaded.'); }
}
