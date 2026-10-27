"use client";

/**
 * My payslips — legacy employee/myPayslips (?year=&month=&limit=), employee/myPayslips/:payrollId
 * (detail) and employee/getMySalaryPdfdownload/:payrollId (PDF).
 */

import { useState } from 'react';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, Empty, Field, Row, Section, Select, MONTHS, fmtDate, money, num, useAction, useLoad } from '../ui';

type Line = { componentName?: string; name?: string; amount: number; fixedAmount?: number; calculationType?: string };
type PayrollRun = {
  _id: string; id?: string; month: string; year: number;
  earnings: Line[]; deductions: Line[]; benefits: Line[]; reimbursements: Line[];
  grossEarnings: number; totalDeductions: number; netPay: number;
  employerContributions?: { epf: number; edli: number; adminCharges: number; esi: number; lwf: number; total: number };
  workingDays?: number; presentDays?: number; absentDays?: number; lopDays?: number;
  payStatus: string; processedDate?: string | null; approvedDate?: string | null; paidDate?: string | null;
  paymentMode?: string; transactionId?: string; remarks?: string;
};
type ListData = { total: number; data: PayrollRun[] };
type Detail = {
  organization: { name: string; address: string | Record<string, unknown>; logo: string };
  employee: { name: string; code: string; email: string; department: string; designation: string };
  payPeriod: { month: string; year: number };
  earnings: Line[]; deductions: Line[]; benefits: Line[]; reimbursements: Line[];
  summary: { grossEarnings: number; totalDeductions: number; netPay: number };
  attendance: { workingDays: number; paidDays: number; presentDays: number; lopDays: number };
  payStatus: string; processedDate: string | null;
};

const idOf = (r: { _id?: unknown; id?: unknown }) => String(r._id ?? r.id ?? '');
const lineName = (l: Line) => l.componentName || l.name || 'Component';
const PAYMENT_MODE: Record<string, string> = { bank_transfer: 'Bank transfer', cash: 'Cash', cheque: 'Cheque' };

export default function MyPayslips({ notify, params }: ModuleProps) {
  const [filters, setFilters] = useState({ year: '', month: '', limit: '12' });
  const [openId, setOpenId] = useState<string>(params.payrollId ?? '');
  const list = useLoad(() => pe.get<ListData>('employee/myPayslips', filters), [filters]);
  const { busy, run } = useAction(notify);
  const download = (id: string) => void run(() => pe.download(`employee/getMySalaryPdfdownload/${id}`, undefined, 'Payslip.pdf'));
  const view = (id: string) => void run(() => pe.open(`employee/getMySalaryPdfdownload/${id}`));
  const thisYear = new Date().getFullYear();

  if (openId) {
    const row = (list.data?.data ?? []).find(r => idOf(r) === openId);
    return <PayslipDetail id={openId} row={row} busy={busy} onBack={() => setOpenId('')} onDownload={() => download(openId)} onView={() => view(openId)} />;
  }

  return <Section title="My payslips" subtitle="Tap a month to see the full breakdown or download the PDF.">
    <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-3 gap-2">
      <Field label="Year"><Select value={filters.year} onChange={v => setFilters(f => ({ ...f, year: v }))} placeholder="All" options={Array.from({ length: 6 }, (_, i) => String(thisYear - i))} /></Field>
      <Field label="Month"><Select value={filters.month} onChange={v => setFilters(f => ({ ...f, month: v }))} placeholder="All" options={[...MONTHS]} /></Field>
      <Field label="Show"><Select value={filters.limit} onChange={v => setFilters(f => ({ ...f, limit: v }))} options={[{ value: '12', label: 'Last 12' }, { value: '24', label: 'Last 24' }, { value: '60', label: 'Last 60' }]} /></Field>
    </div>
    <Async state={list}>{data => data.data.length === 0
      ? <Empty title="No payslips found" text={filters.year || filters.month ? 'Try clearing the filters.' : 'Payslips appear here after your employer runs payroll.'} />
      : <ul className="divide-y divide-gray-100">{data.data.map(p => <li key={idOf(p)} className="flex items-center gap-2 pr-3">
        <button type="button" onClick={() => setOpenId(idOf(p))} className="flex-1 min-w-0 text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{p.month} {p.year}</p>
            <p className="text-[11px] text-gray-500">Gross {money(p.grossEarnings)} · Deductions {money(p.totalDeductions)}</p>
            {p.paidDate && <p className="text-[11px] text-gray-400">Paid {fmtDate(p.paidDate)}</p>}
          </div>
          <div className="text-right shrink-0"><p className="text-sm font-bold">{money(p.netPay)}</p><Badge status={p.payStatus} /></div>
        </button>
        <Btn variant="ghost" busy={busy} aria-label={`Download ${p.month} ${p.year} payslip`} onClick={() => download(idOf(p))}><Download size={16} /></Btn>
      </li>)}</ul>}</Async>
    {list.data && <p className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100">{list.data.total} payslip(s) shown</p>}
  </Section>;
}

function PayslipDetail({ id, row, busy, onBack, onDownload, onView }: { id: string; row?: PayrollRun; busy: boolean; onBack: () => void; onDownload: () => void; onView: () => void }) {
  const state = useLoad(() => pe.get<Detail>(`employee/myPayslips/${id}`), [id]);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Btn variant="secondary" onClick={onBack}><ArrowLeft size={14} />All payslips</Btn>
      <div className="flex gap-2">
        <Btn variant="secondary" busy={busy} onClick={onView}><ExternalLink size={14} />Open PDF</Btn>
        <Btn busy={busy} onClick={onDownload}><Download size={14} />Download PDF</Btn>
      </div>
    </div>
    <Async state={state}>{d => <>
      <Section title={`Payslip · ${d.payPeriod.month} ${d.payPeriod.year}`} subtitle={d.organization.name} right={<Badge status={d.payStatus} />}>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Row label="Employee" value={d.employee.name} />
          <Row label="Employee code" value={d.employee.code || '—'} />
          <Row label="Designation" value={d.employee.designation || '—'} />
          <Row label="Department" value={d.employee.department || '—'} />
          <Row label="Processed on" value={fmtDate(d.processedDate)} />
          {row?.paidDate && <Row label="Paid on" value={fmtDate(row.paidDate)} />}
          {row?.paymentMode && <Row label="Payment mode" value={PAYMENT_MODE[row.paymentMode] ?? row.paymentMode} />}
          {row?.transactionId && <Row label="Transaction ID" value={row.transactionId} />}
        </div>
      </Section>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Working days" value={num(d.attendance.workingDays, 1)} />
        <Stat label="Paid days" value={num(d.attendance.paidDays, 1)} />
        <Stat label="Present days" value={num(d.attendance.presentDays, 1)} />
        <Stat label="LOP days" value={num(d.attendance.lopDays, 1)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Lines title="Earnings" lines={d.earnings} total={d.summary.grossEarnings} totalLabel="Gross earnings" showRate />
        <Lines title="Deductions" lines={d.deductions} total={d.summary.totalDeductions} totalLabel="Total deductions" tone="text-red-600" />
      </div>
      {(d.benefits.length > 0 || d.reimbursements.length > 0) && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {d.benefits.length > 0 && <Lines title="Benefits (included in earnings)" lines={d.benefits} />}
        {d.reimbursements.length > 0 && <Lines title="Reimbursements (included in earnings)" lines={d.reimbursements} />}
      </div>}
      <div className="rounded-2xl bg-green-50 border border-green-100 px-5 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-green-800">Net pay</span>
        <span className="text-2xl font-extrabold text-green-800">{money(d.summary.netPay)}</span>
      </div>
      {row?.employerContributions && row.employerContributions.total > 0 && <Section title="Employer contributions" subtitle="Paid by your employer on top of your salary (part of CTC)">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Row label="EPF" value={money(row.employerContributions.epf)} />
          <Row label="EDLI" value={money(row.employerContributions.edli)} />
          <Row label="PF admin charges" value={money(row.employerContributions.adminCharges)} />
          <Row label="ESI" value={money(row.employerContributions.esi)} />
          <Row label="LWF" value={money(row.employerContributions.lwf)} />
          <Row label="Total" value={money(row.employerContributions.total)} />
        </div>
      </Section>}
      {row?.remarks && <Section title="Remarks"><p className="p-4 text-sm text-gray-700 whitespace-pre-wrap">{row.remarks}</p></Section>}
    </>}</Async>
  </div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-gray-200 bg-white px-3 py-2"><p className="text-[11px] text-gray-500">{label}</p><p className="text-base font-bold">{value}</p></div>;
}

function Lines({ title, lines, total, totalLabel, tone, showRate }: { title: string; lines: Line[]; total?: number; totalLabel?: string; tone?: string; showRate?: boolean }) {
  return <Section title={title}>
    {lines.length ? <ul className="px-4 py-3 space-y-1.5">{lines.map((l, i) => <li key={lineName(l) + i} className="flex items-start justify-between gap-3 text-xs">
      <span>{lineName(l)}{showRate && l.fixedAmount !== undefined && Number(l.fixedAmount) !== Number(l.amount) && <span className="block text-[10px] text-gray-400">Full-month rate {money(l.fixedAmount)}</span>}</span>
      <span className={`font-semibold ${tone ?? ''}`}>{money(l.amount)}</span>
    </li>)}</ul> : <Empty title="None" />}
    {total !== undefined && <p className="flex justify-between px-4 py-2 border-t border-gray-100 text-xs font-bold"><span>{totalLabel}</span><span className={tone}>{money(total)}</span></p>}
  </Section>;
}
