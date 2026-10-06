import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { adminActivityUpstream } from '@/server/adminMasters';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const query = new URLSearchParams();
    for (const key of ['role', 'action', 'from', 'to']) {
      const value = params.get(key);
      if (value) query.set(key, value);
    }
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const result = await adminActivityUpstream(suffix);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The activity log could not be loaded.'); }
}
