import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { portalRolePath } from '@/server/role-path';
import { requireApiSession } from '@/server/session';
import { MAX_CONTENT_LENGTH_BYTES, MAX_FILE_SIZE_BYTES } from '@/server/storage';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession();

    if (session.role !== 'Contractor') {
      return NextResponse.json(
        { error: 'Only contractors can generate registers.' },
        { status: 403 }
      );
    }

    assertRateLimit(`compliance-batches:${session.sessionId}`, 10, 60_000);

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_CONTENT_LENGTH_BYTES) {
      return NextResponse.json({ error: 'Upload request is too large.' }, { status: 413 });
    }

    const data = await request.formData();
    const master = data.get('master');

    if (!(master instanceof File) || !master.size) {
      return NextResponse.json({ error: 'Choose a master file.' }, { status: 400 });
    }

    if (master.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Master file must be 10 MB or smaller.' },
        { status: 413 }
      );
    }

    const config = getRuntimeConfig();
    const result = await upstreamRequest(
      config.apiBaseUrl,
      `/v1/${portalRolePath(session.role)}/compliance-batches`,
      session,
      { method: 'POST', body: data }
    );
    return NextResponse.json(result, {
      status: 201,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return apiError(error, 'Registers could not be generated.');
  }
}
