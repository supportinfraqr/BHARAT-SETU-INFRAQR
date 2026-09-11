import 'server-only';

import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest, UpstreamError } from '@/server/http';
import type { PortalRole } from '@/types/portal';

export type LoginInput = {
  role: PortalRole;
  method: 'otp' | 'mpin' | 'password';
  identifier: string;
  credential: string;
};

type AuthResult = {
  subject: string;
  role: PortalRole;
  sessionId: string;
  accessToken?: string;
};

function cleanIdentifier(value: string): string {
  const clean = value.trim();
  if (clean.length < 3 || clean.length > 254) {
    throw Object.assign(new Error('Enter a valid registered ID, mobile number, or email address.'), { status: 400 });
  }
  return clean;
}

export async function authenticate(input: LoginInput): Promise<AuthResult> {
  const identifier = cleanIdentifier(input.identifier);
  const config = getRuntimeConfig();

  const result = await upstreamRequest<AuthResult>(config.authBaseUrl, '/v1/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ ...input, identifier }),
  });
  if (
    !result ||
    result.role !== input.role ||
    typeof result.subject !== 'string' ||
    !result.subject ||
    typeof result.sessionId !== 'string' ||
    !result.sessionId
  ) {
    throw new UpstreamError('The identity service returned an invalid session.', 502);
  }
  return result;
}

export async function requestOtp(role: PortalRole, identifierValue: string): Promise<{ challengeId?: string; expiresIn: number }> {
  const identifier = cleanIdentifier(identifierValue);
  const config = getRuntimeConfig();
  return upstreamRequest(config.authBaseUrl, '/v1/auth/otp', null, {
    method: 'POST',
    body: JSON.stringify({ role, identifier }),
  });
}