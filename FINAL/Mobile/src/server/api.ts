import 'server-only';

import { NextResponse } from 'next/server';
import { UpstreamError, isStaleSessionError } from '@/server/http';
import { SESSION_COOKIE } from '@/server/session';

type RateBucket = { count: number; resetAt: number };
const rateLimitGlobal = globalThis as typeof globalThis & { __bssRateBuckets?: Map<string, RateBucket> };
const rateBuckets = rateLimitGlobal.__bssRateBuckets ??= new Map<string, RateBucket>();

export function apiError(error: unknown, fallback = 'The request could not be completed.') {
  if (error instanceof UpstreamError) {
    if (isStaleSessionError(error)) {
      const response = NextResponse.json(
        { error: 'Your session is no longer valid. Please sign in again.', reauth: true },
        { status: 401 },
      );
      response.cookies.set(SESSION_COOKIE, '', {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0,
      });
      return response;
    }
    if (error.status >= 500) console.error(fallback, error);
    return NextResponse.json({ error:error.message }, { status:error.status });
  }
  const status = typeof error === 'object' && error && 'status' in error && typeof error.status === 'number' ? error.status : 500;
  const message = error instanceof Error && status < 500 ? error.message : fallback;
  if (status >= 500) console.error(fallback, error);
  return NextResponse.json({ error:message }, { status });
}

export async function readJsonObject(request: Request, maxBytes = 64_000): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > maxBytes) throw Object.assign(new Error('Request body is too large.'), { status:413 });
  const type = request.headers.get('content-type')?.split(';')[0].trim();
  if (type !== 'application/json') throw Object.assign(new Error('Content-Type must be application/json.'), { status:415 });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw Object.assign(new Error('Request body is too large.'), { status:413 });
  let body: unknown = null;
  try { body = JSON.parse(raw); } catch { /* handled by the object check below */ }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('Request body must be a JSON object.'), { status:400 });
  return body as Record<string, unknown>;
}

export function assertTrustedMutation(request: Request): void {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') throw Object.assign(new Error('Cross-site requests are not accepted.'), { status:403 });
  const origin = request.headers.get('origin');
  if (!origin) return;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? (request.url.startsWith('https') ? 'https' : 'http');
  const requestOrigin = host ? `${proto}://${host}` : new URL(request.url).origin;
  const expected = process.env.BSS_APP_ORIGIN?.replace(/\/$/, '') ?? requestOrigin;
  if (origin !== expected && origin !== requestOrigin) throw Object.assign(new Error('The request origin is not trusted.'), { status:403 });
}

export function assertRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  if (rateBuckets.size > 10_000) {
    for (const [bucketKey, bucket] of rateBuckets) if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
  }
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count:1, resetAt:now + windowMs });
    return;
  }
  if (current.count >= limit) {
    const error = Object.assign(new Error('Too many requests. Wait a moment and try again.'), { status:429 });
    throw error;
  }
  current.count += 1;
}
