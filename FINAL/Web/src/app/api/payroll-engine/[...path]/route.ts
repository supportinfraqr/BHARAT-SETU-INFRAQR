import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { UpstreamError, isStaleSessionError, upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

/**
 * Same-origin proxy for the payroll engine (Django `/v1/payroll-engine/*`).
 *
 * One handler covers the whole payroll API: JSON bodies, multipart uploads
 * (claims, investment proofs, Excel imports) and binary downloads (payslip /
 * Form 16 / tax-report PDFs, bank files, Excel exports). Upstream error bodies
 * (`{ status, success, message }`) are passed through unchanged so the UI can
 * show the payroll engine's own messages.
 */

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ path: string[] }> };

const MAX_BODY_BYTES = 25 * 1024 * 1024;
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'content-length'];

function upstreamPath(path: string[], request: Request): string {
  const safe = path.map(segment => encodeURIComponent(segment)).join('/');
  const search = new URL(request.url).search;
  return `/v1/payroll-engine/${safe}${search}`;
}

async function proxy(request: Request, context: Context): Promise<Response> {
  const method = request.method.toUpperCase();
  try {
    if (method !== 'GET' && method !== 'HEAD') assertTrustedMutation(request);
    const session = await requireApiSession();
    assertRateLimit(`payroll-engine:${session.sessionId}:${method === 'GET' ? 'r' : 'w'}`, method === 'GET' ? 600 : 120, 60_000);
    const { path } = await context.params;
    const config = getRuntimeConfig();

    const headers: Record<string, string> = {};
    const org = request.headers.get('x-payroll-org');
    if (org) headers['X-Payroll-Org'] = org;
    let body: BodyInit | undefined;
    if (method !== 'GET' && method !== 'HEAD' && method !== 'DELETE') {
      const length = Number(request.headers.get('content-length') ?? 0);
      if (length > MAX_BODY_BYTES) return NextResponse.json({ status: false, success: false, message: 'Request body is too large.' }, { status: 413 });
      const buffer = Buffer.from(await request.arrayBuffer());
      if (buffer.byteLength > MAX_BODY_BYTES) return NextResponse.json({ status: false, success: false, message: 'Request body is too large.' }, { status: 413 });
      headers['Content-Type'] = request.headers.get('content-type') ?? 'application/json';
      body = buffer;
    } else if (method === 'DELETE') {
      const text = await request.text();
      if (text) { headers['Content-Type'] = 'application/json'; body = text; }
    }

    const upstream = await upstreamStream(config.apiBaseUrl, upstreamPath(path, request), session, { method, headers, body });
    const out = new Headers({ 'Cache-Control': 'private, no-store' });
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) out.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch (error) {
    // Pass the payroll engine's own error envelope through untouched.
    if (error instanceof UpstreamError && !isStaleSessionError(error) && error.status < 500) {
      let details: unknown = error.details;
      if (typeof details === 'string') { try { details = JSON.parse(details); } catch { /* not JSON */ } }
      if (details && typeof details === 'object') return NextResponse.json(details, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    return apiError(error, 'The payroll request could not be completed.');
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
