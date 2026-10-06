import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest, upstreamStream } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    const session = await requireApiSession('Employer');
    const { id } = await ctx.params;
    const config = getRuntimeConfig();
    const isPdf = new URL(request.url).searchParams.get('format') === 'pdf';
    if (isPdf) {
      const upstream = await upstreamStream(
        config.apiBaseUrl,
        `/v1/employer/submissions/${encodeURIComponent(id)}/ai-report.pdf`,
        session,
      );
      const headers = new Headers();
      for (const name of ['Content-Type', 'Content-Length', 'Content-Disposition']) {
        const value = upstream.headers.get(name);
        if (value) headers.set(name, value);
      }
      headers.set('Cache-Control', 'private, no-store');
      return new Response(upstream.body, { status: 200, headers });
    }
    const result = await upstreamRequest(
      config.apiBaseUrl,
      `/v1/employer/submissions/${encodeURIComponent(id)}/ai-report`,
      session,
    );
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'The audit report could not be generated.');
  }
}
