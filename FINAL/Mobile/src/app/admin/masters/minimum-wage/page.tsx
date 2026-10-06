import MasterCrudPage from '@/components/admin/MasterCrudPage';

import { requireSession } from '@/server/session';

export default async function AdminMinimumWagePage() {
  await requireSession('BSS Admin');
  return <MasterCrudPage configKey="minimum-wage"/>;
}
