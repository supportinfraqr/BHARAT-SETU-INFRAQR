import { NextResponse } from 'next/server';
import { getStateForm, listStateForms, resetStateForm, saveStateForm } from '@/server/medical/store';

export const dynamic = 'force-dynamic';

/** GET → summary of all 36 state / UT forms · GET ?state=X → that form with its HTML. */
export async function GET(req: Request) {
  const state = new URL(req.url).searchParams.get('state');
  if (state) return NextResponse.json({ form: await getStateForm(state) });
  return NextResponse.json({ forms: await listStateForms() });
}

/** PUT { state, html, status: 'draft' | 'frozen' } → save edits / lock a version. */
export async function PUT(req: Request) {
  const body = await req.json().catch(() => null) as { state?: string; html?: string; status?: 'draft' | 'frozen' } | null;
  if (!body?.state || typeof body.html !== 'string' || !['draft', 'frozen'].includes(body.status ?? '')) return NextResponse.json({ error: 'state, html and status are required.' }, { status: 400 });
  if (body.html.length > 2_000_000) return NextResponse.json({ error: 'Form HTML is too large.' }, { status: 413 });
  return NextResponse.json({ form: await saveStateForm(body.state, body.html, body.status!, 'BSS Staff') });
}

/** DELETE ?state=X → restore the default replica of the Gazette form. */
export async function DELETE(req: Request) {
  const state = new URL(req.url).searchParams.get('state');
  if (!state) return NextResponse.json({ error: 'state is required.' }, { status: 400 });
  return NextResponse.json({ form: await resetStateForm(state) });
}
