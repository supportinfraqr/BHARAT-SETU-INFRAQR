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

    // Only Worker and Contractor roles can upload portal documents
    if (session.role !== 'Worker' && session.role !== 'Contractor') {
      return NextResponse.json(
        { error: 'Your role cannot upload portal documents.' },
        { status: 403 }
      );
    }

    assertRateLimit(`uploads:${session.sessionId}`, 20, 60_000);

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_CONTENT_LENGTH_BYTES) {
      return NextResponse.json(
        { error: 'Upload request is too large.' },
        { status: 413 }
      );
    }

    const data = await request.formData();
    const file = data.get('file');

    if (!(file instanceof File) || !file.size) {
      return NextResponse.json(
        { error: 'Choose a document to upload.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Document must be 10 MB or smaller.' },
        { status: 413 }
      );
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
      `/v1/${portalRolePath(session.role)}/submissions`,
      session,
      { method: 'POST', body: data },
      { timeoutMs: 60_000 },
    );
    return NextResponse.json(result, {
      status: 201,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return apiError(error, 'Document upload could not be completed.');
  }
}