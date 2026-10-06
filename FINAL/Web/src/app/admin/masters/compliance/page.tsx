import MasterCrudPage from '@/components/admin/MasterCrudPage';

import { requireSession } from '@/server/session';

export default async function AdminCompliancePage() {
  await requireSession('BSS Admin');
  return <MasterCrudPage configKey="compliance"/>;
}
