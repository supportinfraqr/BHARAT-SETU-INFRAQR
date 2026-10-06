import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const siteId = new URL(request.url).searchParams.get('siteId') ?? '';
    const suffix = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/contractor/clra/site-documents${suffix}`, session);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Required documents could not be loaded.'); }
}
