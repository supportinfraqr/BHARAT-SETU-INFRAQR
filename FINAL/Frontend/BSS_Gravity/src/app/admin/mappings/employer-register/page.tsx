import MasterCrudPage from '@/components/admin/MasterCrudPage';

import { requireSession } from '@/server/session';

export default async function AdminEmployerRegisterPage() {
  await requireSession('BSS Admin');
  return <MasterCrudPage configKey="employer-register"/>;
}
