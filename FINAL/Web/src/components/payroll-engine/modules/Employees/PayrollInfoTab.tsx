"use client";

/**
 * Payroll info: GET/PUT employee/:id/payrollInfo (payrollInfo, payrollPreferences, taxInfo)
 * and POST calculatePayrollInfo (preview from base or gross, state, attendance).
 */

import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps, PayrollEmployee } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, Field, FormGrid, NumberInput, Row, Section, Select, TextInput, Toggle, fmtDate, isoDate, money, useAction, useLoad } from '../../ui';
import { INDIAN_STATES, STATES_DATALIST_ID } from '../Setup/constants';
import { PayrollBreakdown } from './Breakdown';
import type { CalculatePayrollInfoResult, PayrollInfoResponse, TaxInfo } from './types';

type SalaryForm = { baseSalary: number; grossSalary: number; ctc: number; paymentFrequency: string; currency: string; taxRegime: string; variablePay: number; incentives: number; salaryEffectiveFrom: string };
type PrefForm = { holdSalary: boolean; holdReason: string; paymentMode: string; loanDeduction: number; advanceDeduction: number };

export default function PayrollInfoTab({ employee, notify, navigate, onChanged }: { employee: PayrollEmployee; notify: ModuleProps['notify']; navigate: ModuleProps['navigate']; onChanged: () => void }) {
  const state = useLoad(() => pe.get<PayrollInfoResponse>(`employee/${employee._id}/payrollInfo`), [employee._id]);
  return <Async state={state}>{d => <Form data={d} employee={employee} notify={notify} navigate={navigate} onSaved={() => { state.reload(); onChanged(); }} />}</Async>;
}

function Form({ data, employee, notify, navigate, onSaved }: { data: PayrollInfoResponse; employee: PayrollEmployee; notify: ModuleProps['notify']; navigate: ModuleProps['navigate']; onSaved: () => void }) {
  const p = data.payrollInfo; const pr = data.payrollPreferences; const t = data.taxInfo;
  const [salary, setSalary] = useState<SalaryForm>({
    baseSalary: p.baseSalary ?? 0, grossSalary: p.grossSalary ?? 0, ctc: p.ctc ?? 0, paymentFrequency: p.paymentFrequency ?? 'Monthly', currency: p.currency ?? 'INR',
    taxRegime: p.taxRegime ?? 'New', variablePay: p.variablePay ?? 0, incentives: p.incentives ?? 0, salaryEffectiveFrom: isoDate(p.salaryEffectiveFrom),
  });
  const [prefs, setPrefs] = useState<PrefForm>({ holdSalary: !!pr.holdSalary, holdReason: pr.holdReason ?? '', paymentMode: pr.paymentMode ?? 'Bank Transfer', loanDeduction: pr.loanDeduction ?? 0, advanceDeduction: pr.advanceDeduction ?? 0 });
  const [tax, setTax] = useState<TaxInfo>({ taxDeclarationSubmitted: !!t.taxDeclarationSubmitted, taxDeclarationYear: t.taxDeclarationYear ?? '', investmentProofSubmitted: !!t.investmentProofSubmitted, investmentProofYear: t.investmentProofYear ?? '', estimatedTaxLiability: t.estimatedTaxLiability ?? 0, tdsDeducted: t.tdsDeducted ?? 0 });
  const { busy, run } = useAction(notify);
  const vpf = pr.vpf;

  const save = async () => {
    if (prefs.holdSalary && !prefs.holdReason.trim()) { notify('Enter a reason for holding salary', 'error'); return; }
    if (salary.baseSalary < 0 || salary.grossSalary < 0 || salary.ctc < 0) { notify('Salary figures cannot be negative', 'error'); return; }
    const ok = await run(() => pe.put(`employee/${employee._id}/payrollInfo`, {
      payrollInfo: { ...salary, salaryEffectiveFrom: salary.salaryEffectiveFrom || null },
      payrollPreferences: prefs,
      taxInfo: tax,
    }), 'Payroll information updated successfully');
    if (ok !== undefined) onSaved();
  };

  return <div className="space-y-4">
    <Section title="Salary" subtitle="Monthly base & gross, annual CTC. Use the calculator below to derive them from the org salary structure.">
      <div className="p-5">
        <FormGrid cols={3}>
          <Field label="Basic salary (₹ / month)"><NumberInput min={0} value={salary.baseSalary} onChange={baseSalary => setSalary(s => ({ ...s, baseSalary }))} /></Field>
          <Field label="Gross salary (₹ / month)"><NumberInput min={0} value={salary.grossSalary} onChange={grossSalary => setSalary(s => ({ ...s, grossSalary }))} /></Field>
          <Field label="CTC (₹ / year)"><NumberInput min={0} value={salary.ctc} onChange={ctc => setSalary(s => ({ ...s, ctc }))} /></Field>
          <Field label="Payment frequency"><Select value={salary.paymentFrequency} onChange={paymentFrequency => setSalary(s => ({ ...s, paymentFrequency }))} options={['Monthly', 'Bi-Weekly', 'Weekly']} /></Field>
          <Field label="Currency"><Select value={salary.currency} onChange={currency => setSalary(s => ({ ...s, currency }))} options={['INR', 'USD', 'EUR']} /></Field>
          <Field label="Tax regime"><Select value={salary.taxRegime} onChange={taxRegime => setSalary(s => ({ ...s, taxRegime }))} options={[{ value: 'New', label: 'New regime' }, { value: 'Old', label: 'Old regime' }]} /></Field>
          <Field label="Variable pay (₹)"><NumberInput min={0} value={salary.variablePay} onChange={variablePay => setSalary(s => ({ ...s, variablePay }))} /></Field>
          <Field label="Incentives (₹)"><NumberInput min={0} value={salary.incentives} onChange={incentives => setSalary(s => ({ ...s, incentives }))} /></Field>
          <Field label="Salary effective from"><TextInput type="date" value={salary.salaryEffectiveFrom} onChange={salaryEffectiveFrom => setSalary(s => ({ ...s, salaryEffectiveFrom }))} /></Field>
        </FormGrid>
        <p className="mt-3 text-[11px] text-gray-400">For a dated change with arrears use <button type="button" className="underline" onClick={() => navigate('revisions', { employeeId: employee._id })}>Salary Revisions</button>.</p>
      </div>
    </Section>

    <Section title="Payment preferences" right={prefs.holdSalary ? <Badge status="on_hold">Salary on hold</Badge> : undefined}>
      <div className="p-5 space-y-3">
        <Toggle checked={prefs.holdSalary} onChange={holdSalary => setPrefs(s => ({ ...s, holdSalary }))} label="Hold salary (excluded from payouts until released)" />
        <FormGrid cols={3}>
          <Field label="Hold reason" className="md:col-span-2"><TextInput disabled={!prefs.holdSalary} value={prefs.holdReason} onChange={holdReason => setPrefs(s => ({ ...s, holdReason }))} /></Field>
          <Field label="Payment mode"><Select value={prefs.paymentMode} onChange={paymentMode => setPrefs(s => ({ ...s, paymentMode }))} options={['Bank Transfer', 'Cheque', 'Cash']} /></Field>
          <Field label="Loan deduction (₹ / month)" hint="Manual; loan EMIs from Loans are added automatically"><NumberInput min={0} value={prefs.loanDeduction} onChange={loanDeduction => setPrefs(s => ({ ...s, loanDeduction }))} /></Field>
          <Field label="Advance deduction (₹ / month)"><NumberInput min={0} value={prefs.advanceDeduction} onChange={advanceDeduction => setPrefs(s => ({ ...s, advanceDeduction }))} /></Field>
        </FormGrid>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Row label="VPF status" value={<Badge status={vpf?.status ?? 'none'} />} />
          <Row label="VPF contribution" value={vpf?.enabled ? (vpf.contributionType === 'fixed' ? money(vpf.fixedAmount) : `${vpf.percentage}% of basic`) : 'Not opted'} />
          <Row label="VPF effective from" value={<span>{fmtDate(vpf?.effectiveFrom)} <button type="button" className="ml-1 underline text-[var(--color-bss-interactive-blue)]" onClick={() => navigate('vpf', { employeeId: employee._id })}>Manage</button></span>} />
        </div>
      </div>
    </Section>

    <Section title="Tax information">
      <div className="p-5 space-y-3">
        <FormGrid cols={3}>
          <div className="flex items-end pb-2"><Toggle checked={tax.taxDeclarationSubmitted} onChange={taxDeclarationSubmitted => setTax(s => ({ ...s, taxDeclarationSubmitted }))} label="Tax declaration submitted" /></div>
          <Field label="Declaration year"><TextInput value={tax.taxDeclarationYear} onChange={taxDeclarationYear => setTax(s => ({ ...s, taxDeclarationYear }))} placeholder="2025-26" /></Field>
          <Field label="Estimated tax liability (₹)"><NumberInput min={0} value={tax.estimatedTaxLiability} onChange={estimatedTaxLiability => setTax(s => ({ ...s, estimatedTaxLiability }))} /></Field>
          <div className="flex items-end pb-2"><Toggle checked={tax.investmentProofSubmitted} onChange={investmentProofSubmitted => setTax(s => ({ ...s, investmentProofSubmitted }))} label="Investment proof submitted" /></div>
          <Field label="Proof year"><TextInput value={tax.investmentProofYear} onChange={investmentProofYear => setTax(s => ({ ...s, investmentProofYear }))} placeholder="2025-26" /></Field>
          <Field label="TDS deducted (₹)"><NumberInput min={0} value={tax.tdsDeducted} onChange={tdsDeducted => setTax(s => ({ ...s, tdsDeducted }))} /></Field>
        </FormGrid>
      </div>
    </Section>

    <div className="flex justify-end"><Btn busy={busy} onClick={() => void save()}>Save payroll info</Btn></div>

    <CalculatorPanel employee={employee} notify={notify} onApply={r => setSalary(s => ({ ...s, baseSalary: r.payrollInfo.baseSalary, grossSalary: r.payrollInfo.grossSalary, ctc: r.payrollInfo.ctc }))}
      initialBase={salary.baseSalary} initialGross={salary.grossSalary} />
  </div>;
}

function CalculatorPanel({ employee, notify, onApply, initialBase, initialGross }: { employee: PayrollEmployee; notify: ModuleProps['notify']; onApply: (r: CalculatePayrollInfoResult) => void; initialBase: number; initialGross: number }) {
  const [mode, setMode] = useState<'gross' | 'base' | 'both'>(initialGross > 0 ? 'gross' : 'base');
  const [base, setBase] = useState(initialBase);
  const [gross, setGross] = useState(initialGross);
  const [st, setSt] = useState(employee.statutoryInfo?.ptState || employee.workState || '');
  const [presentDays, setPresentDays] = useState('');
  const [workingDays, setWorkingDays] = useState('');
  const [result, setResult] = useState<CalculatePayrollInfoResult | null>(null);
  const { busy, run } = useAction(notify);

  const calc = async () => {
    const b = mode === 'gross' ? 0 : base; const g = mode === 'base' ? 0 : gross;
    if (b <= 0 && g <= 0) { notify('baseSalary or grossSalary is required and must be greater than 0', 'error'); return; }
    const out = await run(() => pe.post<CalculatePayrollInfoResult>('calculatePayrollInfo', {
      employeeId: employee._id, baseSalary: b || undefined, grossSalary: g || undefined, state: st || undefined,
      presentDays: presentDays === '' ? undefined : Number(presentDays), workingDays: workingDays === '' ? undefined : Number(workingDays),
    }));
    if (out) setResult(out);
  };

  return <Section title="Salary calculator" subtitle="Preview the full monthly structure using org components, statutory settings and this employee's overrides." right={<Calculator size={16} className="text-gray-400" />}>
    <div className="p-5 space-y-4">
      <datalist id={STATES_DATALIST_ID}>{INDIAN_STATES.map(s => <option key={s} value={s} />)}</datalist>
      <FormGrid cols={3}>
        <Field label="Calculate from"><Select value={mode} onChange={v => setMode(v as typeof mode)} options={[{ value: 'gross', label: 'Gross salary' }, { value: 'base', label: 'Basic salary' }, { value: 'both', label: 'Basic + Gross (balance to allowance)' }]} /></Field>
        <Field label="Basic (₹ / month)"><NumberInput disabled={mode === 'gross'} min={0} value={base} onChange={setBase} /></Field>
        <Field label="Gross (₹ / month)"><NumberInput disabled={mode === 'base'} min={0} value={gross} onChange={setGross} /></Field>
        <Field label="State (PT / LWF / bonus)"><TextInput list={STATES_DATALIST_ID} value={st} onChange={setSt} /></Field>
        <Field label="Present days" hint="Optional — pro-rates statutory bonus"><TextInput type="number" min={0} value={presentDays} onChange={setPresentDays} /></Field>
        <Field label="Working days" hint="Optional"><TextInput type="number" min={0} value={workingDays} onChange={setWorkingDays} /></Field>
      </FormGrid>
      <div className="flex flex-wrap gap-2">
        <Btn busy={busy} onClick={() => void calc()}><Calculator size={14} />Calculate</Btn>
        {result && <Btn variant="secondary" onClick={() => { onApply(result); notify('Figures copied to the salary form — review and save', 'success'); }}>Use base {money(result.payrollInfo.baseSalary)} · gross {money(result.payrollInfo.grossSalary)} · CTC {money(result.payrollInfo.ctc)}</Btn>}
      </div>
      {result && <PayrollBreakdown result={result} />}
    </div>
  </Section>;
}
