import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { getContractorPortal, getEmployerPortal, getGovernmentPortal, getWorkerPortal } from '@/server/portal';
import { getOperationsSnapshot } from '@/server/operations';
import { requireApiSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireApiSession();
    const data = session.role === 'Worker' ? await getWorkerPortal(session)
      : session.role === 'Contractor' ? await getContractorPortal(session)
      : session.role === 'Employer' ? await getEmployerPortal(session)
      : session.role === 'Government' ? await getGovernmentPortal(session)
      : await getOperationsSnapshot(session);
    return NextResponse.json({ data, role:session.role }, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Portal data could not be loaded.'); }
}
