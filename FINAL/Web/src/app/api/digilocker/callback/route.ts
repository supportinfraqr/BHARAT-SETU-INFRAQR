import { NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

/**
 * DigiLocker OAuth redirect target. DigiLocker sends the browser here with
 * ?code=&state=; we hand those to the backend (which exchanges the code, links
 * the profile and starts the document fetch), then bounce the browser back to
 * the worker profile.
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
    return NextResponse.redirect(`${target}linked`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DigiLocker linking failed.';
    return NextResponse.redirect(`${target}error&message=${encodeURIComponent(message)}`);
  }
}
