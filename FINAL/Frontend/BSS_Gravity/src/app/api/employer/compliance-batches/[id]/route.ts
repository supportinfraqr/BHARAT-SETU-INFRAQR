import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id:string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const pk = Number(id);
    if (!Number.isInteger(pk)) return NextResponse.json({ error:'Unknown batch.' }, { status:404 });
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const site = new URL(request.url).searchParams.get('site');
    const path = site
      ? `/v1/employer/compliance-batches/${pk}/site-documents?site=${encodeURIComponent(site)}`
      : `/v1/employer/compliance-batches/${pk}/summary`;
    const result = await upstreamRequest(config.apiBaseUrl, path, session);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Batch details could not be loaded.'); }
}
