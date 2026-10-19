import { NextResponse } from 'next/server';
import { createDispatch, listDispatches } from '@/server/medical/store';

export const dynamic = 'force-dynamic';

/** GET ?state=X → send history for a state (newest first, without HTML). */
export async function GET(req: Request) {
  const state = new URL(req.url).searchParams.get('state') ?? undefined;
  const list = await listDispatches({ state });
  return NextResponse.json({ dispatches: list.map(d => ({ ...d, html: undefined })) });
}

/** POST { state, employerId, siteIds[], note? } → push the locked form to those sites. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { state?: string; employerId?: string; siteIds?: string[]; note?: string } | null;
  if (!body?.state || !body.employerId || !Array.isArray(body.siteIds)) return NextResponse.json({ error: 'state, employerId and siteIds are required.' }, { status: 400 });
  try {
    const d = { ...await createDispatch({ state: body.state, employerId: body.employerId, siteIds: body.siteIds, note: body.note, by: 'BSS Staff' }), html: undefined };
    return NextResponse.json({ dispatch: d });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not send the form.' }, { status: 422 });
  }
}
