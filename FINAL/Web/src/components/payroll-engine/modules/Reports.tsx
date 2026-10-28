"use client";

/**
 * Payroll reports (legacy controller/payroll/payrollReports.js):
 *   GET reports/summary   ?month&year
 *   GET reports/ytd       ?year&employeeId
 *   GET reports/statutory ?month&year
 *   GET reports/tds       ?financialYear
 *   GET reports/ctc
 *   GET reports/variance  ?month1&year1&month2&year2
 * Every report renders all returned fields and exports to Excel client-side.
 */

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import {
  Async, Badge, Btn, DataTable, Empty, EmployeePicker, Field, FinancialYearPicker, Kpi, KpiGrid, MONTHS, PeriodPicker,
  Section, Select, Tabs, currentFinancialYear, money, useEmployees, useLoad, type Notify,
} from '../ui';
import { componentAmount, componentNames, exportWorkbook, sheet, toColumns, totalsFooter, type Sheet, type Spec } from './Reports/table';

// ---------------------------------------------------------------------------
// Response types (exact legacy shapes)
// ---------------------------------------------------------------------------

type Line = { name: string; amount: number };
type Identity = { employeeId: string; name: string; employeeCode: string; department: string; designation: string };

type SummaryEmployee = Identity & {
  paidDays: number; lopDays: number; earnings: Line[]; gross: number; deductions: Line[]; totalDeductions: number; netPay: number;
  employerPF: number; employerESI: number; edli: number; adminCharges: number; status: string;
};
type DeptAgg = { count: number; totalGross: number; totalDeductions: number; totalNet: number };
type SummaryData = {
  month: string; year: string | number;
  summary: {
    totalEmployees: number; totalGrossEarnings: number; totalDeductions: number; totalNetPay: number;
    departmentWise: Record<string, DeptAgg>; statusWise: Record<string, number>; employees: SummaryEmployee[];
  };
};

type YtdMonth = {
  month: string; paidDays: number; lopDays: number; basic: number; hra: number; otherEarnings: number; grossEarnings: number;
  epf: number; esi: number; professionalTax: number; tds: number; lwf: number; otherDeductions: number; deductions: number; netPay: number;
};
type YtdEmployee = { employee: Identity & { email: string }; months: YtdMonth[]; totals: { grossEarnings: number; deductions: number; netPay: number } };
type YtdData = { year: string | number; data: YtdEmployee[] };

type EpfRow = { employeeId: string; name: string; employeeCode: string; uan: string; pfAccountNumber: string; epfWage: number; employeeContribution: number; employerContribution: number; edliContribution: number; adminCharges: number; abryApplied: boolean };
type EsiRow = { employeeId: string; name: string; employeeCode: string; esiNumber: string; wageUsed: number; employeeContribution: number; employerContribution: number };
type PtRow = { employeeId: string; name: string; employeeCode: string; state: string; ptNumber: string; cycle: string; amount: number };
type LwfRow = { employeeId: string; name: string; employeeCode: string; state: string; cycle: string; employeeShare: number; employerShare: number };
type BonusRow = { employeeId: string; name: string; employeeCode: string; cycle: string; calcBase: number; percentage: number; amount: number };
type StatutoryData = {
  month: string; year: string | number;
  report: {
    epf: { employees: EpfRow[]; totalEmployeeContribution: number; totalEmployerContribution: number; totalEdliContribution: number; totalAdminCharges: number; totalEmployerCost: number };
    esi: { employees: EsiRow[]; totalEmployeeContribution: number; totalEmployerContribution: number };
    pt: { employees: PtRow[]; totalAmount: number };
    lwf: { employees: LwfRow[]; totalEmployeeShare: number; totalEmployerShare: number };
    bonus: { employees: BonusRow[]; totalAmount: number };
  };
};

const FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'] as const;
type TdsEmployee = Identity & {
  email: string; pan: string; taxRegime: string; basic: number; hra: number; allowances: number; perquisites: number; otherIncome: number;
  grossTotalIncome: number; hraExemption: number; section10: number; standardDeduction: number; professionalTax: number; section24: number;
  section80C: number; section80CCD1B: number; section80CCD2: number; section80D: number; otherChapterVIA: number; taxableIncome: number;
  incomeTax: number; rebate: number; surcharge: number; cess: number; totalTax: number; monthlyTDS: number; totalDeducted: number; balance: number;
  months: Record<string, number>;
};
type TdsData = { financialYear: string; report: { totalEmployees: number; totalAnnualIncome: number; totalTaxDeducted: number; employees: TdsEmployee[] } };

type CtcComponent = { name: string; category: string; monthly: number };
type CtcEmployee = {
  employeeId: string; name: string; email: string; employeeCode: string; department: string; designation: string; ctc: number; monthlyCTC: number;
  grossSalary: number; basicSalary: number; annualBasic: number; annualGross: number; variablePay: number; incentives: number; components: CtcComponent[];
};
type CtcData = { totalEmployees: number; totalCTC: number; totalGross: number; employees: CtcEmployee[]; departmentWise: Record<string, { count: number; totalCTC: number }> };

type Triple = { gross: number; deductions: number; net: number };
type VarianceRow = Identity & { period1: Triple; period2: Triple; variance: Triple & { grossPercentage: string | number; deductionPercentage: string | number; netPercentage: string | number } };
type VarianceData = { period1: { month: string; year: string | number }; period2: { month: string; year: string | number }; variances: VarianceRow[] };

// ---------------------------------------------------------------------------

const REPORTS = [
  { key: 'summary', label: 'Payroll summary' },
  { key: 'ytd', label: 'Year to date' },
  { key: 'statutory', label: 'Statutory (EPF/ESI/PT/LWF/Bonus)' },
  { key: 'tds', label: 'TDS' },
  { key: 'ctc', label: 'Cost to company' },
  { key: 'variance', label: 'Variance' },
];

const thisMonth = (): string => MONTHS[new Date().getMonth()];
type Period = { month: string; year: number };
/** Period passed by other modules (e.g. Pay Runs / Dashboard "Reports" links), else the current month. */
function initialPeriod(params: Record<string, string>): Period {
  const month = params.month && (MONTHS as readonly string[]).includes(params.month) ? params.month : thisMonth();
  return { month, year: Number(params.year) || new Date().getFullYear() };
}

function useExport(notify: Notify) {
  const [busy, setBusy] = useState(false);
  const run = async (filename: string, build: () => Sheet[]) => {
    setBusy(true);
    try { await exportWorkbook(filename, build()); notify('Excel downloaded', 'success'); }
    catch (e) { notify(e instanceof Error ? e.message : 'Export failed', 'error'); }
    finally { setBusy(false); }
  };
  return { busy, run };
}

function ExportBtn({ onClick, busy, disabled }: { onClick: () => void; busy: boolean; disabled?: boolean }) {
  return <Btn variant="secondary" busy={busy} disabled={disabled} onClick={onClick}><Download size={14} />Export Excel</Btn>;
}

function Table<T>({ specs, rows, rowKey, empty }: { specs: Spec<T>[]; rows: T[]; rowKey: (r: T, i: number) => string; empty: string }) {
  return <DataTable columns={toColumns(specs)} rows={rows} rowKey={rowKey} empty={empty} footer={totalsFooter(specs, rows)} />;
}

const identitySpecs = <T extends { name: string; employeeCode: string }>(): Spec<T>[] => [
  { label: 'Employee', value: r => r.name },
  { label: 'Code', value: r => r.employeeCode },
];

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function SummaryReport({ notify, initial }: { notify: Notify; initial: Period }) {
  const [period, setPeriod] = useState(initial);
  const state = useLoad(() => pe.get<SummaryData>('reports/summary', period), [period.month, period.year]);
  const ex = useExport(notify);
  const s = state.data?.summary;

  const { empSpecs, deptSpecs, depts } = useMemo(() => {
    const emps = s?.employees ?? [];
    const earn = componentNames(emps, e => e.earnings);
    const ded = componentNames(emps, e => e.deductions);
    const empSpecs: Spec<SummaryEmployee>[] = [
      ...identitySpecs<SummaryEmployee>(),
      { label: 'Department', value: r => r.department },
      { label: 'Designation', value: r => r.designation },
      { label: 'Paid days', value: r => r.paidDays, kind: 'num', total: true },
      { label: 'LOP days', value: r => r.lopDays, kind: 'num', total: true },
      ...earn.map((n): Spec<SummaryEmployee> => ({ label: n, value: r => componentAmount(r.earnings, n), kind: 'money', total: true })),
      { label: 'Gross', value: r => r.gross, kind: 'money', total: true },
      ...ded.map((n): Spec<SummaryEmployee> => ({ label: n, value: r => componentAmount(r.deductions, n), kind: 'money', total: true })),
      { label: 'Total deductions', value: r => r.totalDeductions, kind: 'money', total: true },
      { label: 'Net pay', value: r => r.netPay, kind: 'money', total: true },
      { label: 'Employer PF', value: r => r.employerPF, kind: 'money', total: true },
      { label: 'Employer ESI', value: r => r.employerESI, kind: 'money', total: true },
      { label: 'EDLI', value: r => r.edli, kind: 'money', total: true },
      { label: 'PF admin charges', value: r => r.adminCharges, kind: 'money', total: true },
      { label: 'Status', value: r => r.status, render: r => <Badge status={r.status} /> },
    ];
    const depts = Object.entries(s?.departmentWise ?? {}).map(([name, v]) => ({ name, ...v }));
    const deptSpecs: Spec<(typeof depts)[number]>[] = [
      { label: 'Department', value: r => r.name },
      { label: 'Employees', value: r => r.count, kind: 'num', total: true },
      { label: 'Gross', value: r => r.totalGross, kind: 'money', total: true },
      { label: 'Deductions', value: r => r.totalDeductions, kind: 'money', total: true },
      { label: 'Net pay', value: r => r.totalNet, kind: 'money', total: true },
    ];
    return { empSpecs, deptSpecs, depts };
  }, [s]);

  const exportIt = () => ex.run(`Payroll_Summary_${period.month}_${period.year}`, () => {
    const pre = [['Payroll summary', `${period.month} ${period.year}`], ['Employees', s?.totalEmployees ?? 0], ['Gross earnings', s?.totalGrossEarnings ?? 0], ['Deductions', s?.totalDeductions ?? 0], ['Net pay', s?.totalNetPay ?? 0]];
    const status = Object.entries(s?.statusWise ?? {}).map(([k, v]) => ({ k, v }));
    return [
      sheet('Employees', empSpecs, s?.employees ?? [], pre),
      sheet('Departments', deptSpecs, depts),
      sheet('Status', [{ label: 'Status', value: (r: { k: string; v: number }) => r.k }, { label: 'Count', value: r => r.v, kind: 'num', total: true }], status),
    ];
  });

  return <Section title="Payroll summary" subtitle="Monthly payroll register with department and status breakdown"
    right={<><PeriodPicker month={period.month} year={period.year} onChange={(month, year) => setPeriod({ month, year })} /><ExportBtn busy={ex.busy} disabled={!s?.employees.length} onClick={exportIt} /></>}>
    <Async state={state}>{() => !s || !s.totalEmployees ? <Empty title={`No payroll for ${period.month} ${period.year}`} text="Process the pay run for this period from Pay Runs, then come back." /> : <div className="p-4 space-y-4">
      <KpiGrid>
        <Kpi label="Employees" value={s.totalEmployees} />
        <Kpi label="Gross earnings" value={money(s.totalGrossEarnings)} />
        <Kpi label="Deductions" value={money(s.totalDeductions)} tone="text-red-700" />
        <Kpi label="Net pay" value={money(s.totalNetPay)} tone="text-green-700" />
      </KpiGrid>
      <div className="flex flex-wrap gap-2" aria-label="Status counts">
        {Object.entries(s.statusWise).map(([k, v]) => <span key={k} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1 text-xs"><Badge status={k} /><b>{v}</b></span>)}
      </div>
      <div className="rounded-xl border border-gray-200 overflow-hidden"><p className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 border-b">Department-wise</p>
        <Table specs={deptSpecs} rows={depts} rowKey={r => r.name} empty="No departments" /></div>
      <div className="rounded-xl border border-gray-200 overflow-hidden"><p className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 border-b">Employee register</p>
        <Table specs={empSpecs} rows={s.employees} rowKey={(r, i) => `${r.employeeId}-${i}`} empty="No employees" /></div>
    </div>}</Async>
  </Section>;
}

// ---------------------------------------------------------------------------
// YTD
// ---------------------------------------------------------------------------

const ytdMonthSpecs: Spec<YtdMonth>[] = [
  { label: 'Month', value: r => r.month },
  { label: 'Paid days', value: r => r.paidDays, kind: 'num', total: true },
  { label: 'LOP days', value: r => r.lopDays, kind: 'num', total: true },
  { label: 'Basic', value: r => r.basic, kind: 'money', total: true },
  { label: 'HRA', value: r => r.hra, kind: 'money', total: true },
  { label: 'Other earnings', value: r => r.otherEarnings, kind: 'money', total: true },
  { label: 'Gross', value: r => r.grossEarnings, kind: 'money', total: true },
  { label: 'EPF', value: r => r.epf, kind: 'money', total: true },
  { label: 'ESI', value: r => r.esi, kind: 'money', total: true },
  { label: 'Prof. tax', value: r => r.professionalTax, kind: 'money', total: true },
  { label: 'TDS', value: r => r.tds, kind: 'money', total: true },
  { label: 'LWF', value: r => r.lwf, kind: 'money', total: true },
  { label: 'Other deductions', value: r => r.otherDeductions, kind: 'money', total: true },
  { label: 'Total deductions', value: r => r.deductions, kind: 'money', total: true },
  { label: 'Net pay', value: r => r.netPay, kind: 'money', total: true },
];

function YtdReport({ notify, initialEmployee }: { notify: Notify; initialEmployee: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [employeeId, setEmployeeId] = useState(initialEmployee);
  const employees = useEmployees();
  const state = useLoad(() => pe.get<YtdData>('reports/ytd', { year, employeeId }), [year, employeeId]);
  const ex = useExport(notify);
  const rows = state.data?.data ?? [];
  const years = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 5 + i);
  const MONTH_ORDER = (m: string) => MONTHS.indexOf(m as (typeof MONTHS)[number]);

  const exportIt = () => ex.run(`Payroll_YTD_${year}${employeeId ? `_${rows[0]?.employee.employeeCode || employeeId}` : ''}`, () => {
    type Flat = YtdMonth & { emp: YtdEmployee['employee'] };
    const flat: Flat[] = rows.flatMap(r => r.months.map(m => ({ ...m, emp: r.employee })));
    const specs: Spec<Flat>[] = [
      { label: 'Employee', value: r => r.emp.name }, { label: 'Code', value: r => r.emp.employeeCode }, { label: 'Email', value: r => r.emp.email },
      { label: 'Department', value: r => r.emp.department }, { label: 'Designation', value: r => r.emp.designation },
      ...(ytdMonthSpecs as Spec<Flat>[]),
    ];
    const totals: Spec<YtdEmployee>[] = [
      { label: 'Employee', value: r => r.employee.name }, { label: 'Code', value: r => r.employee.employeeCode }, { label: 'Department', value: r => r.employee.department },
      { label: 'Gross earnings', value: r => r.totals.grossEarnings, kind: 'money', total: true },
      { label: 'Deductions', value: r => r.totals.deductions, kind: 'money', total: true },
      { label: 'Net pay', value: r => r.totals.netPay, kind: 'money', total: true },
    ];
    return [sheet('Totals', totals, rows, [['Year to date', String(year)]]), sheet('Monthly', specs, flat)];
  });

  return <Section title="Year-to-date report" subtitle="Month-by-month earnings and deductions for the calendar year"
    right={<>
      <label className="sr-only" htmlFor="ytd-year">Year</label>
      <Select id="ytd-year" className="w-24" value={String(year)} onChange={v => setYear(Number(v))} options={years.map(String)} />
      <label className="block w-64"><span className="sr-only">Employee</span><EmployeePicker value={employeeId} onChange={id => setEmployeeId(id)} employees={employees.data ?? []} placeholder="All employees" /></label>
      <ExportBtn busy={ex.busy} disabled={!rows.length} onClick={exportIt} />
    </>}>
    <Async state={state}>{() => !rows.length ? <Empty title={`No payroll found for ${year}`} text="Pick another year or employee." /> : <div className="p-4 space-y-4">
      <KpiGrid>
        <Kpi label="Employees" value={rows.length} />
        <Kpi label="Gross earnings" value={money(rows.reduce((a, r) => a + r.totals.grossEarnings, 0))} />
        <Kpi label="Deductions" value={money(rows.reduce((a, r) => a + r.totals.deductions, 0))} tone="text-red-700" />
        <Kpi label="Net pay" value={money(rows.reduce((a, r) => a + r.totals.netPay, 0))} tone="text-green-700" />
      </KpiGrid>
      {rows.map(r => <details key={r.employee.employeeId} open={rows.length === 1} className="rounded-xl border border-gray-200 overflow-hidden group">
        <summary className="cursor-pointer px-3 py-2 bg-gray-50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span><b className="text-gray-900">{r.employee.name}</b> <span className="text-gray-500">· {r.employee.employeeCode} · {r.employee.department}{r.employee.designation ? ` · ${r.employee.designation}` : ''}</span></span>
          <span className="text-gray-600">Gross {money(r.totals.grossEarnings)} · Ded. {money(r.totals.deductions)} · <b className="text-green-700">Net {money(r.totals.netPay)}</b></span>
        </summary>
        <Table specs={ytdMonthSpecs} rows={[...r.months].sort((a, b) => MONTH_ORDER(a.month) - MONTH_ORDER(b.month))} rowKey={(m, i) => `${m.month}-${i}`} empty="No months" />
      </details>)}
    </div>}</Async>
  </Section>;
}

// ---------------------------------------------------------------------------
// Statutory
// ---------------------------------------------------------------------------

const epfSpecs: Spec<EpfRow>[] = [...identitySpecs<EpfRow>(),
  { label: 'UAN', value: r => r.uan }, { label: 'PF account', value: r => r.pfAccountNumber },
  { label: 'EPF wage', value: r => r.epfWage, kind: 'money', total: true },
  { label: 'Employee contribution', value: r => r.employeeContribution, kind: 'money', total: true },
  { label: 'Employer contribution', value: r => r.employerContribution, kind: 'money', total: true },
  { label: 'EDLI', value: r => r.edliContribution, kind: 'money', total: true },
  { label: 'Admin charges', value: r => r.adminCharges, kind: 'money', total: true },
  { label: 'ABRY applied', value: r => r.abryApplied },
];
const esiSpecs: Spec<EsiRow>[] = [...identitySpecs<EsiRow>(),
  { label: 'ESI number', value: r => r.esiNumber },
  { label: 'ESI wage', value: r => r.wageUsed, kind: 'money', total: true },
  { label: 'Employee contribution', value: r => r.employeeContribution, kind: 'money', total: true },
  { label: 'Employer contribution', value: r => r.employerContribution, kind: 'money', total: true },
];
const ptSpecs: Spec<PtRow>[] = [...identitySpecs<PtRow>(),
  { label: 'State', value: r => r.state }, { label: 'PT number', value: r => r.ptNumber }, { label: 'Cycle', value: r => r.cycle },
  { label: 'Amount', value: r => r.amount, kind: 'money', total: true },
];
const lwfSpecs: Spec<LwfRow>[] = [...identitySpecs<LwfRow>(),
  { label: 'State', value: r => r.state }, { label: 'Cycle', value: r => r.cycle },
  { label: 'Employee share', value: r => r.employeeShare, kind: 'money', total: true },
  { label: 'Employer share', value: r => r.employerShare, kind: 'money', total: true },
];
const bonusSpecs: Spec<BonusRow>[] = [...identitySpecs<BonusRow>(),
  { label: 'Cycle', value: r => r.cycle }, { label: 'Calculation base', value: r => r.calcBase, kind: 'money', total: true },
  { label: 'Percentage', value: r => r.percentage, kind: 'pct' }, { label: 'Amount', value: r => r.amount, kind: 'money', total: true },
];

function StatutoryReport({ notify, initial }: { notify: Notify; initial: Period }) {
  const [period, setPeriod] = useState(initial);
  const [tab, setTab] = useState('epf');
  const state = useLoad(() => pe.get<StatutoryData>('reports/statutory', period), [period.month, period.year]);
  const ex = useExport(notify);
  const r = state.data?.report;
  const any = !!r && (r.epf.employees.length + r.esi.employees.length + r.pt.employees.length + r.lwf.employees.length + r.bonus.employees.length) > 0;

  const exportIt = () => ex.run(`Statutory_${period.month}_${period.year}`, () => !r ? [] : [
    sheet('EPF', epfSpecs, r.epf.employees, [['EPF', `${period.month} ${period.year}`], ['Total employer cost (ER + EDLI + admin)', r.epf.totalEmployerCost]]),
    sheet('ESI', esiSpecs, r.esi.employees),
    sheet('Professional Tax', ptSpecs, r.pt.employees),
    sheet('LWF', lwfSpecs, r.lwf.employees),
    sheet('Bonus', bonusSpecs, r.bonus.employees),
  ]);

  return <Section title="Statutory compliance report" subtitle="EPF, ESI, Professional Tax, Labour Welfare Fund and Statutory Bonus for the month"
    right={<><PeriodPicker month={period.month} year={period.year} onChange={(month, year) => setPeriod({ month, year })} /><ExportBtn busy={ex.busy} disabled={!any} onClick={exportIt} /></>}>
    <Async state={state}>{() => !r || !any ? <Empty title={`No statutory deductions for ${period.month} ${period.year}`} text="Statutory figures appear once payroll for this period is processed." /> : <div className="p-4 space-y-4">
      <KpiGrid>
        <Kpi label="EPF (employee)" value={money(r.epf.totalEmployeeContribution)} sub={`Employer ${money(r.epf.totalEmployerContribution)}`} />
        <Kpi label="EPF employer cost" value={money(r.epf.totalEmployerCost)} sub={`EDLI ${money(r.epf.totalEdliContribution)} · Admin ${money(r.epf.totalAdminCharges)}`} />
        <Kpi label="ESI" value={money(r.esi.totalEmployeeContribution)} sub={`Employer ${money(r.esi.totalEmployerContribution)}`} />
        <Kpi label="Professional tax" value={money(r.pt.totalAmount)} />
        <Kpi label="LWF" value={money(r.lwf.totalEmployeeShare)} sub={`Employer ${money(r.lwf.totalEmployerShare)}`} />
        <Kpi label="Statutory bonus" value={money(r.bonus.totalAmount)} />
      </KpiGrid>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'epf', label: `EPF (${r.epf.employees.length})` }, { key: 'esi', label: `ESI (${r.esi.employees.length})` },
        { key: 'pt', label: `PT (${r.pt.employees.length})` }, { key: 'lwf', label: `LWF (${r.lwf.employees.length})` },
        { key: 'bonus', label: `Bonus (${r.bonus.employees.length})` },
      ]} />
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {tab === 'epf' && <Table specs={epfSpecs} rows={r.epf.employees} rowKey={(x, i) => `${x.employeeId}-${i}`} empty="No EPF contributions" />}
        {tab === 'esi' && <Table specs={esiSpecs} rows={r.esi.employees} rowKey={(x, i) => `${x.employeeId}-${i}`} empty="No ESI contributions" />}
        {tab === 'pt' && <Table specs={ptSpecs} rows={r.pt.employees} rowKey={(x, i) => `${x.employeeId}-${i}`} empty="No professional tax deducted" />}
        {tab === 'lwf' && <Table specs={lwfSpecs} rows={r.lwf.employees} rowKey={(x, i) => `${x.employeeId}-${i}`} empty="No LWF this month" />}
        {tab === 'bonus' && <Table specs={bonusSpecs} rows={r.bonus.employees} rowKey={(x, i) => `${x.employeeId}-${i}`} empty="No statutory bonus paid this month" />}
      </div>
    </div>}</Async>
  </Section>;
}

// ---------------------------------------------------------------------------
// TDS
// ---------------------------------------------------------------------------

const tdsSpecs: Spec<TdsEmployee>[] = [
  ...identitySpecs<TdsEmployee>(),
  { label: 'PAN', value: r => r.pan }, { label: 'Department', value: r => r.department }, { label: 'Designation', value: r => r.designation },
  { label: 'Email', value: r => r.email }, { label: 'Regime', value: r => r.taxRegime },
  { label: 'Basic', value: r => r.basic, kind: 'money', total: true },
  { label: 'HRA', value: r => r.hra, kind: 'money', total: true },
  { label: 'Allowances', value: r => r.allowances, kind: 'money', total: true },
  { label: 'Perquisites', value: r => r.perquisites, kind: 'money', total: true },
  { label: 'Other income', value: r => r.otherIncome, kind: 'money', total: true },
  { label: 'Gross total income', value: r => r.grossTotalIncome, kind: 'money', total: true },
  { label: 'HRA exemption', value: r => r.hraExemption, kind: 'money', total: true },
  { label: 'Sec 10 exemptions', value: r => r.section10, kind: 'money', total: true },
  { label: 'Standard deduction', value: r => r.standardDeduction, kind: 'money', total: true },
  { label: 'Prof. tax', value: r => r.professionalTax, kind: 'money', total: true },
  { label: 'Sec 24', value: r => r.section24, kind: 'money', total: true },
  { label: '80C', value: r => r.section80C, kind: 'money', total: true },
  { label: '80CCD(1B)', value: r => r.section80CCD1B, kind: 'money', total: true },
  { label: '80CCD(2)', value: r => r.section80CCD2, kind: 'money', total: true },
  { label: '80D', value: r => r.section80D, kind: 'money', total: true },
  { label: 'Other Ch. VI-A', value: r => r.otherChapterVIA, kind: 'money', total: true },
  { label: 'Taxable income', value: r => r.taxableIncome, kind: 'money', total: true },
  { label: 'Income tax', value: r => r.incomeTax, kind: 'money', total: true },
  { label: 'Rebate 87A', value: r => r.rebate, kind: 'money', total: true },
  { label: 'Surcharge', value: r => r.surcharge, kind: 'money', total: true },
  { label: 'Cess', value: r => r.cess, kind: 'money', total: true },
  { label: 'Total tax', value: r => r.totalTax, kind: 'money', total: true },
  { label: 'Monthly TDS', value: r => r.monthlyTDS, kind: 'money', total: true },
  ...FY_MONTHS.map((m): Spec<TdsEmployee> => ({ label: `TDS ${m}`, value: r => r.months?.[m] ?? 0, kind: 'money', total: true })),
  { label: 'TDS deducted', value: r => r.totalDeducted, kind: 'money', total: true },
  { label: 'Balance', value: r => r.balance, kind: 'money', total: true },
];

function TdsReport({ notify }: { notify: Notify }) {
  const [fy, setFy] = useState(currentFinancialYear());
  const state = useLoad(() => pe.get<TdsData>('reports/tds', { financialYear: fy }), [fy]);
  const ex = useExport(notify);
  const r = state.data?.report;
  const exportIt = () => ex.run(`TDS_Report_FY_${state.data?.financialYear ?? fy}`, () => [
    sheet('TDS', tdsSpecs, r?.employees ?? [], [['TDS report', `FY ${state.data?.financialYear ?? fy}`], ['Total annual income', r?.totalAnnualIncome ?? 0], ['Total tax deducted', r?.totalTaxDeducted ?? 0]]),
  ]);
  return <Section title="TDS report" subtitle="Projected income, exemptions, Chapter VI-A deductions, tax computation and month-wise TDS"
    right={<><FinancialYearPicker value={fy} onChange={setFy} /><ExportBtn busy={ex.busy} disabled={!r?.employees.length} onClick={exportIt} /></>}>
    <Async state={state}>{() => !r?.employees.length ? <Empty title={`No TDS computations for FY ${fy}`} text="Run TDS calculation for employees from the TDS / Income Tax module." /> : <div className="p-4 space-y-4">
      <KpiGrid>
        <Kpi label="Employees" value={r.totalEmployees} />
        <Kpi label="Total annual income" value={money(r.totalAnnualIncome)} />
        <Kpi label="Total tax liability" value={money(r.employees.reduce((a, e) => a + (Number(e.totalTax) || 0), 0))} />
        <Kpi label="TDS deducted" value={money(r.totalTaxDeducted)} tone="text-green-700" sub={`Balance ${money(r.employees.reduce((a, e) => a + (Number(e.balance) || 0), 0))}`} />
      </KpiGrid>
      <div className="rounded-xl border border-gray-200 overflow-hidden"><Table specs={tdsSpecs} rows={r.employees} rowKey={(x, i) => `${x.employeeId}-${i}`} empty="No employees" /></div>
    </div>}</Async>
  </Section>;
}

// ---------------------------------------------------------------------------
// CTC
// ---------------------------------------------------------------------------

function CtcReport({ notify }: { notify: Notify }) {
  const state = useLoad(() => pe.get<CtcData>('reports/ctc'), []);
  const ex = useExport(notify);
  const d = state.data;
  const { specs, deptSpecs, depts } = useMemo(() => {
    const emps = d?.employees ?? [];
    const comps = componentNames(emps, e => e.components);
    const category = (n: string) => emps.flatMap(e => e.components ?? []).find(c => c.name === n)?.category;
    const specs: Spec<CtcEmployee>[] = [
      ...identitySpecs<CtcEmployee>(),
      { label: 'Email', value: r => r.email }, { label: 'Department', value: r => r.department }, { label: 'Designation', value: r => r.designation },
      { label: 'Annual CTC', value: r => r.ctc, kind: 'money', total: true },
      { label: 'Monthly CTC', value: r => r.monthlyCTC, kind: 'money', total: true },
      { label: 'Monthly gross', value: r => r.grossSalary, kind: 'money', total: true },
      { label: 'Annual gross', value: r => r.annualGross, kind: 'money', total: true },
      { label: 'Monthly basic', value: r => r.basicSalary, kind: 'money', total: true },
      { label: 'Annual basic', value: r => r.annualBasic, kind: 'money', total: true },
      ...comps.map((n): Spec<CtcEmployee> => { const c = category(n); return { label: `${n}${c ? ` (${c})` : ''} / month`, value: r => componentAmount(r.components, n), kind: 'money', total: true }; }),
      { label: 'Variable pay', value: r => r.variablePay, kind: 'money', total: true },
      { label: 'Incentives', value: r => r.incentives, kind: 'money', total: true },
    ];
    const depts = Object.entries(d?.departmentWise ?? {}).map(([name, v]) => ({ name, ...v }));
    const deptSpecs: Spec<(typeof depts)[number]>[] = [
      { label: 'Department', value: r => r.name },
      { label: 'Employees', value: r => r.count, kind: 'num', total: true },
      { label: 'Total annual CTC', value: r => r.totalCTC, kind: 'money', total: true },
    ];
    return { specs, deptSpecs, depts };
  }, [d]);
  const exportIt = () => ex.run('CTC_Report', () => [
    sheet('Employees', specs, d?.employees ?? [], [['Cost to company report'], ['Active employees', d?.totalEmployees ?? 0], ['Total CTC', d?.totalCTC ?? 0], ['Total monthly gross', d?.totalGross ?? 0]]),
    sheet('Departments', deptSpecs, depts),
  ]);
  return <Section title="Cost to company" subtitle="Current salary structure of all active employees"
    right={<><Btn variant="secondary" onClick={state.reload} busy={state.loading}>Refresh</Btn><ExportBtn busy={ex.busy} disabled={!d?.employees.length} onClick={exportIt} /></>}>
    <Async state={state}>{() => !d?.employees.length ? <Empty title="No active employees" text="Sync employees and set their salary in Employees & Salary." /> : <div className="p-4 space-y-4">
      <KpiGrid>
        <Kpi label="Active employees" value={d.totalEmployees} />
        <Kpi label="Total annual CTC" value={money(d.totalCTC)} />
        <Kpi label="Total monthly gross" value={money(d.totalGross)} />
        <Kpi label="Average CTC" value={money(d.totalEmployees ? d.totalCTC / d.totalEmployees : 0)} />
      </KpiGrid>
      <div className="rounded-xl border border-gray-200 overflow-hidden"><p className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 border-b">Department-wise</p>
        <Table specs={deptSpecs} rows={depts} rowKey={r => r.name} empty="No departments" /></div>
      <div className="rounded-xl border border-gray-200 overflow-hidden"><p className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 border-b">Employees</p>
        <Table specs={specs} rows={d.employees} rowKey={(x, i) => `${x.employeeId}-${i}`} empty="No employees" /></div>
    </div>}</Async>
  </Section>;
}

// ---------------------------------------------------------------------------
// Variance
// ---------------------------------------------------------------------------

function VarianceCell({ value, pct }: { value: number; pct: string | number }) {
  const tone = value > 0 ? 'text-green-700' : value < 0 ? 'text-red-700' : 'text-gray-500';
  return <span className={`tabular-nums ${tone}`}>{value > 0 ? '+' : ''}{money(value)} <span className="text-[10px]">({value > 0 ? '+' : ''}{pct}%)</span></span>;
}

function VarianceReport({ notify }: { notify: Notify }) {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [p1, setP1] = useState({ month: MONTHS[prev.getMonth()] as string, year: prev.getFullYear() });
  const [p2, setP2] = useState({ month: MONTHS[now.getMonth()] as string, year: now.getFullYear() });
  const state = useLoad(() => pe.get<VarianceData>('reports/variance', { month1: p1.month, year1: p1.year, month2: p2.month, year2: p2.year }), [p1.month, p1.year, p2.month, p2.year]);
  const ex = useExport(notify);
  const rows = state.data?.variances ?? [];
  const l1 = `${p1.month} ${p1.year}`, l2 = `${p2.month} ${p2.year}`;
  const specs: Spec<VarianceRow>[] = [
    ...identitySpecs<VarianceRow>(),
    { label: 'Department', value: r => r.department }, { label: 'Designation', value: r => r.designation },
    { label: `Gross ${l1}`, value: r => r.period1.gross, kind: 'money', total: true },
    { label: `Gross ${l2}`, value: r => r.period2.gross, kind: 'money', total: true },
    { label: 'Gross variance', value: r => r.variance.gross, kind: 'money', total: true, render: r => <VarianceCell value={r.variance.gross} pct={r.variance.grossPercentage} /> },
    { label: 'Gross %', value: r => Number(r.variance.grossPercentage), kind: 'pct' },
    { label: `Deductions ${l1}`, value: r => r.period1.deductions, kind: 'money', total: true },
    { label: `Deductions ${l2}`, value: r => r.period2.deductions, kind: 'money', total: true },
    { label: 'Deduction variance', value: r => r.variance.deductions, kind: 'money', total: true, render: r => <VarianceCell value={r.variance.deductions} pct={r.variance.deductionPercentage} /> },
    { label: 'Deduction %', value: r => Number(r.variance.deductionPercentage), kind: 'pct' },
    { label: `Net ${l1}`, value: r => r.period1.net, kind: 'money', total: true },
    { label: `Net ${l2}`, value: r => r.period2.net, kind: 'money', total: true },
    { label: 'Net variance', value: r => r.variance.net, kind: 'money', total: true, render: r => <VarianceCell value={r.variance.net} pct={r.variance.netPercentage} /> },
    { label: 'Net %', value: r => Number(r.variance.netPercentage), kind: 'pct' },
  ];
  const sum = (f: (r: VarianceRow) => number) => rows.reduce((a, r) => a + (Number(f(r)) || 0), 0);
  const exportIt = () => ex.run(`Payroll_Variance_${p1.month}${p1.year}_vs_${p2.month}${p2.year}`, () => [sheet('Variance', specs, rows, [['Variance report', `${l1} vs ${l2}`]])]);
  return <Section title="Variance report" subtitle="Employees paid in both periods, compared side by side"
    right={<ExportBtn busy={ex.busy} disabled={!rows.length} onClick={exportIt} />}>
    <div className="px-4 pt-4 flex flex-wrap items-end gap-4">
      <Field label="Base period"><PeriodPicker month={p1.month} year={p1.year} onChange={(month, year) => setP1({ month, year })} /></Field>
      <Field label="Compare with"><PeriodPicker month={p2.month} year={p2.year} onChange={(month, year) => setP2({ month, year })} /></Field>
    </div>
    <Async state={state}>{() => !rows.length ? <Empty title="No common employees in both periods" text="Variance compares employees whose payroll exists in both months." /> : <div className="p-4 space-y-4">
      <KpiGrid>
        <Kpi label="Employees compared" value={rows.length} />
        <Kpi label="Gross change" value={money(sum(r => r.variance.gross))} sub={`${money(sum(r => r.period1.gross))} → ${money(sum(r => r.period2.gross))}`} />
        <Kpi label="Deductions change" value={money(sum(r => r.variance.deductions))} sub={`${money(sum(r => r.period1.deductions))} → ${money(sum(r => r.period2.deductions))}`} />
        <Kpi label="Net pay change" value={money(sum(r => r.variance.net))} sub={`${money(sum(r => r.period1.net))} → ${money(sum(r => r.period2.net))}`} />
      </KpiGrid>
      <div className="rounded-xl border border-gray-200 overflow-hidden"><Table specs={specs} rows={rows} rowKey={(x, i) => `${x.employeeId}-${i}`} empty="No rows" /></div>
    </div>}</Async>
  </Section>;
}

// ---------------------------------------------------------------------------

export default function Reports({ notify, params }: ModuleProps) {
  const [period] = useState(() => initialPeriod(params));
  const [tab, setTab] = useState(params.report && REPORTS.some(r => r.key === params.report) ? params.report : params.employeeId ? 'ytd' : 'summary');
  return <div className="space-y-4">
    <div className="bg-white border border-gray-200 rounded-2xl px-3 pt-2">
      <Tabs tabs={REPORTS} active={tab} onChange={setTab} />
    </div>
    {tab === 'summary' && <SummaryReport notify={notify} initial={period} />}
    {tab === 'ytd' && <YtdReport notify={notify} initialEmployee={params.employeeId ?? ''} />}
    {tab === 'statutory' && <StatutoryReport notify={notify} initial={period} />}
    {tab === 'tds' && <TdsReport notify={notify} />}
    {tab === 'ctc' && <CtcReport notify={notify} />}
    {tab === 'variance' && <VarianceReport notify={notify} />}
  </div>;
}
