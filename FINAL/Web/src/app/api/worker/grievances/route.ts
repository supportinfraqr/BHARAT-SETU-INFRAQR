import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireApiSession('Worker');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/worker/grievances', session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Grievances could not be loaded.');
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Worker');
    assertRateLimit(`grievances:${session.sessionId}`, 20, 60_000);
    const config = getRuntimeConfig();
    const contentType = request.headers.get('content-type') ?? '';
    const out = new FormData();

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const text = typeof form.get('body') === 'string' ? String(form.get('body')) : '';
      const audio = form.get('audio');
      const attach = form.get('attachment');
      const hasAttachment = attach instanceof File && attach.size > 0;
      if (!text.trim() && !(audio instanceof File && audio.size) && !hasAttachment) {
        return NextResponse.json({ error: 'Describe your concern, record audio or attach a file.' }, { status: 400 });
      }
      out.append('body', text);
      out.append('category', String(form.get('category') ?? 'Other'));
      out.append('language', String(form.get('language') ?? ''));
      out.append('duration', String(form.get('duration') ?? ''));
      if (audio instanceof File && audio.size) out.append('audio', audio, audio.name || 'recording.webm');
      if (hasAttachment) out.append('attachment', attach as File, (attach as File).name || 'attachment');
    } else {
      const body = await readJsonObject(request);
      const text = typeof body.body === 'string' ? body.body : '';
      const attachment = typeof body.attachment === 'string' ? body.attachment : '';
      if (!text.trim() && !attachment.trim()) {
        return NextResponse.json({ error: 'Describe your concern or attach a file.' }, { status: 400 });
      }
      out.append('body', text);
      out.append('category', String(body.category ?? 'Other'));
      out.append('language', String(body.language ?? ''));
      out.append('attachment', attachment);
    }

    const result = await upstreamRequest(config.apiBaseUrl, '/v1/worker/grievances', session, {
      method: 'POST',
      body: out,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error, 'Grievance could not be submitted.');
  }
}
