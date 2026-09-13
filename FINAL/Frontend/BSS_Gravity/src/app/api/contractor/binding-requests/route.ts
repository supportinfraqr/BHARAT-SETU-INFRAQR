import { NextResponse } from 'next/server';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { apiError, readJsonObject, assertTrustedMutation } from '@/server/api';

export const dynamic = 'force-dynamic';

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
    if (!['approve-binding', 'approve-site', 'reject-site', 'request-site', 'request-site-release', 'cancel-site-release', 'reject', 'unbind'].includes(action)) {
      return NextResponse.json({ error: 'Unsupported binding action.' }, { status: 400 });
    }
    const config = getRuntimeConfig();
    const result = await upstreamRequest(config.apiBaseUrl, `/v1/contractor/binding-requests/${bindingId}/action`, session, {
      method: 'POST',
      body: JSON.stringify({
        action,
        siteId: Number(body.siteId) || undefined,
        siteIds: Array.isArray(body.siteIds) ? body.siteIds.map(Number).filter(Number.isInteger) : undefined,
      }),
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'The binding could not be updated.');
  }
}
