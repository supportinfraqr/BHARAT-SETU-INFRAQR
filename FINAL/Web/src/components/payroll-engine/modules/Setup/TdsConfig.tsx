"use client";

/**
 * TDS configuration (legacy tdsManagement.js createOrUpdateTDSConfig / getTDSConfig,
 * model models/payroll/tdsConfig.js). GET tds/config?financialYear= auto-creates defaults.
 */

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Btn, Field, FinancialYearPicker, FormGrid, NumberInput, Section, Select, currentFinancialYear, fmtDateTime, inputClass, money, useAction, useLoad } from '../../ui';

type Slab = { incomeFrom: number; incomeTo: number; taxRate: number };
type SurchargeSlab = { incomeFrom: number; incomeTo: number; surchargeRate: number };
type Limits = Record<string, number | null>;
type TdsConfig = {
  _id?: string; financialYear: string; taxRegime: 'old' | 'new';
  newRegimeSlabs: Slab[]; oldRegimeSlabs: Slab[]; oldRegimeSlabsSenior: Slab[]; oldRegimeSlabsSuperSenior: Slab[];
  standardDeduction: number; standardDeductionOld: number; section80CLimit: number;
  surchargeSlabs: SurchargeSlab[]; surchargeSlabsOld: SurchargeSlab[]; healthEducationCess: number;
  rebateLimit: number; rebateAmount: number; rebateLimitOld: number; rebateAmountOld: number; exemptionLimits: Limits; updatedAt?: string;
};

/** Every key of tdsConfig.exemptionLimits with a readable label (nullable = "no cap" allowed). */
const LIMIT_GROUPS: Array<{ title: string; items: Array<[string, string, boolean?]> }> = [
  { title: 'Section 80D — health insurance', items: [['section80D', '80D overall'], ['section80DSelf', '80D self / family'], ['section80DSenior', '80D senior citizen'], ['section80DPreventive', 'Preventive health check-up']] },
  { title: 'Chapter VI-A deductions', items: [
    ['section80E', '80E education loan interest', true], ['section80G', '80G donations', true], ['section80CCD1Percent', '80CCD(1) — % of salary'],
    ['section80CCD1B', '80CCD(1B) NPS'], ['section80CCD2Percent', '80CCD(2) employer NPS — % (new regime)'], ['section80CCD2PercentOld', '80CCD(2) employer NPS — % (old regime)'],
    ['section80DD', '80DD disabled dependant'], ['section80DDSevere', '80DD severe disability'], ['section80DDB', '80DDB medical treatment'], ['section80DDBSenior', '80DDB senior citizen'],
    ['section80EE', '80EE home loan interest'], ['section80EEA', '80EEA affordable housing'], ['section80GGMonthly', '80GG rent — per month'], ['section80GGA', '80GGA scientific research', true],
    ['section80GGC', '80GGC political donation', true], ['section80TTA', '80TTA savings interest'], ['section80TTB', '80TTB senior interest'], ['section80U', '80U self disability'],
    ['section80USevere', '80U severe disability'], ['section24', 'Section 24 home loan interest'], ['otherDeductions', 'Other deductions', true],
  ] },
  { title: 'Section 10 exemptions & allowances', items: [
    ['childrenEducationPerMonth', 'Children education — per child / month'], ['childrenEducationMaxChildren', 'Children education — max children'], ['childrenEducationAnnualCap', 'Children education — annual cap'],
    ['hostelPerMonth', 'Hostel — per child / month'], ['hostelMaxChildren', 'Hostel — max children'], ['hostelAnnualCap', 'Hostel — annual cap'],
    ['lta', 'Leave travel allowance', true], ['disabledTransportPerMonth', 'Transport (disabled) — per month'], ['gratuity', 'Gratuity exemption'],
    ['leaveEncashment', 'Leave encashment exemption'], ['retrenchment', 'Retrenchment compensation'], ['vrs', 'VRS compensation'], ['officialDuty', 'Official duty allowances', true], ['lifeInsurance', 'Life insurance', true],
  ] },
];

export default function TdsConfigTab({ notify }: Pick<ModuleProps, 'notify'>) {
  const [fy, setFy] = useState(currentFinancialYear());
  const state = useLoad(() => pe.get<TdsConfig>('tds/config', { financialYear: fy }), [fy]);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
      <FinancialYearPicker value={fy} onChange={setFy} />
      <p className="text-xs text-gray-500">Tax slabs and limits used for TDS projections, Form 16 and the employee tax calculator. Defaults are created for a new financial year.</p>
    </div>
    <Async state={state}>{c => <TdsForm key={`${c._id ?? fy}-${c.updatedAt ?? ''}`} initial={c} fy={fy} notify={notify} onSaved={state.reload} />}</Async>
  </div>;
}

function TdsForm({ initial, fy, notify, onSaved }: { initial: TdsConfig; fy: string; notify: ModuleProps['notify']; onSaved: () => void }) {
  const [c, setC] = useState<TdsConfig>({ ...initial, exemptionLimits: { ...(initial.exemptionLimits ?? {}) } });
  const { busy, run } = useAction(notify);
  const set = (patch: Partial<TdsConfig>) => setC(prev => ({ ...prev, ...patch }));

  const save = async () => {
    const { _id, updatedAt, ...rest } = c;
    void _id; void updatedAt;
    const body = { ...rest, financialYear: fy };
    const ok = await run(() => pe.post('tds/config', body), 'TDS configuration saved successfully');
    if (ok !== undefined) onSaved();
  };

  return <div className="space-y-4">
    <Section title={`General — FY ${fy}`} subtitle={initial.updatedAt ? `Last updated ${fmtDateTime(initial.updatedAt)}` : undefined}>
      <div className="p-5">
        <FormGrid cols={3}>
          <Field label="Default tax regime"><Select value={c.taxRegime} onChange={v => set({ taxRegime: v as TdsConfig['taxRegime'] })} options={[{ value: 'new', label: 'New regime (115BAC)' }, { value: 'old', label: 'Old regime' }]} /></Field>
          <Field label="Health & education cess (%)"><NumberInput min={0} step="0.01" value={c.healthEducationCess} onChange={healthEducationCess => set({ healthEducationCess })} /></Field>
          <Field label="Section 80C limit (₹)"><NumberInput min={0} value={c.section80CLimit} onChange={section80CLimit => set({ section80CLimit })} /></Field>
          <Field label="Standard deduction — new regime (₹)"><NumberInput min={0} value={c.standardDeduction} onChange={standardDeduction => set({ standardDeduction })} /></Field>
          <Field label="Rebate 87A limit — new regime (₹)"><NumberInput min={0} value={c.rebateLimit} onChange={rebateLimit => set({ rebateLimit })} /></Field>
          <Field label="Rebate 87A amount — new regime (₹)"><NumberInput min={0} value={c.rebateAmount} onChange={rebateAmount => set({ rebateAmount })} /></Field>
          <Field label="Standard deduction — old regime (₹)"><NumberInput min={0} value={c.standardDeductionOld} onChange={standardDeductionOld => set({ standardDeductionOld })} /></Field>
          <Field label="Rebate 87A limit — old regime (₹)"><NumberInput min={0} value={c.rebateLimitOld} onChange={rebateLimitOld => set({ rebateLimitOld })} /></Field>
          <Field label="Rebate 87A amount — old regime (₹)"><NumberInput min={0} value={c.rebateAmountOld} onChange={rebateAmountOld => set({ rebateAmountOld })} /></Field>
        </FormGrid>
      </div>
    </Section>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <SlabEditor title="New regime slabs" rows={c.newRegimeSlabs ?? []} rateKey="taxRate" onChange={newRegimeSlabs => set({ newRegimeSlabs })} />
      <SlabEditor title="Old regime slabs — below 60" rows={c.oldRegimeSlabs ?? []} rateKey="taxRate" onChange={oldRegimeSlabs => set({ oldRegimeSlabs })} />
      <SlabEditor title="Old regime slabs — senior (60–79)" rows={c.oldRegimeSlabsSenior ?? []} rateKey="taxRate" onChange={oldRegimeSlabsSenior => set({ oldRegimeSlabsSenior })} />
      <SlabEditor title="Old regime slabs — super senior (80+)" rows={c.oldRegimeSlabsSuperSenior ?? []} rateKey="taxRate" onChange={oldRegimeSlabsSuperSenior => set({ oldRegimeSlabsSuperSenior })} />
      <SlabEditor title="Surcharge — new regime" rows={c.surchargeSlabs ?? []} rateKey="surchargeRate" onChange={surchargeSlabs => set({ surchargeSlabs })} />
      <SlabEditor title="Surcharge — old regime" rows={c.surchargeSlabsOld ?? []} rateKey="surchargeRate" onChange={surchargeSlabsOld => set({ surchargeSlabsOld })} />
    </div>

    <Section title="Deduction & exemption limits" subtitle="Caps applied to employee declarations. Blank on an optional head means no cap.">
      <div className="p-5 space-y-5">
        {LIMIT_GROUPS.map(g => <div key={g.title}>
          <p className="text-xs font-semibold text-gray-700 mb-2">{g.title}</p>
          <FormGrid cols={3}>
            {g.items.map(([key, label, nullable]) => <Field key={key} label={label} hint={nullable ? 'Blank = no cap' : undefined}>
              <input type="number" min={0} className={inputClass} value={c.exemptionLimits[key] ?? ''}
                onChange={e => set({ exemptionLimits: { ...c.exemptionLimits, [key]: e.target.value === '' ? (nullable ? null : 0) : Number(e.target.value) } })} />
            </Field>)}
          </FormGrid>
        </div>)}
      </div>
    </Section>

    <div className="sticky bottom-2 z-10 flex justify-end"><Btn busy={busy} onClick={() => void save()} className="shadow-lg">Save TDS configuration</Btn></div>
  </div>;
}

function SlabEditor<K extends 'taxRate' | 'surchargeRate'>({ title, rows, rateKey, onChange }: { title: string; rows: Array<{ incomeFrom: number; incomeTo: number } & Record<K, number>>; rateKey: K; onChange: (rows: Array<{ incomeFrom: number; incomeTo: number } & Record<K, number>>) => void }) {
  type R = { incomeFrom: number; incomeTo: number } & Record<K, number>;
  const upd = (i: number, patch: Partial<R>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return <Section title={title} right={<span className="text-[11px] text-gray-400">{rows.length} slabs</span>}>
    <div className="p-4 overflow-x-auto">
      <table className="w-full text-xs min-w-[380px]">
        <thead className="text-gray-500"><tr><th className="text-left font-semibold py-1">Income from (₹)</th><th className="text-left font-semibold py-1">Income to (₹)</th><th className="text-left font-semibold py-1">{rateKey === 'taxRate' ? 'Tax rate (%)' : 'Surcharge (%)'}</th><th /></tr></thead>
        <tbody>
          {rows.map((r, i) => <tr key={i}>
            <td className="pr-2 py-1"><NumberInput aria-label="Income from" min={0} value={r.incomeFrom} onChange={incomeFrom => upd(i, { incomeFrom } as Partial<R>)} /></td>
            <td className="pr-2 py-1"><NumberInput aria-label="Income to" min={0} value={r.incomeTo} onChange={incomeTo => upd(i, { incomeTo } as Partial<R>)} title={money(r.incomeTo)} /></td>
            <td className="pr-2 py-1"><NumberInput aria-label="Rate" min={0} max={100} step="0.01" value={r[rateKey]} onChange={v => upd(i, { [rateKey]: v } as Partial<R>)} /></td>
            <td className="w-8"><button type="button" aria-label="Remove slab" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="inline-grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button></td>
          </tr>)}
        </tbody>
      </table>
      <Btn variant="ghost" className="mt-2" onClick={() => { const last = rows.at(-1); onChange([...rows, { incomeFrom: last ? last.incomeTo : 0, incomeTo: 0, [rateKey]: 0 } as R]); }}><Plus size={14} />Add slab</Btn>
      <p className="text-[11px] text-gray-400 mt-1">Use a very large &quot;to&quot; value (e.g. 9999999999) for the top slab.</p>
    </div>
  </Section>;
}
