import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const body = await readJsonObject(request);
    const identifier = String(body.identifier ?? '').trim();
    const otp = String(body.otp ?? '').trim();
    const mpin = String(body.mpin ?? '');
    if (!identifier) return NextResponse.json({ error: 'Enter your BSS ID or mobile number.' }, { status: 400 });
    if (!/^\d{4,6}$/.test(mpin)) return NextResponse.json({ error: 'MPIN must be 4-6 digits.' }, { status: 400 });
    assertRateLimit(`mpin-reset:${identifier.toLowerCase()}`, 5, 10 * 60_000);
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.authBaseUrl, '/v1/auth/mpin/reset', null, {
      method: 'POST',
      body: JSON.stringify({ identifier, otp, mpin }),
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'MPIN could not be reset.');
  }
}
