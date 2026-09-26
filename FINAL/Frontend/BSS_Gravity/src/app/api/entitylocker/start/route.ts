import { NextResponse } from 'next/server';
import { apiError, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

/** Begin the EntityLocker OAuth2 consent flow (public — part of registration). */
export async function POST(request: Request) {
  try {
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 8_000);
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/entitylocker/start', null, {
      method: 'POST', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'EntityLocker verification could not be started.'); }
}
