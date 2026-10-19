import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const search = new URL(request.url).search;
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/employer/medical-forms${search}`, session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'Health forms could not be loaded.'); }
}
