import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest, upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';
import { MAX_CONTENT_LENGTH_BYTES, MAX_FILE_SIZE_BYTES, verifyFileSignature } from '@/server/storage';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ key:string; id:string }> };

/** Download/preview the file attached to a master record (e.g. a notification PDF). */
export async function GET(request: Request, context: Context) {
  try {
    const { key, id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return NextResponse.json({ error:'Unknown master record.' }, { status:404 });
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const download = new URL(request.url).searchParams.get('download');
    const suffix = download ? '?download=1' : '';
    const upstream = await upstreamStream(
      config.apiBaseUrl, `/v1/admin/masters/${encodeURIComponent(key)}/${pk}/file${suffix}`, session);
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/pdf',
        'Content-Disposition': upstream.headers.get('content-disposition') ?? `inline; filename="${key}-${pk}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) { return apiError(error, 'The file could not be downloaded.'); }
}

/** Remove the file attached to a master record. */
export async function DELETE(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { key, id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return NextResponse.json({ error:'Unknown master record.' }, { status:404 });
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`admin-master-file:${session.sessionId}:${key}:${pk}`, 20, 60_000);
    const config = getRuntimeConfig();
    const result = await upstreamRequest(
      config.apiBaseUrl, `/v1/admin/masters/${encodeURIComponent(key)}/${pk}/file`, session,
      { method:'DELETE' });
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The file could not be removed.'); }
}

/** Upload/replace the file attached to a master record. PDF only, <= 10 MB. */
export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { key, id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return NextResponse.json({ error:'Unknown master record.' }, { status:404 });
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`admin-master-file:${session.sessionId}:${key}:${pk}`, 20, 60_000);

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_CONTENT_LENGTH_BYTES) {
      return NextResponse.json({ error:'Upload request is too large.' }, { status:413 });
    }
    const data = await request.formData();
    const file = data.get('file');
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error:'Choose a PDF to upload.' }, { status:400 });
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error:'Only PDF files are accepted.' }, { status:415 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error:'PDF must be 10 MB or smaller.' }, { status:413 });
    }
    const signature = await verifyFileSignature(file);
    if (!signature.valid) {
      return NextResponse.json({ error:'The uploaded file is not a valid PDF.' }, { status:415 });
    }

    const config = getRuntimeConfig();
    const result = await upstreamRequest(
      config.apiBaseUrl, `/v1/admin/masters/${encodeURIComponent(key)}/${pk}/file`, session,
      { method:'POST', body: data });
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The file could not be uploaded.'); }
}
