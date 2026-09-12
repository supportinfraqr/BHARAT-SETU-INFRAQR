import 'server-only';

import { assertRuntimeConfigured, getRuntimeConfig } from '@/server/config';
import type { PortalSession } from '@/types/portal';

export class UpstreamError extends Error {
  constructor(message: string, public readonly status = 502, public readonly details?: unknown) { super(message); }
}

/**
 * True when the upstream rejected the request because the *session* is no longer
 * valid (missing/expired token, or the account no longer exists) — as opposed to
 * a genuine role/permission denial. Such requests should send the user to login.
 */
export function isStaleSessionError(error: unknown): boolean {
  if (!(error instanceof UpstreamError)) return false;
  if (error.status === 401) return true;
  if (error.status !== 403) return false;
  const message = error.message.toLowerCase();
  return message.includes('authentication credentials')
    || message.includes('credentials were not provided')
    || message.includes('not valid')
    || message.includes('token');
}

function upstreamErrorMessage(responseStatus: number, payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) {
    const text = payload.trim();
    // Never surface a raw HTML error page (nginx / Django 500) to the client.
    if (/^<!doctype html|^<html|^<head/i.test(text)) return fallback;
    const maybe = `${responseStatus} ${text}`.replace(/^[45]\d\d /, '');
    if (maybe.trim()) return maybe.trim();
  } else if (payload && typeof payload === 'object') {
    const detail = (payload as Record<string, unknown>).error ?? (payload as Record<string, unknown>).detail ?? (payload as Record<string, unknown>).message;
    if (typeof detail === 'string' && detail.trim()) return detail.trim();
  }
  return fallback;
}

function buildUpstreamHeaders(session: PortalSession | null, init: RequestInit): Headers {
  const config = getRuntimeConfig();
  const headers = new Headers(init.headers);
  if (typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (session?.accessToken) headers.set('Authorization', `Bearer ${session.accessToken}`);
  else if (config.serviceToken) headers.set('Authorization', `Bearer ${config.serviceToken}`);
  if (session) {
    headers.set('X-BSS-Subject', session.subject);
    headers.set('X-BSS-Role', session.role);
    headers.set('X-Correlation-ID', session.sessionId);
  }
  return headers;
}

export async function upstreamRequest<T>(baseUrl: string | undefined, path: string, session: PortalSession | null, init: RequestInit = {}): Promise<T> {
  const config = assertRuntimeConfigured();
  if (!baseUrl) throw new UpstreamError('The upstream service is not configured.', 503);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const headers = buildUpstreamHeaders(session, init);
    headers.set('Accept', 'application/json');
    const response = await fetch(`${baseUrl}${path}`, { ...init, headers, cache: 'no-store', signal: controller.signal });
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) throw new UpstreamError(upstreamErrorMessage(response.status, payload, 'The BSS service rejected the request.'), response.status, payload);
    return payload as T;
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new UpstreamError('The BSS service timed out.', 504);
    throw new UpstreamError('The BSS service is unavailable.', 503);
  } finally {
    clearTimeout(timer);
  }
}

export async function upstreamStream(baseUrl: string | undefined, path: string, session: PortalSession | null, init: RequestInit = {}): Promise<Response> {
  const config = assertRuntimeConfigured();
  if (!baseUrl) throw new UpstreamError('The upstream service is not configured.', 503);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const headers = buildUpstreamHeaders(session, init);
    if (!headers.has('Accept')) headers.set('Accept', '*/*');
    const response = await fetch(`${baseUrl}${path}`, { ...init, headers, cache: 'no-store', signal: controller.signal });
    if (!response.ok) {
      const payload = await response.text();
      throw new UpstreamError(upstreamErrorMessage(response.status, payload, 'The BSS service rejected the request.'), response.status, payload);
    }
    return response;
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new UpstreamError('The BSS service timed out.', 504);
    throw new UpstreamError('The BSS service is unavailable.', 503);
  } finally {
    clearTimeout(timer);
  }
}