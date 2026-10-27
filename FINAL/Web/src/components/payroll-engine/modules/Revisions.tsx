"use client";

/**
 * Salary Revisions — legacy controller/payroll/salaryRevision.js
 *
 *   POST   revision/create                   { employeeId, revisionType, effectiveFrom, newSalary{grossSalary,basicSalary?,ctc?},
 *                                              componentOverrides?, arrearsApplicable, arrearsFromDate, remarks, state }
 *   PUT    revision/:id/approve              { status: approved|rejected, comments }
 *   POST   revision/:id/implement            applies the new salary; auto-creates arrears when applicable
 *   DELETE revision/:id                      pending / rejected only
 *   GET    revision                          ?status=&employeeId=&page=&limit=
 *   GET    revision/employee/:employeeId     full history of one employee
 *   GET    revision/:id                      detail (old vs new structure, approvals, arrears)
 *
 * The create form also reads `employee/:id/salary-structure-preview` (the endpoint the legacy router
 * marks "use on salary revision screen") to list components for per-employee overrides.
 */

import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, Play, Plus, Trash2, XCircle } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps, PayrollEmployee } from '@/lib/payroll-engine/types';
import {
  Async, Badge, Btn, Confirm, DataTable, Empty, EmployeePicker, Field, FormGrid, Kpi, KpiGrid, Modal, NumberInput, Row,
  Section, Select, Tabs, TextInput, Toggle, employeeName, fmtDate, fmtDateTime, isoDate, money, num, useAction,
  useEmployees, useLoad, type Column,
} from '../ui';
import { Pager } from './Arrears';

// ---------------------------------------------------------------------------
// Types (legacy models/payroll/salaryRevision.js)
// ---------------------------------------------------------------------------

type EmpRef = string | { _id: string; firstName?: string; lastName?: string; email?: string; payrollInfo?: { employeeCode?: string; ctc?: number; grossSalary?: number; baseSalary?: number } } | null;
type Override = { category: string; code: string; name: string; overrideAmount: number | null; disabled: boolean };
type SalaryBlock = { ctc: number; grossSalary: number; basicSalary: number; components: Array<{ componentName: string; amount: number }>; componentOverrides: Override[]; defaultComponents?: Array<{ category?: string; code?: string; name?: string; componentName?: string; amount?: number }> };
type Approval = { employeeId: EmpRef; approverName: string; approverRole: string; status: string; comments: string; approvedDate: string | null };

type Revision = {
  _id: string;
  employeeId: EmpRef;
  revisionType: string;
  effectiveFrom: string;
  oldSalary: SalaryBlock;
  newSalary: SalaryBlock;
  incrementAmount: number;
  incrementPercentage: number;
  arrearsApplicable: boolean;
  arrearsFromDate: string | null;
  arrearsToDate: string | null;
  arrearsAmount: number;
  arrearsPaid: boolean;
  statutoryApplicability?: Record<string, boolean | undefined>;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  requestedBy?: string | null;
  approvals: Approval[];
  implementedDate?: string | null;
  remarks?: string;
  state?: string;
  createdAt?: string;
  updatedAt?: string;
  inputMode?: string;
  warnings?: string[];
};
type RevisionPage = { total: number; page: number; limit: number; totalPages: number; data: Revision[] };

type PreviewLine = { category: string; name: string; code: string; calculationType?: string; monthlyAmount: number; annualAmount?: number; defaultMonthlyAmount?: number; overrideAmount: number | null; isOverridden?: boolean; disabled?: boolean; isBalancing?: boolean };
type StructurePreview = {
  inputMode: string;
  salaryBases: { baseSalary: number; grossSalary: number; ctc: number };
  componentOverrides: Override[];
  earnings: PreviewLine[]; deductions: PreviewLine[]; benefits: PreviewLine[]; reimbursements: PreviewLine[];
  totals: Record<string, number>;
};

const REVISION_TYPES = [
  { value: 'increment', label: 'Increment' },
  { value: 'annual_hike', label: 'Annual hike' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'new_joiner', label: 'New joiner' },
];
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }, { value: 'implemented', label: 'Implemented' },
];
const typeLabel = (t: string) => REVISION_TYPES.find(x => x.value === t)?.label ?? t;

function refId(ref: EmpRef): string {
  if (!ref) return '';
  return typeof ref === 'string' ? ref : ref._id;
}
function refName(ref: EmpRef, employees: PayrollEmployee[]): string {
  if (ref && typeof ref === 'object') {
    const n = [ref.firstName, ref.lastName].filter(Boolean).join(' ');
    if (n) return n;
  }
  const emp = employees.find(e => e._id === refId(ref));
  return emp ? employeeName(emp) : refId(ref) || '—';
}
function pct(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? `${n > 0 ? '+' : ''}${num(n)}%` : '—';
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export default function Revisions({ notify, navigate, params }: ModuleProps) {
  const employeesState = useEmployees();
  const employees = useMemo(() => employeesState.data ?? [], [employeesState.data]);
  const [tab, setTab] = useState(params.employeeId ? 'history' : 'all');
  const [version, setVersion] = useState(0);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(params.revisionId ?? '');
  const [deciding, setDeciding] = useState<{ rev: Revision; status: 'approved' | 'rejected' } | null>(null);
  const [implementing, setImplementing] = useState<Revision | null>(null);
  const [deleting, setDeleting] = useState<Revision | null>(null);
  const { busy, run } = useAction(notify);
  const refresh = () => setVersion(v => v + 1);

  const implement = async (rev: Revision) => {
    const out = await run(() => pe.post<{ revision: Revision; arrearsRecord: { _id: string; totalArrearsAmount: number } | null }>(`revision/${rev._id}/implement`));
    if (!out) return;
    notify(out.arrearsRecord ? `Salary revision implemented. Arrears of ${money(out.arrearsRecord.totalArrearsAmount)} created — approve it in Arrears.` : 'Salary revision implemented successfully');
    setImplementing(null);
    refresh();
  };
  const remove = async (rev: Revision) => {
    const out = await run(() => pe.del(`revision/${rev._id}`), 'Salary revision deleted successfully');
    if (out !== undefined) { setDeleting(null); setOpenId(''); refresh(); }
  };

  const actions: Actions = {
    view: r => setOpenId(r._id),
    decide: (rev, status) => setDeciding({ rev, status }),
    implement: setImplementing,
    remove: setDeleting,
  };

  return <div className="space-y-4">
    <Section title="Salary revisions" subtitle="Raise a revision → approve or reject → implement to update the employee's salary (and create arrears for back-dated revisions)."
      right={<Btn onClick={() => setCreating(true)}><Plus size={14} />New revision</Btn>}>
      <div className="px-5 pt-3"><Tabs active={tab} onChange={setTab} tabs={[{ key: 'all', label: 'All revisions' }, { key: 'history', label: 'Employee history' }]} /></div>
      {tab === 'all'
        ? <AllRevisions employees={employees} actions={actions} version={version} initialEmployee={params.employeeId ?? ''} />
        : <EmployeeHistory employees={employees} actions={actions} version={version} initialEmployee={params.employeeId ?? ''} />}
    </Section>

    {creating && <CreateRevision employees={employees} notify={notify} initialEmployee={params.employeeId ?? ''} onClose={() => setCreating(false)}
      onCreated={id => { setCreating(false); refresh(); setOpenId(id); }} />}
    {openId && <RevisionDetail id={openId} version={version} employees={employees} actions={actions} onClose={() => setOpenId('')}
      onArrears={empId => navigate('arrears', { employeeId: empId })} />}
    {deciding && <DecisionModal rev={deciding.rev} status={deciding.status} employees={employees} notify={notify} onClose={() => setDeciding(null)} onDone={() => { setDeciding(null); refresh(); }} />}
    {implementing && <Confirm title="Implement salary revision" busy={busy} onClose={() => setImplementing(null)} onConfirm={() => void implement(implementing)}
      message={<div className="space-y-2">
        <p>Update <b>{refName(implementing.employeeId, employees)}</b>&apos;s salary to CTC {money(implementing.newSalary?.ctc)} / gross {money(implementing.newSalary?.grossSalary)} effective {fmtDate(implementing.effectiveFrom)}?</p>
        {implementing.arrearsApplicable && implementing.arrearsAmount > 0 && <p className="text-xs text-gray-500">An arrears entry of {money(implementing.arrearsAmount)} will be created automatically.</p>}
      </div>} />}
    {deleting && <Confirm danger title="Delete salary revision" busy={busy} onClose={() => setDeleting(null)} onConfirm={() => void remove(deleting)}
      message={<>Delete the {typeLabel(deleting.revisionType).toLowerCase()} revision for <b>{refName(deleting.employeeId, employees)}</b>?</>} />}
  </div>;
}

type Actions = { view: (r: Revision) => void; decide: (r: Revision, s: 'approved' | 'rejected') => void; implement: (r: Revision) => void; remove: (r: Revision) => void };

function RowActions({ r, actions }: { r: Revision; actions: Actions }) {
  return <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
    <Btn variant="ghost" aria-label="View revision" onClick={() => actions.view(r)}><Eye size={14} /></Btn>
    {r.status === 'pending' && <>
      <Btn variant="ghost" onClick={() => actions.decide(r, 'approved')}><CheckCircle2 size={14} />Approve</Btn>
      <Btn variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => actions.decide(r, 'rejected')}><XCircle size={14} />Reject</Btn>
    </>}
    {r.status === 'approved' && <Btn variant="ghost" onClick={() => actions.implement(r)}><Play size={14} />Implement</Btn>}
    {(r.status === 'pending' || r.status === 'rejected') && <Btn variant="ghost" aria-label="Delete revision" className="text-red-600 hover:bg-red-50" onClick={() => actions.remove(r)}><Trash2 size={14} /></Btn>}
  </div>;
}

function columns(employees: PayrollEmployee[], actions: Actions, withEmployee: boolean): Column<Revision>[] {
  const cols: Column<Revision>[] = [
    { key: 'employee', label: 'Employee', render: r => <span className="font-semibold">{refName(r.employeeId, employees)}</span> },
    { key: 'type', label: 'Type', render: r => typeLabel(r.revisionType) },
    { key: 'effectiveFrom', label: 'Effective', render: r => <span className="whitespace-nowrap">{fmtDate(r.effectiveFrom)}</span> },
    { key: 'ctc', label: 'CTC (old → new)', render: r => <span className="whitespace-nowrap">{money(r.oldSalary?.ctc)} <ArrowRight size={11} className="inline" aria-label="to" /> <b>{money(r.newSalary?.ctc)}</b></span> },
    { key: 'gross', label: 'Gross / month', align: 'right', render: r => money(r.newSalary?.grossSalary) },
    { key: 'increment', label: 'Increment', align: 'right', render: r => <span className={r.incrementAmount >= 0 ? 'text-green-700' : 'text-red-600'}>{money(r.incrementAmount)} <span className="text-[11px]">({pct(r.incrementPercentage)})</span></span> },
    { key: 'arrears', label: 'Arrears', align: 'right', render: r => (r.arrearsApplicable ? money(r.arrearsAmount) : '—') },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    { key: 'actions', label: 'Actions', align: 'right', render: r => <RowActions r={r} actions={actions} /> },
  ];
  return withEmployee ? cols : cols.filter(c => c.key !== 'employee');
}

function AllRevisions({ employees, actions, version, initialEmployee }: { employees: PayrollEmployee[]; actions: Actions; version: number; initialEmployee: string }) {
  const [status, setStatus] = useState('');
  const [employeeId, setEmployeeId] = useState(initialEmployee);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const state = useLoad(() => pe.get<RevisionPage>('revision', { status, employeeId, page, limit }), [status, employeeId, page, limit, version]);
  return <div>
    <div className="px-5 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Field label="Status"><Select value={status} onChange={v => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} placeholder="All statuses" /></Field>
      <Field label="Employee"><EmployeePicker value={employeeId} onChange={id => { setEmployeeId(id); setPage(1); }} employees={employees} placeholder="All employees" /></Field>
      <Field label="Rows per page"><Select value={String(limit)} onChange={v => { setLimit(Number(v)); setPage(1); }} options={['10', '20', '50', '100']} /></Field>
    </div>
    <Async state={state}>
      {data => <>
        <DataTable columns={columns(employees, actions, true)} rows={data.data ?? []} rowKey={r => r._id} onRowClick={actions.view}
          empty={status || employeeId ? 'No revisions match these filters' : 'No salary revisions yet — click “New revision”'} />
        <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
      </>}
    </Async>
  </div>;
}

function EmployeeHistory({ employees, actions, version, initialEmployee }: { employees: PayrollEmployee[]; actions: Actions; version: number; initialEmployee: string }) {
  const [employeeId, setEmployeeId] = useState(initialEmployee);
  const state = useLoad(() => (employeeId ? pe.get<Revision[]>(`revision/employee/${employeeId}`) : Promise.resolve(null)), [employeeId, version]);
  const emp = employees.find(e => e._id === employeeId);
  const rows = state.data ?? [];
  const implemented = rows.filter(r => r.status === 'implemented');
  return <div>
    <div className="px-5 py-3 max-w-md"><Field label="Employee"><EmployeePicker value={employeeId} onChange={id => setEmployeeId(id)} employees={employees} /></Field></div>
    {!employeeId ? <Empty title="Pick an employee" text="See every salary revision of the employee, newest effective date first." /> : <>
      <div className="px-5 pb-3"><KpiGrid>
        <Kpi label="Current CTC" value={money(emp?.payrollInfo?.ctc)} sub={emp?.payrollInfo?.salaryEffectiveFrom ? `since ${fmtDate(emp.payrollInfo.salaryEffectiveFrom)}` : undefined} />
        <Kpi label="Current gross / month" value={money(emp?.payrollInfo?.grossSalary)} />
        <Kpi label="Revisions" value={num(rows.length, 0)} sub={`${implemented.length} implemented`} />
        <Kpi label="Total implemented increment" value={money(implemented.reduce((s, r) => s + (Number(r.incrementAmount) || 0), 0))} tone="text-green-700" />
      </KpiGrid></div>
      <Async state={state}>{data => <DataTable columns={columns(employees, actions, false)} rows={data} rowKey={r => r._id} onRowClick={actions.view} empty="No revisions for this employee" />}</Async>
    </>}
  </div>;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

function CreateRevision({ employees, notify, initialEmployee, onClose, onCreated }: { employees: PayrollEmployee[]; notify: ModuleProps['notify']; initialEmployee: string; onClose: () => void; onCreated: (id: string) => void }) {
  const [employeeId, setEmployeeId] = useState(initialEmployee);
  const emp = employees.find(e => e._id === employeeId);
  return <Modal title="New salary revision" subtitle="Creates a pending revision; the employee's salary changes only when it is approved and implemented." onClose={onClose} width="max-w-4xl">
    <div className="space-y-4">
      <Field label="Employee *" className="max-w-md"><EmployeePicker value={employeeId} onChange={id => setEmployeeId(id)} employees={employees} includeInactive={false} /></Field>
      {emp ? <RevisionForm key={emp._id} emp={emp} notify={notify} onClose={onClose} onCreated={onCreated} />
        : <Empty title="Pick an employee" text="Their current salary and components load here." />}
    </div>
  </Modal>;
}

type OverrideDraft = { amount: string; disabled: boolean };

function RevisionForm({ emp, notify, onClose, onCreated }: { emp: PayrollEmployee; notify: ModuleProps['notify']; onClose: () => void; onCreated: (id: string) => void }) {
  const preview = useLoad(() => pe.get<StructurePreview>(`employee/${emp._id}/salary-structure-preview`), [emp._id]);
  const [mode, setMode] = useState<'gross' | 'manual'>('gross');
  const [f, setF] = useState({
    revisionType: 'increment', effectiveFrom: isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    grossSalary: Number(emp.payrollInfo?.grossSalary) || 0, basicSalary: Number(emp.payrollInfo?.baseSalary) || 0, ctc: Number(emp.payrollInfo?.ctc) || 0,
    arrearsApplicable: false, arrearsFromDate: '', remarks: '', state: emp.statutoryInfo?.ptState || emp.workState || '',
  });
  const [overrides, setOverrides] = useState<Record<string, OverrideDraft>>({});
  const [result, setResult] = useState<Revision | null>(null);
  const { busy, run } = useAction(notify);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(s => ({ ...s, [k]: v }));

  const oldCtc = Number(emp.payrollInfo?.ctc) || 0;
  const estCtc = mode === 'manual' ? f.ctc : 0;
  const lines = preview.data ? [...preview.data.earnings, ...preview.data.deductions, ...preview.data.benefits, ...preview.data.reimbursements].filter(l => !l.isBalancing) : [];
  const keyOf = (l: { category: string; code: string; name: string }) => `${l.category}:${l.code || l.name}`;

  // Legacy arrears estimate: (new CTC − old CTC) / 12 × whole months between arrears-from and effective date.
  const arrearsMonths = (() => {
    if (!f.arrearsApplicable || !f.arrearsFromDate || !f.effectiveFrom) return 0;
    const a = new Date(f.arrearsFromDate); const b = new Date(f.effectiveFrom);
    return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
  })();

  const submit = async () => {
    if (!(f.grossSalary > 0)) { notify('New gross salary (monthly) is required', 'error'); return; }
    if (mode === 'manual' && (!(f.basicSalary > 0) || !(f.ctc > 0))) { notify('Manual mode needs CTC, gross and basic', 'error'); return; }
    if (mode === 'manual' && (f.basicSalary > f.grossSalary || f.grossSalary > f.ctc)) { notify('Invalid salary structure. Please keep Basic ≤ Gross ≤ CTC', 'error'); return; }
    if (f.arrearsApplicable && !f.arrearsFromDate) { notify('Arrears from date is required when arrears is applicable', 'error'); return; }
    const componentOverrides = lines.flatMap(l => {
      const d = overrides[keyOf(l)];
      if (!d) return [];
      const amount = d.amount.trim() === '' ? null : Number(d.amount);
      if (amount === null && !d.disabled) return [];
      return [{ category: l.category, code: l.code, name: l.name, overrideAmount: amount ?? 0, disabled: d.disabled }];
    });
    const newSalary = mode === 'manual' ? { grossSalary: f.grossSalary, basicSalary: f.basicSalary, ctc: f.ctc } : { grossSalary: f.grossSalary };
    const body = {
      employeeId: emp._id, revisionType: f.revisionType, effectiveFrom: f.effectiveFrom, newSalary,
      ...(componentOverrides.length ? { componentOverrides } : {}),
      arrearsApplicable: f.arrearsApplicable, arrearsFromDate: f.arrearsApplicable ? f.arrearsFromDate : undefined,
      remarks: f.remarks, state: f.state || undefined,
    };
    const out = await run(() => pe.post<Revision>('revision/create', body), 'Salary revision created successfully');
    if (out) {
      if (out.warnings?.length) setResult(out); else onCreated(out._id);
    }
  };

  if (result) {
    return <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-800">Revision created (pending approval) — the engine raised these warnings:</p>
      <ul className="list-disc pl-5 text-xs text-orange-700 space-y-1">{(result.warnings ?? []).map((w, i) => <li key={i}>{w}</li>)}</ul>
      <div className="flex justify-end"><Btn onClick={() => onCreated(result._id)}>Open revision</Btn></div>
    </div>;
  }

  return <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Row label="Current CTC (annual)" value={money(oldCtc)} />
      <Row label="Current gross / month" value={money(emp.payrollInfo?.grossSalary)} />
      <Row label="Current basic / month" value={money(emp.payrollInfo?.baseSalary)} />
    </div>
    <FormGrid cols={3}>
      <Field label="Revision type *"><Select value={f.revisionType} onChange={v => set('revisionType', v)} options={REVISION_TYPES} /></Field>
      <Field label="Effective from *"><TextInput type="date" value={f.effectiveFrom} onChange={v => set('effectiveFrom', v)} /></Field>
      <Field label="PT / work state" hint="Used for professional tax in the recomputed structure"><TextInput value={f.state} onChange={v => set('state', v)} /></Field>
    </FormGrid>

    <fieldset className="rounded-xl border border-gray-200 p-3 space-y-3">
      <legend className="px-1 text-xs font-semibold text-gray-700">New salary</legend>
      <div className="flex flex-wrap gap-4 text-sm" role="radiogroup" aria-label="Salary input mode">
        <label className="inline-flex items-center gap-2"><input type="radio" checked={mode === 'gross'} onChange={() => setMode('gross')} />Gross only — engine derives basic, components & CTC</label>
        <label className="inline-flex items-center gap-2"><input type="radio" checked={mode === 'manual'} onChange={() => setMode('manual')} />Manual — I enter CTC, gross and basic</label>
      </div>
      <FormGrid cols={3}>
        <Field label="Gross salary / month *"><NumberInput value={f.grossSalary} min={0} onChange={v => set('grossSalary', v)} /></Field>
        {mode === 'manual' && <Field label="Basic salary / month *"><NumberInput value={f.basicSalary} min={0} onChange={v => set('basicSalary', v)} /></Field>}
        {mode === 'manual' && <Field label="CTC (annual) *" hint={oldCtc ? `Change ${money(estCtc - oldCtc)} (${pct(((estCtc - oldCtc) / oldCtc) * 100)})` : undefined}><NumberInput value={f.ctc} min={0} onChange={v => set('ctc', v)} /></Field>}
      </FormGrid>
      {mode === 'gross' && <p className="text-[11px] text-gray-500">The engine recomputes the structure from the org salary components and the overrides below; final CTC and increment show on the created revision.</p>}
    </fieldset>

    <fieldset className="rounded-xl border border-gray-200">
      <legend className="ml-3 px-1 text-xs font-semibold text-gray-700">Component overrides (optional)</legend>
      <p className="px-3 pb-2 text-[11px] text-gray-500">Leave blank to keep the org rule / employee&apos;s existing override. Enter a monthly amount to override, or switch a component off for this employee. Special allowance balances automatically.</p>
      <Async state={preview} empty={<Empty title="No components configured" />}>
        {() => lines.length === 0 ? <Empty title="No salary components configured for the organization" text="Set them up in Payroll Setup." /> :
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500"><tr>
              <th className="px-3 py-2 text-left">Component</th><th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Current / month</th><th className="px-3 py-2 text-left">Override / month</th><th className="px-3 py-2 text-left">Disable</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map(l => {
                const k = keyOf(l); const d = overrides[k] ?? { amount: '', disabled: false };
                const upd = (p: Partial<OverrideDraft>) => setOverrides(o => ({ ...o, [k]: { ...d, ...p } }));
                return <tr key={k}>
                  <td className="px-3 py-2 font-semibold text-gray-800">{l.name}{l.isOverridden && <span className="ml-1 text-[10px] text-blue-600">(overridden)</span>}</td>
                  <td className="px-3 py-2 capitalize text-gray-500">{l.category}</td>
                  <td className="px-3 py-2 text-right">{l.disabled ? 'Off' : money(l.monthlyAmount)}</td>
                  <td className="px-3 py-2 w-40"><TextInput type="number" value={d.amount} onChange={v => upd({ amount: v })} placeholder="—" aria-label={`Override ${l.name}`} /></td>
                  <td className="px-3 py-2"><Toggle checked={d.disabled} onChange={v => upd({ disabled: v })} /></td>
                </tr>;
              })}
            </tbody>
          </table></div>}
      </Async>
    </fieldset>

    <fieldset className="rounded-xl border border-gray-200 p-3 space-y-3">
      <legend className="px-1 text-xs font-semibold text-gray-700">Arrears</legend>
      <Toggle checked={f.arrearsApplicable} onChange={v => set('arrearsApplicable', v)} label="Back-dated — pay arrears for months before the effective date" />
      {f.arrearsApplicable && <FormGrid cols={2}>
        <Field label="Arrears from date *" hint="Cannot be after the effective date"><TextInput type="date" value={f.arrearsFromDate} max={f.effectiveFrom} onChange={v => set('arrearsFromDate', v)} /></Field>
        <Field label="Estimate">
          <div className="h-9 flex items-center text-xs text-gray-600">{arrearsMonths} month(s) × (annual CTC increase ÷ 12){mode === 'manual' && oldCtc ? ` ≈ ${money(Math.round(((f.ctc - oldCtc) / 12) * arrearsMonths))}` : ''}</div>
        </Field>
      </FormGrid>}
    </fieldset>

    <Field label="Remarks"><TextInput value={f.remarks} onChange={v => set('remarks', v)} placeholder="Reason for the revision" /></Field>
    <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>Create revision</Btn></div>
  </div>;
}

// ---------------------------------------------------------------------------
// Detail / decide
// ---------------------------------------------------------------------------

function RevisionDetail({ id, version, employees, actions, onClose, onArrears }: { id: string; version: number; employees: PayrollEmployee[]; actions: Actions; onClose: () => void; onArrears: (employeeId: string) => void }) {
  const state = useLoad(() => pe.get<Revision>(`revision/${id}`), [id, version]);
  const r = state.data;
  return <Modal title={r ? `${typeLabel(r.revisionType)} · ${refName(r.employeeId, employees)}` : 'Salary revision'} subtitle={r ? `Effective ${fmtDate(r.effectiveFrom)} · raised ${fmtDateTime(r.createdAt)}` : undefined} onClose={onClose} width="max-w-4xl"
    footer={r ? <RowActions r={r} actions={{ ...actions, view: () => undefined }} /> : undefined}>
    <Async state={state}>
      {rev => <div className="space-y-4">
        <KpiGrid>
          <Kpi label="Status" value={<Badge status={rev.status} />} sub={rev.implementedDate ? `Implemented ${fmtDate(rev.implementedDate)}` : undefined} />
          <Kpi label="New CTC" value={money(rev.newSalary?.ctc)} sub={`was ${money(rev.oldSalary?.ctc)}`} />
          <Kpi label="Increment" value={money(rev.incrementAmount)} sub={pct(rev.incrementPercentage)} tone={rev.incrementAmount >= 0 ? 'text-green-700' : 'text-red-600'} />
          <Kpi label="Arrears" value={rev.arrearsApplicable ? money(rev.arrearsAmount) : 'Not applicable'} sub={rev.arrearsApplicable ? (rev.arrearsPaid ? 'Paid' : 'Unpaid') : undefined} />
        </KpiGrid>

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <p className="px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-100">Old vs new structure</p>
          <ComparisonTable rev={rev} />
        </div>

        {rev.arrearsApplicable && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Row label="Arrears from" value={fmtDate(rev.arrearsFromDate)} />
          <Row label="Arrears to" value={fmtDate(rev.arrearsToDate)} />
          <Row label="Arrears amount" value={money(rev.arrearsAmount)} />
          <Row label="Arrears paid" value={rev.arrearsPaid ? 'Yes' : 'No'} />
          {rev.status === 'implemented' && <div className="sm:col-span-2"><Btn variant="ghost" onClick={() => onArrears(refId(rev.employeeId))}>View the employee&apos;s arrears <ArrowRight size={14} /></Btn></div>}
        </div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Row label="PT / work state" value={rev.state || '—'} />
          <Row label="Remarks" value={rev.remarks || '—'} />
          {Object.entries(rev.statutoryApplicability ?? {}).filter(([, v]) => typeof v === 'boolean').map(([k, v]) => <Row key={k} label={k} value={v ? 'Yes' : 'No'} />)}
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <p className="px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-100">Approvals</p>
          <DataTable rows={rev.approvals ?? []} rowKey={(_, i) => String(i)} empty="No approval decisions yet"
            columns={[
              { key: 'approverName', label: 'Approver', render: a => <div><p className="font-semibold">{a.approverName || refName(a.employeeId, employees)}</p><p className="text-[11px] text-gray-400">{a.approverRole}</p></div> },
              { key: 'status', label: 'Decision', render: a => <Badge status={a.status} /> },
              { key: 'comments', label: 'Comments', render: a => a.comments || '—' },
              { key: 'approvedDate', label: 'Date', render: a => fmtDateTime(a.approvedDate) },
            ]} />
        </div>
      </div>}
    </Async>
  </Modal>;
}

function ComparisonTable({ rev }: { rev: Revision }) {
  const o = rev.oldSalary ?? ({} as SalaryBlock);
  const n = rev.newSalary ?? ({} as SalaryBlock);
  const rows: Array<{ label: string; old: number | null; neu: number | null; note?: string }> = [
    { label: 'CTC (annual)', old: o.ctc, neu: n.ctc },
    { label: 'Gross salary (monthly)', old: o.grossSalary, neu: n.grossSalary },
    { label: 'Basic salary (monthly)', old: o.basicSalary, neu: n.basicSalary },
  ];
  const names = new Map<string, { old: number | null; neu: number | null }>();
  for (const c of o.components ?? []) names.set(c.componentName, { old: c.amount, neu: null });
  for (const c of n.components ?? []) names.set(c.componentName, { old: names.get(c.componentName)?.old ?? null, neu: c.amount });
  for (const [label, v] of names) rows.push({ label, ...v });
  const ovKey = (x: Override) => `${x.category}:${x.code || x.name}`;
  const ovs = new Map<string, { name: string; category: string; old?: Override; neu?: Override }>();
  for (const x of o.componentOverrides ?? []) ovs.set(ovKey(x), { name: x.name, category: x.category, old: x });
  for (const x of n.componentOverrides ?? []) ovs.set(ovKey(x), { name: x.name, category: x.category, old: ovs.get(ovKey(x))?.old, neu: x });
  const ovText = (x?: Override) => (!x ? '—' : x.disabled ? 'Disabled' : x.overrideAmount === null || x.overrideAmount === undefined ? 'Default' : money(x.overrideAmount));

  return <div className="overflow-x-auto"><table className="w-full text-xs">
    <thead className="bg-gray-50 text-gray-500"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Old</th><th className="px-3 py-2 text-right">New</th><th className="px-3 py-2 text-right">Change</th></tr></thead>
    <tbody className="divide-y divide-gray-100">
      {rows.map(r => {
        const diff = r.old !== null && r.neu !== null ? Number(r.neu) - Number(r.old) : null;
        return <tr key={r.label}>
          <td className="px-3 py-2 font-semibold text-gray-800">{r.label}</td>
          <td className="px-3 py-2 text-right">{r.old === null ? '—' : money(r.old)}</td>
          <td className="px-3 py-2 text-right font-semibold">{r.neu === null ? '—' : money(r.neu)}</td>
          <td className={`px-3 py-2 text-right ${diff === null ? 'text-gray-400' : diff >= 0 ? 'text-green-700' : 'text-red-600'}`}>{diff === null ? '—' : money(diff)}</td>
        </tr>;
      })}
      {ovs.size > 0 && <tr className="bg-gray-50"><td colSpan={4} className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Component overrides</td></tr>}
      {[...ovs.entries()].map(([k, v]) => <tr key={k}>
        <td className="px-3 py-2 text-gray-800">{v.name} <span className="text-[10px] capitalize text-gray-400">{v.category}</span></td>
        <td className="px-3 py-2 text-right">{ovText(v.old)}</td>
        <td className="px-3 py-2 text-right font-semibold">{ovText(v.neu)}</td>
        <td className="px-3 py-2" />
      </tr>)}
    </tbody>
  </table>
    {(o.components ?? []).length === 0 && (n.components ?? []).length > 0 && <p className="px-3 py-2 text-[11px] text-gray-400">The legacy engine does not snapshot the old component breakup; only the new breakup is listed.</p>}
  </div>;
}

function DecisionModal({ rev, status, employees, notify, onClose, onDone }: { rev: Revision; status: 'approved' | 'rejected'; employees: PayrollEmployee[]; notify: ModuleProps['notify']; onClose: () => void; onDone: () => void }) {
  const [comments, setComments] = useState('');
  const { busy, run } = useAction(notify);
  const submit = async () => {
    const out = await run(() => pe.put(`revision/${rev._id}/approve`, { status, comments }), `Salary revision ${status} successfully`);
    if (out !== undefined) onDone();
  };
  return <Modal title={status === 'approved' ? 'Approve salary revision' : 'Reject salary revision'} subtitle={`${refName(rev.employeeId, employees)} · ${money(rev.oldSalary?.ctc)} → ${money(rev.newSalary?.ctc)}`} onClose={onClose} width="max-w-md"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant={status === 'approved' ? 'primary' : 'danger'} busy={busy} onClick={() => void submit()}>{status === 'approved' ? 'Approve' : 'Reject'}</Btn></>}>
    <Field label="Comments / remarks"><textarea className="w-full rounded-lg border border-gray-300 p-2 text-sm" rows={3} value={comments} onChange={e => setComments(e.target.value)} aria-label="Comments" /></Field>
  </Modal>;
}
