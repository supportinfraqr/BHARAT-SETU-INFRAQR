import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getOperationsSnapshot, performOperationsAction } from '@/server/operations';
import { requireApiSession } from '@/server/session';
import type { OperationsAction } from '@/types/operations';

export const dynamic = 'force-dynamic';

function parseAction(body: Record<string, unknown>): OperationsAction {
  if (body.action === 'command' && typeof body.command === 'string') return { action:'command', command:body.command };
  if (body.action === 'probe-service' && typeof body.id === 'string') return { action:'probe-service', id:body.id };
  if (body.action === 'ticket' && typeof body.id === 'string' && ['claim','monitor','resolve','escalate'].includes(String(body.transition))) {
    return { action:'ticket', id:body.id, transition:body.transition as 'claim' | 'monitor' | 'resolve' | 'escalate' };
  }
  if (body.action === 'case' && typeof body.id === 'string' && ['claim','wait','resolve','escalate'].includes(String(body.transition))) {
    return { action:'case', id:body.id, transition:body.transition as 'claim' | 'wait' | 'resolve' | 'escalate' };
  }
  throw Object.assign(new Error('The requested operation is invalid.'), { status:422 });
}

export async function GET() {
  try {
    const session = await requireApiSession();
    const data = await getOperationsSnapshot(session);
    return NextResponse.json({ data }, { headers:{ 'Cache-Control':'private, no-store, max-age=0' } });
  } catch (error) {
    return apiError(error, 'Operations data could not be loaded.');
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession();
    assertRateLimit(`operations:${session.sessionId}`, 30, 60_000);
    const action = parseAction(await readJsonObject(request, 16_000));
    const result = await performOperationsAction(session, action);
    const data = await getOperationsSnapshot(session);
    return NextResponse.json({ result, data }, { headers:{ 'Cache-Control':'private, no-store, max-age=0' } });
  } catch (error) {
    return apiError(error, 'The operations action could not be completed.');
  }
}
