import { NextResponse } from 'next/server';
import { getSession, requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { apiError, readJsonObject, assertTrustedMutation } from '@/server/api';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store' } as const;

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ data: { records: [] } }, { headers: noStore });
    const url = new URL(request.url);
    const ownerType = url.searchParams.get('ownerType') ?? '';
    const ownerId = url.searchParams.get('ownerId') ?? '';
    const config = getRuntimeConfig();
    const path = `/v1/document-templates?ownerType=${encodeURIComponent(ownerType)}&ownerId=${encodeURIComponent(ownerId)}`;
    const result = await upstreamRequest<{ data?: { records?: unknown[] } }>(config.apiBaseUrl, path, session);
    return NextResponse.json({ data: { records: result?.data?.records ?? [] } }, { headers: noStore });
  } catch (error) {
    return apiError(error, 'Document templates could not be loaded.');
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession().catch(() => null);
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const body = await readJsonObject(request);
    const config = getRuntimeConfig();
    const result = await upstreamRequest<{ data?: { records?: unknown[] } }>(config.apiBaseUrl, '/v1/document-templates', session, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(result ?? { data: { records: [] } }, { headers: noStore });
  } catch (error) {
    return apiError(error, 'Document templates could not be saved.');
  }
}
