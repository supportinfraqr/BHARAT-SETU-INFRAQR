import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { PortalSession } from '@/types/portal';

// Pure session-token crypto (no next/headers), so it can be reused by the
// Node-runtime proxy as well as the server session helpers.
export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-bss_session' : 'bss_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

function secretKey(): Buffer {
  const configured = process.env.BSS_SESSION_SECRET;
  if (process.env.NODE_ENV === 'production' && (!configured || configured.length < 32)) {
    throw new Error('A production-grade BSS_SESSION_SECRET is required.');
  }
  return createHash('sha256').update(configured ?? 'bss-development-session-secret-not-for-production').digest();
}

export function encryptSession(payload: PortalSession): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(value => value.toString('base64url')).join('.');
}

export function decryptSession(value: string): PortalSession | null {
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
