/**
 * Shared Payroll service — pure helpers used by Contractor, Employer and Admin
 * payroll surfaces. No mock values are scattered in components; demo data is
 * provided by the existing portal/demo-data layer and this service operates on
 * the single Worker-level PayrollWorkerRecord model.
 */

import type { ContractorPayrollConfig, PayrollWorkerRecord } from '@/types/portal';
import type { AuditEvent, PayRun, PayRunType, PayrollLoan, PayrollRole, SalaryStructure } from './types';

export function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(value || 0));
}
export function today(): string { return new Date().toISOString().slice(0, 10); }
export function nowIso(): string { return new Date().toISOString(); }
export function shortDate(value: string): string { return value ? value.slice(0, 10) : '—'; }

export const PERIODS = ['September 2026', 'August 2026', 'July 2026', 'June 2026', 'May 2026'];

export type PayrollTotals = {
  gross: number;
  net: number;
  employeeDeductions: number;
  employerContributions: number;
  employerCost: number;
  workers: number;
  statutory: { epfEmployee: number; epfEmployer: number; eps: number; esiEmployee: number; esiEmployer: number; pt: number; lwfEmployee: number; lwfEmployer: number; edli: number; admin: number; tds: number; bonus: number };
};

export function totalsOf(records: PayrollWorkerRecord[]): PayrollTotals {
  const out: PayrollTotals = { gross: 0, net: 0, employeeDeductions: 0, employerContributions: 0, employerCost: 0, workers: records.length, statutory: { epfEmployee: 0, epfEmployer: 0, eps: 0, esiEmployee: 0, esiEmployer: 0, pt: 0, lwfEmployee: 0, lwfEmployer: 0, edli: 0, admin: 0, tds: 0, bonus: 0 } };
  for (const r of records) {
    out.gross += r.gross;
    out.net += r.netPay;
    out.employeeDeductions += r.totalDeductions;
    out.employerCost += r.employerCost;
    out.statutory.epfEmployee += r.contributions.employeePF;
    out.statutory.epfEmployer += r.contributions.employerPF;
    out.statutory.eps += r.contributions.eps;
    out.statutory.esiEmployee += r.contributions.employeeESI;
    out.statutory.esiEmployer += r.contributions.employerESI;
    out.statutory.pt += r.contributions.employeePT;
    out.statutory.lwfEmployee += r.contributions.lwfEmployee;
    out.statutory.lwfEmployer += r.contributions.lwfEmployer;
    out.statutory.edli += r.contributions.edli;
    out.statutory.admin += r.contributions.admin;
    const bonus = r.earnings.find(e => /bonus/i.test(e.component))?.amount ?? 0;
    out.statutory.bonus += bonus;
    const tds = r.deductions.find(d => /tds|tax/i.test(d.component))?.amount ?? 0;
    out.statutory.tds += tds;
  }
  out.employerContributions = out.statutory.epfEmployer + out.statutory.eps + out.statutory.esiEmployer + out.statutory.lwfEmployer + out.statutory.edli + out.statutory.admin;
  return out;
}

/** Contribution split — worker vs employer is NEVER merged (spec § Pay Run Taxes & Deductions). */
export function workerVsEmployer(records: PayrollWorkerRecord[]) {
  const t = totalsOf(records);
  return {
    worker: { epf: t.statutory.epfEmployee, esi: t.statutory.esiEmployee, pt: t.statutory.pt, lwf: t.statutory.lwfEmployee, tds: t.statutory.tds, other: Math.max(0, t.employeeDeductions - t.statutory.epfEmployee - t.statutory.esiEmployee - t.statutory.pt - t.statutory.lwfEmployee - t.statutory.tds) },
    employer: { epf: t.statutory.epfEmployer, eps: t.statutory.eps, esi: t.statutory.esiEmployer, lwf: t.statutory.lwfEmployer, edli: t.statutory.edli, admin: t.statutory.admin },
  };
}

export type RunSpec = { type: PayRunType; period: string; employer: string; contractor: string | null; site: string | null; paymentDate: string; schedule: string; createdBy: string };

/** Builds a PayRun from existing Worker payroll records — never a new record source. */
export function buildPayRun(records: PayrollWorkerRecord[], spec: RunSpec): PayRun {
  const included = records.filter(r => r.status === 'Verified' || r.status === 'Submitted');
  const skipped = records.filter(r => !included.some(i => i.id === r.id));
  const t = totalsOf(included);
  const id = `RUN-${Date.now().toString().slice(-6)}`;
  return {
    id,
    period: spec.period,
    type: spec.type,
    employer: spec.employer,
    contractor: spec.contractor,
    site: spec.site,
    schedule: spec.schedule,
    workersIncluded: included.length,
    workersSkipped: skipped.length,
    gross: t.gross,
    net: t.net,
    employeeDeductions: t.employeeDeductions,
    employerContributions: t.employerContributions,
    paymentDate: spec.paymentDate,
    status: 'Awaiting Approval',
    createdBy: spec.createdBy,
    createdAt: nowIso(),
    errors: skipped.map(r => `${r.workerName} skipped — record status ${r.status}`),
  };
}

/** Employer distribution preview from Worker→Site→Contractor mapping. */
export function distributionPreview(records: PayrollWorkerRecord[]) {
  const byContractor = new Map<string, PayrollWorkerRecord[]>();
  let unmapped = 0;
  for (const r of records) {
    if (!r.contractor) { unmapped += 1; continue; }
    const list = byContractor.get(r.contractor) ?? [];
    list.push(r);
    byContractor.set(r.contractor, list);
  }
  return { contractors: [...byContractor.entries()].map(([name, list]) => ({ name, workers: list.length, net: list.reduce((s, r) => s + r.netPay, 0) })), unmapped };
}

export function loanRemaining(loan: PayrollLoan): number { return Math.max(0, loan.amount - loan.repaid); }

/** F&F summary (§ 19) — numbers derive from existing salary/leave/gratuity records. */
export function fnfSummary(record: PayrollWorkerRecord, config: ContractorPayrollConfig, _lastWorkingDate: string, leaveBalanceDays: number, yearsOfService: number, penaltyHeads: Array<{ label: string; amount: number }>) {
  const lastMonthSalary = record.gross;
  const leaveConfig = config.salary.fullFinal.leaveEncashment;
  const dailyWage = record.gross / Math.max(1, record.attendanceDays || 26);
  const leaveEncashment = leaveConfig.enabled && leaveBalanceDays > 0 ? Math.round(dailyWage * leaveBalanceDays) : 0;
  const gratuityEnabled = config.salary.fullFinal.gratuityEncashment.enabled;
  const gratuity = gratuityEnabled && yearsOfService >= 5 ? Math.round((15 / 26) * record.gross * Math.min(yearsOfService, 20)) : 0;
  const penalties = penaltyHeads.reduce((s, h) => s + h.amount, 0);
  const tds = Math.round(record.gross * 0.03);
  const adjustments = leaveEncashment + gratuity;
  const totalNetPayable = Math.max(0, lastMonthSalary + adjustments - tds - penalties);
  const summary = { salaryHoldMonths: 0, lastMonthSalary, gross: lastMonthSalary, net: totalNetPayable, tds, adjustments, penalties, totalNetPayable };
  return { leaveEncashment, gratuity, tds, net: totalNetPayable, heads: [...penaltyHeads.map(h => ({ label: h.label, amount: -h.amount })), { label: 'Leave Encashment', amount: leaveEncashment }, { label: 'Gratuity (computed)', amount: gratuity }, { label: 'TDS', amount: -tds }], summary };
}

/** Build the standard salary structure view from the configured compensation. */
export function standardStructure(config: ContractorPayrollConfig): SalaryStructure {
  const heads: SalaryStructure['heads'] = [
    ...config.salary.earnings.map(e => ({ type: 'Earning' as const, name: e.name, calculationType: e.calculation, formulaAmount: e.flatAmount ? String(e.flatAmount) : e.calculation, attendanceBased: /attendance/i.test(e.calculation) || e.type === 'Overtime Allowance', presentDayBased: /present|day/i.test(e.calculation), showOnPayslip: true, active: e.active })),
    ...config.salary.deductions.map(d => ({ type: 'Deduction' as const, name: d.name, calculationType: d.frequency, formulaAmount: d.frequency, attendanceBased: false, presentDayBased: false, showOnPayslip: true, active: d.active })),
    ...config.salary.benefits.map(b => ({ type: 'Employer Contribution' as const, name: b.name, calculationType: b.frequency, formulaAmount: b.frequency, attendanceBased: false, presentDayBased: false, showOnPayslip: true, active: b.active })),
    ...config.salary.reimbursements.map(r => ({ type: 'Allowance' as const, name: r.name, calculationType: 'Reimbursement', formulaAmount: r.maxAmount ? String(r.maxAmount) : '—', attendanceBased: false, presentDayBased: false, showOnPayslip: true, active: r.active })),
    { type: 'Statutory', name: 'EPF — Employee', calculationType: '12% of PF Wage (₹15,000 cap)', formulaAmount: '₹1,800 max', attendanceBased: false, presentDayBased: false, showOnPayslip: true, active: true },
    { type: 'Statutory', name: 'EPS — Employer', calculationType: '8.33% of PF Wage', formulaAmount: '₹1,250 max', attendanceBased: false, presentDayBased: false, showOnPayslip: true, active: true },
    { type: 'Statutory', name: 'ESI — Employee / Employer', calculationType: '0.75% / 3.25% of gross', formulaAmount: 'configured', attendanceBased: false, presentDayBased: false, showOnPayslip: true, active: true },
  ];
  return { id: 'STRUCT-STD', name: 'Standard Construction Structure', applicability: 'Contractor org · all sites', pfRule: 'Restrict Contribution to ₹15,000 of PF Wage', createdBy: 'System (Payroll Setup)', createdAt: today(), status: 'Active', heads };
}

/** Audit events seed + factory. */
export function auditEvent(actor: string, actorRole: PayrollRole, action: string, entity: string, reference: string, over: { worker?: string; employer?: string; contractor?: string; period?: string; oldValue?: string | null; newValue?: string | null; reason?: string | null } = {}): AuditEvent {
  return { id: `AUD-${Date.now().toString().slice(-6)}`, timestamp: nowIso(), actor, actorRole, action, entity, reference, oldValue: over.oldValue ?? null, newValue: over.newValue ?? null, worker: over.worker ?? '—', employer: over.employer ?? '—', contractor: over.contractor ?? '—', period: over.period ?? '—', reason: over.reason ?? null };
}

export const SEED_AUDIT: AuditEvent[] = [
  auditEvent('Rajesh Kumar', 'Contractor', 'Created', 'Worker Payroll Record', 'PR-05', { worker: 'Imran Shaikh', employer: 'L&T Construction', contractor: 'RK Buildcon Pvt. Ltd.', period: 'August 2026', oldValue: null, newValue: '₹23,750 gross', reason: null }),
  auditEvent('Ananya Mehta', 'Employer', 'Created', 'Worker Payroll Record', 'PR-EM-03', { worker: 'Imran Shaikh', employer: 'L&T Construction', period: 'August 2026', oldValue: null, newValue: '₹23,282 gross', reason: 'Employer-entered payroll' }),
  auditEvent('Rajesh Kumar', 'Contractor', 'Verified', 'Worker Payroll Record', 'PR-01', { worker: 'Ravi Kumar', employer: 'L&T Construction', contractor: 'RK Buildcon Pvt. Ltd.', period: 'August 2026', oldValue: 'Submitted', newValue: 'Verified', reason: null }),
  auditEvent('System', 'Admin', 'Configured', 'EPF statutory settings', 'EPF', { oldValue: '—', newValue: 'Restrict Contribution to ₹15,000', reason: 'Payroll setup baseline' }),
];
