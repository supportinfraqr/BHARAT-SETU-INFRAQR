import { redirect } from 'next/navigation';
import { getSession } from '@/server/session';
import { portalRolePath } from '@/server/role-path';
import LoginPageClient from '@/components/auth/LoginPageClient';

// The root URL is the login page for signed-out visitors. A signed-in user is
// sent straight to their role's portal so visiting "/" never shows login again.
export default async function RootPage() {
  const session = await getSession();
  if (session) redirect(`/${portalRolePath(session.role)}`);
  return <LoginPageClient />;
}
