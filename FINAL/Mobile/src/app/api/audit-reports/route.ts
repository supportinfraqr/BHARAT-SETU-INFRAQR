import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireApiSession();
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/audit-reports', session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'Audit reports could not be loaded.'); }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const body = Buffer.from(await request.arrayBuffer());
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/audit-reports/generate', session, {
      method: 'POST', body, headers: { 'Content-Type': 'application/json' },
    });
    return NextResponse.json(result, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'Audit reports could not be generated.'); }
}
