import { NextResponse } from 'next/server';
import { authenticate, requestOtp, type LoginInput } from '@/server/auth';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { clearSession, createSession, getSession } from '@/server/session';
import type { PortalRole } from '@/types/portal';

export const dynamic = 'force-dynamic';

function role(value: unknown): PortalRole | null { return value === 'Worker' || value === 'Contractor' || value === 'Employer' || value === 'BSS Admin' || value === 'BSS Staff' || value === 'Government' ? value : null; }

const roleRedirects: Record<PortalRole, string> = {
  Worker: '/worker',
  Contractor: '/contractor/dashboard',
  Employer: '/employer/dashboard',
  'BSS Admin': '/admin',
  'BSS Staff': '/bss-staff',
  Government: '/government',
};

export async function GET() {
  const session = await getSession();
  return session
    ? NextResponse.json({ authenticated:true, role:session.role, subject:session.subject, expiresAt:session.expiresAt, permissions:session.permissions ?? [] })
    : NextResponse.json({ authenticated:false }, { status:401 });
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const body = await readJsonObject(request);
    const selectedRole = role(body.role);
    if (!selectedRole) return NextResponse.json({ error:'Select a valid BSS portal role.' }, { status:400 });
    if (body.action === 'request-otp') {
      if (typeof body.identifier !== 'string') return NextResponse.json({ error:'A registered mobile number or email is required.' }, { status:400 });
      const mode = body.mode === 'register' ? 'register' : 'login';
      assertRateLimit(`otp:${selectedRole}:${body.identifier.trim().toLowerCase()}`, 5, 10 * 60_000);
      const result = await requestOtp(selectedRole, body.identifier, mode);
      return NextResponse.json(result, { status:202 });
    }
    if (!['otp','mpin','password'].includes(String(body.method)) || typeof body.identifier !== 'string' || typeof body.credential !== 'string') {
      return NextResponse.json({ error:'Complete all authentication fields.' }, { status:400 });
    }
    assertRateLimit(`login:${selectedRole}:${body.identifier.trim().toLowerCase()}`, 10, 10 * 60_000);
    const result = await authenticate({ role:selectedRole, method:body.method as LoginInput['method'], identifier:body.identifier, credential:body.credential });
    const session = await createSession(result);
    let redirectTo = roleRedirects[session.role];
    if (session.staffId && Array.isArray(session.permissions)) {
      const perms = session.permissions;
      if (perms.includes('medical')) redirectTo = '/employer/worker-compliance-checklists?tab=medical';
      else if (perms.includes('safety')) redirectTo = '/employer/worker-compliance-checklists?tab=safety';
      else if (perms.includes('gate_pass')) redirectTo = '/employer/gate-pass';
      else if (perms.includes('compliance')) redirectTo = '/employer/compliance-submission';
      else redirectTo = '/employer/no-workspace';
    }
    return NextResponse.json({ authenticated:true, role:session.role, redirectTo, permissions:session.permissions ?? [] });
  } catch (error) { return apiError(error, 'Authentication service is unavailable.'); }
}

export async function DELETE(request: Request) {
  assertTrustedMutation(request);
  try {
    const session = await getSession();
    if (session) {
      const config = getRuntimeConfig();
      // Revoke the server-side session (and its tokens) before clearing the cookie.
      await upstreamRequest(config.apiBaseUrl, '/v1/auth/logout', session, {
        method: 'POST',
        body: JSON.stringify({}),
      }).catch(() => { /* best effort — always clear the local cookie */ });
    }
  } catch { /* ignore */ }
  await clearSession();
  return NextResponse.json({ authenticated:false });
}
