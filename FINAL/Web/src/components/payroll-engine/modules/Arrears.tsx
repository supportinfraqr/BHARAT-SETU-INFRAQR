"use client";

/**
 * Arrears — legacy controller/payroll/arrearsManagement.js
 *
 *   POST   arrears/create                 create an arrears entry (components, TDS, pay-in month)
 *   PUT    arrears/:id/approve            calculated -> approved
 *   PUT    arrears/:id/pay                approved -> paid (paidInMonth / paidInYear / payrollId)
 *   DELETE arrears/:id                    delete (not when paid via a payroll run)
 *   GET    arrears                        list (?status=&employeeId=&page=&limit=)
 *   GET    arrears/employee/:employeeId   all arrears of one employee
 *   GET    arrears/pending/:employeeId    pending (calculated + approved) total for one employee
 */

import { useMemo, useState } from 'react';
import { CheckCircle2, Eye, IndianRupee, Plus, Trash2 } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps, PayrollEmployee } from '@/lib/payroll-engine/types';
import {
  Async, Badge, Btn, Confirm, DataTable, Empty, EmployeePicker, Field, FormGrid, Kpi, KpiGrid, MONTHS, Modal,
  NumberInput, PeriodPicker, Row, Section, Select, Tabs, TextInput, employeeName, fmtDate, fmtDateTime, money, num,
  useAction, useEmployees, useLoad, type Column,
} from '../ui';

// ---------------------------------------------------------------------------
// Types (legacy models/payroll/arrears.js)
// ---------------------------------------------------------------------------

type EmpRef = string | { _id: string; firstName?: string; lastName?: string; email?: string; payrollInfo?: { employeeCode?: string } } | null | undefined;

type ArrearsComponent = { componentName: string; oldAmount: number; newAmount: number; difference: number; months: number; totalArrears: number };

type ArrearsRecord = {
  _id: string;
  employeeId: EmpRef;
  arrearsType: string;
  periodFrom?: { month?: string; year?: number } | null;
  periodTo?: { month?: string; year?: number } | null;
  components: ArrearsComponent[];
  totalArrearsAmount: number;
  tdsOnArrears: number;
  netArrearsPayable: number;
  payInMonth?: string;
  payInYear?: number;
  status: 'calculated' | 'approved' | 'paid' | 'rejected';
  paidInMonth?: string;
  paidInYear?: number;
  payrollId?: string | null;
  paidDate?: string | null;
  salaryRevisionId?: string | null;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ArrearsPage = { total: number; page: number; limit: number; totalPages: number; data: ArrearsRecord[] };
type PendingArrears = { count: number; totalAmount: number; arrears: ArrearsRecord[] };

const ARREARS_TYPES = [
  { value: 'salary_revision', label: 'Salary revision' },
  { value: 'correction', label: 'Correction' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'incentive', label: 'Incentive' },
  { value: 'allowance', label: 'Allowance' },
  { value: 'other', label: 'Other' },
];
const STATUS_OPTIONS = [
  { value: 'calculated', label: 'Calculated' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
];
const typeLabel = (t: string) => ARREARS_TYPES.find(x => x.value === t)?.label ?? t;

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
const period = (p?: { month?: string; year?: number } | null) => (p?.month || p?.year ? `${p?.month ?? ''} ${p?.year ?? ''}`.trim() : '—');

function nowPeriod() {
  const d = new Date();
  return { month: MONTHS[d.getMonth()] as string, year: d.getFullYear() };
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export default function Arrears({ notify, navigate, params }: ModuleProps) {
  const [tab, setTab] = useState(params.employeeId ? 'employee' : 'all');
  const employeesState = useEmployees();
  const employees = useMemo(() => employeesState.data ?? [], [employeesState.data]);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<ArrearsRecord | null>(null);
  const [paying, setPaying] = useState<ArrearsRecord | null>(null);
  const [deleting, setDeleting] = useState<ArrearsRecord | null>(null);
  const [approving, setApproving] = useState<ArrearsRecord | null>(null);
  const [version, setVersion] = useState(0);
  const { busy, run } = useAction(notify);
  const refresh = () => setVersion(v => v + 1);

  const approve = async (row: ArrearsRecord) => {
    const ok = await run(() => pe.put(`arrears/${row._id}/approve`), 'Arrears approved successfully');
    if (ok !== undefined) { setApproving(null); setViewing(null); refresh(); }
  };
  const remove = async (row: ArrearsRecord) => {
    const ok = await run(() => pe.del(`arrears/${row._id}`), 'Arrears deleted successfully');
    if (ok !== undefined) { setDeleting(null); setViewing(null); refresh(); }
  };

  const actions = {
    view: setViewing,
    approve: setApproving,
    pay: setPaying,
    remove: setDeleting,
  };

  return <div className="space-y-4">
    <Section title="Arrears" subtitle="Back-pay owed for past periods. Approved arrears are added to the salary slip of their pay-in month."
      right={<Btn onClick={() => setCreating(true)}><Plus size={14} />New arrears</Btn>}>
      <div className="px-5 pt-3"><Tabs active={tab} onChange={setTab} tabs={[{ key: 'all', label: 'All arrears' }, { key: 'employee', label: 'By employee' }]} /></div>
      {tab === 'all'
        ? <AllArrears employees={employees} actions={actions} version={version} initialEmployee={params.employeeId ?? ''} />
        : <EmployeeArrears employees={employees} actions={actions} version={version} initialEmployee={params.employeeId ?? ''} />}
    </Section>

    {creating && <CreateArrears employees={employees} notify={notify} initialEmployee={params.employeeId ?? ''}
      onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refresh(); }} />}
    {viewing && <ArrearsDetail row={viewing} employees={employees} onClose={() => setViewing(null)} actions={actions}
      onRevision={id => navigate('revisions', { revisionId: id })} />}
    {paying && <PayArrears row={paying} employees={employees} notify={notify} onClose={() => setPaying(null)}
      onPaid={() => { setPaying(null); setViewing(null); refresh(); }} />}
    {approving && <Confirm title="Approve arrears" busy={busy} onClose={() => setApproving(null)} onConfirm={() => void approve(approving)}
      message={<>Approve {money(approving.netArrearsPayable)} {typeLabel(approving.arrearsType).toLowerCase()} arrears for <b>{refName(approving.employeeId, employees)}</b>? It will be paid with the {approving.payInMonth ?? '—'} {approving.payInYear ?? ''} payroll.</>} />}
    {deleting && <Confirm danger title="Delete arrears" busy={busy} onClose={() => setDeleting(null)} onConfirm={() => void remove(deleting)}
      message={<>Delete this {money(deleting.totalArrearsAmount)} arrears entry for <b>{refName(deleting.employeeId, employees)}</b>? This cannot be undone.</>} />}
  </div>;
}

type Actions = { view: (r: ArrearsRecord) => void; approve: (r: ArrearsRecord) => void; pay: (r: ArrearsRecord) => void; remove: (r: ArrearsRecord) => void };

function useColumns(employees: PayrollEmployee[], actions: Actions, showEmployee = true): Column<ArrearsRecord>[] {
  const cols: Column<ArrearsRecord>[] = [
    { key: 'employee', label: 'Employee', render: r => <span className="font-semibold">{refName(r.employeeId, employees)}</span> },
    { key: 'type', label: 'Type', render: r => typeLabel(r.arrearsType) },
    { key: 'period', label: 'Period', render: r => <span className="whitespace-nowrap">{period(r.periodFrom)} – {period(r.periodTo)}</span> },
    { key: 'payIn', label: 'Pay in', render: r => <span className="whitespace-nowrap">{r.payInMonth ? `${r.payInMonth} ${r.payInYear ?? ''}` : '—'}</span> },
    { key: 'total', label: 'Total', align: 'right', render: r => money(r.totalArrearsAmount) },
    { key: 'tds', label: 'TDS', align: 'right', render: r => money(r.tdsOnArrears) },
    { key: 'net', label: 'Net payable', align: 'right', render: r => <span className="font-semibold">{money(r.netArrearsPayable)}</span> },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    {
      key: 'actions', label: 'Actions', align: 'right', render: r => <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
        <Btn variant="ghost" aria-label="View arrears" onClick={() => actions.view(r)}><Eye size={14} /></Btn>
        {(r.status === 'calculated' || r.status === 'rejected') && <Btn variant="ghost" onClick={() => actions.approve(r)}><CheckCircle2 size={14} />Approve</Btn>}
        {r.status === 'approved' && <Btn variant="ghost" onClick={() => actions.pay(r)}><IndianRupee size={14} />Mark paid</Btn>}
        {!(r.status === 'paid' && r.payrollId) && <Btn variant="ghost" aria-label="Delete arrears" className="text-red-600 hover:bg-red-50" onClick={() => actions.remove(r)}><Trash2 size={14} /></Btn>}
      </div>,
    },
  ];
  return showEmployee ? cols : cols.filter(c => c.key !== 'employee');
}

function AllArrears({ employees, actions, version, initialEmployee }: { employees: PayrollEmployee[]; actions: Actions; version: number; initialEmployee: string }) {
  const [status, setStatus] = useState('');
  const [employeeId, setEmployeeId] = useState(initialEmployee);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const state = useLoad(() => pe.get<ArrearsPage>('arrears', { status, employeeId, page, limit }), [status, employeeId, page, limit, version]);
  const columns = useColumns(employees, actions);

  return <div>
    <div className="px-5 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Field label="Status"><Select value={status} onChange={v => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} placeholder="All statuses" /></Field>
      <Field label="Employee"><EmployeePicker value={employeeId} onChange={id => { setEmployeeId(id); setPage(1); }} employees={employees} placeholder="All employees" /></Field>
      <Field label="Rows per page"><Select value={String(limit)} onChange={v => { setLimit(Number(v)); setPage(1); }} options={['10', '20', '50', '100']} /></Field>
    </div>
    <Async state={state}>
      {data => <>
        <DataTable columns={columns} rows={data.data ?? []} rowKey={r => r._id} onRowClick={actions.view}
          empty={status || employeeId ? 'No arrears match these filters' : 'No arrears yet — create one, or implement a salary revision with arrears'} />
        <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
      </>}
    </Async>
  </div>;
}

export function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (!total) return null;
  return <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
    <span>{total} record{total === 1 ? '' : 's'} · page {page} of {Math.max(1, totalPages)}</span>
    <div className="flex gap-2">
      <Btn variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Btn>
      <Btn variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</Btn>
    </div>
  </div>;
}

function EmployeeArrears({ employees, actions, version, initialEmployee }: { employees: PayrollEmployee[]; actions: Actions; version: number; initialEmployee: string }) {
  const [employeeId, setEmployeeId] = useState(initialEmployee);
  const history = useLoad(() => (employeeId ? pe.get<ArrearsRecord[]>(`arrears/employee/${employeeId}`) : Promise.resolve(null)), [employeeId, version]);
  const pending = useLoad(() => (employeeId ? pe.get<PendingArrears>(`arrears/pending/${employeeId}`) : Promise.resolve(null)), [employeeId, version]);
  const columns = useColumns(employees, actions, false);
  const rows = history.data ?? [];
  const paid = rows.filter(r => r.status === 'paid').reduce((s, r) => s + (Number(r.netArrearsPayable) || 0), 0);

  return <div>
    <div className="px-5 py-3 max-w-md"><Field label="Employee"><EmployeePicker value={employeeId} onChange={id => setEmployeeId(id)} employees={employees} /></Field></div>
    {!employeeId ? <Empty title="Pick an employee" text="See every arrears entry for the employee and the amount still pending payment." /> : <>
      <div className="px-5 pb-3">
        <KpiGrid>
          <Kpi label="Pending entries" value={pending.data ? num(pending.data.count, 0) : '—'} sub="Calculated + approved" />
          <Kpi label="Pending amount" value={pending.data ? money(pending.data.totalAmount) : '—'} tone="text-orange-700" sub="Net of TDS" />
          <Kpi label="Paid so far" value={money(paid)} tone="text-green-700" />
          <Kpi label="All entries" value={num(rows.length, 0)} />
        </KpiGrid>
        {pending.error && <p className="text-xs text-red-600 mt-2">{pending.error}</p>}
      </div>
      <Async state={history}>
        {data => <DataTable columns={columns} rows={data} rowKey={r => r._id} onRowClick={actions.view} empty="No arrears for this employee" />}
      </Async>
    </>}
  </div>;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

type DraftComponent = { componentName: string; oldAmount: number; newAmount: number; months: number; totalArrears: number; manualTotal: boolean };

function CreateArrears({ employees, notify, onClose, onCreated, initialEmployee }: { employees: PayrollEmployee[]; notify: ModuleProps['notify']; onClose: () => void; onCreated: () => void; initialEmployee: string }) {
  const now = nowPeriod();
  const [employeeId, setEmployeeId] = useState(initialEmployee);
  const [arrearsType, setArrearsType] = useState('correction');
  const [from, setFrom] = useState(now);
  const [to, setTo] = useState(now);
  const [payIn, setPayIn] = useState(now);
  const [components, setComponents] = useState<DraftComponent[]>([]);
  const [manualTotal, setManualTotal] = useState<number | null>(null);
  const [tds, setTds] = useState(0);
  const [remarks, setRemarks] = useState('');
  const { busy, run } = useAction(notify);

  const componentsTotal = components.reduce((s, c) => s + (Number(c.totalArrears) || 0), 0);
  const total = manualTotal ?? componentsTotal;
  const months = monthsBetween(from, to);

  const setComp = (i: number, patch: Partial<DraftComponent>) => setComponents(list => list.map((c, j) => {
    if (j !== i) return c;
    const next = { ...c, ...patch };
    if (!next.manualTotal) next.totalArrears = Math.round((next.newAmount - next.oldAmount) * next.months * 100) / 100;
    return next;
  }));

  const submit = async () => {
    if (!employeeId) { notify('Select an employee', 'error'); return; }
    if (!(total > 0)) { notify('Total arrears amount must be greater than 0', 'error'); return; }
    const body = {
      employeeId, arrearsType,
      periodFrom: { month: from.month, year: from.year },
      periodTo: { month: to.month, year: to.year },
      components: components.filter(c => c.componentName.trim()).map(c => ({
        componentName: c.componentName.trim(), oldAmount: c.oldAmount, newAmount: c.newAmount,
        difference: Math.round((c.newAmount - c.oldAmount) * 100) / 100, months: c.months, totalArrears: c.totalArrears,
      })),
      totalArrearsAmount: total,
      tdsOnArrears: tds,
      remarks,
      payInMonth: payIn.month,
      payInYear: payIn.year,
    };
    const out = await run(() => pe.post('arrears/create', body), 'Arrears created successfully');
    if (out !== undefined) onCreated();
  };

  return <Modal title="New arrears" subtitle="Record back-pay for a past period and choose the payroll month that pays it." onClose={onClose} width="max-w-3xl"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>Create arrears</Btn></>}>
    <div className="space-y-4">
      <FormGrid cols={2}>
        <Field label="Employee *"><EmployeePicker value={employeeId} onChange={id => setEmployeeId(id)} employees={employees} /></Field>
        <Field label="Arrears type *"><Select value={arrearsType} onChange={setArrearsType} options={ARREARS_TYPES} /></Field>
        <Field label="Period from"><PeriodPicker month={from.month} year={from.year} onChange={(m, y) => setFrom({ month: m, year: y })} /></Field>
        <Field label="Period to"><PeriodPicker month={to.month} year={to.year} onChange={(m, y) => setTo({ month: m, year: y })} /></Field>
        <Field label="Pay in payroll month *" hint="The salary slip of this month will carry the arrears."><PeriodPicker month={payIn.month} year={payIn.year} onChange={(m, y) => setPayIn({ month: m, year: y })} /></Field>
      </FormGrid>

      <div className="rounded-xl border border-gray-200">
        <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-700">Components <span className="font-normal text-gray-400">(optional breakup — monthly old vs new amount)</span></p>
          <Btn variant="ghost" onClick={() => setComponents(c => [...c, { componentName: '', oldAmount: 0, newAmount: 0, months: Math.max(1, months), totalArrears: 0, manualTotal: false }])}><Plus size={14} />Add component</Btn>
        </div>
        {components.length === 0 ? <p className="px-3 py-3 text-xs text-gray-400">No breakup. Enter the total amount below, or add components to compute it.</p> :
          <div className="divide-y divide-gray-100">
            {components.map((c, i) => <div key={i} className="p-3 grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
              <Field label="Component" className="col-span-2"><TextInput value={c.componentName} onChange={v => setComp(i, { componentName: v })} placeholder="e.g. Basic Salary" /></Field>
              <Field label="Old / month"><NumberInput value={c.oldAmount} onChange={v => setComp(i, { oldAmount: v })} /></Field>
              <Field label="New / month"><NumberInput value={c.newAmount} onChange={v => setComp(i, { newAmount: v })} /></Field>
              <Field label="Months"><NumberInput value={c.months} min={0} onChange={v => setComp(i, { months: v })} /></Field>
              <Field label="Arrears" hint={`Diff ${money(c.newAmount - c.oldAmount)}`}>
                <div className="flex gap-1">
                  <NumberInput value={c.totalArrears} onChange={v => setComp(i, { totalArrears: v, manualTotal: true })} aria-label="Component arrears" />
                  <Btn variant="ghost" aria-label="Remove component" onClick={() => setComponents(list => list.filter((_, j) => j !== i))}><Trash2 size={14} /></Btn>
                </div>
              </Field>
            </div>)}
          </div>}
      </div>

      <FormGrid cols={3}>
        <Field label="Total arrears amount *" hint={components.length ? `Components sum: ${money(componentsTotal)}` : undefined}>
          <NumberInput value={total} min={0} onChange={v => setManualTotal(v)} />
        </Field>
        <Field label="TDS on arrears"><NumberInput value={tds} min={0} onChange={setTds} /></Field>
        <Field label="Net payable"><div className="h-9 flex items-center text-sm font-bold text-gray-900">{money(total - tds)}</div></Field>
      </FormGrid>
      {manualTotal !== null && components.length > 0 && <button type="button" className="text-xs font-semibold text-[var(--color-bss-interactive-blue)] underline" onClick={() => setManualTotal(null)}>Use components sum</button>}
      <Field label="Remarks"><TextInput value={remarks} onChange={setRemarks} placeholder="Reason / reference" /></Field>
    </div>
  </Modal>;
}

function monthsBetween(a: { month: string; year: number }, b: { month: string; year: number }): number {
  const ia = MONTHS.indexOf(a.month as (typeof MONTHS)[number]);
  const ib = MONTHS.indexOf(b.month as (typeof MONTHS)[number]);
  return Math.max(0, (b.year - a.year) * 12 + (ib - ia) + 1);
}

// ---------------------------------------------------------------------------
// Detail + pay
// ---------------------------------------------------------------------------

function ArrearsDetail({ row, employees, onClose, actions, onRevision }: { row: ArrearsRecord; employees: PayrollEmployee[]; onClose: () => void; actions: Actions; onRevision: (id: string) => void }) {
  return <Modal title={`Arrears · ${refName(row.employeeId, employees)}`} subtitle={`${typeLabel(row.arrearsType)} · created ${fmtDateTime(row.createdAt)}`} onClose={onClose} width="max-w-3xl"
    footer={<>
      {!(row.status === 'paid' && row.payrollId) && <Btn variant="danger" onClick={() => actions.remove(row)}><Trash2 size={14} />Delete</Btn>}
      {(row.status === 'calculated' || row.status === 'rejected') && <Btn onClick={() => actions.approve(row)}><CheckCircle2 size={14} />Approve</Btn>}
      {row.status === 'approved' && <Btn onClick={() => actions.pay(row)}><IndianRupee size={14} />Mark paid</Btn>}
    </>}>
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Row label="Status" value={<Badge status={row.status} />} />
        <Row label="Type" value={typeLabel(row.arrearsType)} />
        <Row label="Period" value={`${period(row.periodFrom)} – ${period(row.periodTo)}`} />
        <Row label="Pay in" value={row.payInMonth ? `${row.payInMonth} ${row.payInYear ?? ''}` : '—'} />
        <Row label="Total arrears" value={money(row.totalArrearsAmount)} />
        <Row label="TDS on arrears" value={money(row.tdsOnArrears)} />
        <Row label="Net payable" value={money(row.netArrearsPayable)} tone="text-green-700" />
        <Row label="Paid in" value={row.paidInMonth ? `${row.paidInMonth} ${row.paidInYear ?? ''}` : '—'} />
        <Row label="Paid on" value={fmtDate(row.paidDate)} />
        <Row label="Payroll run" value={row.payrollId ? String(row.payrollId) : '—'} />
      </div>
      {row.salaryRevisionId && <p className="text-xs text-gray-600">Auto-created from a salary revision. <button type="button" className="font-semibold text-[var(--color-bss-interactive-blue)] underline" onClick={() => onRevision(String(row.salaryRevisionId))}>Open revision</button></p>}
      {row.remarks && <p className="text-xs text-gray-600"><span className="font-semibold">Remarks:</span> {row.remarks}</p>}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <DataTable rows={row.components ?? []} rowKey={(_, i) => String(i)} empty="No component breakup"
          columns={[
            { key: 'componentName', label: 'Component' },
            { key: 'oldAmount', label: 'Old', align: 'right', render: c => money(c.oldAmount) },
            { key: 'newAmount', label: 'New', align: 'right', render: c => money(c.newAmount) },
            { key: 'difference', label: 'Difference', align: 'right', render: c => money(c.difference) },
            { key: 'months', label: 'Months', align: 'right', render: c => num(c.months, 0) },
            { key: 'totalArrears', label: 'Arrears', align: 'right', render: c => <b>{money(c.totalArrears)}</b> },
          ]} />
      </div>
    </div>
  </Modal>;
}

function PayArrears({ row, employees, notify, onClose, onPaid }: { row: ArrearsRecord; employees: PayrollEmployee[]; notify: ModuleProps['notify']; onClose: () => void; onPaid: () => void }) {
  const now = nowPeriod();
  const [p, setP] = useState({ month: row.payInMonth || now.month, year: row.payInYear || now.year });
  const [payrollId, setPayrollId] = useState('');
  const { busy, run } = useAction(notify);
  const submit = async () => {
    const out = await run(() => pe.put(`arrears/${row._id}/pay`, { paidInMonth: p.month, paidInYear: p.year, payrollId: payrollId.trim() }), 'Arrears marked as paid successfully');
    if (out !== undefined) onPaid();
  };
  return <Modal title="Mark arrears as paid" subtitle={`${refName(row.employeeId, employees)} · ${money(row.netArrearsPayable)}`} onClose={onClose} width="max-w-md"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>Mark paid</Btn></>}>
    <div className="space-y-3">
      <Field label="Paid in payroll month *"><PeriodPicker month={p.month} year={p.year} onChange={(m, y) => setP({ month: m, year: y })} /></Field>
      <Field label="Payroll run ID" hint="Optional — link the payroll run that paid it. Linked arrears can no longer be deleted."><TextInput value={payrollId} onChange={setPayrollId} /></Field>
    </div>
  </Modal>;
}
