import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { isValidBSSID } from '@/lib/bssId';

type Context = { params: Promise<{ bssId: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    const { bssId } = await params;
    const contractorId = /^(?:BSS-C\d{10}|BSSC\d{12})$/.test(bssId);
    const employerId = /^BSS-E\d{10}$/.test(bssId);
    if (!isValidBSSID(bssId) && !contractorId && !employerId) {
      return NextResponse.json({ error: 'Invalid BSS ID.' }, { status: 400 });
    }
    const config = getRuntimeConfig();
    const data = await upstreamRequest(config.apiBaseUrl, '/v1/identity/verify/' + encodeURIComponent(bssId), null);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiError(error, 'Identity verification is unavailable.');
  }
}