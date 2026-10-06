import { NextResponse } from 'next/server';
import { isSafeNotificationHref } from '@/lib/notifications';
import { requireApiSession, getSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { upstreamRequest } from '@/server/http';
import { apiError } from '@/server/api';
import { mutatePortal } from '@/server/portal';
import { portalRolePath } from '@/server/role-path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ data: [], syncedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const config = getRuntimeConfig();

    const data = await upstreamRequest(config.apiBaseUrl, `/v1/${portalRolePath(session.role)}/notifications`, session);
    return NextResponse.json({ data, syncedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Notifications could not be loaded.');
  }
}

export async function PATCH(request: Request) {
  const session = await requireApiSession().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid notification update.' }, { status: 400 });
  const { id, action, href } = body as Record<string, unknown>;
  if (typeof id !== 'string' || !id.trim()) return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
  if (!['read', 'unread', 'resolve'].includes(String(action))) return NextResponse.json({ error: 'Unsupported notification action.' }, { status: 400 });
  if (href !== undefined && (typeof href !== 'string' || !isSafeNotificationHref(href))) return NextResponse.json({ error: 'Unsafe notification destination.' }, { status: 400 });
  try {
    const result = await mutatePortal(session, 'notifications', { method: 'PATCH', body: JSON.stringify({ id, action }) });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'Notification could not be updated.');
  }
}