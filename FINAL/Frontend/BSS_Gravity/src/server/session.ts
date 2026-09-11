import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getRuntimeConfig } from '@/server/config';
import type { PortalRole, PortalSession } from '@/types/portal';

export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-bss_session' : 'bss_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function secretKey(): Buffer {
  const configured = getRuntimeConfig().sessionSecret;
  if (process.env.NODE_ENV === 'production' && (!configured || configured.length < 32)) {
    throw new Error('A production-grade BSS_SESSION_SECRET is required.');
  }
  return createHash('sha256').update(configured ?? 'bss-development-session-secret-not-for-production').digest();
}

function encrypt(payload: PortalSession): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(value => value.toString('base64url')).join('.');
}

function decrypt(value: string): PortalSession | null {
  try {
    const [encodedIv, encodedTag, encodedCiphertext] = value.split('.');
    if (!encodedIv || !encodedTag || !encodedCiphertext) return null;
    const decipher = createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(encodedIv, 'base64url'));
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
    const json = Buffer.concat([decipher.update(Buffer.from(encodedCiphertext, 'base64url')), decipher.final()]).toString('utf8');
    const session = JSON.parse(json) as PortalSession;
    if (!session.subject || !session.sessionId || !['Worker', 'Contractor', 'Employer', 'BSS Admin', 'BSS Staff', 'Government'].includes(session.role) || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function createSession(input: { subject: string; role: PortalRole; sessionId: string; accessToken?: string }): Promise<PortalSession> {
  const issuedAt = Date.now();
  const session: PortalSession = { ...input, issuedAt, expiresAt: issuedAt + SESSION_TTL_SECONDS * 1000 };
  const store = await cookies();
  store.set(SESSION_COOKIE, encrypt(session), {
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
  return value ? decrypt(value) : null;
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
