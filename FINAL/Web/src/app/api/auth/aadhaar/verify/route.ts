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
    // The Aadhaar signup step asks only for the 12-digit Aadhaar (the OTP goes to
    // the Aadhaar-linked mobile), so a contact mobile is OPTIONAL here — when
    // supplied it is validated and linked as a login id by the backend.
    const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
    if (
      typeof body.aadhaar !== 'string' ||
      !/^\d{12}$/.test(body.aadhaar.replace(/\D/g, '')) ||
      typeof body.otp !== 'string' ||
      !body.otp ||
      typeof body.acceptedTerms !== 'boolean' ||
      (contact !== '' && !/^[6-9]\d{9}$/.test(contact.replace(/\D/g, '')))
    ) {
      return NextResponse.json({ error: 'Aadhaar number, OTP and accepted terms are required.' }, { status: 400 });
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