"use client";

/**
 * HR payroll dashboard (legacy controller/payroll/hrDashboard.js — GET hrDashboard?month=&year=).
 * Renders every section: summary, requests, approvals, FY cost summary, deduction breakdown,
 * department payroll, employer cost and FY CTC analysis.
 */

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Btn, DataTable, Empty, Kpi, KpiGrid, MONTHS, PeriodPicker, Section, money, useLoad } from '../ui';

type MonthRow = { month: string; year: number; label: string };
type Dashboard = {
  period: { month: string; monthFull: string; year: number; financialYear: string };
  summary: { totalGrossPay: number; totalNetPay: number; taxesWithheld: number; activeEmployees: number };
  costSummary: Array<MonthRow & { netPay: number; taxes: number; benefits: number; donations: number; deductions: number; total: number }>;
  deductionBreakdown: { total: number; items: Array<{ name: string; amount: number; percentage: number }> };
  departmentPayroll: Array<{ department: string; grossPay: number; netPay: number; employeeCount: number }>;
  employerCost: Array<{ label: string; amount: number }>;
  ctcAnalysis: Array<MonthRow & { grossPay: number; employerCost: number; netPay: number; totalCtc: number }>;
  requests: { pendingForPayroll: number; pendingForFnf: number; salaryOnHold: number; pendingForPayment: number; avatars: Array<{ employeeId: string; name: string; avatar: string | null }> };
  approvals: { approvalsPendingOnMe: number; reimbursement: number; pendingRevisions: number; pendingArrears: number };
};

/** Single-hue magnitude bar (value is always printed as text beside it). */
function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return <div className="h-2 w-full rounded-full bg-gray-100" role="img" aria-label={label} title={label}>
    <div className="h-2 rounded-full bg-[var(--color-bss-interactive-blue)]" style={{ width: `${pct}%`, minWidth: value > 0 ? 4 : 0 }} />
  </div>;
}

function ActionCard({ label, count, hint, onClick }: { label: string; count: number; hint: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="text-left rounded-2xl border border-gray-200 bg-white px-4 py-3 hover:border-blue-200 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-100">
    <p className="text-xs font-medium text-gray-500">{label}</p>
    <p className={`text-lg font-bold mt-1 ${count > 0 ? 'text-orange-600' : 'text-gray-950'}`}>{count}</p>
    <p className="text-[11px] text-[var(--color-bss-interactive-blue)] mt-0.5 inline-flex items-center gap-1">{hint}<ArrowRight size={11} /></p>
  </button>;
}

export default function HrDashboard({ navigate }: ModuleProps) {
  const now = new Date();
  const [period, setPeriod] = useState({ month: MONTHS[now.getMonth()] as string, year: now.getFullYear() });
  const state = useLoad(() => pe.get<Dashboard>('hrDashboard', { month: period.month, year: period.year }), [period.month, period.year]);

  return <div className="space-y-4">
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-950">Payroll dashboard</h2>
        <p className="text-xs text-gray-500">{state.data ? `${state.data.period.monthFull} ${state.data.period.year} · FY ${state.data.period.financialYear}` : 'Select a payroll month'}</p>
      </div>
      <PeriodPicker month={period.month} year={period.year} onChange={(month, year) => setPeriod({ month, year })} />
    </div>
    <Async state={state}>{d => <DashboardBody d={d} navigate={navigate} period={period} />}</Async>
  </div>;
}

function DashboardBody({ d, navigate, period }: { d: Dashboard; navigate: ModuleProps['navigate']; period: { month: string; year: number } }) {
  const pr = { month: period.month, year: String(period.year) };
  const maxCost = Math.max(0, ...d.costSummary.map(r => r.total));
  const maxCtc = Math.max(0, ...d.ctcAnalysis.map(r => r.totalCtc));
  const maxDept = Math.max(0, ...d.departmentPayroll.map(r => r.netPay));
  const maxEmp = Math.max(0, ...d.employerCost.map(r => r.amount));
  const noRun = d.summary.totalGrossPay === 0;

  return <div className="space-y-4">
    <KpiGrid>
      <Kpi label="Gross pay" value={money(d.summary.totalGrossPay)} sub={`${d.period.month} ${d.period.year}`} />
      <Kpi label="Net pay" value={money(d.summary.totalNetPay)} tone="text-green-700" />
      <Kpi label="Taxes withheld" value={money(d.summary.taxesWithheld)} sub="TDS + PT" />
      <Kpi label="Active employees" value={d.summary.activeEmployees} />
    </KpiGrid>
    {noRun && <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800 flex flex-wrap items-center justify-between gap-2">
      <span>No payroll has been processed for {d.period.monthFull} {d.period.year} yet.</span>
      <Btn onClick={() => navigate('payrun', pr)}>Run payroll</Btn>
    </div>}

    <Section title="Needs attention" subtitle="Requests for this period and approvals waiting on HR">
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <ActionCard label="Pending for payroll" count={d.requests.pendingForPayroll} hint="Pay runs" onClick={() => navigate('payrun', pr)} />
        <ActionCard label="Salary on hold" count={d.requests.salaryOnHold} hint="Pay runs" onClick={() => navigate('payrun', { ...pr, status: 'on_hold' })} />
        <ActionCard label="Pending for payment" count={d.requests.pendingForPayment} hint="Bank files" onClick={() => navigate('bank', pr)} />
        <ActionCard label="Pending F&F" count={d.requests.pendingForFnf} hint="Full & Final" onClick={() => navigate('fnf')} />
        <ActionCard label="Reimbursement claims" count={d.approvals.reimbursement} hint="Claims" onClick={() => navigate('claims')} />
        <ActionCard label="Salary revisions" count={d.approvals.pendingRevisions} hint="Revisions" onClick={() => navigate('revisions')} />
        <ActionCard label="Arrears to process" count={d.approvals.pendingArrears} hint="Arrears" onClick={() => navigate('arrears')} />
        <article className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium text-gray-500">Total approvals pending</p>
          <p className="text-lg font-bold mt-1 text-gray-950">{d.approvals.approvalsPendingOnMe}</p>
        </article>
      </div>
      {d.requests.avatars.length > 0 && <div className="px-4 pb-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-gray-400">Active employees:</span>
        {d.requests.avatars.map(a => <button key={a.employeeId} type="button" title={a.name} onClick={() => navigate('employees', { employeeId: a.employeeId })}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 pl-0.5 pr-2 py-0.5 text-[11px] text-gray-700 hover:bg-gray-50">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-50 text-[10px] font-bold text-[var(--color-bss-interactive-blue)]">{a.name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase() || '?'}</span>{a.name}
        </button>)}
      </div>}
    </Section>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Section title="Deduction breakdown" subtitle={`${d.period.month} ${d.period.year} · total ${money(d.deductionBreakdown.total)}`}>
        {d.deductionBreakdown.items.length === 0 ? <Empty title="No deductions this period" /> :
          <ul className="p-4 space-y-3">{d.deductionBreakdown.items.map(i => <li key={i.name}>
            <div className="flex justify-between gap-2 text-xs mb-1"><span className="text-gray-700">{i.name}</span><span className="font-semibold text-gray-900">{money(i.amount)} <span className="font-normal text-gray-400">({i.percentage}%)</span></span></div>
            <Bar value={i.amount} max={d.deductionBreakdown.items[0].amount} label={`${i.name}: ${money(i.amount)}`} />
          </li>)}</ul>}
      </Section>
      <Section title="Employer cost" subtitle={`${d.period.month} ${d.period.year}`}>
        <ul className="p-4 space-y-3">{d.employerCost.map(i => <li key={i.label}>
          <div className="flex justify-between gap-2 text-xs mb-1"><span className="text-gray-700">{i.label}</span><span className="font-semibold text-gray-900">{money(i.amount)}</span></div>
          <Bar value={i.amount} max={maxEmp} label={`${i.label}: ${money(i.amount)}`} />
        </li>)}</ul>
      </Section>
    </div>

    <Section title="Department payroll" subtitle={`${d.period.month} ${d.period.year}`} right={<Btn variant="ghost" onClick={() => navigate('reports', pr)}>Reports</Btn>}>
      <DataTable rows={d.departmentPayroll} rowKey={r => r.department} empty="No payroll processed this period" columns={[
        { key: 'department', label: 'Department' },
        { key: 'employeeCount', label: 'Employees', align: 'right' },
        { key: 'grossPay', label: 'Gross pay', align: 'right', render: r => money(r.grossPay) },
        { key: 'netPay', label: 'Net pay', align: 'right', render: r => money(r.netPay) },
        { key: 'bar', label: '', className: 'w-1/4 min-w-[100px]', render: r => <Bar value={r.netPay} max={maxDept} label={`${r.department} net pay ${money(r.netPay)}`} /> },
      ]} />
    </Section>

    <Section title="Payroll cost summary" subtitle={`FY ${d.period.financialYear} — monthly net pay, taxes, benefits, donations and deductions`}>
      <DataTable rows={d.costSummary} rowKey={r => r.label} onRowClick={r => navigate('payrun', { month: r.month, year: String(r.year) })} columns={[
        { key: 'label', label: 'Month' },
        { key: 'netPay', label: 'Net pay', align: 'right', render: r => money(r.netPay) },
        { key: 'taxes', label: 'Taxes', align: 'right', render: r => money(r.taxes) },
        { key: 'benefits', label: 'Benefits', align: 'right', render: r => money(r.benefits) },
        { key: 'donations', label: 'Donations', align: 'right', render: r => money(r.donations) },
        { key: 'deductions', label: 'Deductions', align: 'right', render: r => money(r.deductions) },
        { key: 'total', label: 'Total', align: 'right', render: r => <b>{money(r.total)}</b> },
        { key: 'bar', label: '', className: 'min-w-[100px]', render: r => <Bar value={r.total} max={maxCost} label={`${r.label} total ${money(r.total)}`} /> },
      ]} footer={<tr>
        <td className="px-3 py-2">FY total</td>
        {(['netPay', 'taxes', 'benefits', 'donations', 'deductions', 'total'] as const).map(k => <td key={k} className="px-3 py-2 text-right">{money(d.costSummary.reduce((s, r) => s + r[k], 0))}</td>)}
        <td />
      </tr>} />
    </Section>

    <Section title="CTC analysis" subtitle={`FY ${d.period.financialYear} — gross pay + employer cost = total CTC`}>
      <DataTable rows={d.ctcAnalysis} rowKey={r => r.label} columns={[
        { key: 'label', label: 'Month' },
        { key: 'grossPay', label: 'Gross pay', align: 'right', render: r => money(r.grossPay) },
        { key: 'employerCost', label: 'Employer cost', align: 'right', render: r => money(r.employerCost) },
        { key: 'netPay', label: 'Net pay', align: 'right', render: r => money(r.netPay) },
        { key: 'totalCtc', label: 'Total CTC', align: 'right', render: r => <b>{money(r.totalCtc)}</b> },
        { key: 'bar', label: '', className: 'min-w-[100px]', render: r => <Bar value={r.totalCtc} max={maxCtc} label={`${r.label} CTC ${money(r.totalCtc)}`} /> },
      ]} footer={<tr>
        <td className="px-3 py-2">FY total</td>
        {(['grossPay', 'employerCost', 'netPay', 'totalCtc'] as const).map(k => <td key={k} className="px-3 py-2 text-right">{money(d.ctcAnalysis.reduce((s, r) => s + r[k], 0))}</td>)}
        <td />
      </tr>} />
    </Section>
  </div>;
}
