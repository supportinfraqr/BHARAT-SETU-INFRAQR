"use client";

/**
 * Salary & statement — legacy employee/salarySummary, employee/annualSalaryStatement?financialYear=
 * and (read-only) employee/:ownId/payrollInfo.
 */

import { useState } from 'react';
import { Printer } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, DataTable, Empty, FinancialYearPicker, Kpi, Row, Section, currentFinancialYear, fmtDate, money, num, useLoad } from '../ui';

type SalarySummary = {
  currentMonth: { month: string; year: number; grossEarnings: number; totalDeductions: number; netPay: number; payStatus: string };
  yearToDate: { year: number; totalGross: number; totalDeductions: number; totalNetPay: number; monthsProcessed: number };
};
type Line = { componentName: string; amount: number };
type MonthRow = {
  payrollId: string; month: string; year: number; basicSalary: number; grossEarnings: number; totalDeductions: number; netPay: number;
  payStatus: string; processedDate: string | null; workingDays: number; presentDays: number; paidDays: number; lopDays: number; earnings: Line[]; deductions: Line[];
};
type Statement = {
  organization: { name: string; address: unknown; logo: string };
  employee: { id: string; name: string; code: string; email: string; department: string; designation: string };
  financialYear: string; financialYearCanonical: string; financialYearLabel: string;
  period: { from: string; to: string; description: string };
  monthlyBreakdown: MonthRow[];
  annualSummary: { totalGross: number; totalDeductions: number; totalNetPay: number; monthsProcessed: number; expectedMonths: number; averageMonthlyGross: number; averageMonthlyNetPay: number };
  componentTotals: { earnings: Line[]; deductions: Line[] };
};
type PayrollInfo = {
  employee: { id: string; name: string; email: string };
  payrollInfo: Record<string, unknown> & { baseSalary?: number; grossSalary?: number; ctc?: number; paymentFrequency?: string; currency?: string; taxRegime?: string; variablePay?: number; incentives?: number; salaryEffectiveFrom?: string | null; department?: string; designation?: string };
  payrollPreferences: Record<string, unknown> & { paymentMode?: string; holdSalary?: boolean; holdReason?: string; loanDeduction?: number; advanceDeduction?: number };
  taxInfo: Record<string, unknown>;
  bankInfo: Record<string, unknown> & { bankName?: string; branchName?: string; ifscCode?: string; bankAccountNumber?: string; accountHolderName?: string; accountType?: string; isVerified?: boolean };
  statutoryInfo: Record<string, unknown> & { pfAccountNumber?: string; uan?: string; esiNumber?: string; esiApplicable?: boolean; ptApplicable?: boolean; ptState?: string; epfApplicable?: boolean; gratuityApplicable?: boolean; lwfApplicable?: boolean };
};

const mask = (v?: string) => (v && v.length > 4 ? `•••• ${v.slice(-4)}` : v || '—');
const yesNo = (v: unknown) => (v === undefined || v === null ? '—' : v ? 'Yes' : 'No');

export default function MySalary({ ctx, params }: ModuleProps) {
  const [fy, setFy] = useState(params.financialYear || currentFinancialYear());
  const summary = useLoad(() => pe.get<SalarySummary>('employee/salarySummary'), []);
  const statement = useLoad(() => pe.get<Statement>('employee/annualSalaryStatement', { financialYear: fy }), [fy]);
  const me = ctx.employee?._id ?? '';
  const info = useLoad(() => (me ? pe.get<PayrollInfo>(`employee/${me}/payrollInfo`).catch(() => null) : Promise.resolve(null)), [me]);

  return <div className="space-y-4">
    <Async state={summary}>{s => <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi label={`Net pay · ${s.currentMonth.month} ${s.currentMonth.year}`} value={money(s.currentMonth.netPay)} sub={<Badge status={s.currentMonth.payStatus} />} />
      <Kpi label="Gross this month" value={money(s.currentMonth.grossEarnings)} sub={`Deductions ${money(s.currentMonth.totalDeductions)}`} />
      <Kpi label={`YTD net (${s.yearToDate.year})`} value={money(s.yearToDate.totalNetPay)} sub={`${s.yearToDate.monthsProcessed} month(s)`} tone="text-green-700" />
      <Kpi label="YTD gross" value={money(s.yearToDate.totalGross)} sub={`Deductions ${money(s.yearToDate.totalDeductions)}`} />
    </div>}</Async>

    <Section title="Annual salary statement" subtitle={statement.data?.period.description ?? 'Indian financial year, April to March'}
      right={<><FinancialYearPicker value={fy} onChange={setFy} /><Btn variant="secondary" onClick={() => window.print()} aria-label="Print statement"><Printer size={14} /></Btn></>}>
      <Async state={statement}>{st => <StatementView st={st} />}</Async>
    </Section>

    {info.data && <SalaryProfile info={info.data} />}
  </div>;
}

function StatementView({ st }: { st: Statement }) {
  const a = st.annualSummary;
  return <div className="p-4 space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Row label="Employer" value={st.organization.name} />
      <Row label="Employee" value={`${st.employee.name}${st.employee.code ? ` · ${st.employee.code}` : ''}`} />
      {st.employee.designation && <Row label="Designation" value={st.employee.designation} />}
      {st.employee.department && <Row label="Department" value={st.employee.department} />}
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi label="Total gross" value={money(a.totalGross)} sub={`Avg ${money(a.averageMonthlyGross)}/month`} />
      <Kpi label="Total deductions" value={money(a.totalDeductions)} tone="text-red-600" />
      <Kpi label="Total net pay" value={money(a.totalNetPay)} sub={`Avg ${money(a.averageMonthlyNetPay)}/month`} tone="text-green-700" />
      <Kpi label="Months processed" value={`${a.monthsProcessed} / ${a.expectedMonths}`} />
    </div>
    {st.monthlyBreakdown.length === 0 ? <Empty title={`No payroll in ${st.financialYearLabel}`} text="Pick another financial year above." /> : <>
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <DataTable rows={st.monthlyBreakdown} rowKey={r => String(r.payrollId)} columns={[
          { key: 'period', label: 'Month', render: r => <span className="font-semibold">{r.month} {r.year}</span> },
          { key: 'days', label: 'Paid / working days', render: r => `${num(r.paidDays, 1)} / ${num(r.workingDays, 1)}${r.lopDays ? ` · LOP ${num(r.lopDays, 1)}` : ''}` },
          { key: 'basicSalary', label: 'Basic', align: 'right', render: r => money(r.basicSalary) },
          { key: 'grossEarnings', label: 'Gross', align: 'right', render: r => money(r.grossEarnings) },
          { key: 'totalDeductions', label: 'Deductions', align: 'right', render: r => money(r.totalDeductions) },
          { key: 'netPay', label: 'Net pay', align: 'right', render: r => <b>{money(r.netPay)}</b> },
          { key: 'payStatus', label: 'Status', render: r => <Badge status={r.payStatus} /> },
          { key: 'processedDate', label: 'Processed', render: r => fmtDate(r.processedDate) },
        ]} footer={<tr><td className="px-3 py-2" colSpan={3}>Total</td><td className="px-3 py-2 text-right">{money(a.totalGross)}</td><td className="px-3 py-2 text-right">{money(a.totalDeductions)}</td><td className="px-3 py-2 text-right">{money(a.totalNetPay)}</td><td colSpan={2} /></tr>} />
      </div>
      <details className="rounded-xl border border-gray-100">
        <summary className="px-4 py-2 text-xs font-semibold text-gray-700 cursor-pointer">Month-wise component breakdown</summary>
        <div className="divide-y divide-gray-100">{st.monthlyBreakdown.map(m => <div key={String(m.payrollId)} className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <p className="sm:col-span-2 text-xs font-bold">{m.month} {m.year}</p>
          <ul className="space-y-1">{m.earnings.map((e, i) => <li key={e.componentName + i} className="flex justify-between text-[11px]"><span>{e.componentName}</span><span>{money(e.amount)}</span></li>)}</ul>
          <ul className="space-y-1">{m.deductions.map((e, i) => <li key={e.componentName + i} className="flex justify-between text-[11px] text-red-600"><span>{e.componentName}</span><span>{money(e.amount)}</span></li>)}</ul>
        </div>)}</div>
      </details>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Totals title="Earnings — annual totals" lines={st.componentTotals.earnings} />
        <Totals title="Deductions — annual totals" lines={st.componentTotals.deductions} tone="text-red-600" />
      </div>
    </>}
  </div>;
}

function Totals({ title, lines, tone }: { title: string; lines: Line[]; tone?: string }) {
  return <div className="rounded-xl border border-gray-100">
    <p className="px-4 py-2 text-xs font-semibold text-gray-600 border-b border-gray-100">{title}</p>
    {lines.length ? <ul className="px-4 py-2 space-y-1">{lines.map(l => <li key={l.componentName} className="flex justify-between text-xs"><span>{l.componentName}</span><span className={`font-semibold ${tone ?? ''}`}>{money(l.amount)}</span></li>)}</ul> : <Empty title="None" />}
  </div>;
}

function SalaryProfile({ info }: { info: PayrollInfo }) {
  const p = info.payrollInfo ?? {};
  const pref = info.payrollPreferences ?? {};
  const b = info.bankInfo ?? {};
  const s = info.statutoryInfo ?? {};
  return <Section title="My salary profile" subtitle="Read-only. Ask your employer's payroll team to correct anything here.">
    <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500">Pay</p>
        <Row label="Annual CTC" value={money(p.ctc)} />
        <Row label="Monthly gross" value={money(p.grossSalary)} />
        <Row label="Basic salary" value={money(p.baseSalary)} />
        {Number(p.variablePay) > 0 && <Row label="Variable pay" value={money(p.variablePay)} />}
        {Number(p.incentives) > 0 && <Row label="Incentives" value={money(p.incentives)} />}
        <Row label="Pay frequency" value={p.paymentFrequency || '—'} />
        <Row label="Tax regime" value={p.taxRegime || '—'} />
        {p.salaryEffectiveFrom && <Row label="Salary effective from" value={fmtDate(p.salaryEffectiveFrom)} />}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500">Bank & payment</p>
        <Row label="Payment mode" value={String(pref.paymentMode || '—').replace(/_/g, ' ')} />
        <Row label="Bank" value={b.bankName || '—'} />
        <Row label="Account" value={mask(b.bankAccountNumber)} />
        <Row label="IFSC" value={b.ifscCode || '—'} />
        <Row label="Account holder" value={b.accountHolderName || '—'} />
        <Row label="Verified" value={yesNo(b.isVerified)} />
        {pref.holdSalary && <Row label="Salary on hold" value={pref.holdReason || 'Yes'} tone="text-red-600" />}
        {Number(pref.loanDeduction) > 0 && <Row label="Loan deduction / month" value={money(pref.loanDeduction)} />}
        {Number(pref.advanceDeduction) > 0 && <Row label="Advance deduction / month" value={money(pref.advanceDeduction)} />}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500">Statutory</p>
        <Row label="UAN" value={s.uan || '—'} />
        <Row label="PF account" value={s.pfAccountNumber || '—'} />
        <Row label="EPF applicable" value={yesNo(s.epfApplicable)} />
        <Row label="ESI number" value={s.esiNumber || '—'} />
        <Row label="ESI applicable" value={yesNo(s.esiApplicable)} />
        <Row label="Professional tax" value={s.ptApplicable ? (s.ptState || 'Yes') : yesNo(s.ptApplicable)} />
        <Row label="LWF applicable" value={yesNo(s.lwfApplicable)} />
        <Row label="Gratuity applicable" value={yesNo(s.gratuityApplicable)} />
      </div>
    </div>
  </Section>;
}
