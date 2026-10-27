"use client";

/** Readable Form 16 (legacy utils/form16Builder.js payload). Shared by HR Form 16 and My Form 16. */

import { DataTable, fmtDateTime, money, Row } from '../../ui';

export type Form16Data = {
  viewType: 'form16';
  documentParts: string[];
  employerDetails: { name: string; address: string; tan: string; pan: string };
  employeeDetails: { employeeName: string; pan: string; employeeCode: string; designation: string; address: string; period: string };
  partA: { periodFrom: string; periodTo: string; quarterlyTds: Array<{ quarter: string; period: string; tdsDeducted: number }>; totalTaxDeducted: number; tracesNote: string };
  partB: { grossSalary: number; basic: number; hra: number; allowances: number; otherIncome: number; lessAllowances: { standardDeduction: number; professionalTax: number; hraExemption: number }; incomeChargeableUnderSalaryHead: number };
  partC: { section80C: number; section80D: number; section80E: number; section80G: number; section24: number; total: number };
  partD: { taxableIncome: number; taxRegime: string; incomeTax: number; surcharge: number; cess: number; totalTax: number; rebate: number; netTax: number; monthlyTDS: number };
  partE: Array<{ month: string; year: number; tdsDeducted: number }>;
  totalTDSDeducted: number;
  financialYear: string;
  financialYearCanonical: string;
  assessmentYear: string;
  periodDescription: string;
  generatedOn: string;
  payrollMonthsProcessed: number;
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-gray-200 overflow-hidden">
    <h4 className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-800">{title}</h4>
    <div className="p-3 space-y-1.5">{children}</div>
  </div>;
}

export function Form16View({ data }: { data: Form16Data }) {
  const e = data.employeeDetails;
  return <div className="space-y-4">
    <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
      <span>FY {data.financialYear} · {data.assessmentYear}</span><span>{data.periodDescription}</span>
      <span>{data.payrollMonthsProcessed} payroll month(s)</span><span>Generated {fmtDateTime(data.generatedOn)}</span>
    </div>

    <Block title="PART A — Certificate under section 203 (TDS on salary)">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Employer (deductor)</p>
          <Row label="Name" value={data.employerDetails.name} />
          <Row label="Address" value={data.employerDetails.address || '—'} />
          <Row label="TAN" value={data.employerDetails.tan} />
          <Row label="PAN" value={data.employerDetails.pan} />
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Employee (deductee)</p>
          <Row label="Name" value={e.employeeName} />
          <Row label="PAN" value={e.pan} />
          <Row label="Employee code" value={e.employeeCode} />
          <Row label="Designation" value={e.designation} />
          <Row label="Address" value={e.address} />
        </div>
      </div>
      <Row label="Period" value={`${data.partA.periodFrom} to ${data.partA.periodTo}`} />
      <DataTable rows={data.partA.quarterlyTds} rowKey={r => r.quarter} columns={[
        { key: 'quarter', label: 'Quarter' },
        { key: 'period', label: 'Period' },
        { key: 'tdsDeducted', label: 'Tax deducted & deposited', align: 'right', render: r => money(r.tdsDeducted) },
      ]} />
      <Row label="Total tax deducted" value={money(data.partA.totalTaxDeducted)} tone="text-gray-950" />
      <p className="text-[11px] text-gray-400">{data.partA.tracesNote}</p>
    </Block>

    <Block title="PART B — Details of salary paid and tax deducted">
      <p className="text-[11px] font-semibold text-gray-500 uppercase">1. Gross salary</p>
      <Row label="Basic" value={money(data.partB.basic)} />
      <Row label="House rent allowance" value={money(data.partB.hra)} />
      <Row label="Other allowances" value={money(data.partB.allowances)} />
      <Row label="Income from other sources" value={money(data.partB.otherIncome)} />
      <Row label="Gross salary" value={money(data.partB.grossSalary)} tone="text-gray-950" />
      <p className="text-[11px] font-semibold text-gray-500 uppercase pt-2">2. Less: exemptions & deductions u/s 10 / 16</p>
      <Row label="HRA exemption u/s 10(13A)" value={money(data.partB.lessAllowances.hraExemption)} />
      <Row label="Standard deduction u/s 16(ia)" value={money(data.partB.lessAllowances.standardDeduction)} />
      <Row label="Professional tax u/s 16(iii)" value={money(data.partB.lessAllowances.professionalTax)} />
      <Row label="Income chargeable under the head 'Salaries'" value={money(data.partB.incomeChargeableUnderSalaryHead)} tone="text-gray-950" />

      <p className="text-[11px] font-semibold text-gray-500 uppercase pt-2">3. Deductions under Chapter VI-A</p>
      <Row label="80C" value={money(data.partC.section80C)} />
      <Row label="80D" value={money(data.partC.section80D)} />
      <Row label="80E" value={money(data.partC.section80E)} />
      <Row label="80G" value={money(data.partC.section80G)} />
      <Row label="24(b) home loan interest" value={money(data.partC.section24)} />
      <Row label="Total deductions" value={money(data.partC.total)} tone="text-gray-950" />

      <p className="text-[11px] font-semibold text-gray-500 uppercase pt-2">4. Tax computation ({data.partD.taxRegime === 'old' ? 'old' : 'new'} regime)</p>
      <Row label="Total taxable income" value={money(data.partD.taxableIncome)} />
      <Row label="Tax on total income" value={money(data.partD.incomeTax)} />
      <Row label="Surcharge" value={money(data.partD.surcharge)} />
      <Row label="Health & education cess" value={money(data.partD.cess)} />
      <Row label="Rebate u/s 87A" value={money(data.partD.rebate)} />
      <Row label="Net tax payable" value={money(data.partD.netTax)} tone="text-gray-950" />
      <Row label="Monthly TDS" value={money(data.partD.monthlyTDS)} />

      <p className="text-[11px] font-semibold text-gray-500 uppercase pt-2">5. Month-wise TDS deducted</p>
      <DataTable rows={data.partE} rowKey={(r, i) => `${r.month}-${r.year}-${i}`} empty="No TDS deducted through payroll" columns={[
        { key: 'm', label: 'Month', render: r => `${r.month} ${r.year}` },
        { key: 'tds', label: 'TDS', align: 'right', render: r => money(r.tdsDeducted) },
      ]} />
      <Row label="Total TDS deducted" value={money(data.totalTDSDeducted)} tone="text-green-700" />
    </Block>
  </div>;
}
