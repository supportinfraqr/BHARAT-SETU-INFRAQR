import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { costSheetsUpstream } from '@/server/adminMasters';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await costSheetsUpstream('GET');
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Cost sheet templates could not be loaded.'); }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`cost-sheets:${session.sessionId}`, 60, 60_000);
    const body = await readJsonObject(request, 512_000);
    const result = await costSheetsUpstream('POST', body);
    return NextResponse.json(result, { status:201, headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The cost sheet template could not be saved.'); }
}
