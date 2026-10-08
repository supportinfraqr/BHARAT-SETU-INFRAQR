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
    const result = await upstreamRequest<{ data?: unknown[] }>(config.apiBaseUrl, '/v1/bindings/', session);
    return NextResponse.json({ data: result?.data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
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
    const config = getRuntimeConfig();

    // Send a binding OTP to the worker (non-smartphone workers dictate it to the contractor).
    if (action === 'send-otp') {
      const result = await upstreamRequest(config.apiBaseUrl, `/v1/bindings/${bindingId}/otp`, session, {
        method: 'POST',
        body: JSON.stringify({ target: 'worker' }),
      });
      return NextResponse.json(result);
    }

    const consent: Record<string, unknown> = { stage: 'APP' };
    if (action === 'accept') {
      consent.action = 'bind';
    } else if (action === 'decline') {
      consent.action = 'decline';
    } else if (action === 'accept-otp') {
      consent.action = 'bind';
      consent.stage = 'OTP';
      consent.otp = String(body.otp ?? '');
      consent.side = body.side === 'contractor' ? 'contractor' : 'worker';
    } else if (action === 'unbind') {
      consent.action = 'unbind';
      consent.stage = body.otp ? 'OTP' : 'APP';
      if (body.otp) consent.otp = String(body.otp);
      if (body.side === 'contractor' || body.side === 'worker') consent.side = body.side;
    } else if (action === 'decline-unbind') {
      consent.action = 'decline-unbind';
      if (body.side === 'contractor' || body.side === 'worker') consent.side = body.side;
    } else if (action === 'withdraw') {
      // The worker withdraws their own still-pending binding request.
      consent.action = 'withdraw';
      consent.side = 'worker';
    } else {
      return NextResponse.json({ error: 'Unsupported binding action.' }, { status: 400 });
    }

    // Offered wage captured when the contractor approves a worker-initiated
    // binding (feeds the appointment letter issued on acceptance).
    const offeredWage = Number(body.offeredWage);
    if (Number.isFinite(offeredWage) && offeredWage > 0) consent.offeredWage = offeredWage;
    // Cost sheet (employer-accepted) attached at approval — replaces manual wage.
    const costSheetId = Number(body.costSheetId);
    if (Number.isInteger(costSheetId) && costSheetId > 0) consent.costSheetId = costSheetId;

    const result = await upstreamRequest(config.apiBaseUrl, `/v1/bindings/${bindingId}/consent`, session, {
      method: 'POST',
      body: JSON.stringify(consent),
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'The binding request could not be updated.');
  }
}
