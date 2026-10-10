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
    const role = new URL(request.url).searchParams.get('role');
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/admin/accounts${query}`, session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Accounts could not be loaded.');
  }
}
