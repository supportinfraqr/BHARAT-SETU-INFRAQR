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
    const params = new URL(request.url).searchParams;
    const state = params.get('state') ?? '';
    const all = params.get('all') ?? '';
    const library = params.get('library') ?? '';
    const query = new URLSearchParams();
    if (state) query.set('state', state);
    if (all) query.set('all', all);
    if (library) query.set('library', library);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const path = `/v1/contractor/clra/templates${suffix}`;
    const result = await upstreamRequest(config.apiBaseUrl, path, session);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Register templates could not be loaded.'); }
}
