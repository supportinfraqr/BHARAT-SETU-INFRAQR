import { NextResponse } from 'next/server';
import { getSession, requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { apiError, readJsonObject, assertTrustedMutation } from '@/server/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ data: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    const config = getRuntimeConfig();
    const result = await upstreamRequest<{ data?: unknown[] }>(config.apiBaseUrl, '/v1/employer/binding-requests', session);
    return NextResponse.json({ data: result?.data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Binding requests could not be loaded.');
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession().catch(() => null);
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const body = await readJsonObject(request);
    const bindingId = Number(body.bindingId ?? body.id);
    const action = String(body.action ?? '').toLowerCase();
    if (!Number.isInteger(bindingId) || bindingId <= 0) {
      return NextResponse.json({ error: 'Binding ID is required.' }, { status: 400 });
    }
    if (!['approve-binding', 'approve-site', 'approve-site-release', 'release-site', 'reject-site-release', 'set-site-successor', 'allot', 'set-secondary', 'reject', 'unbind'].includes(action)) {
      return NextResponse.json({ error: 'Unsupported binding action.' }, { status: 400 });
    }
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/employer/binding-requests/${bindingId}/action`, session, {
      method: 'POST',
      body: JSON.stringify({
        action,
        siteId: Number(body.siteId) || undefined,
        allotmentId: Number(body.allotmentId) || undefined,
        siteIds: Array.isArray(body.siteIds) ? body.siteIds.map(Number).filter(Number.isInteger) : undefined,
        bindingIds: Array.isArray(body.bindingIds) ? body.bindingIds.map(Number).filter(Number.isInteger) : undefined,
        successorBindingId: Number(body.successorBindingId) || undefined,
        successorContractorId: Number(body.successorContractorId) || undefined,
      }),
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'The binding could not be updated.');
  }
}
