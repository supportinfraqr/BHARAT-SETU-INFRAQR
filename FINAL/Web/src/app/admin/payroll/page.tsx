import PayrollEngineApp from '@/components/payroll-engine/PayrollEngineApp';
import { requireSession } from '@/server/session';

/** BSS Admin Payroll — operate any contractor's / employer's payroll (org picker in the app). */
export default async function AdminPayrollPage() {
  await requireSession('BSS Admin');
  return <PayrollEngineApp mode="hr" />;
}
