import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id:string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const { id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return NextResponse.json({ error:'Unknown checklist.' }, { status:404 });
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 32_000);
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/employer/compliance-checklists/${pk}/field`, session, { method:'PATCH', body: JSON.stringify(body) });
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The checklist field could not be updated.'); }
}
