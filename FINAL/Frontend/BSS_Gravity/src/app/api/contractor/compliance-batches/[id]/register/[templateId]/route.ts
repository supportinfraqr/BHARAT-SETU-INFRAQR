import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id:string; templateId:string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id, templateId } = await context.params;
    const batch = Number(id);
    const template = Number(templateId);
    if (!Number.isInteger(batch) || !Number.isInteger(template)) {
      return NextResponse.json({ error:'Unknown register.' }, { status:404 });
    }
    const session = await requireApiSession('Contractor');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/contractor/compliance-batches/${batch}/register/${template}`, session);
    return NextResponse.json(result, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'The register could not be rendered.'); }
}
