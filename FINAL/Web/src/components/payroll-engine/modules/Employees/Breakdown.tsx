"use client";

/** Renders the POST calculatePayrollInfo result (full earnings / deductions / employer cost breakdown). */

import { Badge, DataTable, Kpi, KpiGrid, Row, money } from '../../ui';
import type { CalculatePayrollInfoResult, DeductionLine, EarningLine } from './types';

export function PayrollBreakdown({ result }: { result: CalculatePayrollInfoResult }) {
  const b = result.breakdown;
  const st = b.deductions.statutory;
  const sched = b.summary.netPaySchedule;
  return <div className="space-y-4">
    <KpiGrid>
      <Kpi label="Gross / month" value={money(b.summary.grossSalary)} sub={`Input mode: ${result.inputMode}`} />
      <Kpi label="Net pay / month" value={money(b.summary.netPay)} sub={`${b.summary.takeHomePercentage}% of gross`} tone="text-green-700" />
      <Kpi label="Deductions / month" value={money(b.summary.totalDeductions)} sub={b.deductions.totalDeductionsPeakMonth !== b.summary.totalDeductions ? `Peak month ${money(b.deductions.totalDeductionsPeakMonth)}` : undefined} />
      <Kpi label="Annual CTC" value={money(b.summary.annualCTC)} sub={`Monthly CTC ${money(b.summary.monthlyCTC)}`} />
    </KpiGrid>

    <div>
      <p className="text-xs font-semibold text-gray-700 mb-1">Earnings</p>
      <DataTable<EarningLine> rows={b.earnings.components} rowKey={(r, i) => `${r.code ?? r.name}-${i}`} columns={[
        { key: 'name', label: 'Component', render: r => <span>{r.name} {r.isOverridden && <Badge status="pending">Override</Badge>} {r.isBalancing && <Badge>Balancing</Badge>}</span> },
        { key: 'frequency', label: 'Frequency', render: r => `${r.frequency ?? 'monthly'}${r.paymentMonth ? ` (${r.paymentMonth})` : ''}` },
        { key: 'default', label: 'Org default', align: 'right', render: r => (r.defaultAmount !== undefined ? money(r.defaultAmount) : '—') },
        { key: 'amt', label: 'Monthly', align: 'right', render: r => money(r.calculatedAmount) },
        { key: 'annual', label: 'Annual', align: 'right', render: r => (r.annualAmount !== undefined ? money(r.annualAmount) : '—') },
      ]} footer={<tr><td className="px-3 py-2" colSpan={3}>Gross salary</td><td className="px-3 py-2 text-right">{money(b.earnings.grossSalary)}</td><td /></tr>} />
    </div>

    <div>
      <p className="text-xs font-semibold text-gray-700 mb-1">Employee deductions</p>
      <DataTable<DeductionLine> rows={b.deductions.components} rowKey={(r, i) => `${r.name}-${i}`} empty="No deductions" columns={[
        { key: 'name', label: 'Deduction', render: r => <span>{r.name} {r.type === 'statutory' && <Badge status="processed">Statutory</Badge>} {r.isOverridden && <Badge status="pending">Override</Badge>}</span> },
        { key: 'rate', label: 'Rate / basis', render: r => `${r.rate ?? '—'}${r.state ? ` · ${r.state}` : ''}` },
        { key: 'months', label: 'Months', render: r => (r.months ? (r.recurring ? 'Every month' : r.months.join(', ') || '—') : 'Every month') },
        { key: 'amount', label: 'Amount', align: 'right', render: r => money(r.amount) },
      ]} footer={<tr><td className="px-3 py-2" colSpan={3}>Regular month deductions</td><td className="px-3 py-2 text-right">{money(b.deductions.totalDeductions)}</td></tr>} />
    </div>

    {b.benefits.components.length > 0 && <div>
      <p className="text-xs font-semibold text-gray-700 mb-1">Benefits (part of CTC)</p>
      <DataTable<EarningLine> rows={b.benefits.components} rowKey={(r, i) => `${r.code ?? r.name}-${i}`} columns={[
        { key: 'name', label: 'Benefit' },
        { key: 'frequency', label: 'Frequency', render: r => `${r.frequency ?? 'monthly'}${r.paymentMonth ? ` (${r.paymentMonth})` : ''}` },
        { key: 'amt', label: 'Monthly', align: 'right', render: r => money(r.calculatedAmount) },
        { key: 'annual', label: 'Annual', align: 'right', render: r => money(r.annualAmount) },
      ]} />
    </div>}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700">Employer contributions (monthly)</p>
        <Row label={`EPF employer${st.epf.abryApplied ? ' (ABRY)' : ''}`} value={money(st.epf.employer)} />
        <Row label="EDLI" value={money(st.epf.edli)} />
        <Row label="PF admin charges" value={money(st.epf.adminCharges)} />
        <Row label="ESI employer" value={money(st.esi.employer)} />
        <Row label="EPF wage" value={money(st.epf.wage)} />
        <Row label="Total employer contributions" value={money(b.summary.employerContributions)} />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700">Other statutory</p>
        <Row label="Professional tax" value={money(st.professionalTax)} />
        <Row label={`LWF ${st.lwf.state ? `(${st.lwf.state})` : ''}`} value={`${money(st.lwf.employee)} employee · ${money(st.lwf.employer)} employer`} />
        <Row label="LWF cycle" value={st.lwf.cycle ? `${st.lwf.cycle} · ${st.lwf.months.join(', ') || '—'} (${st.lwf.deductionsPerYear}×/yr)` : '—'} />
        <Row label="Statutory bonus" value={b.statutoryBonus.applicable ? `${money(b.statutoryBonus.annualEquivalent)} / yr (${b.statutoryBonus.percentage}% of ${money(b.statutoryBonus.calcBase)}${b.statutoryBonus.paidInMonth ? `, paid ${b.statutoryBonus.paidInMonth}` : ''})` : 'Not applicable'} />
        <Row label="Benefits (annual)" value={money(b.benefits.totalBenefitsAnnual)} />
      </div>
    </div>

    {sched?.varies && <div>
      <p className="text-xs font-semibold text-gray-700 mb-1">Months where take-home differs from {money(sched.regular)}</p>
      <DataTable rows={sched.exceptions} rowKey={r => r.month} columns={[
        { key: 'month', label: 'Month' },
        { key: 'reason', label: 'Extra deductions' },
        { key: 'netPay', label: 'Net pay', align: 'right', render: r => money(r.netPay) },
      ]} />
    </div>}
  </div>;
}
