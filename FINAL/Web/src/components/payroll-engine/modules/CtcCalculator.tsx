"use client";

/**
 * CTC calculator (legacy controller/payroll/ctcCalculator.js):
 * POST ctc/fromGross { grossSalary }, ctc/fromCTC { ctc }, ctc/buildStructure { ctc, basicPercentage,
 * hraPercentage, customComponents[], state }, ctc/takeHome { ctc, taxRegime, declaredDeductions, state }.
 * Uses the org's statutory settings (and TDS config for take-home).
 */

import { useState } from 'react';
import { Calculator, Plus, Trash2 } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Btn, DataTable, Field, FormGrid, Kpi, KpiGrid, NumberInput, Row, Section, Select, Tabs, TextInput, inputClass, money, useAction } from '../ui';
import { INDIAN_STATES, STATES_DATALIST_ID } from './Setup/constants';

type FromGross = {
  monthlyGross: number; annualGross: number;
  employerContributions: { monthly: { epf: number; edli: number; adminCharges: number; esi: number; gratuity: number; statutoryBonus: number; lwf: number; total: number }; annual: number; annualBonus: number; annualLwfEmployer: number };
  ctc: { annual: number; monthly: number };
};
type FromCtc = { ctc: { annual: number; monthly: number }; gross: { annual: number; monthly: number }; components: { basic: number; hra: number; otherAllowances: number }; employerContributions: { annual: number; monthly: number } };
type Structure = { ctc: number; monthlyGross: number; earnings: Array<{ component: string; amount: number; percentage?: number }>; deductions: Array<{ component: string; amount: number; type?: 'employer' }>; summary: { totalEarnings: number; totalEmployeeDeductions: number; totalEmployerContributions: number; netPay: number } };
type TakeHome = { ctc: number; monthlyGross: number; annualGross: number; deductions: { monthly: { epf: number; esi: number; professionalTax: number; tds: number; total: number }; annual: number }; takeHome: { monthly: number; annual: number } };

const TABS = [
  { key: 'gross', label: 'Gross → CTC' },
  { key: 'ctc', label: 'CTC → Gross' },
  { key: 'structure', label: 'Build structure' },
  { key: 'takehome', label: 'Take-home' },
];

export default function CtcCalculator({ notify }: ModuleProps) {
  const [tab, setTab] = useState('gross');
  return <div className="space-y-4">
    <datalist id={STATES_DATALIST_ID}>{INDIAN_STATES.map(s => <option key={s} value={s} />)}</datalist>
    <div className="rounded-2xl border border-gray-200 bg-white px-4 pt-3">
      <h2 className="text-sm font-semibold text-gray-950">CTC calculator</h2>
      <p className="text-xs text-gray-500 mb-2">Quick offer-letter estimates using this organization&apos;s EPF, ESI, PT, LWF and bonus settings. For an employee&apos;s exact structure use Employees → Payroll info.</p>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
    </div>
    {tab === 'gross' && <GrossToCtc notify={notify} />}
    {tab === 'ctc' && <CtcToGross notify={notify} />}
    {tab === 'structure' && <BuildStructure notify={notify} />}
    {tab === 'takehome' && <TakeHomeCalc notify={notify} />}
  </div>;
}

type P = { notify: ModuleProps['notify'] };

function GrossToCtc({ notify }: P) {
  const [gross, setGross] = useState(0);
  const [r, setR] = useState<FromGross | null>(null);
  const { busy, run } = useAction(notify);
  return <Section title="CTC from gross" subtitle="Assumes Basic = 40% of gross and gratuity at 4.81% of Basic.">
    <form className="p-5 flex flex-wrap items-end gap-2" onSubmit={async e => {
      e.preventDefault();
      if (!(gross > 0)) { notify('Valid gross salary is required', 'error'); return; }
      const out = await run(() => pe.post<FromGross>('ctc/fromGross', { grossSalary: gross })); if (out) setR(out);
    }}>
      <Field label="Monthly gross salary (₹)" className="w-56"><NumberInput min={0} value={gross || ''} onChange={setGross} /></Field>
      <Btn type="submit" busy={busy}><Calculator size={14} />Calculate</Btn>
    </form>
    {r && <div className="px-5 pb-5 space-y-4">
      <KpiGrid>
        <Kpi label="Annual CTC" value={money(r.ctc.annual)} tone="text-[var(--color-bss-interactive-blue)]" />
        <Kpi label="Monthly CTC" value={money(r.ctc.monthly)} />
        <Kpi label="Annual gross" value={money(r.annualGross)} sub={`${money(r.monthlyGross)} / month`} />
        <Kpi label="Employer cost / year" value={money(r.employerContributions.annual)} />
      </KpiGrid>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Row label="EPF employer / month" value={money(r.employerContributions.monthly.epf)} />
        <Row label="EDLI / month" value={money(r.employerContributions.monthly.edli)} />
        <Row label="PF admin charges / month" value={money(r.employerContributions.monthly.adminCharges)} />
        <Row label="ESI employer / month" value={money(r.employerContributions.monthly.esi)} />
        <Row label="Gratuity / month" value={money(r.employerContributions.monthly.gratuity)} />
        <Row label="Monthly employer total" value={money(r.employerContributions.monthly.total)} />
        <Row label="Statutory bonus (monthly equivalent)" value={money(r.employerContributions.monthly.statutoryBonus)} />
        <Row label="Statutory bonus / year" value={money(r.employerContributions.annualBonus)} />
        <Row label="LWF employer (per deduction)" value={money(r.employerContributions.monthly.lwf)} />
        <Row label="LWF employer / year" value={money(r.employerContributions.annualLwfEmployer)} />
      </div>
    </div>}
  </Section>;
}

function CtcToGross({ notify }: P) {
  const [ctc, setCtc] = useState(0);
  const [r, setR] = useState<FromCtc | null>(null);
  const { busy, run } = useAction(notify);
  return <Section title="Gross from CTC" subtitle="Approximation: gross = CTC ÷ 1.25; Basic 40%, HRA 40%, other allowances 20% of gross.">
    <form className="p-5 flex flex-wrap items-end gap-2" onSubmit={async e => {
      e.preventDefault();
      if (!(ctc > 0)) { notify('Valid CTC is required', 'error'); return; }
      const out = await run(() => pe.post<FromCtc>('ctc/fromCTC', { ctc })); if (out) setR(out);
    }}>
      <Field label="Annual CTC (₹)" className="w-56"><NumberInput min={0} value={ctc || ''} onChange={setCtc} /></Field>
      <Btn type="submit" busy={busy}><Calculator size={14} />Calculate</Btn>
    </form>
    {r && <div className="px-5 pb-5 space-y-4">
      <KpiGrid>
        <Kpi label="Monthly gross" value={money(r.gross.monthly)} tone="text-[var(--color-bss-interactive-blue)]" />
        <Kpi label="Annual gross" value={money(r.gross.annual)} />
        <Kpi label="Monthly CTC" value={money(r.ctc.monthly)} sub={`Annual ${money(r.ctc.annual)}`} />
        <Kpi label="Employer contributions" value={money(r.employerContributions.annual)} sub={`${money(r.employerContributions.monthly)} / month`} />
      </KpiGrid>
      <DataTable rows={[['Basic', r.components.basic], ['HRA', r.components.hra], ['Other allowances', r.components.otherAllowances]] as Array<[string, number]>} rowKey={x => x[0]}
        columns={[{ key: 'c', label: 'Component (monthly)', render: x => x[0] }, { key: 'a', label: 'Amount', align: 'right', render: x => money(x[1]) }]}
        footer={<tr><td className="px-3 py-2">Gross</td><td className="px-3 py-2 text-right">{money(r.gross.monthly)}</td></tr>} />
    </div>}
  </Section>;
}

type Custom = { name: string; mode: 'amount' | 'percentage'; value: number };

function BuildStructure({ notify }: P) {
  const [f, setF] = useState({ ctc: 0, basicPercentage: 40, hraPercentage: 40, state: '' });
  const [custom, setCustom] = useState<Custom[]>([]);
  const [r, setR] = useState<Structure | null>(null);
  const { busy, run } = useAction(notify);
  const submit = async () => {
    if (!(f.ctc > 0)) { notify('Valid CTC is required', 'error'); return; }
    if (f.basicPercentage + f.hraPercentage > 100) { notify('Basic % + HRA % cannot exceed 100% of gross', 'error'); return; }
    if (custom.some(c => !c.name.trim())) { notify('Every custom component needs a name', 'error'); return; }
    const out = await run(() => pe.post<Structure>('ctc/buildStructure', {
      ctc: f.ctc, basicPercentage: f.basicPercentage, hraPercentage: f.hraPercentage, state: f.state || undefined,
      customComponents: custom.map(c => (c.mode === 'amount' ? { name: c.name.trim(), amount: c.value } : { name: c.name.trim(), percentage: c.value })),
    }));
    if (out) setR(out);
  };
  return <Section title="Build salary structure" subtitle="Split a CTC into Basic, HRA and custom components; the remainder becomes Other Extra Allowance.">
    <div className="p-5 space-y-4">
      <FormGrid cols={4}>
        <Field label="Annual CTC (₹) *"><NumberInput min={0} value={f.ctc || ''} onChange={ctc => setF(s => ({ ...s, ctc }))} /></Field>
        <Field label="Basic (% of gross)"><NumberInput min={0} max={100} value={f.basicPercentage} onChange={basicPercentage => setF(s => ({ ...s, basicPercentage }))} /></Field>
        <Field label="HRA (% of gross)"><NumberInput min={0} max={100} value={f.hraPercentage} onChange={hraPercentage => setF(s => ({ ...s, hraPercentage }))} /></Field>
        <Field label="State (PT / LWF)"><TextInput list={STATES_DATALIST_ID} value={f.state} onChange={state => setF(s => ({ ...s, state }))} /></Field>
      </FormGrid>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700">Custom components <span className="font-normal text-gray-400">(fixed ₹ / month, or % of the amount left after Basic + HRA)</span></p>
        {custom.map((c, i) => <div key={i} className="flex flex-wrap items-center gap-2">
          <input aria-label="Component name" className={`${inputClass} flex-1 min-w-[160px]`} placeholder="e.g. Conveyance" value={c.name} onChange={e => setCustom(s => s.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
          <select aria-label="Type" className={`${inputClass} w-36`} value={c.mode} onChange={e => setCustom(s => s.map((x, j) => (j === i ? { ...x, mode: e.target.value as Custom['mode'] } : x)))}><option value="amount">Amount (₹)</option><option value="percentage">% of remainder</option></select>
          <input aria-label="Value" type="number" min={0} className={`${inputClass} w-32`} value={c.value} onChange={e => setCustom(s => s.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) || 0 } : x)))} />
          <button type="button" aria-label="Remove component" onClick={() => setCustom(s => s.filter((_, j) => j !== i))} className="inline-grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
        </div>)}
        <Btn variant="ghost" onClick={() => setCustom(s => [...s, { name: '', mode: 'amount', value: 0 }])}><Plus size={14} />Add component</Btn>
      </div>
      <Btn busy={busy} onClick={() => void submit()}><Calculator size={14} />Build structure</Btn>
      {r && <div className="space-y-4">
        <KpiGrid>
          <Kpi label="Monthly gross" value={money(r.monthlyGross)} sub={`CTC ${money(r.ctc)} / yr`} />
          <Kpi label="Employee deductions" value={money(r.summary.totalEmployeeDeductions)} />
          <Kpi label="Employer contributions" value={money(r.summary.totalEmployerContributions)} />
          <Kpi label="Net pay / month" value={money(r.summary.netPay)} tone="text-green-700" />
        </KpiGrid>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataTable rows={r.earnings} rowKey={(x, i) => `${x.component}-${i}`} columns={[
            { key: 'c', label: 'Earning (monthly)', render: x => `${x.component}${x.percentage !== undefined ? ` (${x.percentage}%)` : ''}` },
            { key: 'a', label: 'Amount', align: 'right', render: x => money(x.amount) },
          ]} footer={<tr><td className="px-3 py-2">Total earnings</td><td className="px-3 py-2 text-right">{money(r.summary.totalEarnings)}</td></tr>} />
          <DataTable rows={r.deductions} rowKey={(x, i) => `${x.component}-${i}`} empty="No statutory deductions apply" columns={[
            { key: 'c', label: 'Deduction / contribution', render: x => <span>{x.component}{x.type === 'employer' && <span className="ml-1 text-[11px] text-gray-400">(employer)</span>}</span> },
            { key: 'a', label: 'Amount', align: 'right', render: x => money(x.amount) },
          ]} />
        </div>
      </div>}
    </div>
  </Section>;
}

function TakeHomeCalc({ notify }: P) {
  const [f, setF] = useState({ ctc: 0, taxRegime: 'new', state: '' });
  const [r, setR] = useState<TakeHome | null>(null);
  const { busy, run } = useAction(notify);
  return <Section title="Take-home from CTC" subtitle="Monthly in-hand after EPF, ESI, PT and an estimated TDS from this organization's TDS slabs.">
    <form className="p-5 space-y-4" onSubmit={async e => {
      e.preventDefault();
      if (!(f.ctc > 0)) { notify('Valid CTC is required', 'error'); return; }
      const out = await run(() => pe.post<TakeHome>('ctc/takeHome', { ctc: f.ctc, taxRegime: f.taxRegime, state: f.state || undefined, declaredDeductions: {} }));
      if (out) setR(out);
    }}>
      <FormGrid cols={4}>
        <Field label="Annual CTC (₹) *"><NumberInput min={0} value={f.ctc || ''} onChange={ctc => setF(s => ({ ...s, ctc }))} /></Field>
        <Field label="Tax regime"><Select value={f.taxRegime} onChange={taxRegime => setF(s => ({ ...s, taxRegime }))} options={[{ value: 'new', label: 'New regime' }, { value: 'old', label: 'Old regime' }]} /></Field>
        <Field label="State (PT)"><TextInput list={STATES_DATALIST_ID} value={f.state} onChange={state => setF(s => ({ ...s, state }))} /></Field>
        <div className="flex items-end pb-0.5"><Btn type="submit" busy={busy}><Calculator size={14} />Calculate</Btn></div>
      </FormGrid>
    </form>
    {r && <div className="px-5 pb-5 space-y-4">
      <KpiGrid>
        <Kpi label="Take-home / month" value={money(r.takeHome.monthly)} tone="text-green-700" />
        <Kpi label="Take-home / year" value={money(r.takeHome.annual)} />
        <Kpi label="Monthly gross" value={money(r.monthlyGross)} sub={`Annual ${money(r.annualGross)}`} />
        <Kpi label="Deductions / year" value={money(r.deductions.annual)} />
      </KpiGrid>
      <DataTable rows={[['EPF (employee)', r.deductions.monthly.epf], ['ESI (employee)', r.deductions.monthly.esi], ['Professional tax', r.deductions.monthly.professionalTax], ['TDS (estimated)', r.deductions.monthly.tds]] as Array<[string, number]>}
        rowKey={x => x[0]} columns={[{ key: 'c', label: 'Monthly deduction', render: x => x[0] }, { key: 'a', label: 'Amount', align: 'right', render: x => money(x[1]) }]}
        footer={<tr><td className="px-3 py-2">Total</td><td className="px-3 py-2 text-right">{money(r.deductions.monthly.total)}</td></tr>} />
      {r.deductions.monthly.tds === 0 && <p className="text-[11px] text-gray-400">TDS shows ₹0 when the income is below the taxable threshold or no TDS configuration exists (Payroll Setup → TDS configuration).</p>}
    </div>}
  </Section>;
}
