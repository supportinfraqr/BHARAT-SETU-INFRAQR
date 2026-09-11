import MasterCrudPage from '@/components/admin/MasterCrudPage';

import { requireSession } from '@/server/session';

export default async function AdminLwfPage() {
  await requireSession('BSS Admin');
  return <MasterCrudPage configKey="lwf"/>;
}
