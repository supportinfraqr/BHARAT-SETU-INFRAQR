import { requireSession } from '@/server/session';
import TranslationSettingsPage from '@/components/admin/TranslationSettingsPage';

export default async function AdminTranslationSettingsPage() {
  await requireSession('BSS Admin');
  return <TranslationSettingsPage />;
}
