import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession().catch(() => null);
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    assertRateLimit(`binding-scan:${session.sessionId}`, 30, 60_000);
    const body = await readJsonObject(request);
    const type = typeof body.type === 'string' ? body.type : '';
    if (!['BSS_EMPLOYER', 'BSS_CONTRACTOR', 'BSS_SITE', 'BSS_WORKER'].includes(type)) {
      return NextResponse.json({ error: 'Unsupported QR.' }, { status: 400 });
    }
    const config = getRuntimeConfig();
    const offeredWage = Number(body.offeredWage);
    const result = await upstreamRequest(config.apiBaseUrl, '/v1/bindings/scan', session, {
      method: 'POST',
      body: JSON.stringify({
        type,
        bssId: typeof body.bssId === 'string' ? body.bssId : '',
        siteToken: typeof body.siteToken === 'string' ? body.siteToken : '',
        site: typeof body.site === 'string' ? body.site : '',
        offeredWage: Number.isFinite(offeredWage) && offeredWage > 0 ? offeredWage : undefined,
        costSheetId: Number.isFinite(Number(body.costSheetId)) && Number(body.costSheetId) > 0 ? Number(body.costSheetId) : undefined,
        siteIds: Array.isArray(body.siteIds) ? body.siteIds.filter(id => Number.isInteger(id)) : [],
        source: typeof body.source === 'string' ? body.source : undefined,
        preview: body.preview === true,
      }),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiError(error, 'Binding request could not be created.');
  }
}
