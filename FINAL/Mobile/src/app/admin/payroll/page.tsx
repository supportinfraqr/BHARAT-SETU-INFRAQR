import PayrollWorkspace from '@/components/payroll/PayrollWorkspace';
import { getAdminPayrollSnapshot } from '@/server/payroll-admin';
import { requireSession } from '@/server/session';

/** BSS Admin Payroll — supervisory oversight of the SAME Worker payroll records.
 *  Admin does NOT own a separate payroll database. */
export default async function AdminPayrollPage() {
  const session = await requireSession('BSS Admin');
  const snapshot = await getAdminPayrollSnapshot(session);
  return <div className="relative">
    <div aria-hidden className="pointer-events-none select-none absolute inset-0 z-[60] overflow-hidden">
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-x-20 gap-y-28 -rotate-[24deg] scale-[1.6]">
        {Array.from({ length: 14 }).map((_, i) => <span key={i} className="text-2xl sm:text-3xl font-black uppercase tracking-[0.28em] text-black/5 whitespace-nowrap">Under Development</span>)}
      </div>
    </div>
    <PayrollWorkspace role="Admin" portal={snapshot} />
  </div>;
}
