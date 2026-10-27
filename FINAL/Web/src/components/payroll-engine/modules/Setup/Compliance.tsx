"use client";

/**
 * Statutory compliance (legacy controller/payroll/statutoryCompliance.js).
 * GET getCompliance (404 => not configured yet) / POST createOrUpdateCompliance.
 * The backend merges section-wise, so every section saves only its own key.
 */

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PayrollApiError, pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, Field, FormGrid, MONTHS, MONTHS_LONG, NumberInput, Section, Select, TextInput, Toggle, fmtDateTime, inputClass, useAction, useLoad } from '../../ui';
import { EMPLOYMENT_CATEGORIES, INDIAN_STATES, STATES_DATALIST_ID } from './constants';

// ---- Types (exact field names of models/payroll/statutoryCompliance.js) ----
type Epf = {
  isEnabled: boolean; epfNumber: string; deductionCycle: string; employeeContributionRate: number; employerContributionRate: number;
  restrictedPfWage: number; contributionPreferences: { employerPfContribution: boolean; edliContribution: boolean; adminCharges: boolean };
  allowEmployeeLevelOverride: boolean; eligibleForAbryScheme: boolean; proRateRestrictedPfWage: boolean; considerSalaryBasedOnLOP: boolean;
  considerAllPfComponentsAfterLopBelowCeiling: boolean;
};
type Esi = { isEnabled: boolean; esiNumber: string; deductionCycle: string; employeeContributionRate: number; employerContributionRate: number; wageLimit: number; includeEmployerInSalaryStructure: boolean };
type PtSlab = { salaryRangeFrom: number; salaryRangeTo: number; taxAmount: number };
type PtState = { stateName: string; ptNumber: string; isApplicable: boolean; ptSlabs: PtSlab[] };
type Pt = { isEnabled: boolean; deductionCycle: 'monthly' | 'half-yearly'; states: PtState[] };
type LwfState = {
  stateName: string; deductionCycle: 'monthly' | 'half-yearly' | 'yearly'; periodFrom: string; periodTo: string; minAmount: number;
  maxAmount: number | ''; calculationType: 'fixed' | 'percentage'; employeeShare: number; employerShare: number; months: string[];
  isApplicable: boolean; status: 'active' | 'inactive';
};
type Lwf = { isEnabled: boolean; deductionCycle: string; months: string[]; states: LwfState[] };
type WageCategory = { employmentCategory: string; minWage: number; effectiveFrom: string };
type BonusState = { stateName: string; minWage: number; formulaBase: 'minimumWage' | 'basicAndDA'; wageCategories: WageCategory[] };
type Bonus = { isEnabled: boolean; paymentCycle: 'monthly' | 'yearly'; paymentMonth: string; percentage: number; minimumBonusWage: number; eligibilityCeiling: number; states: BonusState[] };
export type Compliance = { _id?: string; epf: Epf; esi: Esi; professionalTax: Pt; labourWelfareFund: Lwf; statutoryBonus: Bonus; updatedAt?: string };

const DEFAULTS: Compliance = {
  epf: {
    isEnabled: false, epfNumber: '', deductionCycle: 'monthly', employeeContributionRate: 12, employerContributionRate: 12, restrictedPfWage: 15000,
    contributionPreferences: { employerPfContribution: true, edliContribution: false, adminCharges: false },
    allowEmployeeLevelOverride: false, eligibleForAbryScheme: false, proRateRestrictedPfWage: true, considerSalaryBasedOnLOP: true,
    considerAllPfComponentsAfterLopBelowCeiling: true,
  },
  esi: { isEnabled: false, esiNumber: '', deductionCycle: 'monthly', employeeContributionRate: 0.75, employerContributionRate: 3.25, wageLimit: 21000, includeEmployerInSalaryStructure: true },
  professionalTax: { isEnabled: false, deductionCycle: 'monthly', states: [] },
  labourWelfareFund: { isEnabled: false, deductionCycle: 'half-yearly', months: [], states: [] },
  statutoryBonus: { isEnabled: false, paymentCycle: 'yearly', paymentMonth: 'October', percentage: 8.33, minimumBonusWage: 7000, eligibilityCeiling: 21000, states: [] },
};

function withDefaults(c: Partial<Compliance> | null): Compliance {
  const src = c ?? {};
  return {
    ...src,
    epf: { ...DEFAULTS.epf, ...(src.epf ?? {}), contributionPreferences: { ...DEFAULTS.epf.contributionPreferences, ...(src.epf?.contributionPreferences ?? {}) } },
    esi: { ...DEFAULTS.esi, ...(src.esi ?? {}) },
    professionalTax: { ...DEFAULTS.professionalTax, ...(src.professionalTax ?? {}), states: (src.professionalTax?.states ?? []).map(s => ({ ...s, stateName: s.stateName ?? '', ptNumber: s.ptNumber ?? '', isApplicable: s.isApplicable !== false, ptSlabs: s.ptSlabs ?? [] })) },
    labourWelfareFund: { ...DEFAULTS.labourWelfareFund, ...(src.labourWelfareFund ?? {}), months: src.labourWelfareFund?.months ?? [], states: src.labourWelfareFund?.states ?? [] },
    statutoryBonus: { ...DEFAULTS.statutoryBonus, ...(src.statutoryBonus ?? {}), states: (src.statutoryBonus?.states ?? []).map(s => ({ ...s, wageCategories: s.wageCategories ?? [] })) },
  } as Compliance;
}

export async function loadCompliance(): Promise<Compliance | null> {
  try {
    return await pe.get<Compliance>('getCompliance');
  } catch (err) {
    if (err instanceof PayrollApiError && err.status === 404) return null;
    throw err;
  }
}

export default function Compliance({ notify }: Pick<ModuleProps, 'notify'>) {
  const state = useLoad(async () => ({ doc: await loadCompliance() }), []);
  return <Async state={state}>
    {({ doc }) => <ComplianceForm initial={withDefaults(doc)} configured={!!doc} notify={notify} />}
  </Async>;
}

function ComplianceForm({ initial, configured: wasConfigured, notify }: { initial: Compliance; configured: boolean; notify: ModuleProps['notify'] }) {
  const [c, setC] = useState<Compliance>(initial);
  const [savedAt, setSavedAt] = useState(initial.updatedAt ?? '');
  const configured = wasConfigured || !!savedAt;
  const [savingKey, setSavingKey] = useState('');
  const { run } = useAction(notify);

  const save = async (section: keyof Compliance) => {
    setSavingKey(section);
    const out = await run(() => pe.post<Compliance>('createOrUpdateCompliance', { [section]: c[section] }), 'Statutory compliance saved successfully');
    setSavingKey('');
    if (out) setSavedAt(out.updatedAt ?? new Date().toISOString());
  };
  const set = <K extends keyof Compliance>(k: K, patch: Partial<Compliance[K]>) => setC(prev => ({ ...prev, [k]: { ...(prev[k] as object), ...patch } }));

  return <div className="space-y-4">
    <datalist id={STATES_DATALIST_ID}>{INDIAN_STATES.map(s => <option key={s} value={s} />)}</datalist>
    {!configured && <p className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-800">Statutory compliance is not configured for this organization yet. The defaults below are the statutory defaults — enable the sections that apply and save each one.</p>}
    {savedAt && <p className="text-[11px] text-gray-400">Last saved {fmtDateTime(savedAt)}</p>}
    <EpfSection v={c.epf} onChange={p => set('epf', p)} onSave={() => void save('epf')} busy={savingKey === 'epf'} />
    <EsiSection v={c.esi} onChange={p => set('esi', p)} onSave={() => void save('esi')} busy={savingKey === 'esi'} />
    <PtSection v={c.professionalTax} onChange={p => set('professionalTax', p)} onSave={() => void save('professionalTax')} busy={savingKey === 'professionalTax'} />
    <LwfSection v={c.labourWelfareFund} onChange={p => set('labourWelfareFund', p)} onSave={() => void save('labourWelfareFund')} busy={savingKey === 'labourWelfareFund'} />
    <BonusSection v={c.statutoryBonus} onChange={p => set('statutoryBonus', p)} onSave={() => void save('statutoryBonus')} busy={savingKey === 'statutoryBonus'} />
  </div>;
}

type SectionProps<T> = { v: T; onChange: (patch: Partial<T>) => void; onSave: () => void; busy: boolean };

function SaveBar({ onSave, busy, label }: { onSave: () => void; busy: boolean; label: string }) {
  return <div className="px-5 py-3 border-t border-gray-100 flex justify-end"><Btn onClick={onSave} busy={busy}>Save {label}</Btn></div>;
}

function EnabledBadge({ on }: { on: boolean }) {
  return <Badge status={on ? 'active' : 'inactive'}>{on ? 'Enabled' : 'Disabled'}</Badge>;
}

const CYCLES = [{ value: 'monthly', label: 'Monthly' }];

function EpfSection({ v, onChange, onSave, busy }: SectionProps<Epf>) {
  const pref = (patch: Partial<Epf['contributionPreferences']>) => onChange({ contributionPreferences: { ...v.contributionPreferences, ...patch } });
  return <Section title="Employees' Provident Fund (EPF)" subtitle="Contribution rates, wage ceiling and how LOP affects the PF wage." right={<EnabledBadge on={v.isEnabled} />}>
    <div className="p-5 space-y-4">
      <Toggle checked={v.isEnabled} onChange={isEnabled => onChange({ isEnabled })} label="Enable EPF for this organization" />
      <FormGrid cols={3}>
        <Field label="EPF establishment number"><TextInput value={v.epfNumber} onChange={epfNumber => onChange({ epfNumber })} placeholder="e.g. MH/BAN/0012345/000" /></Field>
        <Field label="Deduction cycle"><Select value={v.deductionCycle} onChange={deductionCycle => onChange({ deductionCycle })} options={CYCLES} /></Field>
        <Field label="Restricted PF wage (₹ / month)" hint="Statutory ceiling — defaults to 15,000"><NumberInput min={0} value={v.restrictedPfWage} onChange={restrictedPfWage => onChange({ restrictedPfWage })} /></Field>
        <Field label="Employee contribution rate (%)"><NumberInput min={0} max={100} step="0.01" value={v.employeeContributionRate} onChange={employeeContributionRate => onChange({ employeeContributionRate })} /></Field>
        <Field label="Employer contribution rate (%)"><NumberInput min={0} max={100} step="0.01" value={v.employerContributionRate} onChange={employerContributionRate => onChange({ employerContributionRate })} /></Field>
      </FormGrid>
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">Contribution preferences (included in CTC)</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Toggle checked={v.contributionPreferences.employerPfContribution} onChange={employerPfContribution => pref({ employerPfContribution })} label="Employer PF contribution" />
          <Toggle checked={v.contributionPreferences.edliContribution} onChange={edliContribution => pref({ edliContribution })} label="EDLI contribution" />
          <Toggle checked={v.contributionPreferences.adminCharges} onChange={adminCharges => pref({ adminCharges })} label="PF admin charges" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Toggle checked={v.allowEmployeeLevelOverride} onChange={allowEmployeeLevelOverride => onChange({ allowEmployeeLevelOverride })} label="Allow employee-level EPF override" />
        <Toggle checked={v.eligibleForAbryScheme} onChange={eligibleForAbryScheme => onChange({ eligibleForAbryScheme })} label="Eligible for ABRY scheme" />
        <Toggle checked={v.proRateRestrictedPfWage} onChange={proRateRestrictedPfWage => onChange({ proRateRestrictedPfWage })} label="Pro-rate restricted PF wage" />
        <Toggle checked={v.considerSalaryBasedOnLOP} onChange={considerSalaryBasedOnLOP => onChange({ considerSalaryBasedOnLOP })} label="Consider salary based on LOP" />
        <Toggle checked={v.considerAllPfComponentsAfterLopBelowCeiling} onChange={considerAllPfComponentsAfterLopBelowCeiling => onChange({ considerAllPfComponentsAfterLopBelowCeiling })} label="Consider all PF components when wage after LOP is below ceiling" />
      </div>
    </div>
    <SaveBar onSave={onSave} busy={busy} label="EPF" />
  </Section>;
}

function EsiSection({ v, onChange, onSave, busy }: SectionProps<Esi>) {
  return <Section title="Employees' State Insurance (ESI)" subtitle="Applies to employees whose gross is within the wage limit." right={<EnabledBadge on={v.isEnabled} />}>
    <div className="p-5 space-y-4">
      <Toggle checked={v.isEnabled} onChange={isEnabled => onChange({ isEnabled })} label="Enable ESI for this organization" />
      <FormGrid cols={3}>
        <Field label="ESI number"><TextInput value={v.esiNumber} onChange={esiNumber => onChange({ esiNumber })} /></Field>
        <Field label="Deduction cycle"><Select value={v.deductionCycle} onChange={deductionCycle => onChange({ deductionCycle })} options={CYCLES} /></Field>
        <Field label="Wage limit (₹ / month)" hint="Defaults to 21,000"><NumberInput min={0} value={v.wageLimit} onChange={wageLimit => onChange({ wageLimit })} /></Field>
        <Field label="Employee contribution rate (%)"><NumberInput min={0} step="0.01" value={v.employeeContributionRate} onChange={employeeContributionRate => onChange({ employeeContributionRate })} /></Field>
        <Field label="Employer contribution rate (%)"><NumberInput min={0} step="0.01" value={v.employerContributionRate} onChange={employerContributionRate => onChange({ employerContributionRate })} /></Field>
      </FormGrid>
      <Toggle checked={v.includeEmployerInSalaryStructure} onChange={includeEmployerInSalaryStructure => onChange({ includeEmployerInSalaryStructure })} label="Include employer contribution in salary structure (CTC)" />
    </div>
    <SaveBar onSave={onSave} busy={busy} label="ESI" />
  </Section>;
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="inline-grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">{children}</button>;
}

function PtSection({ v, onChange, onSave, busy }: SectionProps<Pt>) {
  const setState = (i: number, patch: Partial<PtState>) => onChange({ states: v.states.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setSlab = (i: number, k: number, patch: Partial<PtSlab>) => setState(i, { ptSlabs: v.states[i].ptSlabs.map((s, j) => (j === k ? { ...s, ...patch } : s)) });
  return <Section title="Professional Tax (PT)" subtitle="State-wise slabs on monthly gross. Employees use their PT state." right={<EnabledBadge on={v.isEnabled} />}>
    <div className="p-5 space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <Toggle checked={v.isEnabled} onChange={isEnabled => onChange({ isEnabled })} label="Enable Professional Tax" />
        <Field label="Deduction cycle" className="w-48"><Select value={v.deductionCycle} onChange={d => onChange({ deductionCycle: d as Pt['deductionCycle'] })} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'half-yearly', label: 'Half-yearly' }]} /></Field>
      </div>
      {v.states.length === 0 && <p className="text-xs text-gray-500">No states configured. Add each state where you have employees liable for PT.</p>}
      {v.states.map((s, i) => <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="State" className="flex-1 min-w-[180px]"><TextInput list={STATES_DATALIST_ID} value={s.stateName} onChange={stateName => setState(i, { stateName })} /></Field>
          <Field label="PT registration number" className="flex-1 min-w-[180px]"><TextInput value={s.ptNumber} onChange={ptNumber => setState(i, { ptNumber })} /></Field>
          <div className="pb-2"><Toggle checked={s.isApplicable} onChange={isApplicable => setState(i, { isApplicable })} label="Applicable" /></div>
          <IconBtn label={`Remove ${s.stateName || 'state'}`} onClick={() => onChange({ states: v.states.filter((_, j) => j !== i) })}><Trash2 size={15} /></IconBtn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[420px]">
            <thead className="text-gray-500"><tr><th className="text-left font-semibold py-1">Salary from (₹)</th><th className="text-left font-semibold py-1">Salary to (₹)</th><th className="text-left font-semibold py-1">Tax amount (₹)</th><th /></tr></thead>
            <tbody>
              {s.ptSlabs.map((slab, k) => <tr key={k}>
                <td className="pr-2 py-1"><NumberInput aria-label="Salary from" min={0} value={slab.salaryRangeFrom} onChange={salaryRangeFrom => setSlab(i, k, { salaryRangeFrom })} /></td>
                <td className="pr-2 py-1"><NumberInput aria-label="Salary to" min={0} value={slab.salaryRangeTo} onChange={salaryRangeTo => setSlab(i, k, { salaryRangeTo })} /></td>
                <td className="pr-2 py-1"><NumberInput aria-label="Tax amount" min={0} value={slab.taxAmount} onChange={taxAmount => setSlab(i, k, { taxAmount })} /></td>
                <td className="w-8"><IconBtn label="Remove slab" onClick={() => setState(i, { ptSlabs: s.ptSlabs.filter((_, j) => j !== k) })}><Trash2 size={14} /></IconBtn></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <Btn variant="ghost" onClick={() => { const last = s.ptSlabs.at(-1); setState(i, { ptSlabs: [...s.ptSlabs, { salaryRangeFrom: last ? last.salaryRangeTo + 1 : 0, salaryRangeTo: 0, taxAmount: 0 }] }); }}><Plus size={14} />Add slab</Btn>
      </div>)}
      <Btn variant="secondary" onClick={() => onChange({ states: [...v.states, { stateName: '', ptNumber: '', isApplicable: true, ptSlabs: [] }] })}><Plus size={14} />Add state</Btn>
    </div>
    <SaveBar onSave={onSave} busy={busy} label="Professional Tax" />
  </Section>;
}

function MonthChips({ value, onChange, label }: { value: string[]; onChange: (m: string[]) => void; label: string }) {
  return <fieldset>
    <legend className="text-xs font-medium text-gray-600 mb-1">{label}</legend>
    <div className="flex flex-wrap gap-1">
      {MONTHS.map(m => {
        const on = value.includes(m);
        return <button key={m} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter(x => x !== m) : MONTHS.filter(x => x === m || value.includes(x)))}
          className={`h-8 px-2.5 rounded-lg text-xs font-semibold border ${on ? 'bg-blue-50 border-blue-200 text-[var(--color-bss-interactive-blue)]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{m}</button>;
      })}
    </div>
  </fieldset>;
}

function LwfSection({ v, onChange, onSave, busy }: SectionProps<Lwf>) {
  const setState = (i: number, patch: Partial<LwfState>) => onChange({ states: v.states.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const newState = (): LwfState => ({ stateName: '', deductionCycle: (v.deductionCycle as LwfState['deductionCycle']) || 'half-yearly', periodFrom: 'Jun', periodTo: 'Dec', minAmount: 0, maxAmount: '', calculationType: 'fixed', employeeShare: 0, employerShare: 0, months: [], isApplicable: true, status: 'active' });
  return <Section title="Labour Welfare Fund (LWF)" subtitle="State-wise employee / employer shares deducted in the configured months." right={<EnabledBadge on={v.isEnabled} />}>
    <div className="p-5 space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <Toggle checked={v.isEnabled} onChange={isEnabled => onChange({ isEnabled })} label="Enable Labour Welfare Fund" />
        <Field label="Default deduction cycle" className="w-48"><Select value={v.deductionCycle} onChange={deductionCycle => onChange({ deductionCycle })} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'half-yearly', label: 'Half-yearly' }, { value: 'yearly', label: 'Yearly' }]} /></Field>
      </div>
      <MonthChips label="Organization-level deduction months (fallback when a state has none)" value={v.months} onChange={months => onChange({ months })} />
      {v.states.length === 0 && <p className="text-xs text-gray-500">No states configured. Add each state whose LWF Act applies to your employees.</p>}
      {v.states.map((s, i) => {
        const pct = s.calculationType === 'percentage';
        return <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-800">{s.stateName || 'New state'} <Badge status={s.status}>{s.status}</Badge></p>
            <IconBtn label={`Remove ${s.stateName || 'state'}`} onClick={() => onChange({ states: v.states.filter((_, j) => j !== i) })}><Trash2 size={15} /></IconBtn>
          </div>
          <FormGrid cols={4}>
            <Field label="State"><TextInput list={STATES_DATALIST_ID} value={s.stateName} onChange={stateName => setState(i, { stateName })} /></Field>
            <Field label="Deduction cycle"><Select value={s.deductionCycle} onChange={d => setState(i, { deductionCycle: d as LwfState['deductionCycle'] })} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'half-yearly', label: 'Half-yearly' }, { value: 'yearly', label: 'Yearly' }]} /></Field>
            <Field label={s.deductionCycle === 'yearly' ? 'Deduction month' : 'Period from / 1st month'}><Select disabled={s.deductionCycle === 'monthly'} value={s.periodFrom} onChange={periodFrom => setState(i, { periodFrom })} options={[...MONTHS]} /></Field>
            <Field label="Period to / 2nd month"><Select disabled={s.deductionCycle !== 'half-yearly'} value={s.periodTo} onChange={periodTo => setState(i, { periodTo })} options={[...MONTHS]} /></Field>
            <Field label="Calculation type"><Select value={s.calculationType} onChange={t => setState(i, { calculationType: t as LwfState['calculationType'] })} options={[{ value: 'fixed', label: 'Fixed amount (₹)' }, { value: 'percentage', label: '% of gross' }]} /></Field>
            <Field label={`Employee share ${pct ? '(%)' : '(₹)'}`}><NumberInput min={0} max={pct ? 100 : undefined} step="0.01" value={s.employeeShare} onChange={employeeShare => setState(i, { employeeShare })} /></Field>
            <Field label={`Employer share ${pct ? '(%)' : '(₹)'}`}><NumberInput min={0} max={pct ? 100 : undefined} step="0.01" value={s.employerShare} onChange={employerShare => setState(i, { employerShare })} /></Field>
            <Field label="Status"><Select value={s.status} onChange={st => setState(i, { status: st as LwfState['status'], isApplicable: st === 'active' })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></Field>
            <Field label="Minimum amount (₹)"><NumberInput min={0} value={s.minAmount} onChange={minAmount => setState(i, { minAmount })} /></Field>
            <Field label="Maximum amount (₹)" hint="Leave blank for no ceiling">
              <input type="number" min={0} className={inputClass} value={s.maxAmount} onChange={e => setState(i, { maxAmount: e.target.value === '' ? '' : Number(e.target.value) })} />
            </Field>
          </FormGrid>
          <MonthChips label="Deduction months (derived from the cycle when saved)" value={s.months} onChange={months => setState(i, { months })} />
        </div>;
      })}
      <Btn variant="secondary" onClick={() => onChange({ states: [...v.states, newState()] })}><Plus size={14} />Add state</Btn>
    </div>
    <SaveBar onSave={onSave} busy={busy} label="LWF" />
  </Section>;
}

function BonusSection({ v, onChange, onSave, busy }: SectionProps<Bonus>) {
  const setState = (i: number, patch: Partial<BonusState>) => onChange({ states: v.states.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setCat = (i: number, k: number, patch: Partial<WageCategory>) => setState(i, { wageCategories: v.states[i].wageCategories.map((w, j) => (j === k ? { ...w, ...patch } : w)) });
  return <Section title="Statutory Bonus" subtitle="Payment of Bonus Act, 1965 — % of max(minimum wage, minimum bonus wage) or Basic + DA." right={<EnabledBadge on={v.isEnabled} />}>
    <div className="p-5 space-y-4">
      <Toggle checked={v.isEnabled} onChange={isEnabled => onChange({ isEnabled })} label="Enable statutory bonus" />
      <FormGrid cols={3}>
        <Field label="Payment cycle"><Select value={v.paymentCycle} onChange={p => onChange({ paymentCycle: p as Bonus['paymentCycle'] })} options={[{ value: 'yearly', label: 'Yearly' }, { value: 'monthly', label: 'Monthly' }]} /></Field>
        <Field label="Payment month" hint="Used when the cycle is yearly"><Select disabled={v.paymentCycle !== 'yearly'} value={v.paymentMonth} onChange={paymentMonth => onChange({ paymentMonth })} options={[...MONTHS_LONG]} /></Field>
        <Field label="Bonus percentage (%)" hint="8.33% – 20%"><NumberInput min={0} max={100} step="0.01" value={v.percentage} onChange={percentage => onChange({ percentage })} /></Field>
        <Field label="Minimum bonus wage (₹ / month)"><NumberInput min={0} value={v.minimumBonusWage} onChange={minimumBonusWage => onChange({ minimumBonusWage })} /></Field>
        <Field label="Eligibility ceiling (₹ / month)" hint="Employees above this Basic + DA are not eligible"><NumberInput min={0} value={v.eligibilityCeiling} onChange={eligibilityCeiling => onChange({ eligibilityCeiling })} /></Field>
      </FormGrid>
      {v.states.length === 0 && <p className="text-xs text-gray-500">No state minimum wages configured — the minimum bonus wage is used for everyone.</p>}
      {v.states.map((s, i) => <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="State" className="flex-1 min-w-[180px]"><TextInput list={STATES_DATALIST_ID} value={s.stateName} onChange={stateName => setState(i, { stateName })} /></Field>
          <Field label="State minimum wage (₹ / month)" className="flex-1 min-w-[160px]"><NumberInput min={0} value={s.minWage} onChange={minWage => setState(i, { minWage })} /></Field>
          <Field label="Formula base" className="flex-1 min-w-[160px]"><Select value={s.formulaBase} onChange={f => setState(i, { formulaBase: f as BonusState['formulaBase'] })} options={[{ value: 'minimumWage', label: 'Minimum wage' }, { value: 'basicAndDA', label: 'Basic + DA' }]} /></Field>
          <IconBtn label={`Remove ${s.stateName || 'state'}`} onClick={() => onChange({ states: v.states.filter((_, j) => j !== i) })}><Trash2 size={15} /></IconBtn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[460px]">
            <thead className="text-gray-500"><tr><th className="text-left font-semibold py-1">Employment category</th><th className="text-left font-semibold py-1">Minimum wage (₹)</th><th className="text-left font-semibold py-1">Effective from</th><th /></tr></thead>
            <tbody>
              {s.wageCategories.map((w, k) => <tr key={k}>
                <td className="pr-2 py-1"><Select aria-label="Employment category" value={w.employmentCategory} onChange={employmentCategory => setCat(i, k, { employmentCategory })} options={[...EMPLOYMENT_CATEGORIES]} placeholder="Select…" /></td>
                <td className="pr-2 py-1"><NumberInput aria-label="Minimum wage" min={0} value={w.minWage} onChange={minWage => setCat(i, k, { minWage })} /></td>
                <td className="pr-2 py-1"><TextInput aria-label="Effective from" type="date" value={w.effectiveFrom} onChange={effectiveFrom => setCat(i, k, { effectiveFrom })} /></td>
                <td className="w-8"><IconBtn label="Remove category" onClick={() => setState(i, { wageCategories: s.wageCategories.filter((_, j) => j !== k) })}><Trash2 size={14} /></IconBtn></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <Btn variant="ghost" disabled={s.wageCategories.length >= 3} onClick={() => setState(i, { wageCategories: [...s.wageCategories, { employmentCategory: EMPLOYMENT_CATEGORIES.find(c => !s.wageCategories.some(w => w.employmentCategory === c.value))?.value ?? '', minWage: 0, effectiveFrom: '' }] })}><Plus size={14} />Add wage category</Btn>
      </div>)}
      <Btn variant="secondary" onClick={() => onChange({ states: [...v.states, { stateName: '', minWage: 0, formulaBase: 'minimumWage', wageCategories: [] }] })}><Plus size={14} />Add state</Btn>
    </div>
    <SaveBar onSave={onSave} busy={busy} label="Statutory Bonus" />
  </Section>;
}
