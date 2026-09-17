import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const contentType = request.headers.get('content-type') ?? 'multipart/form-data';
    const body = Buffer.from(await request.arrayBuffer());
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/contractor/clra/validate', session, {
      method: 'POST', body, headers: { 'Content-Type': contentType },
    });
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The master file could not be validated.'); }
}
