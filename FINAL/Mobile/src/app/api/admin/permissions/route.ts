import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { adminPermissionsUpstream } from '@/server/adminMasters';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await adminPermissionsUpstream('GET');
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Permissions could not be loaded.'); }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`admin-permissions:${session.sessionId}`, 60, 60_000);
    const body = await readJsonObject(request, 256_000);
    const result = await adminPermissionsUpstream('POST', body);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Permissions could not be saved.'); }
}
