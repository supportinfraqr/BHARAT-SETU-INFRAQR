import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

/** Stream a party licence document (owner or staff). */
export async function GET(_request: Request, context: Context) {
  try {
    const session = await requireApiSession();
    const { id } = await context.params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'Invalid licence.' }, { status: 400 });
    const config = getRuntimeConfig();
    const upstream = await upstreamStream(config.apiBaseUrl, `/v1/party-licenses/${id}/file`, session);
    const headers = new Headers();
    for (const name of ['Content-Type', 'Content-Length', 'Content-Disposition']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('Cache-Control', 'private, no-store');
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return apiError(error, 'The licence could not be loaded.');
  }
}
