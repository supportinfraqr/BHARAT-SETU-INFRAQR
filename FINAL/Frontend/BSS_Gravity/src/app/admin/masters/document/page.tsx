import MasterCrudPage from '@/components/admin/MasterCrudPage';

import { requireSession } from '@/server/session';

export default async function AdminDocumentPage() {
  await requireSession('BSS Admin');
  return <MasterCrudPage configKey="document"/>;
}
