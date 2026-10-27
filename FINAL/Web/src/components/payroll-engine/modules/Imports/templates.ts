/**
 * Client-side Excel templates for the payroll imports. Column headers are exactly
 * the keys the legacy parser recognises (utils/payroll/parsePayrollImportFile.js:
 * mapImportRow / mapSalaryRevisionRow). Reference sheets are ignored by the
 * parser (it only reads the first sheet).
 */

import type { PayrollEmployee } from '@/lib/payroll-engine/types';

export type OrgComponent = { name?: string; code?: string; status?: string; calculationType?: string; [key: string]: unknown };
export type ComponentCatalog = { earnings?: OrgComponent[]; deductions?: OrgComponent[]; benefits?: OrgComponent[]; reimbursements?: OrgComponent[] };

export const ONE_TIME_COLUMNS = ['employee_code', 'category', 'component_code', 'component_name', 'amount', 'remarks'] as const;

export const REVISION_COLUMNS = [
  'employee_code', 'revision_type', 'effective_from', 'gross_salary', 'basic_salary', 'ctc', 'state', 'tax_regime',
  'payment_frequency', 'arrears_applicable', 'arrears_from', 'auto_approve', 'auto_implement',
  'epf', 'pf_on_actuals', 'esi', 'lwf', 'professional_tax', 'remarks',
] as const;

export const REVISION_TYPES = ['increment', 'promotion', 'adjustment', 'new_joiner', 'annual_hike'] as const;

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const BALANCING = new Set(['special', 'specialallowance', 'other', 'otherallowance', 'otherextra', 'otherextraallowance']);
const RESERVED = new Set(REVISION_COLUMNS.map(c => norm(c)).concat(['basic', 'base', 'basesalary', 'basicsalary', 'basicpay', 'newbasic', 'gross', 'annualctc', 'pf', 'esic']));

const empCode = (e: PayrollEmployee) => e.customId || e.uniqueId;
const empName = (e: PayrollEmployee) => [e.firstName, e.lastName].filter(Boolean).join(' ') || e.displayName || '';

/** Active, non-balancing, non-Basic earnings components — usable as dynamic amount columns in the revision sheet. */
export function revisionComponentColumns(catalog: ComponentCatalog | null): string[] {
  const out: string[] = [];
  for (const comp of catalog?.earnings ?? []) {
    if (comp.status && comp.status !== 'active') continue;
    const name = String(comp.name ?? '').trim();
    const key = norm(name) || norm(comp.code);
    if (!key || BALANCING.has(key) || BALANCING.has(norm(comp.code)) || key.includes('basic') || RESERVED.has(key)) continue;
    if (!out.includes(name || String(comp.code))) out.push(name || String(comp.code));
  }
  return out;
}

function componentSheetRows(catalog: ComponentCatalog | null, categories: Array<keyof ComponentCatalog>) {
  const rows: Array<Record<string, string>> = [];
  for (const cat of categories) {
    for (const c of catalog?.[cat] ?? []) {
      if (c.status && c.status !== 'active') continue;
      rows.push({ category: cat, component_code: String(c.code ?? ''), component_name: String(c.name ?? ''), calculation_type: String(c.calculationType ?? '') });
    }
  }
  return rows;
}

function employeeSheetRows(employees: PayrollEmployee[]) {
  return employees.filter(e => e.status === 'Active').map(e => ({
    employee_code: empCode(e), unique_id: e.uniqueId, name: empName(e), department: e.department ?? '',
    current_gross_salary: e.payrollInfo?.grossSalary ?? '', current_basic_salary: e.payrollInfo?.baseSalary ?? '', current_ctc: e.payrollInfo?.ctc ?? '',
  }));
}

export async function downloadOneTimeTemplate(catalog: ComponentCatalog | null, employees: PayrollEmployee[]): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const main = XLSX.utils.aoa_to_sheet([[...ONE_TIME_COLUMNS]]);
  main['!cols'] = ONE_TIME_COLUMNS.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, main, 'Import');
  const instructions = [
    ['Column', 'Required', 'Notes'],
    ['employee_code', 'Yes', 'Employee custom ID (e.g. NSS02) or unique ID (e.g. NAG00003). Only Active employees are accepted.'],
    ['category', 'Yes', 'earnings, deductions or benefits'],
    ['component_code', 'One of code/name', 'Org component code — see the "Components" sheet. Unknown codes are added as ad-hoc one-time lines.'],
    ['component_name', 'One of code/name', 'Org component name, or the label for an ad-hoc line.'],
    ['amount', 'Yes', 'Number >= 0 for this pay period only.'],
    ['remarks', 'No', 'Free text.'],
    [],
    ['Only the first sheet is read. One row per employee per component. Confirming a new import for a period replaces the previous confirmed import for that period.'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructions), 'Instructions');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(componentSheetRows(catalog, ['earnings', 'deductions', 'benefits'])), 'Components');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(employeeSheetRows(employees)), 'Employees');
  XLSX.writeFile(wb, 'one_time_earnings_deductions_template.xlsx');
}

export async function downloadRevisionTemplate(catalog: ComponentCatalog | null, employees: PayrollEmployee[], prefill: boolean): Promise<void> {
  const XLSX = await import('xlsx');
  const componentCols = revisionComponentColumns(catalog);
  const header = [...REVISION_COLUMNS, ...componentCols];
  const rows: Array<Array<string | number>> = [header];
  if (prefill) {
    for (const e of employees.filter(x => x.status === 'Active')) {
      const row: Array<string | number> = header.map(() => '');
      const set = (col: string, v: string | number | undefined | null) => { const i = header.indexOf(col); if (i >= 0 && v !== undefined && v !== null) row[i] = v; };
      set('employee_code', empCode(e));
      set('gross_salary', e.payrollInfo?.grossSalary || '');
      set('state', e.statutoryInfo?.ptState || e.workState || '');
      set('tax_regime', e.payrollInfo?.taxRegime || '');
      set('payment_frequency', e.payrollInfo?.paymentFrequency || '');
      set('auto_approve', 'false');
      set('auto_implement', 'false');
      set('arrears_applicable', 'false');
      rows.push(row);
    }
  }
  const wb = XLSX.utils.book_new();
  const main = XLSX.utils.aoa_to_sheet(rows);
  main['!cols'] = header.map(h => ({ wch: Math.max(14, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, main, 'Import');
  const instructions = [
    ['Column', 'Required', 'Notes'],
    ['employee_code', 'Yes', 'Employee custom ID or unique ID. Only Active employees are accepted.'],
    ['revision_type', 'Yes', `One of: ${REVISION_TYPES.join(', ')} (aliases: hike, annual, adjust, joiner, new)`],
    ['effective_from', 'Yes', 'Date, e.g. 2026-04-01'],
    ['gross_salary', 'Yes', 'New gross salary (> 0). The structure is recomputed from it.'],
    ['basic_salary', 'No', 'Explicit new Basic; blank = derived from org components.'],
    ['ctc', 'No', 'New CTC (>= 0); blank = computed.'],
    ['state', 'No', 'PT / LWF state; blank = employee\'s current PT/LWF state.'],
    ['tax_regime', 'No', 'Old or New'],
    ['payment_frequency', 'No', 'Monthly, Bi-Weekly or Weekly'],
    ['arrears_applicable', 'No', 'true/false. When true, arrears_from is required and must be on/before effective_from.'],
    ['arrears_from', 'If arrears', 'Date arrears start from.'],
    ['auto_approve', 'No', 'true = revision is approved on confirm.'],
    ['auto_implement', 'No', 'true = revision is applied to the employee on confirm (requires auto_approve = true).'],
    ['epf / pf_on_actuals / esi / lwf / professional_tax', 'No', 'true/false statutory switches; blank = keep current.'],
    ['remarks', 'No', 'Free text.'],
    ['<component columns>', 'No', 'One column per org earnings component (by name or code). Number = fixed amount; blank = org default. Unknown columns are ignored with a warning.'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructions), 'Instructions');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(componentSheetRows(catalog, ['earnings', 'deductions', 'benefits'])), 'Components');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(employeeSheetRows(employees)), 'Employees');
  XLSX.writeFile(wb, 'salary_revision_import_template.xlsx');
}
