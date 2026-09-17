import GateScanConsole from '@/components/gate/GateScanConsole';
import { requireSession } from '@/server/session';

export default async function ContractorGateScanPage() {
  await requireSession('Contractor');
  return <GateScanConsole/>;
}
