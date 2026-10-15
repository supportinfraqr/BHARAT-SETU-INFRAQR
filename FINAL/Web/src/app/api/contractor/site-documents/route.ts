import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Contractor uploads/replaces a signed agreement or PO for an allotted site. */
export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Contractor');
    assertRateLimit(`csd:${session.sessionId}`, 30, 60_000);
    const form = await request.formData();
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/contractor/site-documents', session, {
      method: 'POST', body: form,
    }, { timeoutMs: 75_000 });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiError(error, 'The document could not be uploaded.');
  }
}
