import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireApiSession('Worker');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(
      config.apiBaseUrl,
      '/v1/digilocker/documents/',
      session,
      { method: 'GET' },
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiError(error, 'DigiLocker documents could not be loaded.');
  }
}
