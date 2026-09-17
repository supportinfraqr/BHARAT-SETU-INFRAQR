import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { ADMIN_MASTER_KEYS, adminMastersUpstream } from '@/server/adminMasters';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ key:string; id:string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { key, id } = await context.params;
    const pk = Number(id);
    if (!ADMIN_MASTER_KEYS.has(key) || !Number.isInteger(pk)) return NextResponse.json({ error:'Unknown master record.' }, { status:404 });
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`admin-master:${session.sessionId}:${key}`, 60, 60_000);
    const body = await readJsonObject(request);
    const result = await adminMastersUpstream(key, 'PATCH', body, pk);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Master record could not be updated.'); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { key, id } = await context.params;
    const pk = Number(id);
    if (!ADMIN_MASTER_KEYS.has(key) || !Number.isInteger(pk)) return NextResponse.json({ error:'Unknown master record.' }, { status:404 });
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`admin-master:${session.sessionId}:${key}`, 60, 60_000);
    const result = await adminMastersUpstream(key, 'DELETE', undefined, pk);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Master record could not be deleted.'); }
}
