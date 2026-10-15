import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store' } as const;

export async function GET(request: Request) {
  try {
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const templateId = new URL(request.url).searchParams.get('templateId');
    const path = '/v1/employer/letter-adoption'
      + (templateId ? `?templateId=${encodeURIComponent(templateId)}` : '');
    const result = await upstreamRequest(config.apiBaseUrl, path, session);
    return NextResponse.json(result, { headers: noStore });
  } catch (error) { return apiError(error, 'The appointment letter adoption could not be loaded.'); }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const body = await readJsonObject(request, 512_000);
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/letter-adoption', session,
      { method: 'POST', body: JSON.stringify(body) });
    return NextResponse.json(result, { headers: noStore });
  } catch (error) { return apiError(error, 'The appointment letter adoption could not be saved.'); }
}

export async function DELETE(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Employer');
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/employer/letter-adoption', session,
      { method: 'DELETE' });
    return NextResponse.json(result, { headers: noStore });
  } catch (error) { return apiError(error, 'The adoption could not be removed.'); }
}
