import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation, readJsonObject } from '@/server/api';
import { mutatePortal } from '@/server/portal';
import { requireApiSession } from '@/server/session';
import { validatePortalMutation } from '@/server/portal-validation';

const resourcesByRole = {
  Worker: new Set(['profile','notifications','documents','grievances','availability','leave','applications','advances','gratuity','bank-verify','card-orders','settings','courses']),
  Contractor: new Set(['workers','compliances','salaries','gate-passes','applications','job-postings','attendance','leave','site-calendar','worker-compliance','advances','submissions','benefits','grievances','profile','notifications','settings']),
  Employer: new Set(['contractors','workers','sites','approvals','gate-passes','compliances','submissions','reports','grievances','profile','notifications','settings']),
  'BSS Admin': new Set(['notifications','settings','bindings']),
  'BSS Staff': new Set(['notifications','settings','bindings','documents','workers']),
  Government: new Set(['notifications','settings']),
} as const;
type Context = { params: Promise<{ resource:string }> };

async function mutate(request: Request, context: Context, method: 'POST' | 'PATCH' | 'DELETE') {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession();
    const { resource } = await context.params;
    if (!resourcesByRole[session.role].has(resource)) return NextResponse.json({ error:'You do not have access to this portal resource.' }, { status:403 });
    assertRateLimit(`portal:${session.sessionId}:${resource}`, 60, 60_000);
    const body = method === 'DELETE' ? undefined : await readJsonObject(request, 128_000);
    validatePortalMutation(session.role, resource, method, body);
    const result = await mutatePortal(session, resource, { method, body:body ? JSON.stringify(body) : undefined });
    return NextResponse.json(result, { status:method === 'POST' ? 201 : 200, headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error, 'Portal update could not be completed.'); }
}

export function POST(request: Request, context: Context) { return mutate(request, context, 'POST'); }
export function PATCH(request: Request, context: Context) { return mutate(request, context, 'PATCH'); }
export function DELETE(request: Request, context: Context) { return mutate(request, context, 'DELETE'); }
