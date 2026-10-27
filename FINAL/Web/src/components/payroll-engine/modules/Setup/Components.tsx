"use client";

/**
 * Salary components (legacy controller/payroll/salaryCompensation.js):
 * getAllSalaryCompensations, getSalaryCompenBYCategory/:category, getSalaryCompensation/:category/:id,
 * createSalaryCompensation { category, component }, updateSalaryCompensation/:category/:id,
 * deleteSalaryCompensation/:category/:id. Also shows GET salaryComponents (active counts).
 */

import { useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, Confirm, DataTable, Field, FormGrid, Kpi, KpiGrid, Loading, MONTHS_LONG, Modal, NumberInput, Row, Section, Select, TextInput, Toggle, money, num, useAction, useLoad, type Column } from '../../ui';
import { COMPONENT_CATEGORIES, cap, type ComponentCategory } from './constants';

export type SalaryComponent = {
  _id: string; name: string; code: string; description: string; type: 'earning' | 'deduction' | 'benefit' | 'reimbursement';
  calculationType: 'fixed' | 'variable' | 'percentage'; value: number; basedOn: 'basic' | 'gross' | 'ctc' | 'manual' | 'none';
  considerForEPF: boolean; considerForESI: boolean; calculateOnProRata: boolean; taxable: boolean;
  frequency: 'one-time' | 'recurring' | 'monthly' | 'yearly'; paymentMonth: string; maxLimit: number; status: 'active' | 'inactive';
  category?: ComponentCategory;
};
type Paged = { data: SalaryComponent[]; pagination: { total: number; page: number; limit: number; totalPages: number } };
type Summary = { components: Record<ComponentCategory, SalaryComponent[]>; summary: { totalEarnings: number; totalDeductions: number; totalBenefits: number; totalReimbursements: number } };

const typeFor = (cat: ComponentCategory) => COMPONENT_CATEGORIES.find(c => c.value === cat)!.type;
const catLabel = (cat?: string) => COMPONENT_CATEGORIES.find(c => c.value === cat)?.label ?? cat ?? '—';

function blank(category: ComponentCategory): Omit<SalaryComponent, '_id'> {
  return { name: '', code: '', description: '', type: typeFor(category), calculationType: 'fixed', value: 0, basedOn: 'none', considerForEPF: false, considerForESI: false, calculateOnProRata: false, taxable: category !== 'reimbursements', frequency: 'monthly', paymentMonth: '', maxLimit: 0, status: 'active' };
}

export function describeAmount(c: Pick<SalaryComponent, 'calculationType' | 'value' | 'basedOn'>): string {
  if (c.calculationType === 'percentage') return `${num(c.value)}% of ${c.basedOn === 'none' || c.basedOn === 'manual' ? 'base' : c.basedOn.toUpperCase()}`;
  if (c.calculationType === 'variable') return c.value ? `Variable (default ${money(c.value)})` : 'Variable';
  return money(c.value);
}

export default function Components({ notify }: Pick<ModuleProps, 'notify'>) {
  const [category, setCategory] = useState<'' | ComponentCategory>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const list = useLoad(() => (category
    ? pe.get<Paged>(`getSalaryCompenBYCategory/${category}`, { search: query, page, limit }).then(r => ({ ...r, data: r.data.map(c => ({ ...c, category })) }))
    : pe.get<Paged>('getAllSalaryCompensations', { search: query, page, limit })), [category, query, page]);
  const summary = useLoad(() => pe.get<Summary>('salaryComponents'), []);
  const [editing, setEditing] = useState<{ category: ComponentCategory; component: SalaryComponent | null } | null>(null);
  const [viewing, setViewing] = useState<{ category: ComponentCategory; id: string } | null>(null);
  const [deleting, setDeleting] = useState<SalaryComponent | null>(null);
  const { busy, run } = useAction(notify);

  const reload = () => { list.reload(); summary.reload(); };

  const columns: Column<SalaryComponent>[] = [
    { key: 'name', label: 'Component', render: c => <div><p className="font-semibold text-gray-900">{c.name}</p><p className="text-[11px] text-gray-400">{c.code || '—'}</p></div> },
    { key: 'category', label: 'Category', render: c => catLabel(c.category) },
    { key: 'calc', label: 'Calculation', render: c => <span>{cap(c.calculationType)} · {describeAmount(c)}</span> },
    { key: 'frequency', label: 'Frequency', render: c => <span>{cap(c.frequency)}{c.paymentMonth ? ` (${c.paymentMonth})` : ''}</span> },
    { key: 'flags', label: 'Flags', render: c => <div className="flex flex-wrap gap-1">
      {c.taxable && <Badge status="pending">Taxable</Badge>}{c.considerForEPF && <Badge status="processed">EPF</Badge>}{c.considerForESI && <Badge status="processed">ESI</Badge>}{c.calculateOnProRata && <Badge>Pro-rata</Badge>}
    </div> },
    { key: 'status', label: 'Status', render: c => <Badge status={c.status} /> },
    { key: 'actions', label: '', align: 'right', render: c => <div className="flex justify-end gap-1">
      <Btn variant="ghost" aria-label={`View ${c.name}`} onClick={() => setViewing({ category: c.category!, id: c._id })}><Eye size={14} /></Btn>
      <Btn variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => setEditing({ category: c.category!, component: c })}><Pencil size={14} /></Btn>
      <Btn variant="ghost" aria-label={`Delete ${c.name}`} className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(c)}><Trash2 size={14} /></Btn>
    </div> },
  ];

  return <div className="space-y-4">
    {summary.data && <KpiGrid>
      <Kpi label="Active earnings" value={summary.data.summary.totalEarnings} />
      <Kpi label="Active deductions" value={summary.data.summary.totalDeductions} />
      <Kpi label="Active benefits" value={summary.data.summary.totalBenefits} />
      <Kpi label="Active reimbursements" value={summary.data.summary.totalReimbursements} />
    </KpiGrid>}
    <Section title="Salary components" subtitle="The org-wide pay structure. Basic is always counted for EPF and ESI; the balancing 'Other Extra Allowance' is added automatically when salary is set from gross."
      right={<Btn onClick={() => setEditing({ category: category || 'earnings', component: null })}><Plus size={14} />Add component</Btn>}>
      <div className="px-5 py-3 flex flex-wrap items-end gap-2 border-b border-gray-100">
        <Field label="Category" className="w-44"><Select value={category} onChange={v => { setCategory(v as ComponentCategory | ''); setPage(1); }} options={COMPONENT_CATEGORIES.map(c => ({ value: c.value, label: c.label }))} placeholder="All categories" /></Field>
        <form className="flex items-end gap-2 flex-1 min-w-[220px]" onSubmit={e => { e.preventDefault(); setQuery(search.trim()); setPage(1); }}>
          <Field label="Search" className="flex-1"><TextInput value={search} onChange={setSearch} placeholder="Component name" /></Field>
          <Btn type="submit" variant="secondary" aria-label="Search"><Search size={14} /></Btn>
        </form>
      </div>
      <Async state={list}>
        {data => <>
          <DataTable columns={columns} rows={data.data} rowKey={c => `${c.category}-${c._id}`} empty={query ? 'No components match your search' : 'No components yet — add Basic first, then allowances, deductions, benefits and reimbursements.'} />
          {data.pagination.totalPages > 1 && <div className="px-5 py-3 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
            <span>{data.pagination.total} components · page {data.pagination.page} of {data.pagination.totalPages}</span>
            <div className="flex gap-2"><Btn variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Btn><Btn variant="secondary" disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Btn></div>
          </div>}
        </>}
      </Async>
    </Section>

    {editing && <ComponentForm key={editing.component?._id ?? 'new'} initialCategory={editing.category} component={editing.component} notify={notify}
      onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    {viewing && <ComponentView category={viewing.category} id={viewing.id} onClose={() => setViewing(null)}
      onEdit={c => { setViewing(null); setEditing({ category: viewing.category, component: c }); }} />}
    {deleting && <Confirm danger title="Delete component" busy={busy} onClose={() => setDeleting(null)}
      message={<>Delete <b>{deleting.name}</b> from {catLabel(deleting.category)}? Employees&apos; future payroll will no longer include it; past payslips are unchanged.</>}
      onConfirm={async () => { const ok = await run(() => pe.del(`deleteSalaryCompensation/${deleting.category}/${deleting._id}`), 'Component deleted successfully'); if (ok !== undefined) { setDeleting(null); reload(); } }} />}
  </div>;
}

function ComponentView({ category, id, onClose, onEdit }: { category: ComponentCategory; id: string; onClose: () => void; onEdit: (c: SalaryComponent) => void }) {
  const state = useLoad(() => pe.get<SalaryComponent>(`getSalaryCompensation/${category}/${id}`), [category, id]);
  return <Modal title={state.data?.name ?? 'Component'} subtitle={catLabel(category)} onClose={onClose} footer={state.data && <Btn onClick={() => onEdit({ ...state.data!, category })}><Pencil size={14} />Edit</Btn>}>
    {state.loading && !state.data ? <Loading /> : <Async state={state}>{c => <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Row label="Code" value={c.code || '—'} />
      <Row label="Type" value={cap(c.type)} />
      <Row label="Calculation" value={cap(c.calculationType)} />
      <Row label="Value" value={c.calculationType === 'percentage' ? `${num(c.value)}%` : money(c.value)} />
      <Row label="Based on" value={cap(c.basedOn)} />
      <Row label="Max limit" value={c.maxLimit ? money(c.maxLimit) : 'No limit'} />
      <Row label="Frequency" value={cap(c.frequency)} />
      <Row label="Payment month" value={c.paymentMonth || '—'} />
      <Row label="Taxable" value={c.taxable ? 'Yes' : 'No'} />
      <Row label="Pro-rata on LOP" value={c.calculateOnProRata ? 'Yes' : 'No'} />
      <Row label="Counts for EPF" value={c.considerForEPF ? 'Yes' : 'No'} />
      <Row label="Counts for ESI" value={c.considerForESI ? 'Yes' : 'No'} />
      <Row label="Status" value={<Badge status={c.status} />} />
      {c.description && <p className="sm:col-span-2 text-xs text-gray-600 rounded-lg border border-gray-100 px-3 py-2">{c.description}</p>}
    </div>}</Async>}
  </Modal>;
}

function ComponentForm({ initialCategory, component, notify, onClose, onSaved }: { initialCategory: ComponentCategory; component: SalaryComponent | null; notify: ModuleProps['notify']; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState<ComponentCategory>(initialCategory);
  const [f, setF] = useState<Omit<SalaryComponent, '_id'>>(() => {
    if (!component) return blank(initialCategory);
    const { _id: _ignored, category: _cat, ...rest } = component;
    void _ignored; void _cat;
    return { ...blank(initialCategory), ...rest };
  });
  const { busy, run } = useAction(notify);
  const set = (patch: Partial<typeof f>) => setF(prev => ({ ...prev, ...patch }));
  const isEdit = !!component;
  const needsMonth = f.frequency === 'yearly' || f.frequency === 'one-time';

  const submit = async () => {
    if (!f.name.trim()) { notify('Component name is required', 'error'); return; }
    if (f.calculationType === 'percentage' && (f.basedOn === 'none' || f.basedOn === 'manual')) { notify('Choose what the percentage is based on (Basic, Gross or CTC)', 'error'); return; }
    const payload = { ...f, name: f.name.trim(), code: f.code.trim(), type: typeFor(category), paymentMonth: needsMonth ? f.paymentMonth : '' };
    const out = isEdit
      ? await run(() => pe.put(`updateSalaryCompensation/${category}/${component._id}`, payload), 'Component updated successfully')
      : await run(() => pe.post('createSalaryCompensation', { category, component: payload }), 'Component created successfully');
    if (out !== undefined) onSaved();
  };

  return <Modal title={isEdit ? `Edit ${component.name}` : 'Add salary component'} onClose={onClose} width="max-w-3xl"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>{isEdit ? 'Save changes' : 'Create component'}</Btn></>}>
    <div className="space-y-4">
      <FormGrid cols={3}>
        <Field label="Category"><Select disabled={isEdit} value={category} onChange={v => { setCategory(v as ComponentCategory); set({ type: typeFor(v as ComponentCategory) }); }} options={COMPONENT_CATEGORIES.map(c => ({ value: c.value, label: c.label }))} /></Field>
        <Field label="Name *"><TextInput required value={f.name} onChange={name => set({ name })} placeholder="e.g. House Rent Allowance" /></Field>
        <Field label="Code" hint="Short key used in imports and overrides"><TextInput value={f.code} onChange={code => set({ code })} placeholder="e.g. HRA" /></Field>
        <Field label="Calculation type"><Select value={f.calculationType} onChange={v => set({ calculationType: v as SalaryComponent['calculationType'] })} options={[{ value: 'fixed', label: 'Fixed amount' }, { value: 'percentage', label: 'Percentage' }, { value: 'variable', label: 'Variable (entered per run)' }]} /></Field>
        <Field label={f.calculationType === 'percentage' ? 'Percentage (%)' : 'Amount (₹ / period)'}><NumberInput min={0} step="0.01" value={f.value} onChange={value => set({ value })} /></Field>
        <Field label="Based on"><Select value={f.basedOn} onChange={v => set({ basedOn: v as SalaryComponent['basedOn'] })} options={[{ value: 'none', label: 'None' }, { value: 'basic', label: 'Basic' }, { value: 'gross', label: 'Gross' }, { value: 'ctc', label: 'CTC' }, { value: 'manual', label: 'Manual' }]} /></Field>
        <Field label="Frequency"><Select value={f.frequency} onChange={v => set({ frequency: v as SalaryComponent['frequency'] })} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'recurring', label: 'Recurring' }, { value: 'yearly', label: 'Yearly' }, { value: 'one-time', label: 'One-time' }]} /></Field>
        <Field label="Payment month" hint={needsMonth ? 'Month in which it is paid' : 'Only for yearly / one-time'}><Select disabled={!needsMonth} value={f.paymentMonth} onChange={paymentMonth => set({ paymentMonth })} options={[...MONTHS_LONG]} placeholder="—" /></Field>
        <Field label="Maximum limit (₹)" hint="0 = no limit"><NumberInput min={0} value={f.maxLimit} onChange={maxLimit => set({ maxLimit })} /></Field>
        <Field label="Status"><Select value={f.status} onChange={v => set({ status: v as SalaryComponent['status'] })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></Field>
      </FormGrid>
      <Field label="Description"><textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} value={f.description} onChange={e => set({ description: e.target.value })} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Toggle checked={f.taxable} onChange={taxable => set({ taxable })} label="Taxable (counts for TDS)" />
        <Toggle checked={f.calculateOnProRata} onChange={calculateOnProRata => set({ calculateOnProRata })} label="Calculate on pro-rata basis (LOP)" />
        <Toggle checked={f.considerForEPF} onChange={considerForEPF => set({ considerForEPF })} label="Consider for EPF wage" />
        <Toggle checked={f.considerForESI} onChange={considerForESI => set({ considerForESI })} label="Consider for ESI wage" />
      </div>
    </div>
  </Modal>;
}
