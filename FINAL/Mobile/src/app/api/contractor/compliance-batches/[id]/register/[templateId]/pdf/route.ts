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
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(
      config.apiBaseUrl,
      `/v1/contractor/compliance-batches/${batch}/register/${template}/pdf`,
      session,
    );
    const headers = new Headers();
    for (const name of ['Content-Type', 'Content-Length', 'Content-Disposition']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('Cache-Control', 'private, no-store');
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) { return apiError(error, 'The register could not be exported.'); }
}
