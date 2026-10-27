"use client";

/**
 * Bank / statutory / PAN / job corrections — BSS endpoint PUT employees/:id/profile.
 * Edited fields are locked against the next BSS sync.
 */

import { useState } from 'react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps, PayrollEmployee } from '@/lib/payroll-engine/types';
import { Btn, Field, FormGrid, Section, Select, TextInput, Toggle, fmtDate, inputClass, useAction } from '../../ui';
import { EMPLOYMENT_CATEGORIES, INDIAN_STATES, STATES_DATALIST_ID } from '../Setup/constants';

type Bank = { bankName: string; branchName: string; ifscCode: string; bankAccountNumber: string; confirmBankAccountNumber: string; accountHolderName: string; accountType: string; bankCode: string; bankCountry: string; swiftCode: string; isVerified: boolean };
type EpfOverride = PayrollEmployee['statutoryInfo']['epfOverride'];
type Stat = Omit<PayrollEmployee['statutoryInfo'], 'epfOverride'> & { epfOverride: EpfOverride };

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));

export default function ProfileTab({ employee, notify, onSaved }: { employee: PayrollEmployee; notify: ModuleProps['notify']; onSaved: (e: PayrollEmployee) => void }) {
  const b = employee.bankInfo ?? ({} as PayrollEmployee['bankInfo']);
  const st = employee.statutoryInfo ?? ({} as PayrollEmployee['statutoryInfo']);
  const [job, setJob] = useState({ customId: employee.customId ?? '', jobTitle: employee.jobTitle ?? '', department: employee.department ?? '', employeeType: employee.employeeType ?? '', categoryName: employee.categoryName ?? '' });
  const [bank, setBank] = useState<Bank>({
    bankName: s(b.bankName), branchName: s(b.branchName), ifscCode: s(b.ifscCode), bankAccountNumber: s(b.bankAccountNumber), confirmBankAccountNumber: s(b.confirmBankAccountNumber ?? b.bankAccountNumber),
    accountHolderName: s(b.accountHolderName), accountType: s(b.accountType), bankCode: s(b.bankCode), bankCountry: s(b.bankCountry), swiftCode: s(b.swiftCode), isVerified: !!b.isVerified,
  });
  const [stat, setStat] = useState<Stat>({
    pfAccountNumber: st.pfAccountNumber ?? '', uan: st.uan ?? '', esiNumber: st.esiNumber ?? '', esiApplicable: st.esiApplicable !== false, esiOptedOut: !!st.esiOptedOut,
    ptApplicable: !!st.ptApplicable, ptState: st.ptState ?? '', gratuityApplicable: !!st.gratuityApplicable, lwfApplicable: st.lwfApplicable !== false, lwfState: st.lwfState ?? '',
    employmentCategory: st.employmentCategory ?? '', epfApplicable: st.epfApplicable !== false,
    epfOverride: { enabled: !!st.epfOverride?.enabled, employeeContributionRate: st.epfOverride?.employeeContributionRate ?? null, employerContributionRate: st.epfOverride?.employerContributionRate ?? null, restrictedPfWage: st.epfOverride?.restrictedPfWage ?? null, applyCeiling: st.epfOverride?.applyCeiling !== false },
  });
  const [nid, setNid] = useState({ pan: s(employee.nationalID?.pan), nameInPan: s(employee.nationalID?.nameInPan) });
  const { busy, run } = useAction(notify);
  const ov = stat.epfOverride;
  const setOv = (patch: Partial<EpfOverride>) => setStat(x => ({ ...x, epfOverride: { ...x.epfOverride, ...patch } }));

  const save = async () => {
    if (bank.bankAccountNumber !== bank.confirmBankAccountNumber) { notify('Bank account numbers do not match', 'error'); return; }
    if (bank.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifscCode)) { notify('IFSC must be 11 characters, e.g. HDFC0001234', 'error'); return; }
    if (nid.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(nid.pan)) { notify('PAN must be in the format ABCDE1234F', 'error'); return; }
    if (stat.uan && !/^\d{12}$/.test(stat.uan)) { notify('UAN must be 12 digits', 'error'); return; }
    const out = await run(() => pe.put<PayrollEmployee>(`employees/${employee._id}/profile`, { ...job, bankInfo: bank, statutoryInfo: stat, nationalID: nid }), 'Employee payroll profile updated');
    if (out) onSaved(out);
  };
  const nullableNum = (v: number | null, on: (n: number | null) => void, label: string, hint?: string) => <Field label={label} hint={hint}>
    <input type="number" min={0} step="0.01" className={inputClass} disabled={!ov.enabled} value={v ?? ''} placeholder="Org default" onChange={e => on(e.target.value === '' ? null : Number(e.target.value))} />
  </Field>;

  return <div className="space-y-4">
    <datalist id={STATES_DATALIST_ID}>{INDIAN_STATES.map(x => <option key={x} value={x} />)}</datalist>
    <p className="text-[11px] text-gray-400">Corrections made here are kept when employees are re-synced from BSS.</p>
    <Section title="Job details">
      <div className="p-5"><FormGrid cols={3}>
        <Field label="Employee code"><TextInput value={job.customId} onChange={customId => setJob(x => ({ ...x, customId }))} /></Field>
        <Field label="Job title"><TextInput value={job.jobTitle} onChange={jobTitle => setJob(x => ({ ...x, jobTitle }))} /></Field>
        <Field label="Department"><TextInput value={job.department} onChange={department => setJob(x => ({ ...x, department }))} /></Field>
        <Field label="Employee type"><TextInput value={job.employeeType} onChange={employeeType => setJob(x => ({ ...x, employeeType }))} /></Field>
        <Field label="Category"><TextInput value={job.categoryName} onChange={categoryName => setJob(x => ({ ...x, categoryName }))} /></Field>
      </FormGrid></div>
    </Section>
    <Section title="Bank account" subtitle={b.verifiedOn ? `Verified on ${fmtDate(b.verifiedOn)}` : undefined}>
      <div className="p-5 space-y-3"><FormGrid cols={3}>
        <Field label="Account holder name"><TextInput value={bank.accountHolderName} onChange={accountHolderName => setBank(x => ({ ...x, accountHolderName }))} /></Field>
        <Field label="Account number"><TextInput inputMode="numeric" value={bank.bankAccountNumber} onChange={bankAccountNumber => setBank(x => ({ ...x, bankAccountNumber: bankAccountNumber.replace(/\s/g, '') }))} /></Field>
        <Field label="Confirm account number"><TextInput inputMode="numeric" value={bank.confirmBankAccountNumber} onChange={confirmBankAccountNumber => setBank(x => ({ ...x, confirmBankAccountNumber: confirmBankAccountNumber.replace(/\s/g, '') }))} /></Field>
        <Field label="IFSC"><TextInput value={bank.ifscCode} onChange={ifscCode => setBank(x => ({ ...x, ifscCode: ifscCode.toUpperCase().trim() }))} maxLength={11} /></Field>
        <Field label="Bank name"><TextInput value={bank.bankName} onChange={bankName => setBank(x => ({ ...x, bankName }))} /></Field>
        <Field label="Branch"><TextInput value={bank.branchName} onChange={branchName => setBank(x => ({ ...x, branchName }))} /></Field>
        <Field label="Account type"><Select value={bank.accountType} onChange={accountType => setBank(x => ({ ...x, accountType }))} options={['Savings', 'Current', 'Salary']} placeholder="—" /></Field>
        <Field label="Bank code"><TextInput value={bank.bankCode} onChange={bankCode => setBank(x => ({ ...x, bankCode }))} /></Field>
        <Field label="Bank country"><TextInput value={bank.bankCountry} onChange={bankCountry => setBank(x => ({ ...x, bankCountry }))} /></Field>
        <Field label="SWIFT code" hint="International employees"><TextInput value={bank.swiftCode} onChange={swiftCode => setBank(x => ({ ...x, swiftCode: swiftCode.toUpperCase() }))} /></Field>
      </FormGrid>
      <Toggle checked={bank.isVerified} onChange={isVerified => setBank(x => ({ ...x, isVerified }))} label="Bank account verified" /></div>
    </Section>
    <Section title="PAN">
      <div className="p-5"><FormGrid cols={2}>
        <Field label="PAN"><TextInput value={nid.pan} maxLength={10} onChange={pan => setNid(x => ({ ...x, pan: pan.toUpperCase().trim() }))} /></Field>
        <Field label="Name as per PAN"><TextInput value={nid.nameInPan} onChange={nameInPan => setNid(x => ({ ...x, nameInPan }))} /></Field>
      </FormGrid></div>
    </Section>
    <Section title="Statutory">
      <div className="p-5 space-y-4">
        <FormGrid cols={3}>
          <Field label="PF account number"><TextInput value={stat.pfAccountNumber} onChange={pfAccountNumber => setStat(x => ({ ...x, pfAccountNumber }))} /></Field>
          <Field label="UAN"><TextInput inputMode="numeric" maxLength={12} value={stat.uan} onChange={uan => setStat(x => ({ ...x, uan: uan.trim() }))} /></Field>
          <Field label="ESI number"><TextInput value={stat.esiNumber} onChange={esiNumber => setStat(x => ({ ...x, esiNumber }))} /></Field>
          <Field label="PT state"><TextInput list={STATES_DATALIST_ID} value={stat.ptState} onChange={ptState => setStat(x => ({ ...x, ptState }))} /></Field>
          <Field label="LWF state" hint="Falls back to PT state"><TextInput list={STATES_DATALIST_ID} value={stat.lwfState} onChange={lwfState => setStat(x => ({ ...x, lwfState }))} /></Field>
          <Field label="Employment category" hint="Statutory bonus minimum wage"><Select value={stat.employmentCategory} onChange={v => setStat(x => ({ ...x, employmentCategory: v as Stat['employmentCategory'] }))} options={[...EMPLOYMENT_CATEGORIES]} placeholder="Not set" /></Field>
        </FormGrid>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Toggle checked={stat.epfApplicable} onChange={epfApplicable => setStat(x => ({ ...x, epfApplicable }))} label="EPF applicable" />
          <Toggle checked={stat.esiApplicable} onChange={esiApplicable => setStat(x => ({ ...x, esiApplicable }))} label="ESI applicable" />
          <Toggle checked={stat.esiOptedOut} onChange={esiOptedOut => setStat(x => ({ ...x, esiOptedOut }))} label="Opted out of ESI" />
          <Toggle checked={stat.ptApplicable} onChange={ptApplicable => setStat(x => ({ ...x, ptApplicable }))} label="Professional tax applicable" />
          <Toggle checked={stat.lwfApplicable} onChange={lwfApplicable => setStat(x => ({ ...x, lwfApplicable }))} label="LWF applicable" />
          <Toggle checked={stat.gratuityApplicable} onChange={gratuityApplicable => setStat(x => ({ ...x, gratuityApplicable }))} label="Gratuity applicable" />
        </div>
        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <Toggle checked={ov.enabled} onChange={enabled => setOv({ enabled })} label="Employee-level EPF override" />
          <p className="text-[11px] text-gray-400">Honoured only when &quot;Allow employee-level EPF override&quot; is on in Statutory compliance. Blank = organization default.</p>
          <FormGrid cols={4}>
            {nullableNum(ov.employeeContributionRate, employeeContributionRate => setOv({ employeeContributionRate }), 'Employee rate (%)')}
            {nullableNum(ov.employerContributionRate, employerContributionRate => setOv({ employerContributionRate }), 'Employer rate (%)')}
            {nullableNum(ov.restrictedPfWage, restrictedPfWage => setOv({ restrictedPfWage }), 'Restricted PF wage (₹)')}
            <div className="flex items-end pb-2"><Toggle disabled={!ov.enabled} checked={ov.applyCeiling} onChange={applyCeiling => setOv({ applyCeiling })} label="Apply wage ceiling" /></div>
          </FormGrid>
        </div>
      </div>
    </Section>
    <div className="flex justify-end"><Btn busy={busy} onClick={() => void save()}>Save profile</Btn></div>
  </div>;
}

