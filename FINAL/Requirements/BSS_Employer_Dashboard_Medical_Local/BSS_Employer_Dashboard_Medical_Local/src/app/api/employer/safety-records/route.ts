import { NextResponse } from 'next/server';
import { listSafety, saveSafety } from '@/server/medical/store';
import type { SafetyRecord } from '@/components/employer/medical/types';

export const dynamic = 'force-dynamic';

/** GET ?workers=id1,id2 → { records: { [workerId]: SafetyRecord } }. */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get('workers') ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 2000);
  return NextResponse.json({ records: await listSafety(ids) });
}

/** POST SafetyRecord (partial kitItems / trainings are merged) → save. */
export async function POST(req: Request) {
  const rec = await req.json().catch(() => null) as SafetyRecord | null;
  if (!rec?.workerId) return NextResponse.json({ error: 'workerId is required.' }, { status: 400 });
  return NextResponse.json({ record: await saveSafety(rec) });
}
