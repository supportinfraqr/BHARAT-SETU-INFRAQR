import { NextResponse } from 'next/server';

/**
 * Legacy endpoint retained so older clients fail safely. Identity issuance now
 * happens only inside the verified registration workflow.
 */
export function POST() {
  return NextResponse.json(
    { error: 'Use the verified worker registration workflow to issue a BSS ID.' },
    { status: 410 },
  );
}
