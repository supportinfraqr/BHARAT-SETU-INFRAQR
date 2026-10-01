import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { portalRolePath } from '@/server/role-path';
import { requireApiSession } from '@/server/session';
import {
  ALLOWED_MIME_TYPES,
  MAX_CONTENT_LENGTH_BYTES,
  MAX_FILE_SIZE_BYTES,
  verifyFileSignature,
} from '@/server/storage';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession();

    if (session.role !== 'Worker') {
      return NextResponse.json(
        { error: 'Only the worker can verify their own documents.' },
        { status: 403 }
      );
    }

    assertRateLimit(`verify-doc:${session.sessionId}`, 10, 60_000);

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_CONTENT_LENGTH_BYTES) {
      return NextResponse.json({ error: 'Upload request is too large.' }, { status: 413 });
    }

    const data = await request.formData();
    const file = data.get('file');

    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: 'Choose a document to verify.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Document must be 10 MB or smaller.' }, { status: 413 });
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF, JPEG, and PNG documents are accepted.' },
        { status: 415 }
      );
    }

    const signatureCheck = await verifyFileSignature(file);
    if (!signatureCheck.valid) {
      return NextResponse.json(
        { error: 'The uploaded file content does not match its declared format.' },
        { status: 415 }
      );
    }

    const config = getRuntimeConfig();
    const result = await upstreamRequest(
      config.apiBaseUrl,
      `/v1/${portalRolePath(session.role)}/verify-document`,
      session,
      { method: 'POST', body: data },
      { timeoutMs: 60_000 },
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiError(error, 'Document verification could not be completed.');
  }
}
