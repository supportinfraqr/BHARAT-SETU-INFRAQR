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
    const mpin = String(body.mpin ?? '');
    const otp = String(body.otp ?? '');
    const acceptedTerms = body.acceptedTerms === true || String(body.acceptedTerms ?? '').toLowerCase() === 'true';
    if (!['request-otp', 'send-otp'].includes(action) && !/^\d{4,6}$/.test(mpin)) {
      return NextResponse.json({ error: 'MPIN must be 4-6 digits.' }, { status: 400 });
    }
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/auth/mpin', session, {
      method: 'POST',
      body: JSON.stringify({ action, mpin, otp, acceptedTerms }),
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'MPIN could not be saved.');
  }
}
