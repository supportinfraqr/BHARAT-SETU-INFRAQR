import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { getSession } from '@/server/session';
import { isValidBSSID } from '@/lib/bssId';

type Context = { params: Promise<{ bssId: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    const { bssId } = await params;
    const contractorId = /^(?:BSS-?C[A-Z0-9]{10,11}|BSSC\d{12})$/.test(bssId);
    const employerId = /^(?:BSS-?E[A-Z0-9]{10,11}|BSSE\d{12})$/.test(bssId);
    if (!isValidBSSID(bssId) && !contractorId && !employerId) {
      return NextResponse.json({ error: 'Invalid BSS ID.' }, { status: 400 });
    }
    const config = getRuntimeConfig();
    // Forward the session when present so the upstream can include the
    // extensive post-binding record for a bound viewer.
    const session = await getSession();
    const data = await upstreamRequest(config.apiBaseUrl, '/v1/identity/verify/' + encodeURIComponent(bssId), session);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiError(error, 'Identity verification is unavailable.');
  }
}