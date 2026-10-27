"use client";

/** FY tax configuration: GET / POST tds/config (slabs, surcharge, cess, rebate, standard deduction, caps). */

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import { Async, Btn, Field, FormGrid, NumberInput, Section, Select, TextInput, useAction, useLoad, type Notify } from '../../ui';

type Slab = { incomeFrom: number; incomeTo: number; taxRate?: number; surchargeRate?: number };
type TdsConfig = {
  _id?: string; financialYear: string; taxRegime: 'old' | 'new';
  newRegimeSlabs: Slab[]; oldRegimeSlabs: Slab[]; oldRegimeSlabsSenior: Slab[]; oldRegimeSlabsSuperSenior: Slab[];
  surchargeSlabs: Slab[]; surchargeSlabsOld: Slab[];
  standardDeduction: number; standardDeductionOld: number; section80CLimit: number; healthEducationCess: number;
  rebateLimit: number; rebateAmount: number; rebateLimitOld: number; rebateAmountOld: number;
  exemptionLimits: Record<string, number | null>;
  updatedAt?: string;
};

const LIMIT_LABELS: Record<string, string> = {
  section80D: '80D combined cap', section80DSelf: '80D self (below 60)', section80DSenior: '80D senior citizen', section80DPreventive: '80D preventive check-up',
  section80E: '80E', section80G: '80G', section80CCD1Percent: '80CCD(1) % of salary', section80CCD1B: '80CCD(1B)', section80CCD2Percent: '80CCD(2) % (new)', section80CCD2PercentOld: '80CCD(2) % (old)',
  section80DD: '80DD', section80DDSevere: '80DD severe', section80DDB: '80DDB', section80DDBSenior: '80DDB senior', section80U: '80U', section80USevere: '80U severe',
  section80EE: '80EE', section80EEA: '80EEA', section80GGMonthly: '80GG per month', section80GGA: '80GGA', section80GGC: '80GGC', section80TTA: '80TTA', section80TTB: '80TTB',
  section24: '24(b) self-occupied', otherDeductions: 'Other deductions', childrenEducationPerMonth: 'Children education / child / month', childrenEducationMaxChildren: 'Children education max children',
  childrenEducationAnnualCap: 'Children education annual cap', hostelPerMonth: 'Hostel / child / month', hostelMaxChildren: 'Hostel max children', hostelAnnualCap: 'Hostel annual cap',
  lta: 'LTA', disabledTransportPerMonth: 'Transport (disabled) / month', gratuity: 'Gratuity', leaveEncashment: 'Leave encashment', retrenchment: 'Retrenchment', vrs: 'VRS',
  officialDuty: 'Official duty allowance', lifeInsurance: 'Life insurance 10(10D)',
};

function SlabTable({ title, slabs, rateKey, onChange }: { title: string; slabs: Slab[]; rateKey: 'taxRate' | 'surchargeRate'; onChange: (s: Slab[]) => void }) {
  const set = (i: number, patch: Partial<Slab>) => onChange(slabs.map((s, j) => j === i ? { ...s, ...patch } : s));
  return <div className="space-y-2">
    <div className="flex items-center justify-between"><h4 className="text-xs font-semibold text-gray-700">{title}</h4>
      <Btn variant="ghost" onClick={() => onChange([...slabs, { incomeFrom: slabs.at(-1)?.incomeTo ?? 0, incomeTo: 0, [rateKey]: 0 }])}><Plus size={14} />Add slab</Btn></div>
    {slabs.map((s, i) => <div key={i} className="grid grid-cols-[1fr_1fr_90px_auto] gap-2 items-center">
      <NumberInput aria-label={`${title} slab ${i + 1} from`} value={s.incomeFrom} min={0} onChange={v => set(i, { incomeFrom: v })} />
      <NumberInput aria-label={`${title} slab ${i + 1} to`} value={s.incomeTo} min={0} onChange={v => set(i, { incomeTo: v })} />
      <NumberInput aria-label={`${title} slab ${i + 1} rate %`} value={s[rateKey] ?? 0} min={0} step="0.01" onChange={v => set(i, { [rateKey]: v })} />
      <button type="button" aria-label="Remove slab" onClick={() => onChange(slabs.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
    </div>)}
    <p className="text-[11px] text-gray-400">From · To · Rate %</p>
  </div>;
}

function ConfigForm({ initial, financialYear, notify, onSaved }: { initial: TdsConfig; financialYear: string; notify: Notify; onSaved: (c: TdsConfig) => void }) {
  const [cfg, setCfg] = useState<TdsConfig>(initial);
  const { busy, run } = useAction(notify);
  const set = (patch: Partial<TdsConfig>) => setCfg(c => ({ ...c, ...patch }));
  const limits = cfg.exemptionLimits ?? {};
  async function save() {
    const { _id: _ignored, updatedAt: _u, ...rest } = cfg;
    void _ignored; void _u;
    const out = await run(() => pe.post<TdsConfig>('tds/config', { ...rest, financialYear }), 'TDS configuration saved');
    if (out) onSaved(out);
  }
  return <div className="p-5 space-y-6">
    <FormGrid cols={4}>
      <Field label="Default regime"><Select value={cfg.taxRegime} options={[{ value: 'new', label: 'New regime' }, { value: 'old', label: 'Old regime' }]} onChange={v => set({ taxRegime: v as 'old' | 'new' })} /></Field>
      <Field label="Standard deduction (new)"><NumberInput value={cfg.standardDeduction} min={0} onChange={v => set({ standardDeduction: v })} /></Field>
      <Field label="Standard deduction (old)"><NumberInput value={cfg.standardDeductionOld} min={0} onChange={v => set({ standardDeductionOld: v })} /></Field>
      <Field label="80C limit"><NumberInput value={cfg.section80CLimit} min={0} onChange={v => set({ section80CLimit: v })} /></Field>
      <Field label="Health & education cess %"><NumberInput value={cfg.healthEducationCess} min={0} onChange={v => set({ healthEducationCess: v })} /></Field>
      <Field label="87A rebate limit (new)"><NumberInput value={cfg.rebateLimit} min={0} onChange={v => set({ rebateLimit: v })} /></Field>
      <Field label="87A rebate amount (new)"><NumberInput value={cfg.rebateAmount} min={0} onChange={v => set({ rebateAmount: v })} /></Field>
      <Field label="87A rebate limit (old)"><NumberInput value={cfg.rebateLimitOld} min={0} onChange={v => set({ rebateLimitOld: v })} /></Field>
      <Field label="87A rebate amount (old)"><NumberInput value={cfg.rebateAmountOld} min={0} onChange={v => set({ rebateAmountOld: v })} /></Field>
    </FormGrid>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SlabTable title="New regime slabs" rateKey="taxRate" slabs={cfg.newRegimeSlabs ?? []} onChange={v => set({ newRegimeSlabs: v })} />
      <SlabTable title="Old regime slabs (below 60)" rateKey="taxRate" slabs={cfg.oldRegimeSlabs ?? []} onChange={v => set({ oldRegimeSlabs: v })} />
      <SlabTable title="Old regime slabs (60–79)" rateKey="taxRate" slabs={cfg.oldRegimeSlabsSenior ?? []} onChange={v => set({ oldRegimeSlabsSenior: v })} />
      <SlabTable title="Old regime slabs (80+)" rateKey="taxRate" slabs={cfg.oldRegimeSlabsSuperSenior ?? []} onChange={v => set({ oldRegimeSlabsSuperSenior: v })} />
      <SlabTable title="Surcharge (new regime)" rateKey="surchargeRate" slabs={cfg.surchargeSlabs ?? []} onChange={v => set({ surchargeSlabs: v })} />
      <SlabTable title="Surcharge (old regime)" rateKey="surchargeRate" slabs={cfg.surchargeSlabsOld ?? []} onChange={v => set({ surchargeSlabsOld: v })} />
    </div>
    <div>
      <h4 className="text-xs font-semibold text-gray-700 mb-2">Deduction & exemption caps <span className="font-normal text-gray-400">(blank = no cap)</span></h4>
      <FormGrid cols={4}>
        {Object.keys({ ...LIMIT_LABELS, ...limits }).map(k => <Field key={k} label={LIMIT_LABELS[k] ?? k}>
          <TextInput type="number" min={0} value={limits[k] ?? ''} onChange={v => set({ exemptionLimits: { ...limits, [k]: v === '' ? null : Number(v) } })} />
        </Field>)}
      </FormGrid>
    </div>
    <div className="flex justify-end"><Btn busy={busy} onClick={save}>Save configuration</Btn></div>
  </div>;
}

export function TdsConfigPanel({ financialYear, notify }: { financialYear: string; notify: Notify }) {
  const state = useLoad(() => pe.get<TdsConfig>('tds/config', { financialYear }), [financialYear]);
  return <Section title="Income tax configuration" subtitle={`FY ${financialYear} — slabs and limits used by every TDS calculation (defaults are created automatically)`}>
    <Async state={state}>{cfg => <ConfigForm key={`${cfg._id}-${cfg.updatedAt}`} initial={cfg} financialYear={financialYear} notify={notify} onSaved={c => state.setData(c)} />}</Async>
  </Section>;
}
