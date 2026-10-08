import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return NextResponse.json({ error: 'Unknown course.' }, { status: 404 });
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 256_000);
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/admin/courses/${pk}`, session, {
      method: 'PATCH', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The course could not be updated.'); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return NextResponse.json({ error: 'Unknown course.' }, { status: 404 });
    const session = await requireApiSession('BSS Admin');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/admin/courses/${pk}`, session, { method: 'DELETE' });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The course could not be removed.'); }
}
