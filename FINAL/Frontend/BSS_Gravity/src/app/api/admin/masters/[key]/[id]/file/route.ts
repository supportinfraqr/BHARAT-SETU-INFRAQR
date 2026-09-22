import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest, upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ key:string; id:string }> };

/** Download the file attached to a master record (e.g. a notification PDF). */
export async function GET(_request: Request, context: Context) {
  try {
    const { key, id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return NextResponse.json({ error:'Unknown master record.' }, { status:404 });
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(
      config.apiBaseUrl, `/v1/admin/masters/${encodeURIComponent(key)}/${pk}/file`, session);
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'Content-Disposition': upstream.headers.get('content-disposition') ?? `attachment; filename="${key}-${pk}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) { return apiError(error, 'The file could not be downloaded.'); }
}

/** Upload/replace the file attached to a master record. */
export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { key, id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return NextResponse.json({ error:'Unknown master record.' }, { status:404 });
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`admin-master-file:${session.sessionId}:${key}:${pk}`, 20, 60_000);
    const data = await request.formData();
    const file = data.get('file');
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error:'Choose a PDF to upload.' }, { status:400 });
    }
    const config = getRuntimeConfig();
    const result = await upstreamRequest(
      config.apiBaseUrl, `/v1/admin/masters/${encodeURIComponent(key)}/${pk}/file`, session,
      { method:'POST', body: data });
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The file could not be uploaded.'); }
}
