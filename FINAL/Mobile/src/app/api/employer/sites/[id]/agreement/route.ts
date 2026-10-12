import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

/** Upload the site agreement PDF (multipart) for a site the employer owns. */
export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Employer');
    const { id } = await context.params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'Invalid site.' }, { status: 400 });
    assertRateLimit(`site-agreement:${session.sessionId}`, 20, 60_000);

    const form = await request.formData();
    const file = form.get('agreement') ?? form.get('file');
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: 'Choose a PDF file.' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'The site agreement must be 10 MB or smaller.' }, { status: 413 });
    }
    const sig = new TextDecoder().decode(new Uint8Array(await file.slice(0, 5).arrayBuffer()));
    if (sig !== '%PDF-') {
      return NextResponse.json({ error: 'The site agreement must be a PDF file.' }, { status: 415 });
    }

    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/employer/sites/${id}/agreement`, session, {
      method: 'POST',
      body: form,
    }, { timeoutMs: 30_000 });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiError(error, 'The site agreement could not be uploaded.');
  }
}
