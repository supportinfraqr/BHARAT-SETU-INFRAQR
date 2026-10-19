import { NextResponse } from 'next/server';
import { listDirectory } from '@/server/medical/store';

export const dynamic = 'force-dynamic';

/** Employers with their sites and site states, for the "send to" picker. */
export async function GET() {
  return NextResponse.json({ employers: await listDirectory() });
}
