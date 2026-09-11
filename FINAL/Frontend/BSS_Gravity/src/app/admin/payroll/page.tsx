import PayrollWorkspace from '@/components/payroll/PayrollWorkspace';
import { getAdminPayrollSnapshot } from '@/server/payroll-admin';
import { requireSession } from '@/server/session';

/** BSS Admin Payroll — supervisory oversight of the SAME Worker payroll records.
 *  Admin does NOT own a separate payroll database. */
export default async function AdminPayrollPage() {
  const session = await requireSession('BSS Admin');
  const snapshot = await getAdminPayrollSnapshot(session);
  return <PayrollWorkspace role="Admin" portal={snapshot} />;
}
