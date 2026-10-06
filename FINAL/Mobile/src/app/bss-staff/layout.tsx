import SupportShell from '@/components/support/SupportShell';
import { requireSession } from '@/server/session';

export default async function BssStaffLayout({ children }: { children: React.ReactNode }) {
  await requireSession('BSS Staff');
  return <SupportShell label="BSS Staff" nav="/bss-staff">{children}</SupportShell>;
}
