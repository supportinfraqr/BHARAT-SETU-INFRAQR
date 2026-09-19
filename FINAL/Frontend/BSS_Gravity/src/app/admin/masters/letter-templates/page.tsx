import LetterTemplatesPage from '@/components/admin/LetterTemplatesPage';
import { requireSession } from '@/server/session';

export default async function AdminLetterTemplatesPage() {
  await requireSession('BSS Admin');
  return <LetterTemplatesPage />;
}
