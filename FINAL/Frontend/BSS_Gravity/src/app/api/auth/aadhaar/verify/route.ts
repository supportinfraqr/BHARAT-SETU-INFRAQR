import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { createSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const body = await readJsonObject(request);
    if (
      typeof body.aadhaar !== 'string' ||
      !/^\d{12}$/.test(body.aadhaar.replace(/\D/g, '')) ||
      typeof body.contact !== 'string' ||
      !/^[6-9]\d{9}$/.test(body.contact.replace(/\D/g, '')) ||
      typeof body.otp !== 'string' ||
      !body.otp ||
      typeof body.acceptedTerms !== 'boolean'
    ) {
      return NextResponse.json({ error: 'Aadhaar number, mobile number, OTP and accepted terms are required.' }, { status: 400 });
    }
    assertRateLimit(`aadhaar-verify:${body.aadhaar}`, 100, 10 * 60_000);
    const config = getRuntimeConfig();

    const result = await upstreamRequest<{ subject: string; sessionId: string; accessToken?: string; bssId: string }>(
      config.authBaseUrl,
      '/v1/auth/aadhaar/verify',
      null,
      { method: 'POST', body: JSON.stringify(body) },
      { timeoutMs: 45_000 },
    );

    await createSession({ subject: result.subject, role: 'Worker', sessionId: result.sessionId, accessToken: result.accessToken });
    return NextResponse.json({ bssId: result.bssId, redirectTo: '/worker/Profile' }, { status: 201 });
  } catch (error) {
    return apiError(error, 'Aadhaar verification could not be completed.');
  }
}