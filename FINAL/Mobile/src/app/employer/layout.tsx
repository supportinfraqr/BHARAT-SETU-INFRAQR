import EmployerShell from '@/components/employer/EmployerShell';
import { EmployerProvider } from '@/contexts/EmployerContext';
import { EmployerAccessibilityEffects } from '@/components/accessibility/PortalAccessibility';
import VerificationGate from '@/components/verification/VerificationGate';
import { getEmployerPortal } from '@/server/portal';
import { requireSession } from '@/server/session';

export default async function EmployerLayout({ children }: { children:React.ReactNode }) {
  const session = await requireSession('Employer');
  const employer = await getEmployerPortal(session);
  return <EmployerProvider initialData={employer}><EmployerAccessibilityEffects /><VerificationGate role="employer" /><EmployerShell>{children}</EmployerShell></EmployerProvider>;
}
