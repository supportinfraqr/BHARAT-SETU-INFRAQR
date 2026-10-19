import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, decryptSession, encryptSession } from '@/server/session-token';
import type { PortalRole, PortalSession } from '@/types/portal';

export { SESSION_COOKIE };

export async function createSession(input: { subject: string; role: PortalRole; sessionId: string; accessToken?: string; employerId?: number | string; staffId?: number | string; permissions?: string[] }): Promise<PortalSession> {
  const issuedAt = Date.now();
  const session: PortalSession = { ...input, issuedAt, expiresAt: issuedAt + SESSION_TTL_SECONDS * 1000 };
  const store = await cookies();
  store.set(SESSION_COOKIE, encryptSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return session;
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function getSession(): Promise<PortalSession | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? decryptSession(value) : null;
}

export async function requireSession(role?: PortalRole): Promise<PortalSession> {
  const session = await getSession();
  if (!session || (role && session.role !== role)) redirect('/?reason=session');
  return session;
}

export async function requireApiSession(role?: PortalRole): Promise<PortalSession> {
  const session = await getSession();
  if (!session) throw Object.assign(new Error('Authentication required.'), { status: 401 });
  if (role && session.role !== role) throw Object.assign(new Error('You do not have access to this resource.'), { status: 403 });
  return session;
}
