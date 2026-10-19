import { redirect } from 'next/navigation';
import { requireSession } from '@/server/session';

export default async function ContractorAuditReportsRedirect() {
  await requireSession('Contractor');
  redirect('/contractor/compliance?tab=report');
}
