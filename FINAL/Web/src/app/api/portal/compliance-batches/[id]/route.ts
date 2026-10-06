import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamStream } from '@/server/http';
import { portalRolePath } from '@/server/role-path';
import { requireApiSession } from '@/server/session';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function streamHeaders(upstream: Response): Headers {
  const headers = new Headers();
  for (const name of ['Content-Type', 'Content-Length', 'Content-Disposition']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  return headers;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession();
    const { id } = await context.params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Batch ID is required.' }, { status: 400 });
    }

    const config = getRuntimeConfig();
    const upstream = await upstreamStream(
      config.apiBaseUrl,
      `/v1/${portalRolePath(session.role)}/compliance-batches/${encodeURIComponent(id)}/file`,
      session,
    );

    return new Response(upstream.body, { status: 200, headers: streamHeaders(upstream) });
  } catch (error) {
    return apiError(error, 'Download could not be completed.');
  }
}
