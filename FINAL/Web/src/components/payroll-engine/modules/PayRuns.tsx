"use client";

/**
 * Pay Runs — legacy controller/payroll/payrollRun.js.
 *
 * Workflow: pick period -> process -> review rows / detail (recalculate) -> approve -> mark paid -> payslips.
 * Endpoints: processPayroll, getPayRunMonthlyData (period + list of periods), getMonthlyPayrollHistroy,
 * getPayrollHistory, getPayroll/:id, recalculatePayroll/:id, updatePayrollStatus/:id,
 * updatePayrollStatusBulk, generatePayslip/:id, downloadPayslipPdf/:id, deletePayrollRun/:id.
 */

import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Download, Eye, FileText, PlayCircle, RefreshCw, Search, X } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import {
  Async, Badge, Btn, DataTable, EmployeePicker, Empty, Field, Kpi, MONTHS, PeriodPicker, Section, Select, Tabs, TextInput, Toggle,
  employeeName, fmtDate, fmtDateTime, money, num, useAction, useEmployees, useLoad, type Column, type Notify,
} from '../ui';
import { PayslipModal, STATUS_LABEL, StatusModal, downloadPayslipPdf, paymentModeLabel } from './PayRuns/actions';
import { PayrollDetailModal, runDepartment, runEmployeeCode, runEmployeeName } from './PayRuns/detail';
import { ProcessModal } from './PayRuns/process';
import type { MonthlyHistory, PayRunEmployeeRow, PayRunMonthlyData, PayRunPeriods, PayStatus, PayrollRun, PeriodSummary } from './PayRuns/types';

const STATUS_ORDER: PayStatus[] = ['pending', 'processed', 'approved', 'on_hold', 'rejected', 'paid'];

function defaultPeriod(params: Record<string, string>) {
  const now = new Date();
  const m = params.month && (MONTHS as readonly string[]).includes(params.month) ? params.month : MONTHS[now.getMonth()];
  const y = Number(params.year) || now.getFullYear();
  return { month: m, year: y };
}

export default function PayRuns({ notify, navigate, params }: ModuleProps) {
  const [tab, setTab] = useState(params.employeeId && !params.month ? 'records' : 'run');
  const [period, setPeriod] = useState(() => defaultPeriod(params));
  const [employeeFilter, setEmployeeFilter] = useState(params.employeeId ?? '');
  const [detailId, setDetailId] = useState(params.payrollId ?? '');
  const [version, setVersion] = useState(0);
  const bump = () => setVersion(v => v + 1);

  const openPeriod = (month: string, year: number) => { setPeriod({ month, year }); setTab('run'); };

  return <div className="space-y-4">
    <Tabs active={tab} onChange={setTab} tabs={[
      { key: 'run', label: 'Pay run' },
      { key: 'history', label: 'Payroll history' },
      { key: 'records', label: 'Payroll records' },
    ]} />
    {tab === 'run' && <RunTab period={period} setPeriod={setPeriod} employeeFilter={employeeFilter} clearEmployee={() => setEmployeeFilter('')}
      notify={notify} onOpen={setDetailId} version={version} bump={bump} navigate={navigate} />}
    {tab === 'history' && <HistoryTab onOpenPeriod={openPeriod} onOpen={setDetailId} version={version} />}
    {tab === 'records' && <RecordsTab employeeId={employeeFilter} setEmployeeId={setEmployeeFilter} onOpen={setDetailId} version={version} />}
    {detailId && <PayrollDetailModal payrollId={detailId} notify={notify} onClose={() => setDetailId('')} onChanged={bump} />}
  </div>;
}

// ---------------------------------------------------------------------------
// Pay run (one period)
// ---------------------------------------------------------------------------

function Stepper({ summary }: { summary: PeriodSummary | null }) {
  const count = summary?.employeeCount ?? 0;
  const sw = summary?.statusWise ?? {};
  const approvedOrPaid = (sw.approved ?? 0) + (sw.paid ?? 0);
  const steps = [
    { label: 'Process', done: count > 0 },
    { label: 'Review', done: count > 0 && (sw.pending ?? 0) === 0 && (sw.rejected ?? 0) === 0 && (sw.on_hold ?? 0) === 0 },
    { label: 'Approve', done: count > 0 && approvedOrPaid === count },
    { label: 'Mark paid', done: count > 0 && (sw.paid ?? 0) === count },
    { label: 'Payslips', done: count > 0 && (sw.paid ?? 0) === count },
  ];
  const current = steps.findIndex(s => !s.done);
  return <ol className="flex flex-wrap items-center gap-2 text-xs" aria-label="Pay run progress">
    {steps.map((s, i) => <li key={s.label} className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${s.done ? 'bg-green-50 text-green-700' : i === current ? 'bg-blue-50 text-[var(--color-bss-interactive-blue)]' : 'bg-gray-100 text-gray-500'}`}
        aria-current={i === current ? 'step' : undefined}>
        {s.done ? <CheckCircle2 size={12} /> : <span>{i + 1}.</span>}{s.label}
      </span>
      {i < steps.length - 1 && <ChevronRight size={12} className="text-gray-300" />}
    </li>)}
  </ol>;
}

function SummaryKpis({ summary, period }: { summary: PeriodSummary; period?: { baseDays: number; payDay: string | null } }) {
  return <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
    <Kpi label="Payroll cost" value={money(summary.payrollCost)} sub="gross + employer contributions" />
    <Kpi label="Net pay" value={money(summary.totalNetPay)} tone="text-green-700" />
    <Kpi label="Gross pay" value={money(summary.totalGrossPay)} sub="earnings only" />
    <Kpi label="Deductions" value={money(summary.totalDeductions)} sub="excluding taxes" />
    <Kpi label="Taxes (TDS)" value={money(summary.taxes)} />
    <Kpi label="Benefits" value={money(summary.benefits)} />
    <Kpi label="Reimbursements" value={money(summary.reimbursements)} />
    <Kpi label="Donations" value={money(summary.donations)} />
    <Kpi label="Employees" value={summary.employeeCount} sub={`${summary.skippedEmployees} active not in this run`} />
    <Kpi label="Base days" value={num(period?.baseDays ?? summary.baseDays)} />
    <Kpi label="Pay day" value={period?.payDay ?? summary.payDay ?? '—'} />
  </div>;
}

function employeeColumns(opts: { onOpen: (id: string) => void; onPayslip?: (id: string) => void; onPdf?: (row: PayRunEmployeeRow) => void }): Column<PayRunEmployeeRow>[] {
  return [
    { key: 'employee', label: 'Employee', render: r => <button type="button" className="text-left" onClick={e => { e.stopPropagation(); opts.onOpen(r.payrollId); }}>
      <span className="block font-semibold text-gray-900 hover:underline">{r.employeeName || '—'}</span>
      <span className="block text-[11px] text-gray-500">{[r.employeeCode, r.department, r.designation].filter(Boolean).join(' · ') || '—'}</span>
    </button> },
    { key: 'bank', label: 'Bank', render: r => r.bankAccountNumber ? <span className="block text-[11px] leading-tight"><span className="block">{r.bankName || '—'}{r.branchName ? `, ${r.branchName}` : ''}</span><span className="text-gray-500">{r.bankAccountNumber} · {r.ifscCode || 'no IFSC'}</span></span> : <span className="text-[11px] text-red-600">Missing</span> },
    { key: 'days', label: 'Paid / working', align: 'right', render: r => <span title={`Present ${num(r.presentDays)} · LOP ${num(r.lopDays)}`}>{num(r.paidDays)} / {num(r.workingDays)}{r.lopDays ? <span className="block text-[10px] text-orange-600">LOP {num(r.lopDays)}</span> : null}</span> },
    { key: 'grossPay', label: 'Gross', align: 'right', render: r => money(r.grossPay) },
    { key: 'benefits', label: 'Benefits', align: 'right', render: r => money(r.benefits) },
    { key: 'reimbursement', label: 'Reimb.', align: 'right', render: r => money(r.reimbursement) },
    { key: 'deductions', label: 'Deductions', align: 'right', render: r => money(r.deductions) },
    { key: 'taxes', label: 'Taxes', align: 'right', render: r => money(r.taxes) },
    { key: 'netPay', label: 'Net pay', align: 'right', render: r => <span className="font-semibold">{money(r.netPay)}</span> },
    { key: 'payStatus', label: 'Status', render: r => <span className="block"><Badge status={r.payStatus}>{STATUS_LABEL[r.payStatus] ?? r.payStatus}</Badge>
      {r.paymentMode && <span className="block text-[10px] text-gray-500 mt-0.5">{paymentModeLabel(r.paymentMode)}</span>}</span> },
    { key: 'dates', label: 'Processed / paid', render: r => <span className="text-[11px] leading-tight block"><span className="block">{fmtDate(r.processedDate)}</span><span className="text-gray-500">{r.paidDate ? `Paid ${fmtDate(r.paidDate)}` : '—'}</span></span> },
    { key: 'actions', label: '', align: 'right', render: r => <span className="inline-flex gap-1" onClick={e => e.stopPropagation()}>
      <Btn variant="ghost" className="h-7 px-2" aria-label={`View payroll of ${r.employeeName}`} onClick={() => opts.onOpen(r.payrollId)}><Eye size={14} /></Btn>
      {opts.onPayslip && <Btn variant="ghost" className="h-7 px-2" aria-label={`Payslip of ${r.employeeName}`} onClick={() => opts.onPayslip!(r.payrollId)}><FileText size={14} /></Btn>}
      {opts.onPdf && <Btn variant="ghost" className="h-7 px-2" aria-label={`Download payslip PDF of ${r.employeeName}`} onClick={() => opts.onPdf!(r)}><Download size={14} /></Btn>}
    </span> },
  ];
}

function RunTab({ period, setPeriod, employeeFilter, clearEmployee, notify, onOpen, version, bump, navigate }: {
  period: { month: string; year: number }; setPeriod: (p: { month: string; year: number }) => void;
  employeeFilter: string; clearEmployee: () => void; notify: Notify; onOpen: (id: string) => void; version: number; bump: () => void;
  navigate: ModuleProps['navigate'];
}) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<null | { kind: 'process' } | { kind: 'status'; status: PayStatus } | { kind: 'payslip'; id: string }>(null);
  const { busy, run } = useAction(notify);

  const query = employeeFilter
    ? { month: period.month, year: period.year, payStatus, page: 1, limit: 200 }
    : { month: period.month, year: period.year, search, payStatus, page, limit };
  const state = useLoad(() => pe.get<PayRunMonthlyData>('getPayRunMonthlyData', query),
    [period.month, period.year, search, payStatus, page, limit, employeeFilter, version]);

  const rows = useMemo(() => {
    const all = state.data?.employees ?? [];
    return employeeFilter ? all.filter(r => String(r.employeeId) === employeeFilter) : all;
  }, [state.data, employeeFilter]);
  const selectedRows = rows.filter(r => selected.has(r.payrollId));

  const changePeriod = (month: string, year: number) => { setPeriod({ month, year }); setPage(1); setSelected(new Set()); };
  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allChecked = rows.length > 0 && rows.every(r => selected.has(r.payrollId));
  const selectByStatus = (s: PayStatus) => setSelected(new Set(rows.filter(r => r.payStatus === s).map(r => r.payrollId)));
  const done = () => { setDialog(null); setSelected(new Set()); bump(); };

  const pdf = (r: PayRunEmployeeRow) => run(() => downloadPayslipPdf(r.payrollId, `Payslip_${r.employeeCode || r.employeeName}_${period.month}_${period.year}.pdf`), 'Payslip downloaded');
  const bulkPdf = async () => {
    for (const r of selectedRows) {
      const ok = await run(() => downloadPayslipPdf(r.payrollId, `Payslip_${r.employeeCode || r.employeeName}_${period.month}_${period.year}.pdf`));
      if (ok === undefined) break;
    }
    notify(`Downloaded ${selectedRows.length} payslip(s)`, 'success');
  };

  const columns: Column<PayRunEmployeeRow>[] = [
    { key: 'sel', label: '', render: r => <span onClick={e => e.stopPropagation()}><input type="checkbox" className="h-4 w-4 accent-[var(--color-bss-interactive-blue)]" aria-label={`Select ${r.employeeName}`} checked={selected.has(r.payrollId)} onChange={() => toggle(r.payrollId)} /></span> },
    ...employeeColumns({ onOpen, onPayslip: id => setDialog({ kind: 'payslip', id }), onPdf: pdf }),
  ];

  const data = state.data;
  const sw = data?.summary.statusWise ?? {};

  return <div className="space-y-4">
    <Section title={`Pay run · ${period.month} ${period.year}`} subtitle="Process payroll for the month, review each employee, approve, mark paid and issue payslips."
      right={<>
        <PeriodPicker month={period.month} year={period.year} onChange={changePeriod} />
        <Btn variant="secondary" onClick={state.reload} aria-label="Refresh"><RefreshCw size={14} /></Btn>
        <Btn onClick={() => setDialog({ kind: 'process' })}><PlayCircle size={14} />Process payroll</Btn>
      </>}>
      <div className="p-4 space-y-4">
        <Stepper summary={data?.summary ?? null} />
        {data && data.summary.employeeCount > 0 && <SummaryKpis summary={data.summary} period={data.period} />}
        {data && data.summary.employeeCount > 0 && <div className="flex flex-wrap items-center gap-2">
          {(sw.processed ?? 0) > 0 && <Btn variant="secondary" onClick={() => selectByStatus('processed')}>Select {sw.processed} processed to approve</Btn>}
          {(sw.approved ?? 0) > 0 && <Btn variant="secondary" onClick={() => selectByStatus('approved')}>Select {sw.approved} approved to pay</Btn>}
          <Btn variant="ghost" onClick={() => navigate('bank', { month: period.month, year: String(period.year) })}>Bank file for this period →</Btn>
          <Btn variant="ghost" onClick={() => navigate('reports', { month: period.month, year: String(period.year) })}>Reports →</Btn>
        </div>}
      </div>
    </Section>

    <Section title="Employees in this run" subtitle={data ? `${data.pagination.total} payroll record(s)` : undefined}
      right={<>
        {!employeeFilter && <form className="flex items-center gap-1" onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }}>
          <TextInput value={searchInput} onChange={setSearchInput} placeholder="Name or code" aria-label="Search employees" className="w-40" />
          <Btn type="submit" variant="secondary" aria-label="Search"><Search size={14} /></Btn>
        </form>}
        <Select value={payStatus} onChange={v => { setPayStatus(v); setPage(1); setSelected(new Set()); }} placeholder="All statuses" aria-label="Filter by status"
          options={STATUS_ORDER.map(s => ({ value: s, label: `${STATUS_LABEL[s]}${sw[s] !== undefined ? ` (${sw[s]})` : ''}` }))} className="w-40" />
      </>}>
      {employeeFilter && <div className="px-4 pt-3"><span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[var(--color-bss-interactive-blue)] text-xs px-2 py-1">
        Filtered to one employee <button type="button" onClick={clearEmployee} aria-label="Clear employee filter"><X size={12} /></button></span></div>}
      {selected.size > 0 && <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 px-3 py-2" role="toolbar" aria-label="Bulk actions">
        <span className="text-xs font-semibold text-gray-800">{selected.size} selected</span>
        <Btn onClick={() => setDialog({ kind: 'status', status: 'approved' })}>Approve</Btn>
        <Btn onClick={() => setDialog({ kind: 'status', status: 'paid' })}>Mark paid</Btn>
        <Btn variant="secondary" onClick={() => setDialog({ kind: 'status', status: 'on_hold' })}>Hold</Btn>
        <Btn variant="secondary" onClick={() => setDialog({ kind: 'status', status: 'processed' })}>Revert to processed</Btn>
        <Btn variant="danger" onClick={() => setDialog({ kind: 'status', status: 'rejected' })}>Reject</Btn>
        <Btn variant="secondary" busy={busy} onClick={bulkPdf}><Download size={14} />Payslip PDFs</Btn>
        <Btn variant="ghost" onClick={() => setSelected(new Set())}>Clear</Btn>
      </div>}
      <Async state={state}>{d => d.summary.employeeCount === 0
        ? <Empty title={`No payroll processed for ${period.month} ${period.year}`} text="Click “Process payroll” to calculate salaries for active employees, or pick another period." />
        : <>
          <div className="px-4 py-2"><Toggle checked={allChecked} onChange={v => setSelected(v ? new Set(rows.map(r => r.payrollId)) : new Set())} label="Select all on this page" /></div>
          <DataTable rows={rows} rowKey={r => r.payrollId} columns={columns} onRowClick={r => onOpen(r.payrollId)} empty="No employees match the filters" />
          {!employeeFilter && <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 text-xs text-gray-600">
            <span>Page {d.pagination.page} of {d.pagination.totalPages} · {d.pagination.total} records</span>
            <span className="flex items-center gap-2">
              <Select value={String(limit)} onChange={v => { setLimit(Number(v)); setPage(1); }} options={['25', '50', '100', '200']} aria-label="Rows per page" className="w-20" />
              <Btn variant="secondary" disabled={d.pagination.page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Btn>
              <Btn variant="secondary" disabled={d.pagination.page >= d.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Btn>
            </span>
          </div>}
        </>}</Async>
    </Section>

    {dialog?.kind === 'process' && <ProcessModal month={period.month} year={period.year} notify={notify} onClose={() => setDialog(null)} onDone={bump} />}
    {dialog?.kind === 'status' && <StatusModal payrollIds={[...selected]} initialStatus={dialog.status} label={`${period.month} ${period.year}`} notify={notify} onClose={() => setDialog(null)} onDone={done} />}
    {dialog?.kind === 'payslip' && <PayslipModal payrollId={dialog.id} notify={notify} onClose={() => setDialog(null)} />}
  </div>;
}

// ---------------------------------------------------------------------------
// History (all periods)
// ---------------------------------------------------------------------------

function HistoryTab({ onOpenPeriod, onOpen, version }: { onOpenPeriod: (month: string, year: number) => void; onOpen: (id: string) => void; version: number }) {
  const [year, setYear] = useState('');
  const [withEmployees, setWithEmployees] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const periods = useLoad(() => pe.get<PayRunPeriods>('getPayRunMonthlyData'), [version]);
  const history = useLoad(() => pe.get<MonthlyHistory>('getMonthlyPayrollHistroy', { year: year || undefined, includeEmployees: withEmployees }), [year, withEmployees, version]);
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => String(thisYear + 1 - i));
  const flip = (key: string) => setOpen(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  return <div className="space-y-4">
    <Section title="Processed periods" subtitle="Every month with at least one payroll record">
      <Async state={periods}>{d => <DataTable rows={d.periods} rowKey={p => `${p.month}-${p.year}`} empty="No payroll processed yet — start from the Pay run tab."
        onRowClick={p => onOpenPeriod(p.month, p.year)} columns={[
          { key: 'period', label: 'Period', render: p => <span className="font-semibold">{p.month} {p.year}</span> },
          { key: 'employeeCount', label: 'Employees', align: 'right' },
          { key: 'totalGrossPay', label: 'Gross (incl. benefits)', align: 'right', render: p => money(p.totalGrossPay) },
          { key: 'totalNetPay', label: 'Net pay', align: 'right', render: p => money(p.totalNetPay) },
          { key: 'lastProcessedAt', label: 'Last processed', render: p => fmtDateTime(p.lastProcessedAt) },
          { key: 'open', label: '', align: 'right', render: p => <Btn variant="ghost" className="h-7" onClick={e => { e.stopPropagation(); onOpenPeriod(p.month, p.year); }}>Open pay run →</Btn> },
        ]} />}</Async>
    </Section>

    <Section title="Payroll history" subtitle="Period summaries with grand totals"
      right={<>
        <Select value={year} onChange={setYear} placeholder="All years" options={years} aria-label="Year" className="w-32" />
        <Toggle checked={withEmployees} onChange={setWithEmployees} label="Include employee rows" />
      </>}>
      <Async state={history}>{d => d.history.length === 0 ? <Empty title="No payroll history" text="Processed pay runs appear here." /> : <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <Kpi label="Periods" value={d.totalPeriods} />
          <Kpi label="Payroll cost" value={money(d.grandTotals.payrollCost)} />
          <Kpi label="Net pay" value={money(d.grandTotals.totalNetPay)} tone="text-green-700" />
          <Kpi label="Gross pay" value={money(d.grandTotals.totalGrossPay)} />
          <Kpi label="Deductions" value={money(d.grandTotals.totalDeductions)} />
          <Kpi label="Taxes" value={money(d.grandTotals.taxes)} />
          <Kpi label="Benefits + reimb." value={money(d.grandTotals.benefits + d.grandTotals.reimbursements)} sub={`${money(d.grandTotals.benefits)} + ${money(d.grandTotals.reimbursements)}`} />
        </div>
        {d.history.map(block => {
          const key = block.period.label;
          const isOpen = open.has(key);
          return <div key={key} className="rounded-xl border border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <button type="button" className="flex items-center gap-2 text-sm font-semibold text-gray-900" onClick={() => flip(key)} aria-expanded={isOpen}>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}{block.period.label}
              </button>
              <span className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span>{block.summary.employeeCount} employees</span>
                <span className="font-semibold">Net {money(block.summary.totalNetPay)}</span>
                {Object.entries(block.summary.statusWise).filter(([, n]) => n > 0).map(([s, n]) => <Badge key={s} status={s}>{STATUS_LABEL[s as PayStatus] ?? s} {n}</Badge>)}
                <Btn variant="ghost" className="h-7" onClick={() => onOpenPeriod(block.period.month, block.period.year)}>Open pay run →</Btn>
              </span>
            </div>
            {isOpen && <div className="border-t border-gray-100 p-4 space-y-3">
              <SummaryKpis summary={block.summary} period={block.period} />
              {block.employees
                ? <DataTable rows={block.employees} rowKey={r => r.payrollId} columns={employeeColumns({ onOpen })} onRowClick={r => onOpen(r.payrollId)} />
                : <p className="text-xs text-gray-500">Turn on “Include employee rows” to list employees here.</p>}
            </div>}
          </div>;
        })}
      </div>}</Async>
    </Section>
  </div>;
}

// ---------------------------------------------------------------------------
// Records (raw payroll runs, filter by month / year / employee)
// ---------------------------------------------------------------------------

function RecordsTab({ employeeId, setEmployeeId, onOpen, version }: { employeeId: string; setEmployeeId: (id: string) => void; onOpen: (id: string) => void; version: number }) {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const employees = useEmployees();
  const state = useLoad(() => pe.get<{ total: number; data: PayrollRun[] }>('getPayrollHistory', { month: month || undefined, year: year || undefined, employeeId: employeeId || undefined }),
    [month, year, employeeId, version]);
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => String(thisYear + 1 - i));
  const emp = employees.data?.find(e => e._id === employeeId);

  const rows = useMemo(() => [...(state.data?.data ?? [])].sort((a, b) => (b.year - a.year) || (MONTHS.indexOf(b.month as typeof MONTHS[number]) - MONTHS.indexOf(a.month as typeof MONTHS[number]))), [state.data]);

  return <Section title="Payroll records" subtitle={emp ? `Payroll runs of ${employeeName(emp)}` : 'Every payroll record, filterable by period and employee'}
    right={<span className="text-xs text-gray-500">{state.data ? `${state.data.total} record(s)` : ''}</span>}>
    <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-gray-100">
      <Field label="Month"><Select value={month} onChange={setMonth} placeholder="All months" options={[...MONTHS]} /></Field>
      <Field label="Year"><Select value={year} onChange={setYear} placeholder="All years" options={years} /></Field>
      <Field label="Employee"><EmployeePicker value={employeeId} onChange={id => setEmployeeId(id)} employees={employees.data ?? []} placeholder="All employees" /></Field>
    </div>
    <Async state={state}>{() => <DataTable rows={rows} rowKey={r => r._id} onRowClick={r => onOpen(r._id)} empty="No payroll records for these filters" columns={[
      { key: 'employee', label: 'Employee', render: r => <span className="block"><span className="block font-semibold">{runEmployeeName(r)}</span><span className="block text-[11px] text-gray-500">{[runEmployeeCode(r), runDepartment(r)].filter(Boolean).join(' · ')}</span></span> },
      { key: 'period', label: 'Period', render: r => `${r.month} ${r.year}` },
      { key: 'days', label: 'Paid / working', align: 'right', render: r => `${num(r.presentDays)} / ${num(r.workingDays)}` },
      { key: 'lopDays', label: 'LOP', align: 'right', render: r => num(r.lopDays) },
      { key: 'grossEarnings', label: 'Gross', align: 'right', render: r => money(r.grossEarnings) },
      { key: 'totalDeductions', label: 'Deductions', align: 'right', render: r => money(r.totalDeductions) },
      { key: 'netPay', label: 'Net pay', align: 'right', render: r => <span className="font-semibold">{money(r.netPay)}</span> },
      { key: 'employer', label: 'Employer contrib.', align: 'right', render: r => money(r.employerContributions?.total ?? 0) },
      { key: 'payStatus', label: 'Status', render: r => <Badge status={r.payStatus}>{STATUS_LABEL[r.payStatus] ?? r.payStatus}</Badge> },
      { key: 'processedDate', label: 'Processed', render: r => fmtDate(r.processedDate) },
      { key: 'paidDate', label: 'Paid', render: r => fmtDate(r.paidDate) },
      { key: 'remarks', label: 'Remarks', render: r => <span className="text-[11px] text-gray-500">{r.remarks || '—'}</span> },
    ]} />}</Async>
  </Section>;
}
