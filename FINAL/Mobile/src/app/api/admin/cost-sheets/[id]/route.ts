import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { costSheetsUpstream } from '@/server/adminMasters';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id:string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return NextResponse.json({ error:'Unknown template.' }, { status:404 });
    const result = await costSheetsUpstream('GET', undefined, pk);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The cost sheet template could not be loaded.'); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return NextResponse.json({ error:'Unknown template.' }, { status:404 });
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`cost-sheets:${session.sessionId}`, 60, 60_000);
    const body = await readJsonObject(request, 512_000);
    const result = await costSheetsUpstream('PATCH', body, pk);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The cost sheet template could not be saved.'); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return NextResponse.json({ error:'Unknown template.' }, { status:404 });
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`cost-sheets:${session.sessionId}`, 60, 60_000);
    const result = await costSheetsUpstream('DELETE', undefined, pk);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The cost sheet template could not be deleted.'); }
}
