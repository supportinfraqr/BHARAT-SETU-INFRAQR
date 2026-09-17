import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const params = new URL(request.url).searchParams;
    const query = new URLSearchParams();
    for (const key of ['state', 'category', 'date']) {
      const value = params.get(key);
      if (value) query.set(key, value);
    }
    const path = `/v1/admin/cost-sheets/min-wage${query.toString() ? `?${query}` : ''}`;
    const result = await upstreamRequest(config.apiBaseUrl, path, session);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The minimum wage could not be fetched.'); }
}
