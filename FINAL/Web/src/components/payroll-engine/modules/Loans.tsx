"use client";

/**
 * Loans & Advances — legacy controller/payroll/loanManagement.js (+ utils/payroll/loanHelper.js,
 * loanPerquisiteHelper.js)
 *
 *   POST   loan/create-loan-type                 { loanName, perquisiteRate }
 *   GET    loan/get-loan-types                   ?includeInactive=&status=&search=
 *   GET    loan/get-loan-typeById/:id
 *   PUT    loan/upadte-loan-type/:id             (sic) { loanName?, perquisiteRate?, status? }
 *   DELETE loan/delete-loan-type/:id
 *   POST   loan/create-loan                      { loanTypeId, employeeId, loanAmount, disbursementDate, ... }
 *   GET    loan/get-loans                        ?employeeId=&loanTypeId=&status=&search=
 *   GET    loan/get-loanById/:id                 { loan, repaymentSummary, repayments }
 *   POST   loan/record-repayment/:id             { repaymentAmount, repaymentDate, paymentMode, ... }
 *
 * EMIs are deducted automatically by the pay run from the EMI start month; manual repayments
 * (cash / bank / cheque) reduce the outstanding balance and re-plan the remaining schedule.
 */

import { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps, PayrollEmployee } from '@/lib/payroll-engine/types';
import {
  Async, Badge, Btn, Confirm, DataTable, Empty, EmployeePicker, Field, FormGrid, Kpi, KpiGrid, MONTHS, Modal,
  NumberInput, PeriodPicker, Row, Section, Select, Tabs, TextInput, Toggle, employeeName, fmtDate, fmtDateTime,
  isoDate, money, num, useAction, useEmployees, useLoad,
} from '../ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LoanType = { _id: string; loanName: string; perquisiteRate: number; status: 'active' | 'inactive'; createdAt?: string; updatedAt?: string };
type LoanTypeRef = string | { _id: string; loanName?: string; perquisiteRate?: number; status?: string } | null;
type EmpRef = string | { _id: string; firstName?: string; lastName?: string; customId?: string; uniqueId?: string; email?: string; payrollInfo?: { employeeCode?: string } } | null;

type NextInstallment = { nextInstallmentMonth: string | null; nextInstallmentYear: number | null; nextInstallmentLabel: string | null; nextInstallmentDate: string | null };

type Loan = NextInstallment & {
  _id: string;
  loanNumber: string;
  loanTypeId: LoanTypeRef;
  employeeId: EmpRef;
  loanAmount: number;
  outstandingBalance: number;
  disbursementDate: string;
  paidThroughAccount: string;
  referenceNumber: string;
  reason: string;
  exemptFromPerquisite: boolean;
  emiStartDate: string;
  installmentAmount: number;
  totalInstallments: number;
  lastInstallmentAmount: number;
  paidInstallments: number;
  status: 'active' | 'closed' | 'cancelled';
  closedAt: string | null;
  createdAt?: string;
  emiStartMonth?: string;
  emiStartYear?: number;
  emiStartMonthLabel?: string;
  remainingInstallments: number;
  loanClosingDate: string | null;
};

type RepaymentSummary = NextInstallment & {
  totalInstallments: number;
  paidInstallments?: number;
  remainingInstallments?: number;
  installmentAmount: number;
  lastInstallmentAmount: number;
  emiStartDate: string;
  emiStartMonth: string | null;
  emiStartYear: number | null;
  emiStartMonthLabel: string;
  loanClosingDate: string | null;
  outstandingBalance?: number;
  remainingAmount?: number;
  perquisiteRate?: number;
  monthlyPerquisite?: number;
  isPerquisiteExempt?: boolean;
  message: string;
};

type Repayment = {
  _id: string;
  repaymentAmount: number;
  repaymentDate: string;
  paymentMode: 'cash' | 'bank_transfer' | 'cheque';
  depositToAccount: string;
  referenceNumber: string;
  balanceBefore: number;
  balanceAfter: number;
  repaymentType: 'manual' | 'payroll';
  payrollMonth: string | null;
  payrollYear: number | null;
  payrollId: string | null;
  createdAt?: string;
};

type LoanDetail = { loan: Loan; repaymentSummary: RepaymentSummary; repayments: Repayment[] };

const PAYMENT_MODES = [{ value: 'bank_transfer', label: 'Bank transfer' }, { value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' }];
const modeLabel = (m: string) => PAYMENT_MODES.find(x => x.value === m)?.label ?? m;
const SMALL_LOAN_EXEMPT_LIMIT = 20000;

function refId(ref: EmpRef | LoanTypeRef): string {
  if (!ref) return '';
  return typeof ref === 'string' ? ref : ref._id;
}
function empName(ref: EmpRef, employees: PayrollEmployee[]): string {
  if (ref && typeof ref === 'object') {
    const n = [ref.firstName, ref.lastName].filter(Boolean).join(' ');
    if (n) return n;
  }
  const emp = employees.find(e => e._id === refId(ref));
  return emp ? employeeName(emp) : refId(ref) || '—';
}
function empCode(ref: EmpRef): string {
  return ref && typeof ref === 'object' ? ref.payrollInfo?.employeeCode || ref.customId || ref.uniqueId || '' : '';
}
function typeName(ref: LoanTypeRef, types: LoanType[]): string {
  if (ref && typeof ref === 'object' && ref.loanName) return ref.loanName;
  return types.find(t => t._id === refId(ref))?.loanName ?? '—';
}

/** Same rules as utils/payroll/loanPerquisiteHelper.js. */
function perquisiteExempt(loanAmount: number, loanName: string, exemptFlag: boolean): string | null {
  if (exemptFlag) return 'Marked exempt from perquisite';
  if (loanAmount <= SMALL_LOAN_EXEMPT_LIMIT) return `Loans up to ${money(SMALL_LOAN_EXEMPT_LIMIT)} are exempt`;
  if (loanName.toLowerCase().includes('medical')) return 'Medical loans are exempt';
  return null;
}

/** Projected EMI schedule (mirrors loanHelper: equal EMIs, the last one takes the remainder). */
function projectSchedule(outstanding: number, emi: number, startYear: number, startMonth: number) {
  const rows: Array<{ n: number; label: string; amount: number; balance: number }> = [];
  if (!(outstanding > 0) || !(emi > 0)) return rows;
  const count = Math.ceil(outstanding / emi);
  let balance = outstanding;
  for (let i = 0; i < count && i < 600; i += 1) {
    const amount = Math.min(emi, Math.round(balance * 100) / 100);
    balance = Math.max(0, Math.round((balance - amount) * 100) / 100);
    const d = new Date(Date.UTC(startYear, startMonth + i, 1));
    rows.push({ n: i + 1, label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, amount, balance });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export default function Loans({ notify, params }: ModuleProps) {
  const [tab, setTab] = useState('loans');
  const employeesState = useEmployees();
  const employees = useMemo(() => employeesState.data ?? [], [employeesState.data]);
  const [typesVersion, setTypesVersion] = useState(0);
  const allTypes = useLoad(() => pe.get<{ loanTypes: LoanType[]; total: number }>('loan/get-loan-types', { includeInactive: true }), [typesVersion]);
  const types = useMemo(() => allTypes.data?.loanTypes ?? [], [allTypes.data]);

  return <div className="space-y-4">
    <Tabs active={tab} onChange={setTab} tabs={[{ key: 'loans', label: 'Employee loans' }, { key: 'types', label: 'Loan types' }]} />
    {tab === 'loans'
      ? <LoansTab employees={employees} types={types} notify={notify} initialEmployee={params.employeeId ?? ''} initialLoan={params.loanId ?? ''} onNeedTypes={() => setTab('types')} />
      : <LoanTypesTab notify={notify} onChanged={() => setTypesVersion(v => v + 1)} />}
  </div>;
}

// ---------------------------------------------------------------------------
// Loans
// ---------------------------------------------------------------------------

function LoansTab({ employees, types, notify, initialEmployee, initialLoan, onNeedTypes }: { employees: PayrollEmployee[]; types: LoanType[]; notify: ModuleProps['notify']; initialEmployee: string; initialLoan: string; onNeedTypes: () => void }) {
  const [employeeId, setEmployeeId] = useState(initialEmployee);
  const [loanTypeId, setLoanTypeId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(initialLoan);
  const state = useLoad(() => pe.get<{ loans: Loan[]; total: number }>('loan/get-loans', { employeeId, loanTypeId, status, search: query }), [employeeId, loanTypeId, status, query]);
  const loans = state.data?.loans ?? [];
  const active = loans.filter(l => l.status === 'active');

  return <>
    <KpiGrid>
      <Kpi label="Loans shown" value={num(state.data?.total ?? 0, 0)} sub={`${active.length} active`} />
      <Kpi label="Disbursed" value={money(loans.reduce((s, l) => s + (Number(l.loanAmount) || 0), 0))} />
      <Kpi label="Outstanding" value={money(loans.reduce((s, l) => s + (Number(l.outstandingBalance) || 0), 0))} tone="text-orange-700" />
      <Kpi label="Monthly EMI (active)" value={money(active.reduce((s, l) => s + (Number(l.installmentAmount) || 0), 0))} sub="Deducted in pay runs" />
    </KpiGrid>
    <Section title="Employee loans" subtitle="Loans and salary advances recovered through payroll EMIs."
      right={<Btn onClick={() => (types.some(t => t.status === 'active') ? setCreating(true) : (notify('Create an active loan type first', 'error'), onNeedTypes()))}><Plus size={14} />New loan</Btn>}>
      <div className="px-5 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Employee"><EmployeePicker value={employeeId} onChange={id => setEmployeeId(id)} employees={employees} placeholder="All employees" /></Field>
        <Field label="Loan type"><Select value={loanTypeId} onChange={setLoanTypeId} placeholder="All loan types" options={types.map(t => ({ value: t._id, label: `${t.loanName}${t.status === 'inactive' ? ' (inactive)' : ''}` }))} /></Field>
        <Field label="Status"><Select value={status} onChange={setStatus} placeholder="All statuses" options={[{ value: 'active', label: 'Active' }, { value: 'closed', label: 'Closed' }, { value: 'cancelled', label: 'Cancelled' }]} /></Field>
        <Field label="Search">
          <form className="relative" onSubmit={e => { e.preventDefault(); setQuery(search); }}>
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" aria-hidden />
            <TextInput value={search} onChange={setSearch} onBlur={() => setQuery(search)} placeholder="Employee, loan no., reference" className="pl-8" aria-label="Search loans" />
          </form>
        </Field>
      </div>
      <Async state={state}>
        {() => <DataTable rows={loans} rowKey={l => l._id} onRowClick={l => setOpenId(l._id)}
          empty={employeeId || loanTypeId || status || query ? 'No loans match these filters' : 'No loans yet — click “New loan” to disburse one'}
          columns={[
            { key: 'loanNumber', label: 'Loan no.', render: l => <span className="font-semibold whitespace-nowrap">{l.loanNumber || '—'}</span> },
            { key: 'employee', label: 'Employee', render: l => <div><p className="font-semibold">{empName(l.employeeId, employees)}</p><p className="text-[11px] text-gray-400">{empCode(l.employeeId)}</p></div> },
            { key: 'type', label: 'Type', render: l => typeName(l.loanTypeId, types) },
            { key: 'loanAmount', label: 'Amount', align: 'right', render: l => money(l.loanAmount) },
            { key: 'outstanding', label: 'Outstanding', align: 'right', render: l => <b>{money(l.outstandingBalance)}</b> },
            { key: 'emi', label: 'EMI', align: 'right', render: l => money(l.installmentAmount) },
            { key: 'progress', label: 'Installments', render: l => <span className="whitespace-nowrap">{num(l.paidInstallments, 0)} / {num(l.totalInstallments, 0)}</span> },
            { key: 'next', label: 'Next EMI', render: l => l.nextInstallmentLabel ?? '—' },
            { key: 'closing', label: 'Closes', render: l => fmtMonth(l.loanClosingDate) },
            { key: 'status', label: 'Status', render: l => <Badge status={l.status} /> },
            { key: 'open', label: '', align: 'right', render: l => <Btn variant="ghost" aria-label={`Open loan ${l.loanNumber}`} onClick={e => { e.stopPropagation(); setOpenId(l._id); }}><Eye size={14} /></Btn> },
          ]} />}
      </Async>
    </Section>
    {creating && <CreateLoan employees={employees} types={types.filter(t => t.status === 'active')} notify={notify} initialEmployee={employeeId}
      onClose={() => setCreating(false)} onCreated={id => { setCreating(false); state.reload(); setOpenId(id); }} />}
    {openId && <LoanDetailModal loanId={openId} employees={employees} types={types} notify={notify} onClose={() => setOpenId('')} onChanged={state.reload} />}
  </>;
}

function fmtMonth(value: unknown): string {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? '—' : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function CreateLoan({ employees, types, notify, onClose, onCreated, initialEmployee }: { employees: PayrollEmployee[]; types: LoanType[]; notify: ModuleProps['notify']; onClose: () => void; onCreated: (id: string) => void; initialEmployee: string }) {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const [f, setF] = useState({
    loanTypeId: types[0]?._id ?? '', employeeId: initialEmployee, loanAmount: 0, installmentAmount: 0,
    disbursementDate: isoDate(today), paidThroughAccount: '', referenceNumber: '', reason: '', exemptFromPerquisite: false,
    emiStartMonth: MONTHS[nextMonth.getMonth()] as string, emiStartYear: nextMonth.getFullYear(),
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(s => ({ ...s, [k]: v }));
  const { busy, run } = useAction(notify);
  const type = types.find(t => t._id === f.loanTypeId);

  const schedule = projectSchedule(f.loanAmount, f.installmentAmount, f.emiStartYear, MONTHS.indexOf(f.emiStartMonth as (typeof MONTHS)[number]));
  const exempt = perquisiteExempt(f.loanAmount, type?.loanName ?? '', f.exemptFromPerquisite);
  const perqMonthly = exempt || !type?.perquisiteRate ? 0 : Math.round((f.loanAmount * type.perquisiteRate) / 100 / 12);
  const invalid = f.installmentAmount > f.loanAmount && f.loanAmount > 0;

  const submit = async () => {
    const out = await run(() => pe.post<{ loan: Loan; repaymentSummary: RepaymentSummary }>('loan/create-loan', f));
    if (out) {
      notify(out.repaymentSummary?.message ? `Loan ${out.loan.loanNumber} created. ${out.repaymentSummary.message}` : 'Loan created successfully');
      onCreated(out.loan._id);
    }
  };

  return <Modal title="New loan" subtitle="Disburse a loan or salary advance and set its EMI recovery." onClose={onClose} width="max-w-3xl"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} disabled={invalid} onClick={() => void submit()}>Create loan</Btn></>}>
    <div className="space-y-4">
      <FormGrid cols={2}>
        <Field label="Employee *"><EmployeePicker value={f.employeeId} onChange={id => set('employeeId', id)} employees={employees} includeInactive={false} /></Field>
        <Field label="Loan type *"><Select value={f.loanTypeId} onChange={v => set('loanTypeId', v)} options={types.map(t => ({ value: t._id, label: `${t.loanName} · perquisite ${num(t.perquisiteRate)}%` }))} /></Field>
        <Field label="Loan amount *"><NumberInput value={f.loanAmount || ''} min={0} onChange={v => set('loanAmount', v)} /></Field>
        <Field label="Disbursement date *"><TextInput type="date" value={f.disbursementDate} onChange={v => set('disbursementDate', v)} /></Field>
        <Field label="EMI amount *" hint={invalid ? 'EMI cannot exceed the loan amount' : undefined}><NumberInput value={f.installmentAmount || ''} min={0} onChange={v => set('installmentAmount', v)} /></Field>
        <Field label="First EMI from payroll *"><PeriodPicker month={f.emiStartMonth} year={f.emiStartYear} onChange={(m, y) => setF(s => ({ ...s, emiStartMonth: m, emiStartYear: y }))} /></Field>
        <Field label="Paid through account"><TextInput value={f.paidThroughAccount} onChange={v => set('paidThroughAccount', v)} placeholder="e.g. HDFC current a/c" /></Field>
        <Field label="Reference number"><TextInput value={f.referenceNumber} onChange={v => set('referenceNumber', v)} placeholder="UTR / cheque no." /></Field>
        <Field label="Reason" className="md:col-span-2"><TextInput value={f.reason} onChange={v => set('reason', v)} /></Field>
      </FormGrid>
      <Toggle checked={f.exemptFromPerquisite} onChange={v => set('exemptFromPerquisite', v)} label="Exempt from perquisite tax (e.g. medical treatment under Rule 3(7)(i))" />

      {schedule.length > 0 && <div className="rounded-xl border border-gray-200">
        <div className="px-3 py-2 border-b border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div><p className="text-gray-500">Installments</p><p className="font-bold">{schedule.length}</p></div>
          <div><p className="text-gray-500">Last EMI</p><p className="font-bold">{money(schedule[schedule.length - 1].amount)}</p></div>
          <div><p className="text-gray-500">Closes</p><p className="font-bold">{schedule[schedule.length - 1].label}</p></div>
          <div><p className="text-gray-500">Perquisite / month</p><p className="font-bold">{exempt ? 'Exempt' : money(perqMonthly)}</p></div>
        </div>
        <p className="px-3 py-2 text-xs text-gray-600">This loan will be fully paid off in {schedule.length} installments. The first EMI will be deducted from {f.emiStartMonth} {f.emiStartYear} salary payroll.{exempt ? ` ${exempt}.` : ''}</p>
        <div className="max-h-56 overflow-y-auto"><ScheduleTable rows={schedule} /></div>
      </div>}
    </div>
  </Modal>;
}

function ScheduleTable({ rows }: { rows: Array<{ n: number; label: string; amount: number; balance: number }> }) {
  return <DataTable rows={rows} rowKey={r => String(r.n)} empty="Nothing left to repay"
    columns={[
      { key: 'n', label: '#' },
      { key: 'label', label: 'Payroll month' },
      { key: 'amount', label: 'EMI', align: 'right', render: r => money(r.amount) },
      { key: 'balance', label: 'Balance after', align: 'right', render: r => money(r.balance) },
    ]} />;
}

function LoanDetailModal({ loanId, employees, types, notify, onClose, onChanged }: { loanId: string; employees: PayrollEmployee[]; types: LoanType[]; notify: ModuleProps['notify']; onClose: () => void; onChanged: () => void }) {
  const state = useLoad(() => pe.get<LoanDetail>(`loan/get-loanById/${loanId}`), [loanId]);
  const [tab, setTab] = useState('summary');
  const [repaying, setRepaying] = useState(false);
  const d = state.data;
  const title = d ? `${d.loan.loanNumber || 'Loan'} · ${empName(d.loan.employeeId, employees)}` : 'Loan';

  return <Modal title={title} subtitle={d ? `${typeName(d.loan.loanTypeId, types)} · disbursed ${fmtDate(d.loan.disbursementDate)}` : undefined} onClose={onClose} width="max-w-4xl"
    footer={d?.loan.status === 'active' ? <Btn onClick={() => setRepaying(true)}><Wallet size={14} />Record repayment</Btn> : undefined}>
    <Async state={state}>
      {({ loan, repaymentSummary: s, repayments }) => {
        const nextIdx = s.nextInstallmentMonth ? MONTHS.indexOf(s.nextInstallmentMonth as (typeof MONTHS)[number]) : -1;
        const schedule = loan.status === 'active' && nextIdx >= 0 && s.nextInstallmentYear ? projectSchedule(loan.outstandingBalance, loan.installmentAmount, s.nextInstallmentYear, nextIdx) : [];
        const repaid = (Number(loan.loanAmount) || 0) - (Number(loan.outstandingBalance) || 0);
        const pct = loan.loanAmount > 0 ? Math.min(100, Math.round((repaid / loan.loanAmount) * 100)) : 0;
        return <div className="space-y-4">
          <KpiGrid>
            <Kpi label="Loan amount" value={money(loan.loanAmount)} />
            <Kpi label="Outstanding" value={money(loan.outstandingBalance)} tone="text-orange-700" sub={`${pct}% repaid`} />
            <Kpi label="EMI" value={money(loan.installmentAmount)} sub={`Last EMI ${money(s.lastInstallmentAmount)}`} />
            <Kpi label="Status" value={<Badge status={loan.status} />} sub={loan.closedAt ? `Closed ${fmtDate(loan.closedAt)}` : s.nextInstallmentLabel ? `Next: ${s.nextInstallmentLabel}` : undefined} />
          </KpiGrid>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Repaid">
            <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-600">{s.message}</p>
          <Tabs active={tab} onChange={setTab} tabs={[{ key: 'summary', label: 'Summary' }, { key: 'schedule', label: `Remaining schedule (${schedule.length})` }, { key: 'history', label: `Repayments (${repayments.length})` }]} />
          {tab === 'summary' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Row label="Employee" value={`${empName(loan.employeeId, employees)} ${empCode(loan.employeeId) ? `· ${empCode(loan.employeeId)}` : ''}`} />
            <Row label="Loan type" value={typeName(loan.loanTypeId, types)} />
            <Row label="Disbursement date" value={fmtDate(loan.disbursementDate)} />
            <Row label="Paid through account" value={loan.paidThroughAccount || '—'} />
            <Row label="Reference number" value={loan.referenceNumber || '—'} />
            <Row label="Reason" value={loan.reason || '—'} />
            <Row label="EMI starts" value={s.emiStartMonthLabel || fmtMonth(s.emiStartDate)} />
            <Row label="Installments paid" value={`${num(s.paidInstallments ?? loan.paidInstallments, 0)} of ${num(s.totalInstallments, 0)}`} />
            <Row label="Remaining installments" value={num(s.remainingInstallments ?? loan.remainingInstallments, 0)} />
            <Row label="Next installment" value={s.nextInstallmentLabel ?? '—'} />
            <Row label="Projected closing" value={fmtMonth(s.loanClosingDate)} />
            <Row label="Remaining amount" value={money(s.remainingAmount ?? loan.outstandingBalance)} />
            <Row label="Perquisite rate (SBI prescribed)" value={`${num(s.perquisiteRate ?? 0)}%`} />
            <Row label="Taxable perquisite / month" value={s.isPerquisiteExempt ? 'Exempt' : money(s.monthlyPerquisite ?? 0)} tone={s.isPerquisiteExempt ? 'text-green-700' : ''} />
            <Row label="Exempt from perquisite (flag)" value={loan.exemptFromPerquisite ? 'Yes' : 'No'} />
            <Row label="Created" value={fmtDateTime(loan.createdAt)} />
          </div>}
          {tab === 'schedule' && (schedule.length ? <div className="rounded-xl border border-gray-200 overflow-hidden"><ScheduleTable rows={schedule} /></div>
            : <Empty title={loan.status === 'active' ? 'No EMIs scheduled' : `Loan is ${loan.status}`} text={loan.status === 'active' ? undefined : 'Nothing left to recover.'} />)}
          {tab === 'history' && <div className="rounded-xl border border-gray-200 overflow-hidden">
            <DataTable rows={repayments} rowKey={r => r._id} empty="No repayments yet — payroll EMIs and manual repayments appear here"
              columns={[
                { key: 'repaymentDate', label: 'Date', render: r => fmtDate(r.repaymentDate) },
                { key: 'type', label: 'Source', render: r => r.repaymentType === 'payroll' ? <Badge status="processed">Payroll {r.payrollMonth ?? ''} {r.payrollYear ?? ''}</Badge> : <Badge status="paid">Manual</Badge> },
                { key: 'repaymentAmount', label: 'Amount', align: 'right', render: r => <b>{money(r.repaymentAmount)}</b> },
                { key: 'paymentMode', label: 'Mode', render: r => modeLabel(r.paymentMode) },
                { key: 'depositToAccount', label: 'Deposited to', render: r => r.depositToAccount || '—' },
                { key: 'referenceNumber', label: 'Reference', render: r => r.referenceNumber || '—' },
                { key: 'balanceBefore', label: 'Balance before', align: 'right', render: r => money(r.balanceBefore) },
                { key: 'balanceAfter', label: 'Balance after', align: 'right', render: r => money(r.balanceAfter) },
              ]} />
          </div>}
          {repaying && <RecordRepayment loan={loan} notify={notify} onClose={() => setRepaying(false)} onDone={() => { setRepaying(false); state.reload(); onChanged(); }} />}
        </div>;
      }}
    </Async>
  </Modal>;
}

function RecordRepayment({ loan, notify, onClose, onDone }: { loan: Loan; notify: ModuleProps['notify']; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ repaymentAmount: Math.min(loan.installmentAmount, loan.outstandingBalance), repaymentDate: isoDate(new Date()), paymentMode: 'bank_transfer', depositToAccount: '', referenceNumber: '' });
  const { busy, run } = useAction(notify);
  const over = f.repaymentAmount > loan.outstandingBalance;
  const submit = async () => {
    const out = await run(() => pe.post<{ remainingAmount: number }>(`loan/record-repayment/${loan._id}`, f));
    if (out) { notify(`Repayment recorded. Remaining ${money(out.remainingAmount)}`); onDone(); }
  };
  return <Modal title="Record repayment" subtitle={`${loan.loanNumber} · outstanding ${money(loan.outstandingBalance)}`} onClose={onClose} width="max-w-lg"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} disabled={over} onClick={() => void submit()}>Record</Btn></>}>
    <FormGrid cols={2}>
      <Field label="Amount *" hint={over ? 'Cannot exceed the outstanding balance' : `Balance after: ${money(Math.max(0, loan.outstandingBalance - f.repaymentAmount))}`}>
        <NumberInput value={f.repaymentAmount} min={0} onChange={v => setF(s => ({ ...s, repaymentAmount: v }))} />
      </Field>
      <Field label="Date *"><TextInput type="date" value={f.repaymentDate} onChange={v => setF(s => ({ ...s, repaymentDate: v }))} /></Field>
      <Field label="Payment mode *"><Select value={f.paymentMode} onChange={v => setF(s => ({ ...s, paymentMode: v }))} options={PAYMENT_MODES} /></Field>
      <Field label="Deposited to account"><TextInput value={f.depositToAccount} onChange={v => setF(s => ({ ...s, depositToAccount: v }))} /></Field>
      <Field label="Reference number" className="md:col-span-2"><TextInput value={f.referenceNumber} onChange={v => setF(s => ({ ...s, referenceNumber: v }))} /></Field>
    </FormGrid>
    <div className="mt-3"><Btn variant="ghost" onClick={() => setF(s => ({ ...s, repaymentAmount: loan.outstandingBalance }))}>Pay off in full ({money(loan.outstandingBalance)})</Btn></div>
  </Modal>;
}

// ---------------------------------------------------------------------------
// Loan types
// ---------------------------------------------------------------------------

function LoanTypesTab({ notify, onChanged }: { notify: ModuleProps['notify']; onChanged: () => void }) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null); // '' = new
  const [deleting, setDeleting] = useState<LoanType | null>(null);
  const state = useLoad(() => pe.get<{ loanTypes: LoanType[]; total: number }>('loan/get-loan-types', { includeInactive: status ? undefined : true, status, search }), [status, search]);
  const { busy, run } = useAction(notify);

  const remove = async () => {
    if (!deleting) return;
    const out = await run(() => pe.del(`loan/delete-loan-type/${deleting._id}`), 'Loan type deleted successfully');
    if (out !== undefined) { setDeleting(null); state.reload(); onChanged(); }
  };

  return <Section title="Loan types" subtitle="Categories of loans with the perquisite interest rate used to tax interest-free / concessional loans."
    right={<Btn onClick={() => setEditing('')}><Plus size={14} />New loan type</Btn>}>
    <div className="px-5 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Status"><Select value={status} onChange={setStatus} placeholder="Active + inactive" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></Field>
      <Field label="Search"><TextInput value={search} onChange={setSearch} placeholder="Loan name" /></Field>
    </div>
    <Async state={state}>
      {data => <DataTable rows={data.loanTypes} rowKey={t => t._id} empty={search || status ? 'No loan types match' : 'No loan types yet — add e.g. “Salary Advance”, “Personal Loan”'}
        columns={[
          { key: 'loanName', label: 'Loan name', render: t => <b>{t.loanName}</b> },
          { key: 'perquisiteRate', label: 'Perquisite rate', align: 'right', render: t => `${num(t.perquisiteRate)}%` },
          { key: 'status', label: 'Status', render: t => <Badge status={t.status} /> },
          { key: 'updatedAt', label: 'Updated', render: t => fmtDate(t.updatedAt) },
          {
            key: 'actions', label: '', align: 'right', render: t => <div className="flex justify-end gap-1">
              <Btn variant="ghost" aria-label={`Edit ${t.loanName}`} onClick={() => setEditing(t._id)}><Pencil size={14} /></Btn>
              <Btn variant="ghost" aria-label={`Delete ${t.loanName}`} className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(t)}><Trash2 size={14} /></Btn>
            </div>,
          },
        ]} />}
    </Async>
    {editing !== null && <LoanTypeForm id={editing} notify={notify} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); state.reload(); onChanged(); }} />}
    {deleting && <Confirm danger busy={busy} title="Delete loan type" onClose={() => setDeleting(null)} onConfirm={() => void remove()}
      message={<>Delete <b>{deleting.loanName}</b>? Loan types with linked (non-cancelled) loans cannot be deleted — mark them inactive instead.</>} />}
  </Section>;
}

function LoanTypeForm({ id, notify, onClose, onSaved }: { id: string; notify: ModuleProps['notify']; onClose: () => void; onSaved: () => void }) {
  const existing = useLoad(() => (id ? pe.get<LoanType>(`loan/get-loan-typeById/${id}`) : Promise.resolve(null)), [id]);
  return <Modal title={id ? 'Edit loan type' : 'New loan type'} onClose={onClose} width="max-w-md">
    {id && existing.loading && !existing.data ? <p className="text-sm text-gray-500">Loading…</p>
      : id && existing.error ? <p className="text-sm text-red-600">{existing.error}</p>
        : <LoanTypeFields key={existing.data?._id ?? 'new'} initial={existing.data} notify={notify} onClose={onClose} onSaved={onSaved} />}
  </Modal>;
}

function LoanTypeFields({ initial, notify, onClose, onSaved }: { initial: LoanType | null; notify: ModuleProps['notify']; onClose: () => void; onSaved: () => void }) {
  const [loanName, setLoanName] = useState(initial?.loanName ?? '');
  const [rate, setRate] = useState<number>(initial?.perquisiteRate ?? 0);
  const [status, setStatus] = useState<string>(initial?.status ?? 'active');
  const { busy, run } = useAction(notify);
  const save = async () => {
    const out = initial
      ? await run(() => pe.put(`loan/upadte-loan-type/${initial._id}`, { loanName, perquisiteRate: rate, status }), 'Loan type updated successfully')
      : await run(() => pe.post('loan/create-loan-type', { loanName, perquisiteRate: rate }), 'Loan type created successfully');
    if (out !== undefined) onSaved();
  };
  return <div className="space-y-3">
    <Field label="Loan name *"><TextInput value={loanName} onChange={setLoanName} placeholder="e.g. Salary Advance" /></Field>
    <Field label="Perquisite rate (% p.a.)" hint="SBI prescribed rate used to value the perquisite on loans above ₹20,000 (medical loans exempt). 0 = no perquisite.">
      <NumberInput value={rate} min={0} step="0.01" onChange={setRate} />
    </Field>
    {initial && <Field label="Status"><Select value={status} onChange={setStatus} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></Field>}
    <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void save()}>{initial ? 'Save' : 'Create'}</Btn></div>
  </div>;
}
