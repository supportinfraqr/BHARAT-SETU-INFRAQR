import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string; templateId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id, templateId } = await context.params;
    const batch = Number(id);
    const template = Number(templateId);
    if (!Number.isInteger(batch) || !Number.isInteger(template)) {
      return new Response('Unknown register.', { status: 404 });
    }
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(
      config.apiBaseUrl,
      `/v1/employer/compliance-batches/${batch}/register/${template}/xlsx`,
      session,
    );
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="register-${template}.xlsx"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) { return apiError(error, 'The register could not be exported.'); }
}
