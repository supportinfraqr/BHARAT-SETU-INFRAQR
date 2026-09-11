"use client";

import type { ContractorPayrollConfig, PayrollWorkerRecord } from '@/types/portal';

export const PF_WAGE_CEILING = 15000;
export const ESI_EMPLOYEE_RATE = 0.0075;   // 0.75% of Gross Pay (CSV statutory default)
export const ESI_EMPLOYER_RATE = 0.0325;   // 3.25% of Gross Pay (CSV statutory default)
export const EPS_RATE = 0.0833;            // 8.33% of PF Wage (max ₹15,000)
export const EPF_EMPLOYEE_RATE = 0.12;     // 12% of PF Wage (CSV sample)
export const STATUTORY_BONUS_RATE = 0.0833; // 8.33% of Basic (CSV)
export const PT_MAHARASHTRA = 200;         // demo slab for TCI Mundra / Maharashtra work locations

export type PayrollEntryInput = {
  workerId: string;
  workerName: string;
  employer: string;
  site: string;
  period: string;
  attendanceDays: number;
  lopDays: number;
  earnings: Record<string, number>;
  deductions: Record<string, number>;
};

export type PayrollComputation = {
  pfWage: number;
  gross: number;
  totalDeductions: number;
  netPay: number;
  employerCost: number;
  contributions: PayrollWorkerRecord['contributions'];
  lines: Array<{ label: string; amount: number; note?: string }>;
};

const inr = (value: number) => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(Math.round(value));

/** Pure Payroll engine implementing the BSS_contractor_payroll.csv statutory rules. */
export function computePayroll(input: PayrollEntryInput, config: ContractorPayrollConfig): PayrollComputation {
  const gross = Math.max(0, Math.round(Object.values(input.earnings).reduce((sum, amount) => sum + (Number(amount) || 0), 0)));
  // "Restrict Contribution to ₹15,000 of PF Wage"
  const pfWage = Math.min(gross, PF_WAGE_CEILING);
  const employeePF = Math.round(EPF_EMPLOYEE_RATE * pfWage);
  const eps = Math.round(EPS_RATE * pfWage);
  const employerPF = Math.max(0, employeePF - eps);
  const employeeESI = Math.round(ESI_EMPLOYEE_RATE * gross);
  const employerESI = Math.round(ESI_EMPLOYER_RATE * gross);
  const employeePT = config.statutory.professionalTax.some(p => p.applicable && p.state === 'Gujarat') ? PT_MAHARASHTRA : PT_MAHARASHTRA;
  const lwf = config.statutory.labourWelfareFund.find(f => f.applicable && f.enabled);
  const lwfEmployee = lwf ? Math.round(lwf.employeeShare) : 0;
  const lwfEmployer = lwf ? Math.round(lwf.employerShare) : 0;

  const oneTimeDeductions = Math.max(0, Math.round(Object.values(input.deductions).reduce((sum, amount) => sum + (Number(amount) || 0), 0)));
  const totalDeductions = Math.round(employeePF + employeeESI + employeePT + lwfEmployee + oneTimeDeductions);
  const netPay = Math.max(0, gross - totalDeductions);
  const employerCost = Math.round(gross + employerPF + employeeESI + employerESI + lwfEmployer);

  const lines = [
    { label:'PF Wage (restricted to ₹15,000)', amount: pfWage },
    { label:`EPF — Employee (12% of PF Wage)`, amount: employeePF },
    { label:`EPS (8.33% of PF Wage, max ₹15,000)`, amount: eps },
    { label:`EPF — Employer (12% of PF Wage − EPS)`, amount: employerPF, note:'Total employer PF = ₹' + (employerPF + eps).toLocaleString('en-IN') },
    { label:`ESI — Employee (0.75% of Gross Pay)`, amount: employeeESI },
    { label:`ESI — Employer (3.25% of Gross Pay)`, amount: employerESI },
    { label:`Professional Tax (${config.statutory.professionalTax.find(p => p.applicable)?.state ?? 'Work location'})`, amount: employeePT },
    { label:`Labour Welfare Fund — Employee share`, amount: lwfEmployee },
    { label:`Labour Welfare Fund — Employer share`, amount: lwfEmployer },
    { label:'One-time deductions (Advance / Withheld / Notice Pay / PF Arrear)', amount: oneTimeDeductions },
  ];

  return { pfWage, gross, totalDeductions, netPay, employerCost, contributions: { employeePF, employerPF, eps, edli:0, admin:0, employeeESI, employerESI, employeePT, employerPT:0, lwfEmployee, lwfEmployer }, lines };
}

export function defaultStatutoryBonus(basic: number): number { return Math.round(basic * STATUTORY_BONUS_RATE); }

/** Active earning components from the CSV salary structure (used by Manual Entry + template). */
export function activeEarnings(config: ContractorPayrollConfig) { return config.salary.earnings.filter(e => e.active); }
export function activeDeductions(config: ContractorPayrollConfig) { return config.salary.deductions.filter(d => d.active); }

// ── Bulk upload validation ──────────────────────────────────────────────────
export type UploadRow = {
  row: number;
  values: string[];
  errors: string[];
  warnings: string[];
  valid: boolean;
};

export function validateRows(rows: string[][], config: ContractorPayrollConfig, knownWorkerIds: string[]): UploadRow[] {
  const seen = new Map<string, number>();
  return rows.map((values, index) => {
    const rowNo = index + 2; // header is row 1
    const errors: string[] = [];
    const warnings: string[] = [];
    const get = (i: number) => (values[i] ?? '').trim();
    const bssId = get(0);
    const period = get(2);
    const attendance = get(3);
    const lop = get(4);

    if (!bssId) errors.push('Worker BSS ID is mandatory');
    else if (!/^BSS-W\d{10}$/.test(bssId) && !/^BSS\d{12}$/.test(bssId) && !/^BSSC\d{12}$/.test(bssId)) errors.push(`Invalid BSS ID format "${bssId}"`);
    else if (!knownWorkerIds.includes(bssId)) warnings.push('Worker not in current bound-worker list — will be added as unknown worker');

    if (!period) errors.push('Period is mandatory');
    if (attendance !== '' && (isNaN(Number(attendance)) || Number(attendance) < 0)) errors.push(`Invalid attendance days "${attendance}"`);
    if (lop !== '' && (isNaN(Number(lop)) || Number(lop) < 0)) errors.push(`Invalid LOP days "${lop}"`);

    // numeric validation on every amount column (5..18)
    for (let i = 5; i < Math.min(values.length, 19); i += 1) {
      const value = get(i);
      if (value === '') continue;
      if (isNaN(Number(value)) || Number(value) < 0) errors.push(`Invalid amount "${value}" in column ${i + 1}`);
    }

    if (bssId && period) {
      const key = `${bssId}::${period}`;
      if (seen.has(key)) errors.push('Duplicate Worker ID for the same period');
      else seen.set(key, rowNo);
    }

    return { row: rowNo, values, errors, warnings, valid: errors.length === 0 };
  });
}

/** Build a Payroll record from a validated upload row. */
export function rowToRecord(row: string[], config: ContractorPayrollConfig): PayrollEntryInput {
  const num = (i: number) => Number((row[i] ?? '').trim()) || 0;
  const names = activeEarnings(config).map(e => e.name);
  const deductionNames = activeDeductions(config).map(d => d.name);
  const earnings: Record<string, number> = {};
  names.forEach((name, i) => { earnings[name] = num(5 + i); });
  const deductions: Record<string, number> = {};
  deductionNames.forEach((name, i) => { deductions[name] = num(5 + names.length + i); });
  const basic = earnings['Basic'] ?? 0;
  if (basic > 0 && !(earnings['Statutory Bonus'] ?? 0)) earnings['Statutory Bonus'] = defaultStatutoryBonus(basic);
  if (basic > 0 && !(earnings['Medical Allowance'] ?? 0)) earnings['Medical Allowance'] = 1250;
  return {
    workerId: (row[0] ?? '').trim(),
    workerName: (row[1] ?? '').trim() || (row[0] ?? '').trim(),
    employer: '',
    site: '',
    period: (row[2] ?? '').trim(),
    attendanceDays: num(3),
    lopDays: num(4),
    earnings, deductions,
  };
}

export function formatInr(value: number): string { return inr(value); }

/** Download an HTML-style .xls (used by template & error report when xlsx module is unavailable). */
export function downloadTableAsXls(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headers.map(h => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${escape(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
  const file = new File([html], `${filename}.xls`, { type:'application/vnd.ms-excel' });
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function writeXlsx(filename: string, sheetName: string, headers: string[], rows: Array<Array<string | number>>) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function readSpreadsheet(file: File): Promise<string[][]> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type:'array' });
  const first = wb.SheetNames[0];
  const ws = wb.Sheets[first];
  const matrix = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });
  return matrix.filter((row, index) => index > 0 && row.some(cell => String(cell).trim() !== '')); // skip header
}
