import { NextResponse } from 'next/server';
import { authenticate, requestOtp, type LoginInput } from '@/server/auth';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
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
    ? NextResponse.json({ authenticated:true, role:session.role, subject:session.subject, expiresAt:session.expiresAt })
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
      assertRateLimit(`otp:${selectedRole}:${body.identifier.trim().toLowerCase()}`, 5, 10 * 60_000);
      const result = await requestOtp(selectedRole, body.identifier);
      return NextResponse.json(result, { status:202 });
    }
    if (!['otp','mpin','password'].includes(String(body.method)) || typeof body.identifier !== 'string' || typeof body.credential !== 'string') {
      return NextResponse.json({ error:'Complete all authentication fields.' }, { status:400 });
    }
    assertRateLimit(`login:${selectedRole}:${body.identifier.trim().toLowerCase()}`, 10, 10 * 60_000);
    const result = await authenticate({ role:selectedRole, method:body.method as LoginInput['method'], identifier:body.identifier, credential:body.credential });
    const session = await createSession(result);
    return NextResponse.json({ authenticated:true, role:session.role, redirectTo:roleRedirects[session.role] });
  } catch (error) { return apiError(error, 'Authentication service is unavailable.'); }
}

export async function DELETE(request: Request) {
  assertTrustedMutation(request);
  await clearSession();
  return NextResponse.json({ authenticated:false });
}
