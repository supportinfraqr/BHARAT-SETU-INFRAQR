"use client";

/**
 * Full & Final settlement — legacy controller/payroll/fullAndFinal.js (+ ffSettlementPreview.js,
 * ffLeaveEncashmentHelper.js)
 *
 *   GET  fullAndFinal/exitedEmployees                       ?search=&page=&limit=
 *   GET  fullAndFinal/preview/:employeeId                   ?lastWorkingDate=
 *   GET  fullAndFinal/employee/:employeeId/leaveEncashmentDetails ?asOfDate=
 *   POST fullAndFinal/initiate                              { employeeId, lastWorkingDate, resignationId? }
 *   GET  fullAndFinal                                       all settlements (status filter applied here)
 *   GET  fullAndFinal/employee/:employeeId                  settlement of one employee
 *   GET  fullAndFinal/:id                                   + the step / calculate / approval / finalize / payment
 *                                                           endpoints in ./FullAndFinal/Workspace.tsx
 * BSS: PUT employees/:id/exit { exitStatus, lastWorkingDay, reason } records (or clears) an exit.
 */

import { useMemo, useState } from 'react';
import { Eye, LogOut, Play, Search, Undo2 } from 'lucide-react';
import { PayrollApiError, pe } from '@/lib/payroll-engine/api';
import type { ModuleProps, PayrollEmployee } from '@/lib/payroll-engine/types';
import {
  Async, Badge, Btn, Confirm, DataTable, Empty, EmployeePicker, Field, FormGrid, Kpi, KpiGrid, Modal, Row, Section,
  Select, Tabs, TextInput, Toggle, employeeName, fmtDate, isoDate, money, num, useAction, useEmployees, useLoad,
} from '../ui';
import { Pager } from './Arrears';
import { SettlementWorkspace } from './FullAndFinal/Workspace';
import {
  EXIT_STATUSES, empIdOf, empOf, fullName, settlementTotals,
  type ExitedEmployees, type Settlement, type SettlementEmployee, type SettlementPreview,
} from './FullAndFinal/types';

type Notify = ModuleProps['notify'];

const STATUS_OPTIONS = ['initiated', 'pending', 'approved', 'finalized', 'paid', 'rejected'].map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

export default function FullAndFinal({ ctx, notify, params }: ModuleProps) {
  const [openId, setOpenId] = useState(params.settlementId ?? '');
  const [version, setVersion] = useState(0);
  const employeesState = useEmployees();
  const employees = useMemo(() => employeesState.data ?? [], [employeesState.data]);
  const settlements = useLoad(() => pe.get<Settlement[]>('fullAndFinal'), [version]);
  const refresh = () => setVersion(v => v + 1);

  if (openId) {
    return <SettlementWorkspace settlementId={openId} employees={employees} orgName={ctx.organization?.name ?? ''} notify={notify}
      onBack={() => { setOpenId(''); refresh(); }} onChanged={refresh} />;
  }
  return <Home settlements={settlements} employees={employees} employeesReload={employeesState.reload} notify={notify} onOpen={setOpenId} refresh={refresh} version={version} initialEmployee={params.employeeId ?? ''} />;
}

type SettlementsState = { data: Settlement[] | null; error: string; loading: boolean; reload: () => void };

function Home({ settlements, employees, employeesReload, notify, onOpen, refresh, version, initialEmployee }: { settlements: SettlementsState; employees: PayrollEmployee[]; employeesReload: () => void; notify: Notify; onOpen: (id: string) => void; refresh: () => void; version: number; initialEmployee: string }) {
  const [tab, setTab] = useState(initialEmployee ? 'lookup' : 'settlements');
  const [previewFor, setPreviewFor] = useState<{ id: string; lwd: string } | null>(null);
  const [initiateFor, setInitiateFor] = useState<{ id: string; lwd: string } | null>(null);
  const [recordingExit, setRecordingExit] = useState(false);
  const list = useMemo(() => settlements.data ?? [], [settlements.data]);
  const byEmployee = useMemo(() => new Map(list.map(s => [empIdOf(s), s])), [list]);
  const count = (st: string) => list.filter(s => s.status === st).length;
  const unpaidNet = list.filter(s => s.status !== 'paid' && s.status !== 'rejected').reduce((sum, s) => sum + settlementTotals(s).net, 0);

  const handlers: Handlers = {
    preview: (id, lwd) => setPreviewFor({ id, lwd }),
    initiate: (id, lwd) => setInitiateFor({ id, lwd }),
    open: onOpen,
    byEmployee,
  };

  return <div className="space-y-4">
    <KpiGrid>
      <Kpi label="Settlements" value={num(list.length, 0)} sub={`${count('initiated') + count('pending')} in progress`} />
      <Kpi label="Approved / finalized" value={num(count('approved') + count('finalized'), 0)} sub="Awaiting payment" tone="text-blue-700" />
      <Kpi label="Paid" value={num(count('paid'), 0)} tone="text-green-700" />
      <Kpi label="Net payable (unpaid)" value={money(unpaidNet)} tone="text-orange-700" />
    </KpiGrid>
    <Section title="Full & Final settlement" subtitle="Record an exit → preview → initiate → fill each component → calculate → approve → finalize → pay."
      right={<Btn onClick={() => setRecordingExit(true)}><LogOut size={14} />Record exit</Btn>}>
      <div className="px-5 pt-3"><Tabs active={tab} onChange={setTab} tabs={[
        { key: 'settlements', label: 'Settlements' }, { key: 'exited', label: 'Exited employees' }, { key: 'lookup', label: 'Find by employee' },
      ]} /></div>
      {tab === 'settlements' && <SettlementList state={settlements} onOpen={onOpen} />}
      {tab === 'exited' && <ExitedList handlers={handlers} notify={notify} version={version} onChanged={() => { refresh(); employeesReload(); }} />}
      {tab === 'lookup' && <Lookup employees={employees} handlers={handlers} initialEmployee={initialEmployee} version={version} />}
    </Section>

    {previewFor && <PreviewModal employeeId={previewFor.id} lwd={previewFor.lwd} existing={byEmployee.get(previewFor.id)} onClose={() => setPreviewFor(null)}
      onInitiate={lwd => { setPreviewFor(null); setInitiateFor({ id: previewFor.id, lwd }); }} onOpen={onOpen} />}
    {initiateFor && <InitiateModal employeeId={initiateFor.id} lwd={initiateFor.lwd} employees={employees} notify={notify} onClose={() => setInitiateFor(null)}
      onDone={id => { setInitiateFor(null); refresh(); onOpen(id); }} />}
    {recordingExit && <ExitModal employees={employees} notify={notify} onClose={() => setRecordingExit(false)}
      onDone={(id, lwd) => { setRecordingExit(false); refresh(); employeesReload(); setTab('exited'); setPreviewFor({ id, lwd }); }} />}
  </div>;
}

type Handlers = { preview: (id: string, lwd: string) => void; initiate: (id: string, lwd: string) => void; open: (id: string) => void; byEmployee: Map<string, Settlement> };

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

function SettlementList({ state, onOpen }: { state: SettlementsState; onOpen: (id: string) => void }) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  return <div>
    <div className="px-5 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Status"><Select value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="All statuses" /></Field>
      <Field label="Search"><TextInput value={search} onChange={setSearch} placeholder="Employee name or code" /></Field>
    </div>
    <Async state={state}>
      {data => {
        const rows = data.filter(s => (!status || s.status === status) && (!term || `${fullName(empOf(s))} ${empOf(s)?.uniqueId ?? ''}`.toLowerCase().includes(term)))
          .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
        return <DataTable rows={rows} rowKey={s => s._id} onRowClick={s => onOpen(s._id)}
          empty={status || term ? 'No settlements match' : 'No settlements yet — open “Exited employees” to start one'}
          columns={[
            { key: 'employee', label: 'Employee', render: s => <div><p className="font-semibold">{fullName(empOf(s)) || empIdOf(s)}</p><p className="text-[11px] text-gray-400">{empOf(s)?.uniqueId}</p></div> },
            { key: 'exit', label: 'Exit', render: s => empOf(s)?.exitData?.exitStatus || '—' },
            { key: 'lwd', label: 'Last working day', render: s => fmtDate(s.lastWorkingDate) },
            { key: 'payables', label: 'Earnings', align: 'right', render: s => money(settlementTotals(s).payables) },
            { key: 'deductions', label: 'Deductions', align: 'right', render: s => money(settlementTotals(s).deductions) },
            { key: 'net', label: 'Net payable', align: 'right', render: s => <b>{money(settlementTotals(s).net)}</b> },
            { key: 'status', label: 'Status', render: s => <Badge status={s.status} /> },
            { key: 'open', label: '', align: 'right', render: s => <Btn variant="ghost" onClick={e => { e.stopPropagation(); onOpen(s._id); }}>Open</Btn> },
          ]} />;
      }}
    </Async>
  </div>;
}

function ExitedList({ handlers, notify, version, onChanged }: { handlers: Handlers; notify: Notify; version: number; onChanged: () => void }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [revoking, setRevoking] = useState<SettlementEmployee | null>(null);
  const state = useLoad(() => pe.get<ExitedEmployees>('fullAndFinal/exitedEmployees', { search: query, page, limit: 30 }), [query, page, version]);
  const { busy, run } = useAction(notify);
  const revoke = async () => {
    if (!revoking) return;
    if (await run(() => pe.put(`employees/${revoking._id}/exit`, { exitStatus: '' }), 'Exit cleared — employee is active again') !== undefined) { setRevoking(null); state.reload(); onChanged(); }
  };
  const lwdOf = (e: SettlementEmployee) => isoDate(e.exitData?.lastWorkingDay || e.exitData?.date) || isoDate(new Date());

  return <div>
    <form className="px-5 py-3 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); setQuery(search); setPage(1); }}>
      <Field label="Search exited employees" className="flex-1 min-w-[200px]"><TextInput value={search} onChange={setSearch} placeholder="Name, code or email" /></Field>
      <Btn type="submit" variant="secondary"><Search size={14} />Search</Btn>
    </form>
    <Async state={state}>
      {data => <>
        <DataTable rows={data.employees} rowKey={e => e._id}
          empty={query ? 'No exited employees match' : 'No exited employees. Use “Record exit” to mark an employee as left.'}
          columns={[
            { key: 'name', label: 'Employee', render: e => <div><p className="font-semibold">{fullName(e) || '—'}</p><p className="text-[11px] text-gray-400">{[e.uniqueId, e.jobTitle].filter(Boolean).join(' · ')}</p></div> },
            { key: 'doj', label: 'Joined', render: e => fmtDate(e.dateOfJoining) },
            { key: 'exit', label: 'Exit type', render: e => e.exitData?.exitStatus || (e.status === 'Inactive' ? 'Inactive' : '—') },
            { key: 'lwd', label: 'Last working day', render: e => fmtDate(e.exitData?.lastWorkingDay || e.exitData?.date) },
            { key: 'settlement', label: 'Settlement', render: e => { const s = handlers.byEmployee.get(e._id); return s ? <Badge status={s.status} /> : <span className="text-gray-400">Not started</span>; } },
            {
              key: 'actions', label: 'Actions', align: 'right', render: e => {
                const s = handlers.byEmployee.get(e._id);
                return <div className="flex justify-end gap-1">
                  <Btn variant="ghost" onClick={() => handlers.preview(e._id, lwdOf(e))}><Eye size={14} />Preview</Btn>
                  {s ? <Btn variant="ghost" onClick={() => handlers.open(s._id)}>Open</Btn>
                    : <>
                      <Btn variant="ghost" onClick={() => handlers.initiate(e._id, lwdOf(e))}><Play size={14} />Initiate</Btn>
                      <Btn variant="ghost" aria-label="Clear exit" title="Clear exit (employee did not leave)" onClick={() => setRevoking(e)}><Undo2 size={14} /></Btn>
                    </>}
                </div>;
              },
            },
          ]} />
        <Pager page={data.currentPage} totalPages={data.totalPages} total={data.totalEmployees} onPage={setPage} />
      </>}
    </Async>
    {revoking && <Confirm title="Clear exit" busy={busy} onClose={() => setRevoking(null)} onConfirm={() => void revoke()}
      message={<>Mark <b>{fullName(revoking)}</b> as active again and remove the recorded exit?</>} />}
  </div>;
}

function Lookup({ employees, handlers, initialEmployee, version }: { employees: PayrollEmployee[]; handlers: Handlers; initialEmployee: string; version: number }) {
  const [employeeId, setEmployeeId] = useState(initialEmployee);
  const state = useLoad(async () => {
    if (!employeeId) return null;
    try { return { settlement: await pe.get<Settlement>(`fullAndFinal/employee/${employeeId}`) }; }
    catch (err) { if (err instanceof PayrollApiError && err.status === 404) return { settlement: null }; throw err; }
  }, [employeeId, version]);
  const emp = employees.find(e => e._id === employeeId);
  const lwd = isoDate(emp?.exitData?.lastWorkingDay || emp?.exitData?.date) || isoDate(new Date());
  return <div className="px-5 py-3 space-y-3">
    <Field label="Employee" className="max-w-md"><EmployeePicker value={employeeId} onChange={id => setEmployeeId(id)} employees={employees} /></Field>
    {!employeeId ? <Empty title="Pick an employee" text="Shows the employee's settlement, or lets you preview and start one." /> :
      <Async state={state}>
        {r => r.settlement ? <div className="rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{fullName(empOf(r.settlement)) || (emp ? employeeName(emp) : '')} <Badge status={r.settlement.status} /></p>
            <p className="text-xs text-gray-500">Last working day {fmtDate(r.settlement.lastWorkingDate)} · net {money(settlementTotals(r.settlement).net)}</p>
          </div>
          <Btn onClick={() => handlers.open(r.settlement!._id)}>Open settlement</Btn>
        </div> : <div className="rounded-xl border border-dashed border-gray-300 p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700">No settlement for this employee yet.</p>
          {emp && emp.status !== 'Inactive' && !emp.exitData?.exitStatus && <p className="text-xs text-orange-700">The employee has no recorded exit — use “Record exit” first so they appear in the exited list.</p>}
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" onClick={() => handlers.preview(employeeId, lwd)}><Eye size={14} />Preview</Btn>
            <Btn onClick={() => handlers.initiate(employeeId, lwd)}><Play size={14} />Initiate settlement</Btn>
          </div>
        </div>}
      </Async>}
  </div>;
}

// ---------------------------------------------------------------------------
// Preview / initiate / exit
// ---------------------------------------------------------------------------

function PreviewModal({ employeeId, lwd: initialLwd, existing, onClose, onInitiate, onOpen }: { employeeId: string; lwd: string; existing?: Settlement; onClose: () => void; onInitiate: (lwd: string) => void; onOpen: (id: string) => void }) {
  const [lwd, setLwd] = useState(initialLwd);
  const state = useLoad(() => pe.get<SettlementPreview>(`fullAndFinal/preview/${employeeId}`, { lastWorkingDate: lwd }), [employeeId, lwd]);
  const p = state.data;
  return <Modal title="Settlement preview" subtitle={p ? `${p.employee.name} · ${p.employee.employeeCode}${p.employee.exitStatus ? ` · ${p.employee.exitStatus}` : ''}` : 'System-computed estimate'} onClose={onClose} width="max-w-3xl"
    footer={existing ? <Btn onClick={() => onOpen(existing._id)}>Open existing settlement</Btn> : <Btn onClick={() => onInitiate(lwd)}><Play size={14} />Initiate with these values</Btn>}>
    <div className="space-y-4">
      <Field label="Last working day" className="max-w-xs"><TextInput type="date" value={lwd} onChange={setLwd} /></Field>
      <Async state={state}>{data => <PreviewBody p={data} />}</Async>
    </div>
  </Modal>;
}

function PreviewBody({ p }: { p: SettlementPreview }) {
  const bonus = p.bonusIncentives.performanceBonus + p.bonusIncentives.statutoryBonus + p.bonusIncentives.incentives + p.bonusIncentives.commission;
  const salary = p.salaryDues.unpaidSalary + p.salaryDues.proratedSalary;
  const total = salary + p.leaveEncashment.totalAmount + bonus + p.gratuity.gratuityAmount;
  const block = (title: string, amount: number, rows: Array<[string, React.ReactNode]>, formula: string) => <div className="rounded-xl border border-gray-200 p-3 space-y-2">
    <div className="flex items-center justify-between"><p className="text-xs font-semibold text-gray-800">{title}</p><p className="text-sm font-bold">{money(amount)}</p></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">{rows.map(([l, v]) => <Row key={l} label={l} value={v} />)}</div>
    {formula && <p className="text-[11px] text-gray-500">{formula}</p>}
  </div>;
  return <div className="space-y-3">
    <p className="text-xs text-gray-500">Joined {fmtDate(p.employee.dateOfJoining)}. Deductions are not part of the preview — add them after initiating.</p>
    {block('Salary dues', salary, [['Working days in last month', num(p.salaryDues.workingDaysInLastMonth, 0)], ['Prorated salary', money(p.salaryDues.proratedSalary)], ['Monthly basic', money(p.salaryDues.basicSalary)], ['Allowances', money(p.salaryDues.allowances)]], p.salaryDues.formula)}
    {block('Leave encashment', p.leaveEncashment.totalAmount, [['Available leaves', num(p.leaveEncashment.availableLeaves)], ['Encashable leaves', num(p.leaveEncashment.encashableLeaves)], ['Per-day rate', money(p.leaveEncashment.perDayRate)], ['Method', p.leaveEncashment.method]], p.leaveEncashment.formula)}
    {block('Bonus & incentives', bonus, [['Statutory bonus', money(p.bonusIncentives.statutoryBonus)], ['Performance bonus', money(p.bonusIncentives.performanceBonus)], ['Incentives', money(p.bonusIncentives.incentives)], ['Months counted', num(p.bonusIncentives.monthsCounted, 0)]], p.bonusIncentives.formula)}
    {block('Gratuity', p.gratuity.gratuityAmount, [['Eligible', p.gratuity.isEligible ? 'Yes' : 'No'], ['Completed years', num(p.gratuity.completedYears, 0)], ['Years counted', num(p.gratuity.yearsOfService, 0)], ['Last drawn basic + DA', money(p.gratuity.lastDrawnSalary)]], `${p.gratuity.reason} ${p.gratuity.formula}`)}
    <div className="rounded-xl bg-green-50 px-4 py-3 flex items-center justify-between"><span className="text-sm font-semibold text-green-900">Estimated earnings</span><span className="text-lg font-bold text-green-800">{money(total)}</span></div>
  </div>;
}

function InitiateModal({ employeeId: initialId, lwd: initialLwd, employees, notify, onClose, onDone }: { employeeId: string; lwd: string; employees: PayrollEmployee[]; notify: Notify; onClose: () => void; onDone: (id: string) => void }) {
  const [employeeId, setEmployeeId] = useState(initialId);
  const [lastWorkingDate, setLwd] = useState(initialLwd);
  const [resignationId, setResignationId] = useState('');
  const [prefill, setPrefill] = useState(true);
  const { busy, run } = useAction(notify);
  const submit = async () => {
    const out = await run(async () => {
      const s = await pe.post<Settlement>('fullAndFinal/initiate', { employeeId, lastWorkingDate, ...(resignationId.trim() ? { resignationId: resignationId.trim() } : {}) });
      if (prefill) {
        const p = await pe.get<SettlementPreview>(`fullAndFinal/preview/${employeeId}`, { lastWorkingDate });
        await pe.put(`fullAndFinal/${s._id}/salaryDues`, p.salaryDues);
        await pe.put(`fullAndFinal/${s._id}/leaveEncashment`, p.leaveEncashment);
        await pe.put(`fullAndFinal/${s._id}/bonusIncentives`, p.bonusIncentives);
        await pe.put(`fullAndFinal/${s._id}/gratuity`, p.gratuity);
      }
      return s;
    }, prefill ? 'Full & Final settlement initiated and pre-filled from the preview' : 'Full & Final settlement initiated successfully');
    if (out) onDone(out._id);
  };
  return <Modal title="Initiate Full & Final settlement" onClose={onClose} width="max-w-lg"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} disabled={!employeeId || !lastWorkingDate} onClick={() => void submit()}>Initiate</Btn></>}>
    <div className="space-y-3">
      <Field label="Employee *"><EmployeePicker value={employeeId} onChange={id => setEmployeeId(id)} employees={employees} /></Field>
      <FormGrid cols={2}>
        <Field label="Last working day *"><TextInput type="date" value={lastWorkingDate} onChange={setLwd} /></Field>
        <Field label="Resignation ID" hint="Optional reference to a resignation record"><TextInput value={resignationId} onChange={setResignationId} /></Field>
      </FormGrid>
      <Toggle checked={prefill} onChange={setPrefill} label="Pre-fill salary dues, leave encashment, bonus and gratuity from the system preview" />
    </div>
  </Modal>;
}

function ExitModal({ employees, notify, onClose, onDone }: { employees: PayrollEmployee[]; notify: Notify; onClose: () => void; onDone: (id: string, lwd: string) => void }) {
  const [employeeId, setEmployeeId] = useState('');
  const [exitStatus, setExitStatus] = useState('Resigned');
  const [lastWorkingDay, setLwd] = useState(isoDate(new Date()));
  const [reason, setReason] = useState('');
  const { busy, run } = useAction(notify);
  const submit = async () => {
    if (!employeeId) { notify('Select an employee', 'error'); return; }
    if (await run(() => pe.put(`employees/${employeeId}/exit`, { exitStatus, lastWorkingDay, reason }), 'Employee exit recorded') !== undefined) onDone(employeeId, lastWorkingDay);
  };
  return <Modal title="Record employee exit" subtitle="Marks the employee inactive in payroll and makes them eligible for Full & Final." onClose={onClose} width="max-w-lg"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>Record exit</Btn></>}>
    <div className="space-y-3">
      <Field label="Employee *"><EmployeePicker value={employeeId} onChange={id => setEmployeeId(id)} employees={employees} includeInactive={false} placeholder="Select active employee" /></Field>
      <FormGrid cols={2}>
        <Field label="Exit type *"><Select value={exitStatus} onChange={setExitStatus} options={EXIT_STATUSES} /></Field>
        <Field label="Last working day *"><TextInput type="date" value={lastWorkingDay} onChange={setLwd} /></Field>
      </FormGrid>
      <Field label="Reason / notes"><TextInput value={reason} onChange={setReason} /></Field>
    </div>
  </Modal>;
}
