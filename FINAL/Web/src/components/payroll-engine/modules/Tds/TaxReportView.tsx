"use client";

/** Renders the legacy tax report (`tds/tax-report/:id`, `employee/tax-report`). Shared by HR TDS and My Form 16. */

import { pe } from '@/lib/payroll-engine/api';
import { Badge, DataTable, fmtDate, fmtDateTime, Kpi, money, Row } from '../../ui';
import { deductionLabel, type InvestmentLine, type TaxReport } from './types';

function AttachmentLink({ url }: { url?: string }) {
  if (!url) return <span className="text-gray-400">—</span>;
  return <a href={pe.fileUrl(url)} target="_blank" rel="noreferrer" className="text-[var(--color-bss-interactive-blue)] underline">View</a>;
}

function Lines({ title, lines }: { title: string; lines: InvestmentLine[] }) {
  if (!lines?.length) return null;
  return <div>
    <h4 className="text-xs font-semibold text-gray-700 mb-1">{title}</h4>
    <DataTable rows={lines} rowKey={(_, i) => String(i)} columns={[
      { key: 'investmentType', label: 'Investment', render: r => r.investmentType || '—' },
      { key: 'amount', label: 'Amount', align: 'right', render: r => money(r.amount) },
      { key: 'attachment', label: 'Proof', render: r => <AttachmentLink url={r.attachment} /> },
    ]} />
  </div>;
}

export function TaxReportView({ report }: { report: TaxReport }) {
  const s = report.summary;
  return <div className="space-y-4">
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600 flex flex-wrap gap-x-6 gap-y-1">
      <span><b className="text-gray-800">{report.employee.employeeName || '—'}</b> · {report.employee.employeeCode || '—'}</span>
      <span>PAN: {report.employee.pan || '—'}</span>
      <span>{report.employee.designation || ''}</span>
      <span>{report.financialYearLabel} · {report.assessmentYear}</span>
      <span>{report.periodDescription}</span>
      <span>Generated {fmtDateTime(report.generatedOn)}</span>
    </div>

    {!report.tdsCalculated && <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">{report.message || 'TDS not calculated for this financial year.'}</div>}

    {s && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Kpi label="Gross income" value={money(s.grossIncome)} sub={s.taxRegimeLabel} />
      <Kpi label="Taxable income" value={money(s.taxableIncome)} />
      <Kpi label="Total tax (year)" value={money(s.totalTax)} sub={s.rebateApplicable ? `87A rebate ${money(s.rebateAmount)}` : undefined} />
      <Kpi label="Monthly TDS" value={money(s.monthlyTDS)} sub={s.isLocked ? 'Declaration locked' : undefined} />
      <Kpi label="TDS deducted" value={money(s.totalTDSDeducted)} tone="text-green-700" />
      <Kpi label="Pending TDS" value={money(s.pendingTDS)} tone={s.pendingTDS > 0 ? 'text-orange-700' : 'text-gray-950'} />
      <Kpi label="Payroll months processed" value={report.payrollMonthsProcessed} />
      <Kpi label="Proof status" value={<Badge status={report.proofStatus.proofStatus}>{report.proofStatus.proofStatus}</Badge>} sub={report.proofStatus.proofReviewedAt ? `Reviewed ${fmtDate(report.proofStatus.proofReviewedAt)}` : undefined} />
    </div>}
    {report.proofStatus.proofRemarks && <p className="text-xs text-gray-600"><b>Reviewer remarks:</b> {report.proofStatus.proofRemarks}</p>}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {report.income && <div className="space-y-1.5">
        <h4 className="text-xs font-semibold text-gray-700">Income from salary</h4>
        <Row label="Basic" value={money(report.income.basic)} />
        <Row label="HRA" value={money(report.income.hra)} />
        <Row label="Other allowances" value={money(report.income.allowances)} />
        <Row label="Income from other sources" value={money(report.income.otherIncome)} />
        <Row label="Gross salary" value={money(report.income.grossSalary)} />
        <Row label="HRA received" value={money(report.income.hraReceived)} />
        <Row label="Rent paid" value={money(report.income.rentPaid)} />
        <Row label="Less: HRA exemption" value={money(report.income.hraExemption)} />
        <Row label="Less: Standard deduction" value={money(report.income.standardDeduction)} />
        <Row label="Less: Professional tax" value={money(report.income.professionalTax)} />
        <Row label="Income chargeable under salaries" value={money(report.income.incomeFromSalary)} tone="text-gray-950" />
      </div>}
      {report.taxComputation && <div className="space-y-1.5">
        <h4 className="text-xs font-semibold text-gray-700">Tax computation</h4>
        <Row label="Taxable income" value={money(report.taxComputation.taxableIncome)} />
        <Row label="Income tax" value={money(report.taxComputation.incomeTax)} />
        <Row label="Surcharge" value={money(report.taxComputation.surcharge)} />
        <Row label="Health & education cess" value={money(report.taxComputation.cess)} />
        <Row label={`Rebate u/s 87A${report.taxComputation.rebateApplicable ? '' : ' (not applicable)'}`} value={money(report.taxComputation.rebateAmount)} />
        <Row label="Net tax liability" value={money(report.taxComputation.netTaxLiability)} tone="text-gray-950" />
        <Row label="Monthly TDS" value={money(report.taxComputation.monthlyTDS)} />
        {report.chapter6A && <>
          <h4 className="text-xs font-semibold text-gray-700 pt-2">Chapter VI-A deductions (old regime)</h4>
          {Object.entries(report.chapter6A).map(([k, v]) => <Row key={k} label={k === 'totalChapter6A' ? 'Total Chapter VI-A' : deductionLabel(k)} value={money(v)} />)}
        </>}
      </div>}
    </div>

    {report.tdsDeductions && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-1">Month-wise TDS deducted</h4>
        <DataTable rows={report.tdsDeductions.monthWise} rowKey={(r, i) => `${r.month}-${r.year}-${i}`} empty="No TDS deducted in payroll yet" columns={[
          { key: 'month', label: 'Month', render: r => `${r.month} ${r.year}` },
          { key: 'tdsDeducted', label: 'TDS', align: 'right', render: r => money(r.tdsDeducted) },
        ]} />
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-1">Quarterly summary</h4>
        <DataTable rows={report.tdsDeductions.quarterly} rowKey={r => r.quarter} columns={[
          { key: 'quarter', label: 'Quarter' },
          { key: 'period', label: 'Period' },
          { key: 'tdsDeducted', label: 'TDS', align: 'right', render: r => money(r.tdsDeducted) },
        ]} />
      </div>
    </div>}

    {report.declarations && <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-700">Declarations</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
        {Object.entries(report.declarations.declaredDeductions).map(([k, v]) => <Row key={k} label={deductionLabel(k)} value={money(v)} />)}
      </div>
      <Lines title="80C investments" lines={report.declarations.investments80C} />
      <Lines title="80D health insurance" lines={report.declarations.investments80D} />
      <Lines title="Other investments" lines={report.declarations.itDeclaration.investmentsOther} />
      {report.declarations.itDeclaration.stayingInRentedHouse && report.declarations.itDeclaration.rentEntries?.length > 0 && <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-1">Rent paid</h4>
        <DataTable rows={report.declarations.itDeclaration.rentEntries} rowKey={(_, i) => String(i)} columns={[
          { key: 'period', label: 'Period', render: r => `${fmtDate(r.fromDate)} – ${fmtDate(r.toDate)}` },
          { key: 'rentMonthly', label: 'Monthly', align: 'right', render: r => money(r.rentMonthly) },
          { key: 'landlordName', label: 'Landlord', render: r => r.landlordName || '—' },
          { key: 'isMetroCity', label: 'Metro', render: r => r.isMetroCity ? 'Yes' : 'No' },
          { key: 'attachment', label: 'Proof', render: r => <AttachmentLink url={r.attachment} /> },
        ]} />
      </div>}
      {report.declarations.itDeclaration.homeLoanSelfOccupied?.enabled && <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <Row label="Home loan principal" value={money(report.declarations.itDeclaration.homeLoanSelfOccupied.principalPaid)} />
        <Row label="Home loan interest" value={money(report.declarations.itDeclaration.homeLoanSelfOccupied.interestPaid)} />
        <Row label="Lender" value={`${report.declarations.itDeclaration.homeLoanSelfOccupied.lenderName || '—'} ${report.declarations.itDeclaration.homeLoanSelfOccupied.lenderPAN ? `(${report.declarations.itDeclaration.homeLoanSelfOccupied.lenderPAN})` : ''}`} />
        <Row label="Proof" value={<AttachmentLink url={report.declarations.itDeclaration.homeLoanSelfOccupied.attachment} />} />
      </div>}
    </div>}
  </div>;
}
