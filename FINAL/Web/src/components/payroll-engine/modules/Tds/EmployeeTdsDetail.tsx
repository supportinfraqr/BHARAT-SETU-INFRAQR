"use client";

/** One employee's TDS for a FY: computation, calculate, HRA, declaration/proofs, lock, delete, tax report. */

import { useState } from 'react';
import { Calculator, Download, Lock, Trash2, Unlock } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import {
  Async, Badge, Btn, Confirm, DataTable, Field, fmtDate, FormGrid, Kpi, Modal, money, num, NumberInput, Row, Section, Select, Tabs, Toggle, useAction, useLoad, type Notify,
} from '../../ui';
import { DeclarationEditor } from './DeclarationEditor';
import { TaxReportView } from './TaxReportView';
import {
  deductionLabel, SALARY_EXEMPTION_FIELDS,
  type CalculateResult, type EmployeeTdsRecord, type HraExemption, type IncomeBreakdown, type ProjectedIncome, type SalaryExemptions, type TaxCalculation, type TaxReport, type TdsSummaryView,
} from './types';

type HraDetailsResp = { employeeId: string; financialYear: string; hraReceived: { monthlyAmount: number; annualAmount: number | null; payrollMonths: number; source: string; component: { name?: string; componentName?: string; [k: string]: unknown } | null } };

const SECTION10_LABELS: Record<string, string> = {
  childrenEducation: 'Children education', hostel: 'Hostel allowance', disabledTransport: 'Transport (disabled)', lta: 'LTA', gratuity: 'Gratuity',
  leaveEncashment: 'Leave encashment', retrenchment: 'Retrenchment', vrs: 'VRS', officialDuty: 'Official duty allowance', lifeInsurance: 'Life insurance 10(10D)',
};

function IncomeBlock({ income }: { income?: ProjectedIncome }) {
  if (!income) return null;
  return <div className="space-y-1.5">
    <h4 className="text-xs font-semibold text-gray-700">Income heads (projected)</h4>
    <Row label="Basic" value={money(income.basic)} />
    <Row label="HRA" value={money(income.hra)} />
    <Row label="Other allowances" value={money(income.allowances)} />
    {income.gross !== undefined && <Row label="Gross salary" value={money(income.gross)} />}
    <Row label="Income from other sources" value={money(income.otherIncome)} />
    <Row label="Loan perquisite" value={money(income.loanPerquisite)} />
    <Row label="Total income" value={money(income.total)} tone="text-gray-950" />
  </div>;
}

function HraBlock({ hra }: { hra?: HraExemption }) {
  if (!hra) return null;
  return <div className="space-y-1.5">
    <h4 className="text-xs font-semibold text-gray-700">HRA exemption (least of three)</h4>
    <Row label="Actual HRA received" value={money(hra.actualHRA)} />
    <Row label="Rent paid − 10% of basic" value={money(hra.rentMinusTenPercent)} />
    <Row label={`${hra.isMetro ? '50' : '40'}% of basic (${hra.isMetro ? 'metro' : 'non-metro'})`} value={money(hra.percentOfBasic)} />
    <Row label="Annual rent paid" value={money(hra.rentPaid)} />
    <Row label="Basic considered" value={money(hra.basic)} />
    <Row label="Exempt amount" value={money(hra.exemptAmount)} tone="text-green-700" />
  </div>;
}

function TaxBlock({ tax, regime }: { tax?: TaxCalculation; regime: string }) {
  if (!tax) return null;
  return <div className="space-y-2">
    <h4 className="text-xs font-semibold text-gray-700">Tax ({regime === 'old' ? 'old' : 'new'} regime){tax.ageCategory ? ` · ${tax.ageCategory}` : ''}</h4>
    {tax.dobMissing && <p className="text-[11px] text-orange-700">Date of birth missing — below-60 old-regime slabs used.</p>}
    <DataTable rows={tax.slabBreakdown ?? []} rowKey={(_, i) => String(i)} empty="Income below the taxable slab" columns={[
      { key: 'range', label: 'Slab', render: r => `${money(r.incomeFrom)} – ${r.incomeTo >= 1e12 ? 'above' : money(r.incomeTo)}` },
      { key: 'rate', label: 'Rate', align: 'right', render: r => `${r.rate}%` },
      { key: 'taxableAmount', label: 'Taxable', align: 'right', render: r => money(r.taxableAmount) },
      { key: 'tax', label: 'Tax', align: 'right', render: r => money(r.tax) },
    ]} />
    <Row label="Income tax" value={money(tax.incomeTax)} />
    <Row label={`Surcharge (${num(tax.surchargeRate)}%)`} value={money(tax.surcharge)} />
    <Row label={`Cess (${num(tax.cessRate)}%)`} value={money(tax.cess)} />
    <Row label={`Rebate u/s 87A${tax.rebateApplicable ? '' : ' (n/a)'}`} value={money(tax.rebateAmount ?? 0)} />
    <Row label="Total tax payable" value={money(tax.total)} tone="text-gray-950" />
  </div>;
}

function Section10Block({ s10 }: { s10?: Record<string, unknown> }) {
  if (!s10 || !Object.keys(s10).length) return null;
  const rows = Object.keys(SECTION10_LABELS).filter(k => s10[k] !== undefined).map(k => ({ k, exempt: Number(s10[k]) || 0, received: Number(s10[`${k}Received`]) || 0 }));
  const notes = (s10.notes ?? {}) as Record<string, string>;
  return <div className="space-y-1.5">
    <h4 className="text-xs font-semibold text-gray-700">Section 10 exemptions</h4>
    <DataTable rows={rows} rowKey={r => r.k} empty="None" columns={[
      { key: 'k', label: 'Head', render: r => SECTION10_LABELS[r.k] },
      { key: 'received', label: 'Received', align: 'right', render: r => money(r.received) },
      { key: 'exempt', label: 'Exempt', align: 'right', render: r => money(r.exempt) },
    ]} />
    <Row label="Total section 10" value={money(s10.total)} tone="text-gray-950" />
    {Object.values(notes).map((n, i) => <p key={i} className="text-[11px] text-gray-400">{n}</p>)}
  </div>;
}

function DeductionsBlock({ deductions, capped }: { deductions?: Record<string, unknown> | null; capped?: Record<string, unknown> }) {
  if (!deductions) return null;
  const keys = Object.keys(deductions).filter(k => typeof deductions[k] === 'number' && (Number(deductions[k]) > 0 || ['section80C', 'section80D', 'standardDeduction', 'total'].includes(k)) && k !== 'section80EStartYear');
  return <div className="space-y-1.5">
    <h4 className="text-xs font-semibold text-gray-700">Deductions by section</h4>
    <DataTable rows={keys} rowKey={k => k} columns={[
      { key: 'k', label: 'Section', render: k => deductionLabel(k) },
      { key: 'declared', label: 'Declared', align: 'right', render: k => money(deductions[k]) },
      ...(capped ? [{ key: 'allowed', label: 'Allowed (capped)', align: 'right' as const, render: (k: string) => typeof capped[k] === 'number' ? money(capped[k]) : '—' }] : []),
    ]} />
    {deductions.section80DDSevere === true && <p className="text-[11px] text-gray-500">80DD: severe disability</p>}
    {(deductions.section80DSelfSenior === true || deductions.section80DParentsSenior === true) && <p className="text-[11px] text-gray-500">80D senior citizen: {deductions.section80DSelfSenior ? 'self ' : ''}{deductions.section80DParentsSenior ? 'parents' : ''}</p>}
  </div>;
}

function MonthlySchedule({ breakdown, record }: { breakdown?: IncomeBreakdown; record: EmployeeTdsRecord }) {
  const deducted = record.monthlyDeductions ?? [];
  const months = breakdown?.months ?? [];
  const findDeducted = (label: string) => deducted.find(d => `${d.month} ${d.year}`.toLowerCase() === label.toLowerCase() || label.toLowerCase().startsWith(String(d.month).slice(0, 3).toLowerCase()) && label.includes(String(d.year)));
  const rows = months.map(m => { const d = findDeducted(m.label); return { ...m, tds: d ? d.tdsDeducted : null }; });
  return <div className="space-y-2">
    <h4 className="text-xs font-semibold text-gray-700">Monthly salary & TDS schedule {breakdown ? `· ${num(breakdown.equivalentMonths)} equivalent months` : ''}</h4>
    <DataTable rows={rows} rowKey={(r, i) => `${r.label}-${i}`} empty="Calculate TDS to build the schedule" columns={[
      { key: 'label', label: 'Month', render: r => <>{r.label}{r.partial && <span className="ml-1 text-[10px] text-orange-600">partial {r.applicableDays}/{r.daysInMonth}d</span>}</> },
      { key: 'amount', label: 'Salary counted', align: 'right', render: r => money(r.amount) },
      { key: 'tds', label: 'TDS', align: 'right', render: r => r.tds !== null ? <span className="text-green-700">{money(r.tds)} deducted</span> : <span className="text-gray-500">{money(record.monthlyTDS)} projected</span> },
    ]} />
    {deducted.length > 0 && <p className="text-[11px] text-gray-500">TDS deducted so far: {money(record.totalTDSDeducted ?? deducted.reduce((s, d) => s + (Number(d.tdsDeducted) || 0), 0))} across {deducted.length} payroll month(s).</p>}
  </div>;
}

function Comparison({ record, fullYear }: { record: EmployeeTdsRecord; fullYear?: TdsSummaryView }) {
  const fy = record.fullYearComparison;
  if (!fy && !fullYear) return null;
  const rows: Array<[string, unknown, unknown]> = fullYear
    ? [['Gross / total income', record.projectedAnnualIncome?.total, fullYear.annualIncome?.total], ['Deductions applied', record.declaredDeductions?.total, fullYear.deductionsApplied], ['HRA exemption', record.hraExemption?.exemptAmount, fullYear.hraExemption?.exemptAmount], ['Taxable income', record.taxableIncome, fullYear.taxableIncome], ['Tax payable', record.taxPayable?.total, fullYear.taxCalculation?.total], ['Monthly TDS', record.monthlyTDS, fullYear.monthlyTDS]]
    : [['Gross salary', record.incomeBreakdown?.salaryIncome, fy!.gross], ['Total income', record.projectedAnnualIncome?.total, fy!.totalIncome], ['Deductions applied', record.declaredDeductions?.total, fy!.deductions], ['HRA exemption', record.hraExemption?.exemptAmount, fy!.hraExemption], ['Taxable income', record.taxableIncome, fy!.taxableIncome], ['Tax payable', record.taxPayable?.total, fy!.taxPayable], ['Monthly TDS', record.monthlyTDS, fy!.monthlyTDS]];
  return <div className="space-y-1.5">
    <h4 className="text-xs font-semibold text-gray-700">Actual TDS period vs full financial year</h4>
    <p className="text-[11px] text-gray-500">Period: {fmtDate(record.tdsPeriod?.start)} – {fmtDate(record.tdsPeriod?.end)} {record.tdsPeriod?.startDateSource ? `(start from ${record.tdsPeriod.startDateSource.replace(/_/g, ' ')})` : ''}{fy?.periodStart ? ` · full year ${fmtDate(fy.periodStart)} – ${fmtDate(fy.periodEnd)}` : ''}</p>
    <DataTable rows={rows} rowKey={r => r[0]} columns={[
      { key: 'h', label: '', render: r => r[0] },
      { key: 'a', label: 'TDS period', align: 'right', render: r => money(r[1]) },
      { key: 'b', label: 'Full year', align: 'right', render: r => money(r[2]) },
    ]} />
  </div>;
}

function CalculateModal({ employeeId, financialYear, record, onClose, onDone, notify }: { employeeId: string; financialYear: string; record: EmployeeTdsRecord; onClose: () => void; onDone: (r: CalculateResult) => void; notify: Notify }) {
  const it = record.itDeclaration ?? {};
  const [regime, setRegime] = useState<string>(record.isNew ? '' : record.taxRegime);
  const [useOtherIncome, setUseOtherIncome] = useState(false);
  const [otherIncome, setOtherIncome] = useState(0);
  const [useHra, setUseHra] = useState(false);
  const [hra, setHra] = useState({ rentPaid: 0, isMetroCity: false, hraReceived: 0, annualRent: 0 });
  const [exempt, setExempt] = useState<Partial<SalaryExemptions>>({ ...(it.salaryExemptions ?? {}) });
  const [oib, setOib] = useState({ incomeFromOtherSources: 0, interestSavings: 0, interestFD: 0, interestNSC: 0, ...(it.otherIncomeBreakdown ?? {}) });
  const { busy, run } = useAction(notify);
  async function submit() {
    const body: Record<string, unknown> = { financialYear, salaryExemptions: exempt, otherIncomeBreakdown: { incomeFromOtherSources: oib.incomeFromOtherSources, interestSavings: oib.interestSavings, interestFD: oib.interestFD, interestNSC: oib.interestNSC } };
    if (regime) body.taxRegime = regime;
    if (useOtherIncome) body.otherIncome = otherIncome;
    if (useHra) body.hraDetails = { rentPaid: hra.rentPaid, isMetroCity: hra.isMetroCity, ...(hra.hraReceived > 0 ? { hraReceived: hra.hraReceived } : {}), ...(hra.annualRent > 0 ? { annualRent: hra.annualRent } : {}) };
    const out = await run(() => pe.post<CalculateResult>(`tds/calculate/${employeeId}`, body), 'TDS calculated');
    if (out) onDone(out);
  }
  return <Modal title="Calculate TDS" subtitle={`FY ${financialYear} — saves the projection used on payslips`} onClose={onClose} width="max-w-3xl" footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={submit}><Calculator size={14} />Calculate & save</Btn></>}>
    <div className="space-y-4">
      <FormGrid cols={3}>
        <Field label="Tax regime" hint="Blank keeps the employee's choice / org default"><Select value={regime} placeholder="Keep current" options={[{ value: 'new', label: 'New regime' }, { value: 'old', label: 'Old regime' }]} onChange={setRegime} /></Field>
        <div className="space-y-1"><Toggle label="Override other income" checked={useOtherIncome} onChange={setUseOtherIncome} />{useOtherIncome && <NumberInput aria-label="Other income (annual)" value={otherIncome} min={0} onChange={setOtherIncome} />}</div>
        <div><Toggle label="Override HRA / rent" checked={useHra} onChange={setUseHra} /><p className="text-[11px] text-gray-400 mt-1">Otherwise rent comes from the declaration.</p></div>
      </FormGrid>
      {useHra && <FormGrid cols={4}>
        <Field label="Rent paid (monthly)"><NumberInput value={hra.rentPaid} min={0} onChange={v => setHra(h => ({ ...h, rentPaid: v }))} /></Field>
        <Field label="Annual rent" hint="Optional"><NumberInput value={hra.annualRent} min={0} onChange={v => setHra(h => ({ ...h, annualRent: v }))} /></Field>
        <Field label="HRA received (monthly)" hint="Blank = salary structure"><NumberInput value={hra.hraReceived} min={0} onChange={v => setHra(h => ({ ...h, hraReceived: v }))} /></Field>
        <div className="flex items-end pb-2"><Toggle label="Metro city" checked={hra.isMetroCity} onChange={v => setHra(h => ({ ...h, isMetroCity: v }))} /></div>
      </FormGrid>}
      <div><h4 className="text-xs font-semibold text-gray-700 mb-2">Section 10 salary exemptions</h4><FormGrid cols={3}>
        {SALARY_EXEMPTION_FIELDS.map(f => <Field key={f.key} label={f.label}><NumberInput value={exempt[f.key] ?? 0} min={0} onChange={v => setExempt(e => ({ ...e, [f.key]: v }))} /></Field>)}
      </FormGrid></div>
      <div><h4 className="text-xs font-semibold text-gray-700 mb-2">Other income breakdown</h4><FormGrid cols={4}>
        <Field label="Other sources"><NumberInput value={oib.incomeFromOtherSources} min={0} onChange={v => setOib(o => ({ ...o, incomeFromOtherSources: v }))} /></Field>
        <Field label="Savings interest"><NumberInput value={oib.interestSavings} min={0} onChange={v => setOib(o => ({ ...o, interestSavings: v }))} /></Field>
        <Field label="FD interest"><NumberInput value={oib.interestFD} min={0} onChange={v => setOib(o => ({ ...o, interestFD: v }))} /></Field>
        <Field label="NSC interest"><NumberInput value={oib.interestNSC} min={0} onChange={v => setOib(o => ({ ...o, interestNSC: v }))} /></Field>
      </FormGrid></div>
    </div>
  </Modal>;
}

export function EmployeeTdsDetail({ employeeId, employeeLabel, financialYear, notify, onChanged }: { employeeId: string; employeeLabel: string; financialYear: string; notify: Notify; onChanged: () => void }) {
  const [tab, setTab] = useState('computation');
  const [calcOpen, setCalcOpen] = useState(false);
  const [lastCalc, setLastCalc] = useState<CalculateResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const state = useLoad(() => pe.get<EmployeeTdsRecord>(`tds/employee/${employeeId}`, { financialYear }), [employeeId, financialYear]);
  const hraState = useLoad(() => tab === 'hra' ? pe.get<HraDetailsResp>(`tds/hra-details/${employeeId}`, { financialYear }) : Promise.resolve(null), [employeeId, financialYear, tab]);
  const reportState = useLoad(() => tab === 'report' ? pe.get<TaxReport>(`tds/tax-report/${employeeId}`, { financialYear }) : Promise.resolve(null), [employeeId, financialYear, tab]);
  const { busy, run } = useAction(notify);
  const record = state.data;
  const calc = lastCalc;

  async function toggleLock() {
    if (!record) return;
    const out = await run(() => pe.put(`tds/lock/${employeeId}`, { financialYear, isLocked: !record.isLocked }), record.isLocked ? 'TDS unlocked' : 'TDS locked');
    if (out) { state.reload(); onChanged(); }
  }
  async function remove() {
    if (!record?._id) return;
    const out = await run(async () => { await pe.del(`tds/record/${record._id}`); return true; }, 'TDS record deleted');
    setConfirmDelete(false);
    if (out) { setLastCalc(null); state.reload(); onChanged(); }
  }

  return <Section title={employeeLabel} subtitle={`TDS · FY ${financialYear}`} right={record && <>
    {!record.isNew && <Badge status={record.isLocked ? 'locked' : 'draft'}>{record.isLocked ? 'Locked' : 'Unlocked'}</Badge>}
    <Btn onClick={() => setCalcOpen(true)}><Calculator size={14} />Calculate TDS</Btn>
    {!record.isNew && <Btn variant="secondary" busy={busy} onClick={toggleLock}>{record.isLocked ? <><Unlock size={14} />Unlock</> : <><Lock size={14} />Lock</>}</Btn>}
    <Btn variant="secondary" onClick={() => run(() => pe.download(`tds/tax-report/${employeeId}/download`, { financialYear }, `tax-report-${financialYear}.pdf`))}><Download size={14} />Tax report PDF</Btn>
    {!record.isNew && record._id && <Btn variant="ghost" className="text-red-600" onClick={() => setConfirmDelete(true)}><Trash2 size={14} />Delete</Btn>}
  </>}>
    <div className="px-5 pt-3"><Tabs active={tab} onChange={setTab} tabs={[{ key: 'computation', label: 'Computation' }, { key: 'declaration', label: 'Declaration & proofs' }, { key: 'hra', label: 'HRA details' }, { key: 'report', label: 'Tax report' }]} /></div>
    <div className="p-5">
      {tab === 'computation' && <Async state={state}>{rec => rec.isNew && !calc
        ? <div className="text-sm text-gray-600 py-6 text-center">No TDS record for FY {financialYear} yet. Click <b>Calculate TDS</b> to project tax from the salary structure and any declaration.</div>
        : <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Regime" value={(calc?.breakdown.taxRegime ?? rec.taxRegime) === 'old' ? 'Old' : 'New'} sub={calc ? (calc.breakdown.chapterVIADeductionsApplied ? 'Chapter VI-A applied' : 'Chapter VI-A not applied') : undefined} />
            <Kpi label="Taxable income" value={money(calc?.breakdown.taxableIncome ?? rec.taxableIncome)} />
            <Kpi label="Annual tax" value={money(calc?.breakdown.taxCalculation.total ?? rec.taxPayable?.total)} />
            <Kpi label="Monthly TDS" value={money(calc?.breakdown.monthlyTDS ?? rec.monthlyTDS)} sub={calc ? `${calc.breakdown.remainingMonths} months left · ${money(calc.breakdown.alreadyDeducted)} already deducted` : undefined} />
          </div>
          {calc && <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Row label="HRA received (monthly)" value={`${money(calc.breakdown.hraReceived.monthlyAmount)} · ${calc.breakdown.hraReceived.source.replace(/_/g, ' ')}`} />
            <Row label="Standard deduction" value={money(calc.breakdown.standardDeduction)} />
            <Row label="Total deductions applied" value={money(calc.breakdown.deductionsApplied)} />
            <Row label="80C limit" value={money(calc.breakdown.section80CLimit)} />
            <Row label="Loan perquisite (annual)" value={money(calc.breakdown.loanPerquisite?.annualTotal ?? 0)} />
            <Row label="Payroll start" value={fmtDate(calc.breakdown.payrollImplementationDate)} />
          </div>}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <IncomeBlock income={calc?.breakdown.annualIncome ?? rec.projectedAnnualIncome} />
            <HraBlock hra={calc?.breakdown.hraExemption ?? rec.hraExemption} />
            <DeductionsBlock deductions={calc?.employeeTDS.declaredDeductions ?? rec.declaredDeductions} capped={calc?.breakdown.chapterVIA} />
            <Section10Block s10={calc?.breakdown.section10 ?? rec.section10Exemptions} />
            <TaxBlock tax={calc?.breakdown.taxCalculation ?? rec.taxPayable} regime={calc?.breakdown.taxRegime ?? rec.taxRegime} />
            <Comparison record={calc?.employeeTDS ?? rec} fullYear={calc?.fullYear} />
          </div>
          <MonthlySchedule breakdown={calc?.breakdown.incomeBreakdown ?? rec.incomeBreakdown} record={calc?.employeeTDS ?? rec} />
          <p className="text-[11px] text-gray-400">To compare regimes, recalculate with the other regime selected (the last calculation is saved and used on payslips). Employees see an old-vs-new comparison when they save their declaration.</p>
        </div>}</Async>}

      {tab === 'declaration' && <Async state={state}>{rec => <DeclarationEditor key={`${rec._id ?? 'new'}-${rec.updatedAt ?? ''}`} record={rec} employeeId={employeeId} financialYear={financialYear} notify={notify} onSaved={() => { state.reload(); onChanged(); }} />}</Async>}

      {tab === 'hra' && <Async state={hraState}>{d => <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl">
        <Row label="Monthly HRA (from salary structure)" value={money(d.hraReceived.monthlyAmount)} />
        <Row label="Annual HRA for TDS period" value={d.hraReceived.annualAmount === null ? '—' : money(d.hraReceived.annualAmount)} />
        <Row label="Payroll months in period" value={num(d.hraReceived.payrollMonths)} />
        <Row label="Source" value={d.hraReceived.source.replace(/_/g, ' ')} />
        <Row label="Component" value={d.hraReceived.component ? String(d.hraReceived.component.name ?? d.hraReceived.component.componentName ?? 'HRA') : 'Not in salary structure'} />
        <Row label="Financial year" value={d.financialYear || financialYear} />
      </div>}</Async>}

      {tab === 'report' && <Async state={reportState}>{r => <TaxReportView report={r} />}</Async>}
    </div>
    {calcOpen && record && <CalculateModal employeeId={employeeId} financialYear={financialYear} record={record} notify={notify} onClose={() => setCalcOpen(false)} onDone={r => { setCalcOpen(false); setLastCalc(r); state.reload(); onChanged(); }} />}
    {confirmDelete && <Confirm danger busy={busy} title="Delete TDS record" message={<>Delete the FY {financialYear} TDS record for {employeeLabel}? This removes the computation, declaration and proof review. Payroll will stop deducting projected TDS until recalculated.</>} onClose={() => setConfirmDelete(false)} onConfirm={remove} />}
  </Section>;
}
