import MasterCrudPage from '@/components/admin/MasterCrudPage';

import { requireSession } from '@/server/session';

export default async function AdminRegisterDocPage() {
  await requireSession('BSS Admin');
  return <MasterCrudPage configKey="register-doc"/>;
}
