import { NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { apiError } from '@/server/api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const config = getRuntimeConfig();
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get('pin')?.trim();
  if (pin && !/^\d{6}$/.test(pin)) return NextResponse.json({ error: 'PIN must contain exactly six digits.' }, { status: 400 });
  try {
    return NextResponse.json(await upstreamRequest(config.apiBaseUrl, `/v1/reference/geography${pin ? `?pin=${encodeURIComponent(pin)}` : ''}`, null));
  } catch (error) {
    return apiError(error, 'Geographic reference could not be loaded.');
  }
}