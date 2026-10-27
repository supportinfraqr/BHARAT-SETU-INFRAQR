"use client";

import { Download } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import { Async, Badge, Btn, DataTable, Empty, Kpi, Row, Section, fmtDate, fmtDateTime, money, num, useAction, useLoad, type Notify } from '../../ui';
import type { EmployeeTdsRecord, HraDetails, ProofItem, RegimeCompare, SaveResult, TaxReport } from './types';

const PROOF_LABEL: Record<string, string> = { pending: 'Not submitted', submitted: 'Submitted · awaiting HR', approved: 'Approved', rejected: 'Rejected' };

export function ProofStatus({ record }: { record: EmployeeTdsRecord }) {
  const status = record.proofStatus ?? 'pending';
  const items = record.proofItems ?? [];
  return <Section title="Proof verification" subtitle="HR reviews each declared line and may accept a different amount"
    right={<Badge status={status}>{PROOF_LABEL[status] ?? status}</Badge>}>
    <div className="p-4 space-y-2">
      {record.proofRemarks && <div className={`rounded-xl px-3 py-2 text-xs ${status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}><b>HR remarks:</b> {record.proofRemarks}</div>}
      {record.proofReviewedAt && <Row label="Last reviewed" value={fmtDateTime(record.proofReviewedAt)} />}
      <Row label="Declaration status" value={record.isLocked ? <Badge status="locked">Frozen</Badge> : <Badge status="active">Open for edits</Badge>} />
    </div>
    {items.length > 0 && <>
      <div className="md:hidden divide-y divide-gray-100">
        {items.map((p: ProofItem, i) => <div key={p._id ?? `${p.lineKey}-${i}`} className="px-4 py-3 space-y-1">
          <div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold text-gray-900">{p.deductionHead || p.lineKey}</p><Badge status={p.status} /></div>
          <p className="text-[11px] text-gray-500">{p.sectionName}</p>
          <div className="flex justify-between text-xs"><span className="text-gray-500">Requested {money(p.requestedAmount)}</span><span className="font-semibold">Accepted {money(p.acceptedAmount)}</span></div>
          {p.remark && <p className="text-[11px] text-gray-600">Remark: {p.remark}</p>}
        </div>)}
      </div>
      <div className="hidden md:block">
        <DataTable rows={items} rowKey={(p, i) => p._id ?? `${p.lineKey}-${i}`} columns={[
          { key: 'sectionName', label: 'Section' },
          { key: 'deductionHead', label: 'Deduction head', render: p => p.deductionHead || p.lineKey },
          { key: 'requestedAmount', label: 'Requested', align: 'right', render: p => money(p.requestedAmount) },
          { key: 'acceptedAmount', label: 'Accepted', align: 'right', render: p => money(p.acceptedAmount) },
          { key: 'status', label: 'Status', render: p => <Badge status={p.status} /> },
          { key: 'remark', label: 'Remark', render: p => p.remark || '—' },
        ]} />
      </div>
    </>}
  </Section>;
}

function RegimeColumn({ title, r, recommended }: { title: string; r: RegimeCompare; recommended: boolean }) {
  const e = r.exemptionsBasedOnDeclaration;
  return <div className={`rounded-xl border p-3 space-y-1.5 ${recommended ? 'border-green-300 bg-green-50/40' : 'border-gray-200'}`}>
    <div className="flex items-center justify-between"><p className="text-sm font-semibold">{title}</p>{recommended && <Badge status="approved">Recommended</Badge>}</div>
    {e && <div className="space-y-1 pb-1">
      <Row label="Allowance exemptions (HRA)" value={money(e.allowanceExemptions)} />
      <Row label="Under section 16" value={money(e.underSection16)} />
      <Row label={`80C (max ${money(e.investments80CMaxLimit)})`} value={money(e.investments80C)} />
      <Row label="80D" value={money(e.investments80D)} />
      <Row label="Other investments & exemptions" value={money(e.otherInvestmentAndExemption)} />
    </div>}
    <Row label="Total exemptions" value={money(r.totalExemptions)} />
    <Row label="Taxable income" value={money(r.totalTaxableIncome)} />
    <Row label="Tax on taxable income" value={money(r.taxOnTotalTaxableIncome)} />
    <Row label="Rebate u/s 87A" value={money(r.rebateUnderSection87A)} />
    <Row label="Health & education cess (4%)" value={money(r.educationCess4Percent)} />
    <Row label="Total tax payable" value={money(r.totalTaxPayable)} tone="text-gray-950 text-sm" />
  </div>;
}

export function CompareResult({ result }: { result: SaveResult }) {
  const c = result.saveAndCompare;
  const p = result.tdsPreview;
  const a = result.aggregates;
  return <Section title="Old vs new regime" subtitle={c ? `Based on your saved declaration · FY ${c.financialYear}` : 'Latest saved declaration'}>
    <div className="p-4 space-y-3">
      {p && <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="Regime applied" value={p.taxRegime === 'old' ? 'Old' : 'New'} />
        <Kpi label="Taxable income" value={money(p.taxableIncome)} />
        <Kpi label="Annual tax" value={money(p.annualTax)} />
        <Kpi label="Monthly TDS" value={money(p.monthlyTDS)} tone="text-[var(--color-bss-interactive-blue)]" />
      </div>}
      {c ? <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Row label="Gross salary" value={money(c.earnings.grossSalary)} />
          <Row label="Other income" value={money(c.earnings.incomeFromOtherSources)} />
          <Row label="Gross total income" value={money(c.earnings.grossTotalIncome)} />
        </div>
        <div className="rounded-xl bg-blue-50 text-blue-800 text-xs px-3 py-2">
          The <b>{c.recommendedRegime === 'old' ? 'old' : 'new'} regime</b> saves you <b>{money(c.taxSavingAmount)}</b> this year.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RegimeColumn title="Old regime" r={c.oldRegime} recommended={c.recommendedRegime === 'old'} />
          <RegimeColumn title="New regime" r={c.newRegime} recommended={c.recommendedRegime === 'new'} />
        </div>
      </> : <Empty title="Comparison unavailable" text="Your employee profile could not be loaded for the comparison." />}
      {a && <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Row label="80C (capped)" value={money(a.section80C)} />
        <Row label={`80D${a.section80DMaxLimit ? ` (max ${money(a.section80DMaxLimit)})` : ''}`} value={money(a.section80D)} />
        <Row label={`Sec 24${a.section24MaxLimit ? ` (max ${money(a.section24MaxLimit)})` : ''}`} value={money(a.section24)} />
        <Row label="Other deductions" value={money(a.otherDeductions)} />
        <Row label="80C lines" value={a.lines80C} />
        <Row label="80D lines" value={a.lines80D} />
        <Row label="Rent periods" value={a.rentEntries} />
        <Row label="Other lines" value={a.otherInvestmentLines} />
      </div>}
    </div>
  </Section>;
}

const DEDUCTION_LABELS: Record<string, string> = {
  standardDeduction: 'Standard deduction', professionalTax: 'Professional tax', section80C: '80C', section80CCC: '80CCC', section80CCD1: '80CCD(1)',
  section80CCD1B: '80CCD(1B)', section80CCD2: '80CCD(2)', section80D: '80D', section80DD: '80DD', section80DDB: '80DDB', section80E: '80E',
  section80EE: '80EE', section80EEA: '80EEA', section80G: '80G', section80GG: '80GG', section80GGA: '80GGA', section80GGC: '80GGC',
  section80TTA: '80TTA', section80TTB: '80TTB', section80U: '80U', section24: 'Sec 24(b) home loan interest', otherDeductions: 'Other deductions',
};

const SECTION10_LABELS: Record<string, string> = {
  childrenEducation: 'Children education', hostel: 'Hostel allowance', disabledTransport: 'Transport (disability)', lta: 'LTA',
  gratuity: 'Gratuity', leaveEncashment: 'Leave encashment', retrenchment: 'Retrenchment', vrs: 'VRS', officialDuty: 'Official duty', lifeInsurance: 'Life insurance',
};

export function Computation({ record }: { record: EmployeeTdsRecord }) {
  if (record.isNew || !record.taxPayable) {
    return <Section title="My TDS computation"><Empty title="No computation yet" text="Save your investment declaration. HR's TDS calculation for the year will appear here." /></Section>;
  }
  const inc = record.projectedAnnualIncome;
  const tax = record.taxPayable;
  const hra = record.hraExemption;
  const dd = record.declaredDeductions ?? {};
  const s10 = (record.section10Exemptions ?? {}) as Record<string, unknown>;
  const deductionRows = Object.entries(DEDUCTION_LABELS).map(([k, label]) => ({ k, label, v: Number(dd[k]) || 0 })).filter(r => r.v > 0);
  const s10Rows = Object.entries(SECTION10_LABELS).map(([k, label]) => ({ k, label, v: Number(s10[k]) || 0 })).filter(r => r.v > 0);
  const months = record.incomeBreakdown?.months ?? [];
  const paid = record.monthlyDeductions ?? [];
  return <div className="space-y-3">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Kpi label="Regime" value={record.taxRegime === 'old' ? 'Old regime' : 'New regime'} />
      <Kpi label="Taxable income" value={money(record.taxableIncome)} />
      <Kpi label="Annual tax" value={money(tax.total)} sub={record.rebateApplicable ? `87A rebate ${money(record.rebateAmount)}` : undefined} />
      <Kpi label="Monthly TDS" value={money(record.monthlyTDS)} tone="text-[var(--color-bss-interactive-blue)]" sub={record.totalTDSDeducted ? `Deducted so far ${money(record.totalTDSDeducted)}` : undefined} />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Section title="Projected annual income">
        <div className="p-4 space-y-1.5">
          <Row label="Basic" value={money(inc?.basic)} />
          <Row label="HRA" value={money(inc?.hra)} />
          <Row label="Other allowances" value={money(inc?.allowances)} />
          <Row label="Other income (declared)" value={money(inc?.otherIncome)} />
          {!!inc?.loanPerquisite && <Row label="Loan perquisite" value={money(inc.loanPerquisite)} />}
          <Row label="Total income" value={money(inc?.total)} tone="text-sm" />
        </div>
      </Section>
      <Section title="Exemptions & deductions">
        <div className="p-4 space-y-1.5">
          {hra && <Row label={`HRA exemption${hra.isMetro ? ' (metro)' : ''}`} value={money(hra.exemptAmount)} />}
          {s10Rows.map(r => <Row key={r.k} label={`Sec 10 · ${r.label}`} value={money(r.v)} />)}
          {deductionRows.map(r => <Row key={r.k} label={r.label} value={money(r.v)} />)}
          <Row label="Total deductions applied" value={money(dd.total)} tone="text-sm" />
        </div>
      </Section>
    </div>

    {hra && hra.rentPaid > 0 && <Section title="HRA exemption working" subtitle="Exempt amount is the least of the three">
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <Row label="Actual HRA received" value={money(hra.actualHRA)} />
        <Row label="Rent paid" value={money(hra.rentPaid)} />
        <Row label="Rent − 10% of basic" value={money(hra.rentMinusTenPercent)} />
        <Row label={`${hra.isMetro ? '50' : '40'}% of basic`} value={money(hra.percentOfBasic)} />
        <Row label="Exempt amount" value={money(hra.exemptAmount)} tone="text-green-700" />
      </div>
    </Section>}

    <Section title="Tax calculation" subtitle="Slab-wise">
      <DataTable rows={tax.slabBreakdown ?? []} rowKey={(_, i) => String(i)} empty="No slab breakdown" columns={[
        { key: 'range', label: 'Income slab', render: r => `${money(r.incomeFrom)} – ${r.incomeTo ? money(r.incomeTo) : 'above'}` },
        { key: 'rate', label: 'Rate', align: 'right', render: r => `${num(r.rate)}%` },
        { key: 'taxableAmount', label: 'Taxable', align: 'right', render: r => money(r.taxableAmount) },
        { key: 'tax', label: 'Tax', align: 'right', render: r => money(r.tax) },
      ]} />
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <Row label="Income tax" value={money(tax.incomeTax)} />
        <Row label={`Surcharge${tax.surchargeRate ? ` (${num(tax.surchargeRate)}%)` : ''}`} value={money(tax.surcharge)} />
        <Row label={`Cess (${num(tax.cessRate ?? 4)}%)`} value={money(tax.cess)} />
        {record.rebateApplicable && <Row label="Rebate u/s 87A" value={`− ${money(record.rebateAmount)}`} />}
        <Row label="Total tax payable" value={money(tax.total)} tone="text-sm" />
      </div>
    </Section>

    {record.fullYearComparison && record.fullYearComparison.totalIncome > 0 && <Section title="Your period vs full financial year" subtitle={record.tdsPeriod?.start ? `TDS period ${fmtDate(record.tdsPeriod.start)} – ${fmtDate(record.tdsPeriod.end)} (${num(record.tdsPeriod.equivalentMonths)} months)` : undefined}>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <Row label="Full-year gross" value={money(record.fullYearComparison.gross)} />
        <Row label="Full-year taxable income" value={money(record.fullYearComparison.taxableIncome)} />
        <Row label="Full-year tax" value={money(record.fullYearComparison.taxPayable)} />
        <Row label="Full-year monthly TDS" value={money(record.fullYearComparison.monthlyTDS)} />
      </div>
    </Section>}

    {months.length > 0 && <Section title="Month-wise salary counted">
      <DataTable rows={months} rowKey={(m, i) => `${m.label}-${i}`} columns={[
        { key: 'label', label: 'Month', render: m => <>{m.label}{m.partial && <span className="ml-1 text-[10px] text-orange-600">partial</span>}</> },
        { key: 'days', label: 'Days', align: 'right', render: m => `${m.applicableDays}/${m.daysInMonth}` },
        { key: 'amount', label: 'Salary', align: 'right', render: m => money(m.amount) },
      ]} />
    </Section>}

    <Section title="TDS deducted in payroll">
      <DataTable rows={paid} rowKey={(m, i) => `${m.month}-${m.year}-${i}`} empty="No TDS deducted in payroll yet" columns={[
        { key: 'period', label: 'Month', render: m => `${m.month} ${m.year}` },
        { key: 'tdsDeducted', label: 'TDS', align: 'right', render: m => money(m.tdsDeducted) },
      ]} />
    </Section>
  </div>;
}

export function HraPanel({ employeeId, financialYear }: { employeeId: string; financialYear: string }) {
  const state = useLoad(() => pe.get<HraDetails>(`tds/hra-details/${employeeId}`, { financialYear }), [employeeId, financialYear]);
  return <Section title="HRA from your salary" subtitle="Used for the HRA exemption on rent you declare">
    <Async state={state}>{d => <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      <Row label="Monthly HRA" value={money(d.hraReceived.monthlyAmount)} />
      <Row label={`Annual HRA (${num(d.hraReceived.payrollMonths)} months)`} value={money(d.hraReceived.annualAmount)} />
      <Row label="Source" value={d.hraReceived.component ? `${d.hraReceived.component.name || d.hraReceived.component.code} salary component` : 'Estimated (40% of gross)'} />
      {d.hraReceived.component && <Row label="Calculation" value={`${d.hraReceived.component.calculationType}${d.hraReceived.component.value ? ` · ${num(d.hraReceived.component.value)}${d.hraReceived.component.calculationType === 'percentage' ? '%' : ''}` : ''}${d.hraReceived.component.basedOn ? ` of ${d.hraReceived.component.basedOn}` : ''}`} />}
    </div>}</Async>
  </Section>;
}

export function TaxReportPanel({ financialYear, notify }: { financialYear: string; notify: Notify }) {
  const state = useLoad(() => pe.get<TaxReport>('tds/tax-report', { financialYear }), [financialYear]);
  const { busy, run } = useAction(notify);
  const download = () => run(() => pe.download('tds/tax-report/download', { financialYear }, `Tax_Report_${financialYear}.pdf`));
  return <Async state={state}>{r => <div className="space-y-3">
    <Section title={`Tax report · ${r.financialYearLabel || r.financialYear}`} subtitle={`${r.assessmentYear} · ${r.periodDescription}`}
      right={r.tdsCalculated ? <Btn variant="secondary" busy={busy} onClick={download}><Download size={14} />PDF</Btn> : undefined}>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <Row label="Employee" value={`${r.employee.employeeName}${r.employee.employeeCode ? ` · ${r.employee.employeeCode}` : ''}`} />
        <Row label="PAN" value={r.employee.pan || '—'} />
        {r.employee.designation && <Row label="Designation" value={r.employee.designation} />}
        <Row label="Payroll months processed" value={r.payrollMonthsProcessed} />
        <Row label="Proof status" value={<Badge status={r.proofStatus.proofStatus}>{PROOF_LABEL[r.proofStatus.proofStatus] ?? r.proofStatus.proofStatus}</Badge>} />
        <Row label="Generated" value={fmtDateTime(r.generatedOn)} />
      </div>
      {!r.tdsCalculated && <Empty title="TDS not calculated yet" text={r.message} />}
    </Section>
    {r.tdsCalculated && r.summary && r.income && r.taxComputation && r.tdsDeductions && <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total tax" value={money(r.summary.totalTax)} sub={r.summary.taxRegimeLabel} />
        <Kpi label="Monthly TDS" value={money(r.summary.monthlyTDS)} />
        <Kpi label="TDS deducted" value={money(r.summary.totalTDSDeducted)} tone="text-green-700" />
        <Kpi label="Pending TDS" value={money(r.summary.pendingTDS)} tone="text-orange-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Section title="Income from salary">
          <div className="p-4 space-y-1.5">
            <Row label="Basic" value={money(r.income.basic)} />
            <Row label="HRA" value={money(r.income.hra)} />
            <Row label="Allowances" value={money(r.income.allowances)} />
            <Row label="Other income" value={money(r.income.otherIncome)} />
            <Row label="Gross salary" value={money(r.income.grossSalary)} />
            <Row label="Rent paid" value={money(r.income.rentPaid)} />
            <Row label="HRA exemption" value={money(r.income.hraExemption)} />
            <Row label="Standard deduction" value={money(r.income.standardDeduction)} />
            <Row label="Professional tax" value={money(r.income.professionalTax)} />
            <Row label="Income chargeable under salary" value={money(r.income.incomeFromSalary)} tone="text-sm" />
          </div>
        </Section>
        <Section title="Tax computation">
          <div className="p-4 space-y-1.5">
            {r.chapter6A && <>
              <Row label="80C" value={money(r.chapter6A.section80C)} />
              <Row label="80D" value={money(r.chapter6A.section80D)} />
              <Row label="80E" value={money(r.chapter6A.section80E)} />
              <Row label="80G" value={money(r.chapter6A.section80G)} />
              <Row label="Sec 24" value={money(r.chapter6A.section24)} />
              <Row label="Other deductions" value={money(r.chapter6A.otherDeductions)} />
              <Row label="Total Chapter VI-A" value={money(r.chapter6A.totalChapter6A)} />
            </>}
            <Row label="Taxable income" value={money(r.taxComputation.taxableIncome)} />
            <Row label="Income tax" value={money(r.taxComputation.incomeTax)} />
            <Row label="Surcharge" value={money(r.taxComputation.surcharge)} />
            <Row label="Cess" value={money(r.taxComputation.cess)} />
            {r.taxComputation.rebateApplicable && <Row label="Rebate u/s 87A" value={money(r.taxComputation.rebateAmount)} />}
            <Row label="Net tax liability" value={money(r.taxComputation.netTaxLiability)} tone="text-sm" />
          </div>
        </Section>
      </div>
      <Section title="TDS deducted" subtitle="Quarter-wise and month-wise">
        <DataTable rows={r.tdsDeductions.quarterly} rowKey={q => q.quarter} columns={[
          { key: 'quarter', label: 'Quarter' }, { key: 'period', label: 'Period' },
          { key: 'tdsDeducted', label: 'TDS', align: 'right', render: q => money(q.tdsDeducted) },
        ]} />
        <DataTable rows={r.tdsDeductions.monthWise} rowKey={(m, i) => `${m.month}-${m.year}-${i}`} empty="No monthly TDS deducted yet" columns={[
          { key: 'period', label: 'Month', render: m => `${m.month} ${m.year}` },
          { key: 'tdsDeducted', label: 'TDS', align: 'right', render: m => money(m.tdsDeducted) },
        ]} />
      </Section>
    </>}
  </div>}</Async>;
}
