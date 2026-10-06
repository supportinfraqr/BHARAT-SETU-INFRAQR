import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Contractor');
    const data = await request.formData();
    const file = data.get('file');
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: 'Choose a document to audit.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Document must be 10 MB or smaller.' }, { status: 413 });
    }
    const config = getRuntimeConfig();
    const result = await upstreamRequest(
      config.apiBaseUrl,
      '/v1/contractor/audit-document',
      session,
      { method: 'POST', body: data },
      { timeoutMs: 120_000 },
    );
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'The document could not be audited.');
  }
}
