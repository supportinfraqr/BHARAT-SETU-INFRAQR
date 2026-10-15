import MasterCrudPage from '@/components/admin/MasterCrudPage';

import { requireSession } from '@/server/session';

export default async function AdminLicensePage() {
  await requireSession('BSS Admin');
  return <MasterCrudPage configKey="license"/>;
}
