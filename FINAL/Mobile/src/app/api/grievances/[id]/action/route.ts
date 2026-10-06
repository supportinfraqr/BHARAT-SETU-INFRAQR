import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// Reply / resolve / confirm / reopen / view a grievance (any role). Multipart so
// a reply may carry an attachment.
export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession();
    const { id } = await context.params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'Invalid grievance.' }, { status: 400 });
    assertRateLimit(`grievance-action:${session.sessionId}:${id}`, 30, 60_000);

    const contentType = request.headers.get('content-type') ?? '';
    let body: FormData | string;
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const out = new FormData();
      out.append('action', String(form.get('action') ?? ''));
      out.append('body', String(form.get('body') ?? ''));
      const attach = form.get('attachment');
      if (attach instanceof File && attach.size) out.append('attachment', attach, attach.name || 'attachment');
      body = out;
    } else {
      body = await request.text();
    }

    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/grievances/${id}/action`, session, { method: 'POST', body });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'The grievance could not be updated.');
  }
}
