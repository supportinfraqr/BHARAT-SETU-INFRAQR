"use client";

/**
 * Employees & Salary — BSS `employees` list (search / status) with a detail view covering
 * identity, payroll info (employee/:id/payrollInfo + calculatePayrollInfo), salary structure &
 * component overrides, bank / statutory / PAN corrections (employees/:id/profile), exit
 * (employees/:id/exit), annual salary statement and portal preferences; plus bulkUpdatePayrollInfo.
 */

import { useState } from 'react';
import { ArrowRight, Search, Users } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps, PayrollEmployee } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, DataTable, Empty, Field, Modal, Row, Section, Select, Tabs, TextInput, employeeName, fmtDate, inputClass, money, useAction, useLoad, type Column } from '../ui';
import { INDIAN_STATES, STATES_DATALIST_ID } from './Setup/constants';
import PayrollInfoTab from './Employees/PayrollInfoTab';
import StructureTab from './Employees/StructureTab';
import ProfileTab from './Employees/ProfileTab';
import { ExitTab, PreferencesTab, StatementTab } from './Employees/OtherTabs';

export default function Employees({ notify, navigate, params }: ModuleProps) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const list = useLoad(() => pe.get<PayrollEmployee[]>('employees', { status, search: query }), [status, query]);
  const [openId, setOpenId] = useState(params.employeeId ?? '');
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState(false);

  const rows = list.data ?? [];
  const allOn = rows.length > 0 && rows.every(r => selected.includes(r._id));
  const toggle = (id: string) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  const columns: Column<PayrollEmployee>[] = [
    { key: 'sel', label: '', render: e => <input type="checkbox" aria-label={`Select ${employeeName(e)}`} className="h-4 w-4 accent-[var(--color-bss-interactive-blue)]" checked={selected.includes(e._id)} onClick={ev => ev.stopPropagation()} onChange={() => toggle(e._id)} /> },
    { key: 'name', label: 'Employee', render: e => <div><p className="font-semibold text-gray-900">{employeeName(e)}</p><p className="text-[11px] text-gray-400">{e.customId || e.uniqueId}{e.phone?.mobile ? ` · ${e.phone.mobile}` : ''}</p></div> },
    { key: 'job', label: 'Role', render: e => <div><p>{e.jobTitle || '—'}</p><p className="text-[11px] text-gray-400">{[e.department, e.siteName].filter(Boolean).join(' · ') || '—'}</p></div> },
    { key: 'base', label: 'Basic', align: 'right', render: e => money(e.payrollInfo?.baseSalary) },
    { key: 'gross', label: 'Gross', align: 'right', render: e => money(e.payrollInfo?.grossSalary) },
    { key: 'ctc', label: 'CTC / yr', align: 'right', render: e => money(e.payrollInfo?.ctc) },
    { key: 'status', label: 'Status', render: e => <div className="flex flex-wrap gap-1"><Badge status={e.status === 'Inactive' ? 'inactive' : 'active'}>{e.status}</Badge>
      {e.payrollPreferences?.holdSalary && <Badge status="on_hold">On hold</Badge>}{e.exitData?.exitStatus && <Badge status="rejected">{e.exitData.exitStatus}</Badge>}
      {!e.bankInfo?.bankAccountNumber && <Badge status="pending">No bank</Badge>}</div> },
  ];

  return <div className="space-y-4">
    <Section title="Employees & salary" subtitle="Workers synced from BSS. Open an employee to set salary, overrides, bank and statutory details or record an exit."
      right={<>
        {selected.length > 0 && <Btn variant="secondary" onClick={() => setBulk(true)}><Users size={14} />Bulk update salary ({selected.length})</Btn>}
      </>}>
      <div className="px-5 py-3 flex flex-wrap items-end gap-2 border-b border-gray-100">
        <form className="flex items-end gap-2 flex-1 min-w-[220px]" onSubmit={e => { e.preventDefault(); setQuery(search.trim()); }}>
          <Field label="Search" className="flex-1"><TextInput value={search} onChange={setSearch} placeholder="Name, ID or mobile" /></Field>
          <Btn type="submit" variant="secondary" aria-label="Search"><Search size={14} /></Btn>
        </form>
        <Field label="Status" className="w-40"><Select value={status} onChange={setStatus} options={['Active', 'Probation', 'Inactive']} placeholder="All" /></Field>
        {rows.length > 0 && <label className="inline-flex items-center gap-2 text-xs text-gray-600 h-9"><input type="checkbox" className="h-4 w-4" checked={allOn} onChange={() => setSelected(allOn ? [] : rows.map(r => r._id))} />Select all</label>}
      </div>
      <Async state={list} empty={<Empty title={query || status ? 'No employees match these filters' : 'No employees yet'} text={query || status ? 'Clear the search or status filter.' : 'Bind workers to this organization in BSS, then use “Sync employees” at the top.'} />}>
        {data => <DataTable columns={columns} rows={data} rowKey={e => e._id} onRowClick={e => setOpenId(e._id)} />}
      </Async>
      {rows.length > 0 && <p className="px-5 py-2 text-[11px] text-gray-400 border-t border-gray-100">{rows.length} employees{selected.length ? ` · ${selected.length} selected` : ''}</p>}
    </Section>

    {openId && <EmployeeDetail id={openId} notify={notify} navigate={navigate} initialTab={params.tab} onClose={() => setOpenId('')} onChanged={list.reload} />}
    {bulk && <BulkUpdate employees={rows.filter(r => selected.includes(r._id))} notify={notify} onClose={() => setBulk(false)} onDone={() => { list.reload(); }} />}
  </div>;
}

const DETAIL_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'payroll', label: 'Payroll info' },
  { key: 'structure', label: 'Salary structure' },
  { key: 'profile', label: 'Bank & statutory' },
  { key: 'exit', label: 'Exit' },
  { key: 'statement', label: 'Annual statement' },
  { key: 'prefs', label: 'Portal preferences' },
];

function EmployeeDetail({ id, notify, navigate, initialTab, onClose, onChanged }: { id: string; notify: ModuleProps['notify']; navigate: ModuleProps['navigate']; initialTab?: string; onClose: () => void; onChanged: () => void }) {
  const state = useLoad(() => pe.get<PayrollEmployee>(`employees/${id}`), [id]);
  const [tab, setTab] = useState(DETAIL_TABS.some(t => t.key === initialTab) ? initialTab! : 'overview');
  const e = state.data;
  const saved = (emp: PayrollEmployee) => { state.setData(emp); onChanged(); };
  const go = (key: string) => navigate(key, { employeeId: id });

  return <Modal title={e ? employeeName(e) : 'Employee'} subtitle={e ? `${e.customId || e.uniqueId} · ${e.jobTitle || 'No job title'}` : undefined} onClose={onClose} width="max-w-5xl">
    <Async state={state}>{emp => <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {[['payrun', 'Pay runs'], ['revisions', 'Salary revisions'], ['loans', 'Loans'], ['tds', 'TDS'], ['fnf', 'Full & Final']].map(([k, l]) =>
          <Btn key={k} variant="secondary" onClick={() => go(k)}>{l}<ArrowRight size={12} /></Btn>)}
      </div>
      <Tabs tabs={DETAIL_TABS} active={tab} onChange={setTab} />
      {tab === 'overview' && <Overview e={emp} />}
      {tab === 'payroll' && <PayrollInfoTab employee={emp} notify={notify} navigate={navigate} onChanged={() => { state.reload(); onChanged(); }} />}
      {tab === 'structure' && <StructureTab employee={emp} notify={notify} />}
      {tab === 'profile' && <ProfileTab employee={emp} notify={notify} onSaved={saved} />}
      {tab === 'exit' && <ExitTab employee={emp} notify={notify} navigate={navigate} onSaved={saved} />}
      {tab === 'statement' && <StatementTab employee={emp} navigate={navigate} />}
      {tab === 'prefs' && <PreferencesTab employee={emp} notify={notify} />}
    </div>}</Async>
  </Modal>;
}

function Overview({ e }: { e: PayrollEmployee }) {
  const addr = (a?: PayrollEmployee['presentAddress']) => (a ? [a.address, a.street, a.city, a.state, a.pin].filter(Boolean).join(', ') : '') || '—';
  const st = e.statutoryInfo ?? ({} as PayrollEmployee['statutoryInfo']);
  const b = e.bankInfo ?? ({} as PayrollEmployee['bankInfo']);
  const acct = b.bankAccountNumber ? `•••• ${String(b.bankAccountNumber).slice(-4)}` : 'Not provided';
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-700">Identity</p>
      <Row label="Employee ID" value={e.customId || e.uniqueId || '—'} />
      <Row label="Status" value={<Badge status={e.status === 'Inactive' ? 'inactive' : 'active'}>{e.status}</Badge>} />
      <Row label="Date of joining" value={fmtDate(e.dateOfJoining)} />
      <Row label="Date of birth" value={fmtDate(e.demographics?.dob)} />
      <Row label="Gender" value={e.demographics?.gender || '—'} />
      <Row label="Father / spouse" value={e.fatherSpouse || '—'} />
      <Row label="Mobile" value={e.phone?.mobile || '—'} />
      <Row label="Email" value={e.email || '—'} />
      <Row label="Department / type" value={[e.department, e.employeeType, e.categoryName].filter(Boolean).join(' · ') || '—'} />
      <Row label="Site / work state" value={[e.siteName, e.workState].filter(Boolean).join(' · ') || '—'} />
      <Row label="Present address" value={addr(e.presentAddress)} />
      <Row label="PAN" value={e.nationalID?.pan ? `${e.nationalID.pan}${e.nationalID.nameInPan ? ` (${e.nationalID.nameInPan})` : ''}` : 'Not provided'} />
    </div>
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-700">Salary</p>
      <Row label="Basic / gross per month" value={`${money(e.payrollInfo?.baseSalary)} / ${money(e.payrollInfo?.grossSalary)}`} />
      <Row label="CTC per year" value={money(e.payrollInfo?.ctc)} />
      <Row label="Tax regime" value={e.payrollInfo?.taxRegime || '—'} />
      <Row label="Payment mode" value={e.payrollPreferences?.paymentMode || '—'} />
      <Row label="Salary hold" value={e.payrollPreferences?.holdSalary ? <Badge status="on_hold">{e.payrollPreferences.holdReason || 'On hold'}</Badge> : 'No'} />
      <p className="text-xs font-semibold text-gray-700 pt-2">Bank</p>
      <Row label="Account" value={`${acct}${b.isVerified ? ' · verified' : ''}`} />
      <Row label="Bank / IFSC" value={[b.bankName, b.ifscCode].filter(Boolean).join(' · ') || '—'} />
      <p className="text-xs font-semibold text-gray-700 pt-2">Statutory</p>
      <Row label="UAN / PF no." value={[st.uan, st.pfAccountNumber].filter(Boolean).join(' · ') || '—'} />
      <Row label="EPF" value={st.epfApplicable === false ? 'Not applicable' : st.epfOverride?.enabled ? 'Applicable (override)' : 'Applicable'} />
      <Row label="ESI" value={st.esiOptedOut ? 'Opted out' : st.esiApplicable === false ? 'Not applicable' : `Applicable${st.esiNumber ? ` · ${st.esiNumber}` : ''}`} />
      <Row label="PT / LWF state" value={`${st.ptApplicable ? st.ptState || 'Applicable' : 'PT n/a'} · ${st.lwfApplicable ? st.lwfState || st.ptState || 'Applicable' : 'LWF n/a'}`} />
      <Row label="Employment category" value={st.employmentCategory || '—'} />
      {e.exitData?.exitStatus && <><p className="text-xs font-semibold text-gray-700 pt-2">Exit</p>
        <Row label="Exit status" value={<Badge status="rejected">{e.exitData.exitStatus}</Badge>} />
        <Row label="Last working day" value={fmtDate(e.exitData.lastWorkingDay)} />
        <Row label="Reason" value={e.exitData.reason || '—'} /></>}
    </div>
  </div>;
}

type BulkResult = { total: number; successful: number; failed: number; results: Array<{ employeeId: string; name: string; status: string; payrollInfo: { baseSalary: number; grossSalary: number; totalDeductions: number; netPay: number; ctc: number } }>; errors: Array<{ employeeId: string; error: string }> };

function BulkUpdate({ employees, notify, onClose, onDone }: { employees: PayrollEmployee[]; notify: ModuleProps['notify']; onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState(() => employees.map(e => ({ employeeId: e._id, name: employeeName(e), baseSalary: String(e.payrollInfo?.baseSalary || ''), state: e.statutoryInfo?.ptState || e.workState || '' })));
  const [all, setAll] = useState({ baseSalary: '', state: '' });
  const [result, setResult] = useState<BulkResult | null>(null);
  const { busy, run } = useAction(notify);
  const nameOf = (id: string) => rows.find(r => r.employeeId === id)?.name ?? id;

  const submit = async () => {
    const bad = rows.find(r => !(Number(r.baseSalary) > 0));
    if (bad) { notify(`${bad.name}: employeeId and baseSalary are required`, 'error'); return; }
    const out = await run(() => pe.post<BulkResult>('bulkUpdatePayrollInfo', { employees: rows.map(r => ({ employeeId: r.employeeId, baseSalary: Number(r.baseSalary), state: r.state || undefined })) }), 'Bulk update completed');
    if (out) { setResult(out); onDone(); }
  };

  return <Modal title="Bulk update salary" subtitle={`${employees.length} employees · recalculates gross, deductions, net pay and CTC from Basic`} onClose={onClose} width="max-w-3xl"
    footer={result ? <Btn onClick={onClose}>Done</Btn> : <><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>Update {rows.length} employees</Btn></>}>
    <datalist id={STATES_DATALIST_ID}>{INDIAN_STATES.map(s => <option key={s} value={s} />)}</datalist>
    {!result ? <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-gray-50 p-3">
        <Field label="Apply basic to all" className="w-40"><TextInput type="number" min={0} value={all.baseSalary} onChange={baseSalary => setAll(s => ({ ...s, baseSalary }))} /></Field>
        <Field label="Apply state to all" className="w-48"><TextInput list={STATES_DATALIST_ID} value={all.state} onChange={state => setAll(s => ({ ...s, state }))} /></Field>
        <Btn variant="secondary" onClick={() => setRows(r => r.map(x => ({ ...x, baseSalary: all.baseSalary || x.baseSalary, state: all.state || x.state })))}>Apply</Btn>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-xs min-w-[480px]">
        <thead className="text-gray-500"><tr><th className="text-left py-1 font-semibold">Employee</th><th className="text-left py-1 font-semibold">Basic (₹ / month)</th><th className="text-left py-1 font-semibold">State (PT)</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.employeeId}>
          <td className="py-1 pr-2 font-medium">{r.name}</td>
          <td className="py-1 pr-2"><input aria-label={`Basic for ${r.name}`} type="number" min={0} className={inputClass} value={r.baseSalary} onChange={e => setRows(s => s.map((x, j) => (j === i ? { ...x, baseSalary: e.target.value } : x)))} /></td>
          <td className="py-1"><input aria-label={`State for ${r.name}`} list={STATES_DATALIST_ID} className={inputClass} value={r.state} onChange={e => setRows(s => s.map((x, j) => (j === i ? { ...x, state: e.target.value } : x)))} /></td>
        </tr>)}</tbody>
      </table></div>
      <p className="text-[11px] text-gray-400">Uses fixed and %-of-basic earnings, EPF, ESI and PT. For full component overrides use each employee&apos;s Salary structure tab.</p>
    </div> : <div className="space-y-3">
      <div className="flex gap-2"><Badge status="completed">{result.successful} updated</Badge>{result.failed > 0 && <Badge status="failed">{result.failed} failed</Badge>}</div>
      <DataTable rows={result.results} rowKey={r => r.employeeId} columns={[
        { key: 'name', label: 'Employee' },
        { key: 'b', label: 'Basic', align: 'right', render: r => money(r.payrollInfo.baseSalary) },
        { key: 'g', label: 'Gross', align: 'right', render: r => money(r.payrollInfo.grossSalary) },
        { key: 'd', label: 'Deductions', align: 'right', render: r => money(r.payrollInfo.totalDeductions) },
        { key: 'n', label: 'Net pay', align: 'right', render: r => money(r.payrollInfo.netPay) },
        { key: 'c', label: 'CTC', align: 'right', render: r => money(r.payrollInfo.ctc) },
      ]} />
      {result.errors.length > 0 && <div className="space-y-1">{result.errors.map(err => <p key={err.employeeId} className="text-xs text-red-700">{nameOf(err.employeeId)}: {err.error}</p>)}</div>}
    </div>}
  </Modal>;
}
