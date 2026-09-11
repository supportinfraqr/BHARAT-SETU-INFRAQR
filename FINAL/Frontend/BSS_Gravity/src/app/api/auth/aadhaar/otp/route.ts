import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const body = await readJsonObject(request);
    if (typeof body.aadhaar !== 'string' || !/^\d{12}$/.test(body.aadhaar.replace(/\D/g, ''))) {
      return NextResponse.json({ error: 'Enter a valid 12-digit Aadhaar number.' }, { status: 400 });
    }
    assertRateLimit(`aadhaar-otp:${body.aadhaar}`, 5, 10 * 60_000);
    const config = getRuntimeConfig();

    const result = await upstreamRequest<{ referenceId: string; expiresIn: number }>(
      config.authBaseUrl,
      '/v1/auth/aadhaar/otp',
      null,
      { method: 'POST', body: JSON.stringify({ aadhaar: body.aadhaar }) },
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiError(error, 'Aadhaar OTP could not be sent.');
  }
}