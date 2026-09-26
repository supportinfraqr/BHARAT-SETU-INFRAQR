import { NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

/**
 * EntityLocker OAuth redirect target — register this exact URL in the API Setu /
 * DigiLocker partner portal: https://login.bharatshramsetu.com/Return/EntityLocker
 * EntityLocker sends the browser here with ?code=&state=; we hand those to the
 * backend (which exchanges the code and reads the entity), then bounce back to
 * the registration form with the verified organisation.
 */
export async function GET(request: Request) {
  const config = getRuntimeConfig();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code') ?? '';
  const state = searchParams.get('state') ?? '';
  const error = searchParams.get('error') ?? '';
  const base = (config.appOrigin ?? new URL(request.url).origin).replace(/\/$/, '');
  const fail = (message: string) =>
    NextResponse.redirect(`${base}/?entityVerified=0&message=${encodeURIComponent(message)}`);

  if (error) return fail(error);
  if (!code || !state) return fail('EntityLocker did not return an authorization code.');
  try {
    const result = await upstreamRequest<{ verified?: boolean; data?: { entityName?: string; verifiedBy?: string }; error?: string }>(
      config.apiBaseUrl,
      `/v1/entitylocker/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      null,
      { method: 'GET' },
    );
    if (!result?.verified) return fail(result?.error ?? 'EntityLocker verification failed.');
    const name = result.data?.entityName ?? '';
    const by = result.data?.verifiedBy ?? '';
    return NextResponse.redirect(
      `${base}/?entityVerified=1&entityName=${encodeURIComponent(name)}&verifiedBy=${encodeURIComponent(by)}`);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'EntityLocker verification failed.');
  }
}
