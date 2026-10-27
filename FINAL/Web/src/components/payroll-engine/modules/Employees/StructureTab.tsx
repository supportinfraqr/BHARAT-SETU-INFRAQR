"use client";

/**
 * Salary structure: GET employee/:id/salary-structure-preview (?baseSalary&grossSalary&ctc what-if),
 * GET salaryComponents (org components) and PUT employee/:id/component-overrides.
 */

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ComponentOverride, ModuleProps, PayrollEmployee } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, DataTable, Field, FormGrid, Kpi, KpiGrid, NumberInput, Section, Toggle, inputClass, money, useAction, useLoad } from '../../ui';
import { COMPONENT_CATEGORIES, type ComponentCategory } from '../Setup/constants';
import type { SalaryComponent } from '../Setup/Components';
import { describeAmount } from '../Setup/Components';
import type { PayrollInfoResponse, PreviewLine, StructurePreview } from './types';

type OrgComponents = { components: Record<ComponentCategory, SalaryComponent[]> };
type Draft = { overrideAmount: string; disabled: boolean };

const norm = (s?: string) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const isBasic = (c: { code?: string; name?: string }) => {
  const code = norm(c.code); const name = norm(c.name);
  return ['basic', 'basesalary', 'base salary', 'bs'].includes(code) || ['basic', 'basic salary', 'base salary'].includes(name) || name.startsWith('basic ');
};
function matchOverride(list: ComponentOverride[], cat: string, comp: { code?: string; name?: string }) {
  const code = norm(comp.code); const name = norm(comp.name);
  return list.find(o => o.category === cat && ((code && norm(o.code) === code) || (name && norm(o.name) === name) || (name && norm(o.code) === name) || (code && norm(o.name) === code)));
}
const keyOf = (cat: string, c: SalaryComponent) => `${cat}:${c._id}`;

export default function StructureTab({ employee, notify }: { employee: PayrollEmployee; notify: ModuleProps['notify'] }) {
  const [whatIf, setWhatIf] = useState({ baseSalary: 0, grossSalary: 0, ctc: 0 });
  const [applied, setApplied] = useState(whatIf);
  const preview = useLoad(() => pe.get<StructurePreview>(`employee/${employee._id}/salary-structure-preview`, {
    baseSalary: applied.baseSalary || undefined, grossSalary: applied.grossSalary || undefined, ctc: applied.ctc || undefined,
  }), [employee._id, applied]);
  const setup = useLoad(() => Promise.all([pe.get<OrgComponents>('salaryComponents'), pe.get<PayrollInfoResponse>(`employee/${employee._id}/payrollInfo`)]), [employee._id]);

  return <div className="space-y-4">
    <Section title="Salary structure preview" subtitle="Org salary components with this employee's overrides applied. Enter figures to preview a what-if structure (not saved).">
      <form className="px-5 py-3 border-b border-gray-100" onSubmit={e => { e.preventDefault(); setApplied(whatIf); }}>
        <FormGrid cols={4}>
          <Field label="Basic (₹ / month)" hint="Blank = current"><NumberInput min={0} value={whatIf.baseSalary || ''} onChange={baseSalary => setWhatIf(s => ({ ...s, baseSalary }))} /></Field>
          <Field label="Gross (₹ / month)" hint="Blank = current"><NumberInput min={0} value={whatIf.grossSalary || ''} onChange={grossSalary => setWhatIf(s => ({ ...s, grossSalary }))} /></Field>
          <Field label="CTC (₹ / year)" hint="Blank = current"><NumberInput min={0} value={whatIf.ctc || ''} onChange={ctc => setWhatIf(s => ({ ...s, ctc }))} /></Field>
          <div className="flex items-end gap-2 pb-5"><Btn type="submit" variant="secondary">Preview</Btn><Btn variant="ghost" aria-label="Reset to current" onClick={() => { const z = { baseSalary: 0, grossSalary: 0, ctc: 0 }; setWhatIf(z); setApplied(z); }}><RotateCcw size={14} /></Btn></div>
        </FormGrid>
      </form>
      <Async state={preview}>{p => <PreviewView p={p} />}</Async>
    </Section>
    <Async state={setup}>{([org, info]) => <OverridesEditor key={JSON.stringify(info.payrollInfo.componentOverrides ?? [])} org={org} current={info.payrollInfo.componentOverrides ?? []} employee={employee} notify={notify}
      onSaved={() => { setup.reload(); preview.reload(); }} />}</Async>
  </div>;
}

function PreviewView({ p }: { p: StructurePreview }) {
  const cols = [
    { key: 'name', label: 'Component', render: (r: PreviewLine) => <span className="inline-flex flex-wrap items-center gap-1">{r.name}{r.isBasic && <Badge status="processed">Basic</Badge>}{r.isBalancing && <Badge>Balancing</Badge>}{r.isOverridden && <Badge status="pending">Override</Badge>}</span> },
    { key: 'rule', label: 'Org rule', render: (r: PreviewLine) => describeAmount({ calculationType: r.calculationType as SalaryComponent['calculationType'], value: r.orgValue, basedOn: r.basedOn as SalaryComponent['basedOn'] }) },
    { key: 'freq', label: 'Frequency', render: (r: PreviewLine) => `${r.frequency ?? 'monthly'}${r.paymentMonth ? ` (${r.paymentMonth})` : ''}` },
    { key: 'def', label: 'Default / mo', align: 'right' as const, render: (r: PreviewLine) => money(r.defaultMonthlyAmount) },
    { key: 'mo', label: 'Monthly', align: 'right' as const, render: (r: PreviewLine) => <b>{money(r.monthlyAmount)}</b> },
    { key: 'yr', label: 'Annual', align: 'right' as const, render: (r: PreviewLine) => money(r.annualAmount) },
  ];
  return <div className="p-5 space-y-4">
    <KpiGrid>
      <Kpi label="Basic / month" value={money(p.salaryBases.baseSalary)} sub={`Input mode: ${p.inputMode}`} />
      <Kpi label="Gross / month" value={money(p.totals.grossSalaryMonthly)} />
      <Kpi label="Deductions / month" value={money(p.totals.deductionsMonthly)} sub="Component deductions (excl. statutory)" />
      <Kpi label="CTC / year" value={money(p.totals.ctcAnnual)} sub={`Benefits ${money(p.totals.benefitsAnnual)} / yr`} />
    </KpiGrid>
    {COMPONENT_CATEGORIES.map(c => {
      const rows = p[c.value];
      if (!rows.length) return null;
      return <div key={c.value}>
        <p className="text-xs font-semibold text-gray-700 mb-1">{c.label}</p>
        <DataTable<PreviewLine> columns={cols} rows={rows} rowKey={(r, i) => `${r.code || r.name}-${i}`} />
      </div>;
    })}
    <p className="text-[11px] text-gray-400">Statutory deductions (EPF, ESI, PT, LWF) and TDS are calculated during the pay run; use the Payroll info calculator to see them.</p>
  </div>;
}

function OverridesEditor({ org, current, employee, notify, onSaved }: { org: OrgComponents; current: ComponentOverride[]; employee: PayrollEmployee; notify: ModuleProps['notify']; onSaved: () => void }) {
  const [draft, setDraft] = useState<Record<string, Draft>>(() => {
    const out: Record<string, Draft> = {};
    for (const cat of COMPONENT_CATEGORIES) for (const comp of org.components[cat.value] ?? []) {
      const o = matchOverride(current, cat.value, comp);
      out[keyOf(cat.value, comp)] = { overrideAmount: o && o.overrideAmount !== null && o.overrideAmount !== undefined ? String(o.overrideAmount) : '', disabled: !!o?.disabled };
    }
    return out;
  });
  const { busy, run } = useAction(notify);
  const total = COMPONENT_CATEGORIES.reduce((n, c) => n + (org.components[c.value]?.length ?? 0), 0);

  const save = async () => {
    const list: ComponentOverride[] = [];
    for (const cat of COMPONENT_CATEGORIES) for (const comp of org.components[cat.value] ?? []) {
      const d = draft[keyOf(cat.value, comp)];
      if (!d || isBasic(comp)) continue;
      if (d.overrideAmount !== '' && Number(d.overrideAmount) < 0) { notify(`${comp.name}: override amount cannot be negative`, 'error'); return; }
      if (d.overrideAmount === '' && !d.disabled) continue;
      list.push({ category: cat.value, code: comp.code || comp.name, name: comp.name, overrideAmount: d.overrideAmount === '' ? null : Number(d.overrideAmount), disabled: d.disabled });
    }
    const ok = await run(() => pe.put(`employee/${employee._id}/component-overrides`, { componentOverrides: list }), 'Employee component overrides saved successfully');
    if (ok !== undefined) onSaved();
  };

  return <Section title="Component overrides" subtitle="Change a component's amount for this employee only, or switch it off. Basic always follows the org rule / payroll info."
    right={<Btn busy={busy} onClick={() => void save()}>Save overrides</Btn>}>
    {total === 0 ? <p className="px-5 py-8 text-center text-xs text-gray-500">No salary components configured. Add them in Payroll Setup → Salary components.</p> :
      <div className="p-5 space-y-4">
        {COMPONENT_CATEGORIES.map(cat => {
          const comps = org.components[cat.value] ?? [];
          if (!comps.length) return null;
          return <div key={cat.value}>
            <p className="text-xs font-semibold text-gray-700 mb-1">{cat.label}</p>
            <DataTable<SalaryComponent> rows={comps} rowKey={c => c._id} columns={[
              { key: 'name', label: 'Component', render: c => <span className="inline-flex flex-wrap items-center gap-1">{c.name}{c.status !== 'active' && <Badge status="inactive">Inactive</Badge>}</span> },
              { key: 'rule', label: 'Org rule', render: c => describeAmount(c) },
              { key: 'ov', label: 'Override amount (₹)', render: c => {
                const k = keyOf(cat.value, c); const d = draft[k];
                return isBasic(c) ? <span className="text-[11px] text-gray-400">Set via payroll info</span> :
                  <input aria-label={`Override for ${c.name}`} type="number" min={0} className={`${inputClass} w-36`} placeholder="Org default" disabled={d?.disabled}
                    value={d?.overrideAmount ?? ''} onChange={e => setDraft(s => ({ ...s, [k]: { ...s[k], overrideAmount: e.target.value } }))} />;
              } },
              { key: 'dis', label: 'Disable', render: c => {
                const k = keyOf(cat.value, c);
                return isBasic(c) ? '—' : <Toggle checked={!!draft[k]?.disabled} label="Off" onChange={disabled => setDraft(s => ({ ...s, [k]: { ...s[k], disabled } }))} />;
              } },
            ]} />
          </div>;
        })}
      </div>}
  </Section>;
}
