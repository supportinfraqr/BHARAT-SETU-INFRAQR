import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireApiSession();
    const config = getRuntimeConfig();
    const result = await upstreamRequest<{ rows?: unknown[] }>(config.apiBaseUrl, '/v1/letter-templates', session);
    return NextResponse.json({ rows: result?.rows ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'Letter templates could not be loaded.'); }
}
