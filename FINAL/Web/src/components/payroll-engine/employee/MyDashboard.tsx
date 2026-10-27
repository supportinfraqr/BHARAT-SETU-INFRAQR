"use client";

/**
 * My Payroll overview — legacy GET employee/dashboard (employeePayroll.getMyPayrollDashboard),
 * plus the org's staff-portal banner / contact / web tabs (staffPortal/settings, staffPortal/webTabs).
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Mail, Megaphone } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, Empty, Kpi, Row, Section, fmtDate, money, num, useAction, useLoad } from '../ui';

type Line = { componentName: string; amount: number; fixedAmount?: number; calculationType?: string };
type PayslipRef = { payrollId: string; month: string; year: number; grossEarnings: number; netPay: number; payStatus: string };
type Dashboard = {
  employee: { _id: string; name: string; code: string; email: string; department: string; designation: string };
  summaryCards: { currentPeriodNetPay: number; ytdGrossPay: number; currentPeriodGrossPay: number; hoursWorked: number; hoursLabel: string };
  currentPeriod: { month: string; year: number; netPay: number; grossEarnings: number; totalDeductions: number; payStatus: string };
  yearToDate: { year: number; totalGross: number; totalDeductions: number; totalNetPay: number; monthsProcessed: number; totalCTC: number };
  attendance: { hoursWorked: number; daysWorked: number; workingDays: number; attendancePercentage: number };
  lastPayslipDate: string | null;
  currentPayStub: null | {
    payrollId: string;
    payPeriod: { month: string; year: number; label: string; endingLabel: string };
    earnings: Line[]; grossPay: number; deductions: Line[]; totalDeductions: number; netPay: number; payStatus: string;
    navigation: { hasPrevious: boolean; hasNext: boolean; previousPayrollId: string | null; nextPayrollId: string | null };
  };
  deductionBreakdown: Array<{ name: string; amount: number; percentage: number }>;
  annualSalaryStatements: Array<{ financialYear: string; label: string; payrollCount: number; totalGross: number; totalNet: number; viewType: string }>;
  claimsAndReimbursements: {
    balanceAvailable: number;
    reimbursementHeads: Array<{ headId: string; headName: string; headCode: string; maxLimit: number; claimed: number; approved: number; utilized: number; balance: number; limitPeriod: string; monthKey: string }>;
    ctcBreakdown: { monthlyCTC: number; annualCTC: number; ctcUtilized: number; ctcBalance: number };
    claimsStats: { total: number; approved: number; pending: number; rejected: number };
    financialYear: string | null;
    claimMonthKey: string | null;
  };
  recentPayslips: PayslipRef[];
};
type PortalSettings = { enablePortalAccess?: boolean; bannerMessage?: string; bannerEndDate?: string | null; portalContactEmail?: string };
type WebTab = { _id: string; title: string; url: string; isVisible?: boolean };
type PayslipDetail = { payPeriod: { month: string; year: number }; earnings: Line[]; deductions: Line[]; summary: { grossEarnings: number; totalDeductions: number; netPay: number }; payStatus: string; processedDate: string | null };

const PALETTE = ['#2563eb', '#f97316', '#16a34a', '#9333ea', '#dc2626', '#0891b2', '#ca8a04', '#64748b'];

export default function MyDashboard({ notify, navigate }: ModuleProps) {
  const state = useLoad(() => pe.get<Dashboard>('employee/dashboard'), []);
  const portal = useLoad(() => Promise.all([
    pe.get<PortalSettings>('staffPortal/settings').catch(() => ({} as PortalSettings)),
    pe.get<WebTab[]>('staffPortal/webTabs').catch(() => [] as WebTab[]),
  ]), []);
  const [settings, tabs] = portal.data ?? [{} as PortalSettings, [] as WebTab[]];
  const bannerActive = !!settings.bannerMessage && (!settings.bannerEndDate || new Date(settings.bannerEndDate) >= new Date(new Date().toDateString()));

  return <div className="space-y-4">
    {bannerActive && <div role="note" className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3 text-sm text-blue-900">
      <Megaphone size={18} className="shrink-0 mt-0.5" />
      <div><p className="whitespace-pre-wrap">{settings.bannerMessage}</p>{settings.bannerEndDate && <p className="text-[11px] text-blue-700 mt-1">Until {fmtDate(settings.bannerEndDate)}</p>}</div>
    </div>}
    <Async state={state}>{d => <DashboardBody d={d} notify={notify} navigate={navigate} />}</Async>
    {(settings.portalContactEmail || tabs.some(t => t.isVisible !== false)) && <Section title="Help & links">
      <div className="p-4 space-y-2">
        {settings.portalContactEmail && <a href={`mailto:${settings.portalContactEmail}`} className="flex items-center gap-2 text-sm text-[var(--color-bss-interactive-blue)] font-semibold break-all"><Mail size={16} />Payroll helpdesk: {settings.portalContactEmail}</a>}
        {tabs.filter(t => t.isVisible !== false && t.url).map(t => <a key={t._id ?? t.url} href={t.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-800 hover:text-[var(--color-bss-interactive-blue)]"><ExternalLink size={14} />{t.title || t.url}</a>)}
      </div>
    </Section>}
  </div>;
}

function DashboardBody({ d, notify, navigate }: { d: Dashboard; notify: ModuleProps['notify']; navigate: ModuleProps['navigate'] }) {
  const cr = d.claimsAndReimbursements;
  return <>
    <section className="rounded-2xl bg-gradient-to-br from-[var(--color-bss-navy,#0f2a5f)] to-[var(--color-bss-interactive-blue,#2563eb)] text-white px-5 py-4">
      <p className="text-xs opacity-80">{[d.employee.code, d.employee.designation, d.employee.department].filter(Boolean).join(' · ')}</p>
      <h2 className="text-lg font-bold">Hi, {d.employee.name || 'there'}</h2>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs opacity-80">Net pay · {d.currentPeriod.month} {d.currentPeriod.year}</p>
          <p className="text-3xl font-extrabold">{money(d.summaryCards.currentPeriodNetPay)}</p>
        </div>
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold capitalize">{d.currentPeriod.payStatus}</span>
      </div>
      {d.lastPayslipDate && <p className="text-[11px] opacity-80 mt-2">Last payslip processed {fmtDate(d.lastPayslipDate)}</p>}
    </section>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi label="Gross this period" value={money(d.summaryCards.currentPeriodGrossPay)} sub={`Deductions ${money(d.currentPeriod.totalDeductions)}`} />
      <Kpi label={`YTD gross (${d.yearToDate.year})`} value={money(d.summaryCards.ytdGrossPay)} sub={`${d.yearToDate.monthsProcessed} month(s) paid`} />
      <Kpi label="Hours worked" value={num(d.summaryCards.hoursWorked, 0)} sub={d.summaryCards.hoursLabel} />
      <Kpi label="Attendance" value={`${num(d.attendance.attendancePercentage)}%`} sub={`${num(d.attendance.daysWorked, 1)} of ${num(d.attendance.workingDays, 1)} days`} />
    </div>

    <PayStub initial={d.currentPayStub} notify={notify} />

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Section title="Deductions breakdown" subtitle={d.currentPayStub ? d.currentPayStub.payPeriod.label : undefined}>
        {d.deductionBreakdown.length ? <div className="p-4 space-y-3">
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-100" aria-hidden="true">
            {d.deductionBreakdown.map((x, i) => <div key={x.name + i} style={{ width: `${x.percentage}%`, background: PALETTE[i % PALETTE.length] }} />)}
          </div>
          <ul className="space-y-1.5">{d.deductionBreakdown.map((x, i) => <li key={x.name + i} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />{x.name}</span>
            <span className="font-semibold">{money(x.amount)} <span className="text-gray-400 font-normal">· {num(x.percentage)}%</span></span>
          </li>)}</ul>
        </div> : <Empty title="No deductions this period" />}
      </Section>

      <Section title="Year to date" subtitle={`Calendar year ${d.yearToDate.year}`}>
        <div className="p-4 grid grid-cols-1 gap-2">
          <Row label="Total gross" value={money(d.yearToDate.totalGross)} />
          <Row label="Total deductions" value={money(d.yearToDate.totalDeductions)} tone="text-red-600" />
          <Row label="Total net pay" value={money(d.yearToDate.totalNetPay)} tone="text-green-700" />
          <Row label="Months processed" value={d.yearToDate.monthsProcessed} />
          <Row label="Annual CTC" value={money(d.yearToDate.totalCTC)} />
        </div>
      </Section>
    </div>

    <Section title="Claims & reimbursements" subtitle={cr.claimMonthKey ? `Monthly limits for ${cr.claimMonthKey}${cr.financialYear ? ` · FY ${cr.financialYear}` : ''}` : undefined}
      right={<Btn variant="secondary" onClick={() => navigate('myClaims')}>Open claims</Btn>}>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Balance available" value={money(cr.balanceAvailable)} tone="text-green-700" />
          <Kpi label="Claims" value={cr.claimsStats.total} sub={`${cr.claimsStats.pending} pending`} />
          <Kpi label="Approved" value={cr.claimsStats.approved} />
          <Kpi label="Rejected" value={cr.claimsStats.rejected} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Row label="Monthly CTC" value={money(cr.ctcBreakdown.monthlyCTC)} />
          <Row label="Annual CTC" value={money(cr.ctcBreakdown.annualCTC)} />
          <Row label="CTC utilised (claims)" value={money(cr.ctcBreakdown.ctcUtilized)} />
          <Row label="CTC balance" value={money(cr.ctcBreakdown.ctcBalance)} />
        </div>
        {cr.reimbursementHeads.length > 0 && <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {cr.reimbursementHeads.map(h => <li key={String(h.headId)} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
            <div><p className="font-semibold text-gray-900">{h.headName}</p><p className="text-gray-500">Claimed {money(h.claimed)} · Approved {money(h.approved)}</p></div>
            <div className="text-right"><p className="font-bold text-green-700">{h.maxLimit > 0 ? money(h.balance) : 'No limit'}</p>{h.maxLimit > 0 && <p className="text-gray-400">of {money(h.maxLimit)}/{h.limitPeriod}</p>}</div>
          </li>)}
        </ul>}
      </div>
    </Section>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Section title="Recent payslips" right={<Btn variant="ghost" onClick={() => navigate('myPayslips')}>All payslips</Btn>}>
        {d.recentPayslips.length ? <ul className="divide-y divide-gray-100">{d.recentPayslips.map(p => <li key={String(p.payrollId)}>
          <button type="button" onClick={() => navigate('myPayslips', { payrollId: String(p.payrollId) })} className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50">
            <div><p className="text-sm font-semibold">{p.month} {p.year}</p><p className="text-[11px] text-gray-500">Gross {money(p.grossEarnings)}</p></div>
            <div className="text-right"><p className="text-sm font-bold">{money(p.netPay)}</p><Badge status={p.payStatus} /></div>
          </button></li>)}</ul> : <Empty title="No payslips yet" text="Payslips appear once your employer runs payroll." />}
      </Section>
      <Section title="Annual salary statements" right={<Btn variant="ghost" onClick={() => navigate('mySalary')}>Open</Btn>}>
        {d.annualSalaryStatements.length ? <ul className="divide-y divide-gray-100">{d.annualSalaryStatements.map(s => <li key={s.financialYear}>
          <button type="button" onClick={() => navigate('mySalary', { financialYear: s.financialYear })} className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50">
            <div><p className="text-sm font-semibold">{s.label}</p><p className="text-[11px] text-gray-500">{s.payrollCount} payslip(s)</p></div>
            <div className="text-right text-xs"><p>Gross {money(s.totalGross)}</p><p className="font-semibold text-green-700">Net {money(s.totalNet)}</p></div>
          </button></li>)}</ul> : <Empty title="No statements yet" />}
      </Section>
    </div>
  </>;
}

/** Current pay stub with previous / next navigation (uses employee/myPayslips/:id for other periods). */
function PayStub({ initial, notify }: { initial: Dashboard['currentPayStub']; notify: ModuleProps['notify'] }) {
  const { busy, run } = useAction(notify);
  if (!initial) return <Section title="Pay stub"><Empty title="No payslip yet" text="Your pay stub appears here after your first payroll is processed." /></Section>;
  return <PayStubView key={String(initial.payrollId)} initial={initial} busy={busy} onDownload={id => void run(() => pe.download(`employee/getMySalaryPdfdownload/${id}`, undefined, 'Payslip.pdf'))} />;
}

function PayStubView({ initial, busy, onDownload }: { initial: NonNullable<Dashboard['currentPayStub']>; busy: boolean; onDownload: (id: string) => void }) {
  const nav = initial.navigation;
  const [cursor, setCursor] = useState<string | null>(null);
  const other = useLoad(() => (cursor ? pe.get<PayslipDetail>(`employee/myPayslips/${cursor}`) : Promise.resolve(null)), [cursor]);
  const showing = cursor && other.data ? {
    payrollId: cursor, label: `${other.data.payPeriod.month} ${other.data.payPeriod.year}`, earnings: other.data.earnings, deductions: other.data.deductions,
    grossPay: other.data.summary.grossEarnings, totalDeductions: other.data.summary.totalDeductions, netPay: other.data.summary.netPay, payStatus: other.data.payStatus,
  } : { payrollId: String(initial.payrollId), label: initial.payPeriod.endingLabel, earnings: initial.earnings, deductions: initial.deductions, grossPay: initial.grossPay, totalDeductions: initial.totalDeductions, netPay: initial.netPay, payStatus: initial.payStatus };
  return <Section title="Pay stub" subtitle={showing.label} right={<>
    {!cursor && nav.hasPrevious && nav.previousPayrollId && <Btn variant="secondary" aria-label="Previous pay period" onClick={() => setCursor(String(nav.previousPayrollId))}><ChevronLeft size={14} /></Btn>}
    {cursor && <Btn variant="secondary" onClick={() => setCursor(null)}>Latest<ChevronRight size={14} /></Btn>}
    {!cursor && nav.hasNext && nav.nextPayrollId && <Btn variant="secondary" aria-label="Next pay period" onClick={() => setCursor(String(nav.nextPayrollId))}><ChevronRight size={14} /></Btn>}
    <Btn variant="secondary" busy={busy} onClick={() => onDownload(showing.payrollId)}><Download size={14} />PDF</Btn>
  </>}>
    {cursor && other.loading && !other.data ? <Empty title="Loading…" /> : other.error ? <Empty title={other.error} /> :
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Earnings</p>
          <ul className="space-y-1">{showing.earnings.map((e, i) => <li key={e.componentName + i} className="flex justify-between text-xs"><span>{e.componentName}</span><span className="font-semibold">{money(e.amount)}</span></li>)}</ul>
          <p className="flex justify-between text-xs font-bold border-t border-gray-100 mt-2 pt-2"><span>Gross pay</span><span>{money(showing.grossPay)}</span></p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Deductions</p>
          {showing.deductions.length ? <ul className="space-y-1">{showing.deductions.map((e, i) => <li key={e.componentName + i} className="flex justify-between text-xs"><span>{e.componentName}</span><span className="font-semibold text-red-600">{money(e.amount)}</span></li>)}</ul> : <p className="text-xs text-gray-400">None</p>}
          <p className="flex justify-between text-xs font-bold border-t border-gray-100 mt-2 pt-2"><span>Total deductions</span><span className="text-red-600">{money(showing.totalDeductions)}</span></p>
        </div>
        <div className="md:col-span-2 rounded-xl bg-green-50 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-green-800">Net pay</span>
          <span className="flex items-center gap-2"><Badge status={showing.payStatus} /><span className="text-lg font-extrabold text-green-800">{money(showing.netPay)}</span></span>
        </div>
      </div>}
  </Section>;
}

