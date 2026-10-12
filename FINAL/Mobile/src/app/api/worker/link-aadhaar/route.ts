import { NextResponse } from 'next/server';
import { requireApiSession } from '@/server/session';
import { mutatePortal } from '@/server/portal';
import { UpstreamError } from '@/server/http';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Worker').catch(() => null);
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const body = await readJsonObject(request);
    const aadhaar = typeof body.aadhaar === 'string' ? body.aadhaar.replace(/\D/g, '') : '';
    if (!/^\d{12}$/.test(aadhaar)) {
      return NextResponse.json({ error: 'Enter a valid 12-digit Aadhaar number.' }, { status: 400 });
    }
    if (typeof body.referenceId !== 'string' || !body.referenceId || typeof body.otp !== 'string' || !body.otp) {
      return NextResponse.json({ error: 'Reference ID and OTP are required.' }, { status: 400 });
    }
    assertRateLimit(`link-aadhaar:${session.sessionId}`, 20, 10 * 60_000);

    const result = await mutatePortal(session, 'link-aadhaar', {
      method: 'POST',
      body: JSON.stringify({ aadhaar, referenceId: body.referenceId, otp: body.otp }),
    }, { timeoutMs: 45_000 });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // Pass the upstream body through so the client sees wrong / attemptsLeft /
    // locked / retryAfterSeconds (the server is the source of truth).
    if (error instanceof UpstreamError && error.details && typeof error.details === 'object') {
      return NextResponse.json(error.details, { status: error.status });
    }
    return apiError(error, 'Aadhaar verification could not be completed.');
  }
}
