import { NextResponse } from 'next/server';
import { apiError, assertTrustedMutation } from '@/server/api';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('Worker');
    const { id } = await context.params;
    const config = getRuntimeConfig();
    const result = await upstreamRequest(
      config.apiBaseUrl,
      `/v1/worker/documents/${encodeURIComponent(id)}`,
      session,
      { method: 'DELETE' },
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiError(error, 'Document could not be deleted.');
  }
}
