import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { createSession } from '@/server/session';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const body = await readJsonObject(request);
    if (body.role !== 'Worker' || typeof body.contact !== 'string' || typeof body.otp !== 'string' || body.acceptedTerms !== true) {
      return NextResponse.json({ error: 'Verified worker contact and accepted terms are required.' }, { status: 400 });
    }
    const contact = body.contact.trim().toLowerCase();
    if (!/^(?:[6-9]\d{9}|[^\s@]+@[^\s@]+\.[^\s@]+)$/.test(contact)) {
      return NextResponse.json({ error: 'Enter a valid Indian mobile number or email address.' }, { status: 400 });
    }
    assertRateLimit(`register:${contact}`, 5, 30 * 60_000);
    const config = getRuntimeConfig();

    const result = await upstreamRequest<{ subject: string; sessionId: string; accessToken?: string; bssId: string }>(
      config.authBaseUrl,
      '/v1/auth/register/worker',
      null,
      { method: 'POST', body: JSON.stringify(body) },
    );

    await createSession({ subject: result.subject, role: 'Worker', sessionId: result.sessionId, accessToken: result.accessToken });
    return NextResponse.json({ bssId: result.bssId, redirectTo: '/worker/Profile' }, { status: 201 });
  } catch (error) {
    return apiError(error, 'Worker registration could not be completed.');
  }
}