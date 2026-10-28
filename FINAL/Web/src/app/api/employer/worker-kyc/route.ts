import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/worker-kyc', session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'Worker KYC data could not be loaded.'); }
}
