import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const result = await upstreamRequest<{ rows?: unknown[] }>(config.apiBaseUrl, '/v1/admin/cost-sheets/sites', session);
    return NextResponse.json({ rows: result?.rows ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'Sites could not be loaded.'); }
}
