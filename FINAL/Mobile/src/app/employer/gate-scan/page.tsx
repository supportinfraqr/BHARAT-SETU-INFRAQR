import GateScanConsole from '@/components/gate/GateScanConsole';
import { requireSession } from '@/server/session';

export default async function EmployerGateScanPage() {
  await requireSession('Employer');
  return <GateScanConsole/>;
}
