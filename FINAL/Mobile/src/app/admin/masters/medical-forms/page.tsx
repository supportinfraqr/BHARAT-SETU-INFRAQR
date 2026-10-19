import MedicalFormStudio from '@/components/employer/medical/MedicalFormStudio';
import { requireSession } from '@/server/session';

export default async function AdminMedicalFormsPage() {
  await requireSession('BSS Admin');
  return <MedicalFormStudio />;
}
