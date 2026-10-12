import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { createSession } from '@/server/session';
import type { PortalRole } from '@/types/portal';
import { isDemoMobile } from '@/lib/demoMobiles';

const registrationByRole: Record<string, { path: string; redirectTo: string }> = {
  Worker: { path: '/v1/auth/register/worker', redirectTo: '/worker/Profile?tab=integrations' },
  Contractor: { path: '/v1/auth/register/contractor', redirectTo: '/contractor/profile' },
  Employer: { path: '/v1/auth/register/employer', redirectTo: '/employer/profile' },
};

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const body = await readJsonObject(request);
    const spec = typeof body.role === 'string' ? registrationByRole[body.role] : undefined;
    if (!spec || typeof body.contact !== 'string' || typeof body.otp !== 'string' || body.acceptedTerms !== true) {
      return NextResponse.json({ error: 'Verified contact and accepted terms are required.' }, { status: 400 });
    }
    const contact = body.contact.trim().toLowerCase();
    if (!/^(?:[6-9]\d{9}|[^\s@]+@[^\s@]+\.[^\s@]+)$/.test(contact) && !isDemoMobile(contact)) {
      return NextResponse.json({ error: 'Enter a valid Indian mobile number or email address.' }, { status: 400 });
    }
    assertRateLimit(`register:${contact}`, 5, 30 * 60_000);
    const config = getRuntimeConfig();

    const result = await upstreamRequest<{ subject: string; sessionId: string; accessToken?: string; bssId: string }>(
      config.authBaseUrl,
      spec.path,
      null,
      { method: 'POST', body: JSON.stringify(body) },
    );

    await createSession({ subject: result.subject, role: body.role as PortalRole, sessionId: result.sessionId, accessToken: result.accessToken });
    return NextResponse.json({ bssId: result.bssId, redirectTo: spec.redirectTo }, { status: 201 });
  } catch (error) {
    return apiError(error, 'Registration could not be completed.');
  }
}