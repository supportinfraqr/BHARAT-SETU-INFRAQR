import RegisterTemplatesPage from '@/components/admin/RegisterTemplatesPage';
import { requireSession } from '@/server/session';

export default async function AdminRegisterTemplatePage() {
  await requireSession('BSS Admin');
  return <RegisterTemplatesPage/>;
}
