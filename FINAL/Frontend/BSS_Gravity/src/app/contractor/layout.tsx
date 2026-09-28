import ContractorShell from '@/components/contractor/ContractorShell';
import { ContractorProvider } from '@/contexts/ContractorContext';
import { ContractorAccessibilityEffects } from '@/components/accessibility/PortalAccessibility';
import GstVerifyGate from '@/components/gst/GstVerifyGate';
import { getContractorPortal } from '@/server/portal';
import { requireSession } from '@/server/session';

export default async function ContractorLayout({ children }: { children:React.ReactNode }) {
  const session = await requireSession('Contractor');
  const contractor = await getContractorPortal(session);
  return <ContractorProvider initialData={contractor}><ContractorAccessibilityEffects /><GstVerifyGate role="contractor" /><ContractorShell>{children}</ContractorShell></ContractorProvider>;
}
