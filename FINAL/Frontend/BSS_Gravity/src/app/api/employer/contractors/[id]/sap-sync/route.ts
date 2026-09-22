import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';
import { MAX_CONTENT_LENGTH_BYTES, MAX_FILE_SIZE_BYTES } from '@/server/storage';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id:string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Employer');
    assertRateLimit(`sap-sync:${session.sessionId}`, 30, 60_000);

    const { id } = await context.params;
    const contractorId = Number(id);
    if (!Number.isInteger(contractorId)) {
      return NextResponse.json({ error: 'Unknown contractor.' }, { status: 404 });
    }

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_CONTENT_LENGTH_BYTES) {
      return NextResponse.json({ error: 'Upload request is too large.' }, { status: 413 });
    }

    const data = await request.formData();
    const file = data.get('sap');
    if (file instanceof File && file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'SAP export must be 10 MB or smaller.' }, { status: 413 });
    }

    const config = getRuntimeConfig();
    const result = await upstreamRequest(
      config.apiBaseUrl,
      `/v1/employer/contractors/${contractorId}/sap-sync`,
      session,
      { method: 'POST', body: data }
    );
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The contractor could not be populated from SAP.'); }
}
