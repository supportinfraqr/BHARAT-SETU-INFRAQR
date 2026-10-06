"use client";

import { Banknote, Calculator, Clock3, IndianRupee, Landmark, PiggyBank, ShieldCheck, TriangleAlert, UserRound, UsersRound } from 'lucide-react';
import { Kpi, StatusPill, Section, money, recordStatusTone } from '@/components/payroll/common';
import { totalsOf, workerVsEmployer, formatInr } from '@/lib/payroll/payrollService';
import type { PayrollStore } from '@/components/payroll/store';

export default function OverviewModule({ store, go }: { store: PayrollStore; go: (tab: string) => void }) {
  const records = store.visibleRecords();
  const totals = totalsOf(records);
  const split = workerVsEmployer(records);
  const pending = records.filter(r => ['Draft', 'Reviewed', 'Submitted'].includes(r.status)).length;
  const processed = records.filter(r => r.status === 'Verified').length;
  const exceptionRows = records.filter(r => r.status === 'Exception' || r.status === 'Returned' || (r.errors && r.errors.length > 0));
  const conflicts = records.filter(r => r.matchState === 'Needs Review').length;
  const unmapped = store.role === 'Employer' ? records.filter(r => !r.contractor).length : 0;
  const pendingApprovals = store.approvals.filter(a => a.status === 'Pending').length;
  const pendingPayments = Object.values(store.payments).filter(p => p.status === 'Not Yet Paid' || p.status === 'Pending').length;
  const actionCount = pending + exceptionRows.length + conflicts + pendingApprovals + pendingPayments + (store.role === 'Admin' ? 0 : 0);

  const roleIntro: Record<string, string> = {
    Contractor: `Contractor Payroll for ${store.orgName} — operates on the workers bound to this contractor.`,
    Employer: `Employer Payroll for ${store.orgName} — the full workforce across sites and contractors.`,
    Admin: 'BSS Admin system-wide Payroll oversight — read across Employers, Sites, Contractors and Workers. No separate Payroll database.',
  };

  const deductionLines = [
    { label: 'EPF (employee)', amount: totals.statutory.epfEmployee, color: 'bg-blue-600' },
    { label: 'ESI (employee)', amount: totals.statutory.esiEmployee, color: 'bg-emerald-600' },
    { label: 'Professional Tax', amount: totals.statutory.pt, color: 'bg-orange-500' },
    { label: 'LWF (employee)', amount: totals.statutory.lwfEmployee, color: 'bg-purple-600' },
    { label: 'TDS', amount: totals.statutory.tds, color: 'bg-red-500' },
    { label: 'Other deductions', amount: split.worker.other, color: 'bg-gray-500' },
  ];

  const employerCostLines = [
    { label: 'Worker gross pay', amount: totals.gross },
    { label: 'EPS (employer)', amount: totals.statutory.eps },
    { label: 'EPF (employer balance)', amount: totals.statutory.epfEmployer },
    { label: 'ESI (employer)', amount: totals.statutory.esiEmployer },
    { label: 'EDLI + Admin', amount: totals.statutory.edli + totals.statutory.admin },
    { label: 'LWF (employer)', amount: totals.statutory.lwfEmployer },
  ];

  return <div className="space-y-6">
    <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-900">{roleIntro[store.role]}{store.role === 'Admin' && <span className="mt-1 block font-semibold">Demo snapshot · Employer/Contractor seeded records merged at Worker × Period — same records the portals operate on.</span>}</div>

    {/* Primary measures */}
    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <Kpi label="Total gross pay" value={money(totals.gross)} sub={`${totals.workers} record(s)`} icon={Calculator} tone="bg-gray-50 text-gray-700" />
      <Kpi label="Total net pay" value={money(totals.net)} sub="paid to workers" icon={IndianRupee} tone="bg-green-50 text-bss-green" />
      <Kpi label="Statutory deductions" value={money(totals.statutory.epfEmployee + totals.statutory.esiEmployee + totals.statutory.pt + totals.statutory.lwfEmployee + totals.statutory.tds)} sub="worker side" icon={Landmark} tone="bg-orange-50 text-orange-600" />
      <Kpi label="Employer contributions" value={money(totals.employerContributions)} sub="EPS · EPF · ESI · LWF · EDLI" icon={PiggyBank} tone="bg-blue-50 text-blue-700" />
      <Kpi label="Workers processed" value={processed} sub={`${pending} pending`} icon={UserRound} tone="bg-green-50 text-green-700" />
      <Kpi label="Exceptions / review" value={exceptionRows.length + conflicts} sub={`${pendingApprovals} approvals · ${pendingPayments} payments`} icon={TriangleAlert} tone="bg-red-50 text-red-600" />
    </section>

    {/* Action required */}
    <Section title="Action required" subtitle={`${actionCount} payroll item(s) need attention — every chip opens the relevant module`}>
      <div className="p-5 flex flex-wrap gap-2">
        <ActionChip label={`${pending} worker record(s) pending payroll`} onClick={() => go('workerPayroll')} tone="orange" />
        {exceptionRows.length > 0 && <ActionChip label={`${exceptionRows.length} exception(s) / returned records`} onClick={() => go('exceptions')} tone="red" />}
        {conflicts > 0 && <ActionChip label={`${conflicts} source conflict(s) — review required`} onClick={() => go('exceptions')} tone="red" />}
        {store.role === 'Employer' && unmapped > 0 && <ActionChip label={`${unmapped} unmapped worker(s) — mapping required`} onClick={() => go('distribution')} tone="red" />}
        {pendingApprovals > 0 && <ActionChip label={`${pendingApprovals} pending approval(s)`} onClick={() => go('approvals')} tone="blue" />}
        {pendingPayments > 0 && <ActionChip label={`${pendingPayments} payment(s) not yet paid`} onClick={() => go('payments')} tone="blue" />}
        <ActionChip label="Create a pay run" onClick={() => go('runs')} tone="navy" />
        <ActionChip label="Payroll setup & statutory configuration" onClick={() => go('setup')} tone="navy" />
      </div>
    </Section>

    <div className="grid lg:grid-cols-2 gap-5">
      {/* Payroll cost summary */}
      <Section title="Payroll cost summary" subtitle="Net pay · taxes · contributions over the current payroll records">
        <div className="p-5 grid sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-gray-100 p-3"><dt className="text-gray-400">Net pay</dt><dd className="font-bold text-bss-green text-base mt-1">{formatInr(totals.net)}</dd></div>
          <div className="rounded-xl border border-gray-100 p-3"><dt className="text-gray-400">Worker statutory (EPF/ESI/PT/LWF/TDS)</dt><dd className="font-bold text-orange-600 text-base mt-1">{formatInr(totals.statutory.epfEmployee + totals.statutory.esiEmployee + totals.statutory.pt + totals.statutory.lwfEmployee + totals.statutory.tds)}</dd></div>
          <div className="rounded-xl border border-gray-100 p-3"><dt className="text-gray-400">Employer contributions</dt><dd className="font-bold text-blue-700 text-base mt-1">{formatInr(totals.employerContributions)}</dd></div>
          <div className="rounded-xl border border-gray-100 p-3"><dt className="text-gray-400">Total employer cost</dt><dd className="font-bold text-gray-900 text-base mt-1">{formatInr(totals.employerCost)}</dd></div>
        </div>
      </Section>

      {/* Deduction breakdown */}
      <Section title="Deduction breakdown" subtitle="Configured statutory + other deductions (worker side)">
        <div className="p-5 space-y-2.5 text-xs">
          {deductionLines.map(line => (
            <div key={line.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-gray-600"><span className={`w-2.5 h-2.5 rounded-full ${line.color}`} />{line.label}</span>
              <strong className="text-gray-800">{formatInr(line.amount)}</strong>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900"><span>Total deductions</span><span>{formatInr(totals.employeeDeductions)}</span></div>
        </div>
      </Section>
    </div>

    {/* Total employer cost */}
    <Section title="Total employer cost" subtitle="Worker gross + employer-paid statutory contributions — worker and employer values are kept separate">
      <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {employerCostLines.map(line => (
          <div key={line.label} className="rounded-xl border border-gray-100 p-3"><dt className="text-gray-400">{line.label}</dt><dd className="font-semibold text-gray-800 mt-1 text-sm">{formatInr(line.amount)}</dd></div>
        ))}
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3"><dt className="text-blue-700/70 font-semibold">Total employer cost</dt><dd className="font-bold text-[#073B67] mt-1 text-lg">{formatInr(totals.employerCost)}</dd></div>
      </div>
    </Section>

    {/* Role workforce overview */}
    <Section title={store.role === 'Admin' ? 'Workforce overview (all employers)' : 'Workforce overview'} subtitle="Workers in payroll scope by employer · contractor · site">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100"><tr>
            <th className="px-5 py-3">Worker</th><th className="px-5 py-3">BSS ID</th>{store.role === 'Admin' || store.role === 'Employer' ? <th className="px-5 py-3">Contractor</th> : null}<th className="px-5 py-3">Site</th><th className="px-5 py-3">Employer</th><th className="px-5 py-3">Designation</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {store.workers.map(w => (
              <tr key={w.bssId} className="hover:bg-gray-50">
                <td className="px-5 py-2.5 font-semibold text-gray-900">{w.name}</td>
                <td className="px-5 py-2.5 font-mono text-gray-500">{w.bssId}</td>
                {store.role === 'Admin' || store.role === 'Employer' ? <td className="px-5 py-2.5 text-gray-600">{w.contractor || <span className="font-bold text-red-600">MAPPING REQUIRED</span>}</td> : null}
                <td className="px-5 py-2.5 text-gray-600">{w.site}</td>
                <td className="px-5 py-2.5 text-gray-600">{w.employer}</td>
                <td className="px-5 py-2.5 text-gray-600">{w.designation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>

    {/* Quick stats strip */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
      <SummaryChip icon={UsersRound} label="Records (filtered)" value={String(records.length)} />
      <SummaryChip icon={ShieldCheck} label="Verified records" value={String(processed)} />
      <SummaryChip icon={Clock3} label="Pending records" value={String(pending)} />
      <SummaryChip icon={Banknote} label="Pending approvals / payments" value={String(pendingApprovals + pendingPayments)} />
    </div>
  </div>;
}

function ActionChip({ label, onClick, tone }: { label: string; onClick: () => void; tone: 'orange' | 'red' | 'blue' | 'navy' }) {
  const map = { orange: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100', red: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100', blue: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100', navy: 'border-gray-900 bg-gray-950 text-white hover:bg-black' };
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition ${map[tone]}`}>{label}</button>;
}

function SummaryChip({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <div className="rounded-xl bg-white border border-gray-200 p-3 flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg bg-gray-50 text-gray-500 grid place-items-center"><Icon size={15}/></span><div><p className="text-gray-400">{label}</p><strong className="block text-gray-900 mt-0.5">{value}</strong></div></div>;
}
