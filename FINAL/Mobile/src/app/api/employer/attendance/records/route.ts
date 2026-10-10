import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const params = new URL(request.url).searchParams;
    const query = new URLSearchParams();
    for (const key of ['month', 'siteId', 'start', 'end']) {
      const value = params.get(key);
      if (value) query.set(key, value);
    }
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/employer/attendance/records${query.size ? `?${query}` : ''}`, session);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Attendance records could not be loaded.');
  }
}
