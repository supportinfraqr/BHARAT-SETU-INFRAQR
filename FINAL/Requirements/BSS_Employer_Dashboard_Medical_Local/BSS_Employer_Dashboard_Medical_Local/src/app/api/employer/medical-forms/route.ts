import { NextResponse } from 'next/server';
import { listDispatches } from '@/server/medical/store';

export const dynamic = 'force-dynamic';

/** Forms BSS has issued to this employer (newest first, with rendered HTML).
 *  Production: take the employer from the session instead of ?employerId. */
export async function GET(req: Request) {
  const employerId = new URL(req.url).searchParams.get('employerId');
  if (!employerId) return NextResponse.json({ error: 'employerId is required.' }, { status: 400 });
  return NextResponse.json({ dispatches: await listDispatches({ employerId }) });
}
