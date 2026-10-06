import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Worker');
    assertRateLimit(`nominee-doc-upload:${session.sessionId}`, 30, 60_000);
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Upload must be multipart/form-data.' }, { status: 415 });
    }
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: 'Choose a document to upload.' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Document must be 10 MB or smaller.' }, { status: 413 });
    }
    const config = getRuntimeConfig();
    const result = await upstreamRequest(
      config.apiBaseUrl,
      '/v1/worker/nominee-document',
      session,
      { method: 'POST', body: form },
    );
    return NextResponse.json(result, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Document could not be uploaded.');
  }
}
