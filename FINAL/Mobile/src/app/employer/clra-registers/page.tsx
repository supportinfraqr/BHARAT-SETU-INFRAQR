import ClraRegistersPage from '@/components/employer/ClraRegistersPage';
import { requireSession } from '@/server/session';

export default async function EmployerClraRegistersPage() {
  await requireSession('Employer');
  return <ClraRegistersPage/>;
}
