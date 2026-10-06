import { NextResponse } from 'next/server';
import { configurationErrors, getDataMode } from '@/server/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const errors = configurationErrors();
  return NextResponse.json({ status:errors.length ? 'degraded' : 'ok', dataMode:getDataMode(), checks:{ configuration:errors.length ? errors : 'ok' }, timestamp:new Date().toISOString() }, { status:errors.length ? 503 : 200 });
}

