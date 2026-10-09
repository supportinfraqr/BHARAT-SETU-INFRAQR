import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { apiError, readJsonObject } from '@/server/api';

export const dynamic = 'force-dynamic';

// Public, key-free engine info so the client knows whether to use the browser
// free path or route through the backend (Google Cloud API).
export async function GET() {
  try {
    const config = getRuntimeConfig();
    const result = await upstreamRequest<{ data?: unknown }>(config.apiBaseUrl, '/v1/translate/config/', null);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ data: { mode: 'free', enabled: true } }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
}

// Machine translation of UI strings. Public by design (login pages need it too);
// the backend applies a per-IP throttle and the client never sends PII.
export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const target = String(body.target ?? '').toLowerCase();
    const texts = Array.isArray(body.texts) ? body.texts.slice(0, 200).map(value => String(value)) : [];
    if (!target || !texts.length) {
      return NextResponse.json({ data: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const config = getRuntimeConfig();
    const session = await getSession();
    const result = await upstreamRequest<{ data?: string[] }>(config.apiBaseUrl, '/v1/translate/', session, {
      method: 'POST',
      body: JSON.stringify({ target, source: String(body.source ?? 'en'), texts }),
    });
    return NextResponse.json({ data: Array.isArray(result?.data) ? result.data : texts }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Translation is unavailable right now.');
  }
}
