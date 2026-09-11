import GovernmentShell from '@/components/government/GovernmentShell';
import { GovernmentProvider } from '@/contexts/GovernmentContext';
import { getGovernmentPortal } from '@/server/portal';
import { requireSession } from '@/server/session';

export default async function GovernmentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession('Government');
  const data = await getGovernmentPortal(session);
  return <GovernmentProvider initialData={data}><GovernmentShell>{children}</GovernmentShell></GovernmentProvider>;
}
