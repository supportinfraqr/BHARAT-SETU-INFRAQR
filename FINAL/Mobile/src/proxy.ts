import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, decryptSession } from '@/server/session-token';

const ROLE_PATHS: Record<string, string> = {
  Worker: 'worker',
  Contractor: 'contractor',
  Employer: 'employer',
  'BSS Admin': 'admin',
  'BSS Staff': 'bss-staff',
  Government: 'government',
};

// Visiting "/" while already signed in goes straight to the role portal before
// any render, so an authenticated user never sees (or flashes) the login page.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== '/') return NextResponse.next();
  const value = request.cookies.get(SESSION_COOKIE)?.value;
  const session = value ? decryptSession(value) : null;
  const path = session ? ROLE_PATHS[session.role] : undefined;
  if (path) return NextResponse.redirect(new URL(`/${path}`, request.url));
  return NextResponse.next();
}

export const config = { matcher: '/' };
