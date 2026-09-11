import { NextResponse } from 'next/server';
import { getSession, requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { apiError, readJsonObject, assertTrustedMutation } from '@/server/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ data: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const config = getRuntimeConfig();
    const data = await upstreamRequest(config.apiBaseUrl, '/v1/bindings/', session);
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Contractor binding requests could not be loaded.');
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession().catch(() => null);
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const body = await readJsonObject(request);
    const bindingId = Number(body.id ?? body.bindingId);
    const action = String(body.action ?? '').toLowerCase();

    if (!Number.isInteger(bindingId) || bindingId <= 0) {
      return NextResponse.json({ error: 'Binding ID is required.' }, { status: 400 });
    }
    if (action === 'accept' || action === 'decline') {
      const config = getRuntimeConfig();
      if (action === 'accept') {
        const result = await upstreamRequest(config.apiBaseUrl, `/v1/bindings/${bindingId}/consent`, session, {
          method: 'POST',
          body: JSON.stringify({ stage: 'APP' }),
        });
        return NextResponse.json(result);
      }
      const result = await upstreamRequest(config.apiBaseUrl, `/v1/bindings/${bindingId}/`, session, {
        method: 'PATCH',
        body: JSON.stringify({ binding_status: 'REJECTED' }),
      });
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: 'Unsupported binding action.' }, { status: 400 });
  } catch (error) {
    return apiError(error, 'The binding request could not be updated.');
  }
}