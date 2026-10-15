import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store' } as const;

export async function GET() {
  try {
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const result = await upstreamRequest<{ rows?: unknown[] }>(config.apiBaseUrl, '/v1/admin/sites-cctv', session);
    return NextResponse.json({ rows: result?.rows ?? [] }, { headers: noStore });
  } catch (error) { return apiError(error, 'Site CCTV settings could not be loaded.'); }
}
