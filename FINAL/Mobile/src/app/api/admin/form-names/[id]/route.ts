import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id:string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return NextResponse.json({ error: 'Unknown form.' }, { status: 404 });
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/admin/form-names/${pk}`, session, { method: 'DELETE' });
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The form could not be removed.'); }
}
