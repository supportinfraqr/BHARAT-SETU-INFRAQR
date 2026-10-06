import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { ADMIN_MASTER_KEYS, adminMastersUpstream } from '@/server/adminMasters';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ key:string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { key } = await context.params;
    if (!ADMIN_MASTER_KEYS.has(key)) return NextResponse.json({ error:'Unknown master.' }, { status:404 });
    const result = await adminMastersUpstream(key, 'GET');
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Master records could not be loaded.'); }
}

export async function POST(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { key } = await context.params;
    if (!ADMIN_MASTER_KEYS.has(key)) return NextResponse.json({ error:'Unknown master.' }, { status:404 });
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`admin-master:${session.sessionId}:${key}`, 60, 60_000);
    const body = await readJsonObject(request);
    const result = await adminMastersUpstream(key, 'POST', body);
    return NextResponse.json(result, { status:201, headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Master record could not be saved.'); }
}
