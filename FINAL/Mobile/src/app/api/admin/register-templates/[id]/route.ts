import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    const { id } = await context.params;
    const body = await readJsonObject(request, 512_000);
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/admin/register-templates/${encodeURIComponent(id)}`, session, {
      method: 'PATCH', body: JSON.stringify(body),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The register template could not be updated.'); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    const { id } = await context.params;
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/admin/register-templates/${encodeURIComponent(id)}`, session, {
      method: 'DELETE',
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error, 'The register template could not be deleted.'); }
}
