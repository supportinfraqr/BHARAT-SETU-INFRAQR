import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { UpstreamError, upstreamRequest } from '@/server/http';

export const dynamic = 'force-dynamic';

/**
 * "Seed defaults" for the letter-template library.
 *
 * The appointment letter and the statutory Form XV HTML live in exactly one
 * place — the backend snapshot `bss_core/seeds/letter_defaults.py` — so this
 * route only forwards to the backend restore endpoint. It deliberately carries
 * no template HTML of its own; hand-maintained copies here drifted apart from
 * the seeded templates.
 *
 *   ?overwrite=false  -> additive: add the all-India defaults if missing
 *   ?overwrite=true   -> exact: reproduce the code snapshot (prunes extras)
 */
export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`letter-templates-seed:${session.sessionId}`, 10, 60_000);
    const config = getRuntimeConfig();

    const { searchParams } = new URL(request.url);
    const overwrite = searchParams.get('overwrite') === 'true';
    const mode = overwrite ? 'reset' : 'ensure';

    const result = await upstreamRequest<{
      success?: boolean; created?: number; updated?: number;
      pruned?: number; total?: number;
    }>(config.apiBaseUrl, '/v1/admin/letter-templates/restore-defaults', session, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });

    const created = result?.created ?? 0;
    const changed = (result?.updated ?? 0) + (result?.pruned ?? 0);

    return NextResponse.json({
      success: true,
      createdCount: created,
      message: overwrite
        ? `Restored the default letter library from code (${created} created, ${result?.updated ?? 0} updated, ${result?.pruned ?? 0} removed, ${result?.total ?? 0} total).`
        : changed === 0 && created === 0
          ? 'The default letter library is already in place — nothing to do.'
          : `Seeded missing default letter templates (${created} created, ${result?.total ?? 0} total).`,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof UpstreamError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400, headers: { 'Cache-Control': 'private, no-store' } });
    }
    return apiError(error, 'Seeding letter templates failed.');
  }
}
