import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';
import { MAX_CONTENT_LENGTH_BYTES, MAX_FILE_SIZE_BYTES } from '@/server/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Employer');
    assertRateLimit(`sap-bulk:${session.sessionId}`, 10, 60_000);
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_CONTENT_LENGTH_BYTES) {
      return NextResponse.json({ error: 'Upload request is too large.' }, { status: 413 });
    }
    const data = await request.formData();
    const file = data.get('mapping');
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: 'Choose the filled mapping template (.xlsx).' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Template must be 10 MB or smaller.' }, { status: 413 });
    }
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/sap/bulk-sync', session, {
      method: 'POST', body: data,
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The bulk SAP pull could not be completed.'); }
}
