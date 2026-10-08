import { NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

/**
 * DigiLocker OAuth redirect target registered with the DigiLocker partner
 * portal for client MS53AA158D. DigiLocker only accepts this exact URI
 * (https://login.bharatshramsetu.com/Return/Digilocker), inherited from the
 * original .NET app, so this route mirrors /api/digilocker/callback.
 */
export async function GET(request: Request) {
  const config = getRuntimeConfig();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code') ?? '';
  const state = searchParams.get('state') ?? '';
  const base = (config.appOrigin ?? new URL(request.url).origin).replace(/\/$/, '');
  const target = `${base}/worker/Profile?digilocker=`;

  if (!code || !state) {
    return NextResponse.redirect(`${target}error&message=${encodeURIComponent('DigiLocker did not return a code.')}`);
  }
  try {
    await upstreamRequest(
      config.apiBaseUrl,
      `/v1/digilocker/callback/?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      null,
      { method: 'GET' },
    );
    return NextResponse.redirect(`${target}linked&tab=integrations`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DigiLocker linking failed.';
    return NextResponse.redirect(`${target}error&tab=integrations&message=${encodeURIComponent(message)}`);
  }
}
