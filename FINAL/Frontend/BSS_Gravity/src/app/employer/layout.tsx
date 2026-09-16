import EmployerShell from '@/components/employer/EmployerShell';
import { EmployerProvider } from '@/contexts/EmployerContext';
import { EmployerAccessibilityEffects } from '@/components/accessibility/PortalAccessibility';
import { getEmployerPortal } from '@/server/portal';
import { requireSession } from '@/server/session';

export default async function EmployerLayout({ children }: { children:React.ReactNode }) {
  const session = await requireSession('Employer');
  const employer = await getEmployerPortal(session);
  return <EmployerProvider initialData={employer}><EmployerAccessibilityEffects /><EmployerShell>{children}</EmployerShell></EmployerProvider>;
}
