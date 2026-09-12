import { NextResponse } from 'next/server';
import {
  deriveMigrationType,
  normalizeMobilityPayload,
  type MobilityPayload,
} from '@/lib/mobility';
import { requireApiSession } from '@/server/session';
import { mutatePortal } from '@/server/portal';
import { apiError } from '@/server/api';

function isPayload(value: unknown): value is MobilityPayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const isAddress = (address: unknown) => Boolean(address && typeof address === 'object' &&
    ['line', 'state', 'district', 'city', 'locality', 'pin'].every(key => typeof (address as Record<string, unknown>)[key] === 'string'));
  return ['email', 'mobile', 'alternateMobile'].every(key => typeof candidate[key] === 'string') &&
    isAddress(candidate.currentAddress) && isAddress(candidate.permanentAddress);
}

export async function PUT(request: Request) {
  const session = await requireApiSession('Worker').catch(() => null);
  if (!session) return NextResponse.json({ error:'Authentication required.' }, { status:401 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (!isPayload(body)) return NextResponse.json({ error: 'Invalid mobility profile payload.' }, { status: 400 });

  const normalized = normalizeMobilityPayload(body);
  const fieldErrors: Record<string, string> = {};
  if (Object.keys(fieldErrors).length) {
    return NextResponse.json({ error: 'Please correct the highlighted mobility information.', fieldErrors }, { status: 422 });
  }

  const migrationType = deriveMigrationType(
    normalized.permanentAddress.state,
    normalized.permanentAddress.district,
    normalized.currentAddress.state,
    normalized.currentAddress.district,
  );
  const data = { ...normalized, migrationType, migrant: migrationType !== 'Non-Migrant / Local' };
  try { await mutatePortal(session,'profile',{method:'PATCH',body:JSON.stringify({section:'mobility',values:data})}); return NextResponse.json({success:true,data}); } catch(error){return apiError(error,'Mobility profile could not be saved.');}
}
