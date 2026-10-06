import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { stateApplicabilityUpstream } from '@/server/adminMasters';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const state = new URL(request.url).searchParams.get('state');
    const suffix = state ? `?state=${encodeURIComponent(state)}` : '';
    const result = await stateApplicabilityUpstream(suffix);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The applicability matrix could not be loaded.'); }
}
