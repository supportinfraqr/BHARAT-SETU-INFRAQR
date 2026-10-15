import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Licences applicable to the signed-in employer + upload status. */
export async function GET() {
  try {
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/licenses', session, {
      method: 'GET',
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiError(error, 'The licence list could not be loaded.');
  }
}
