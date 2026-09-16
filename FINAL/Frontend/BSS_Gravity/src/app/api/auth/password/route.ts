import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession().catch(() => null);
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const body = await readJsonObject(request);
    const action = String(body.action ?? 'set').toLowerCase();
    const password = String(body.password ?? '');
    const otp = String(body.otp ?? '');
    if (!['request-otp', 'send-otp'].includes(action) && password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/auth/password', session, {
      method: 'POST',
      body: JSON.stringify({ action, password, otp }),
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'Password could not be saved.');
  }
}
