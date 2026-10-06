import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { adminMastersUpstream } from '@/server/adminMasters';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await adminMastersUpstream('', 'GET');
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Master counts could not be loaded.'); }
}
