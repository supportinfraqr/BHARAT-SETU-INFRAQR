"use client";

/**
 * Shared types + helpers for the payroll Imports module.
 * Shapes mirror legacy controller/payroll/payrollImport.js and
 * utils/payroll/{oneTimeImportHelper,salaryRevisionImportHelper}.js.
 */

import { PayrollApiError, pe } from '@/lib/payroll-engine/api';
import { Kpi, KpiGrid } from '../../ui';

export type ImportSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  revisionsCreated?: number;
  approved?: number;
  implemented?: number;
  failed?: number;
};

// ---------- one-time earnings & deductions ----------

export type OneTimeRow = {
  rowNumber: number;
  employeeCode: string;
  employeeName: string;
  category: string;
  componentCode: string;
  componentName: string;
  amount: number | null;
  remarks: string;
  valid: boolean;
  error: string;
  isAdHoc: boolean;
  matchedOrgComponent: boolean;
  employeeId: string | null;
};

export type OneTimePreview = {
  importBatchId?: string;
  month?: string;
  year?: number;
  fileName?: string;
  summary: ImportSummary;
  warning?: string | null;
  preview: OneTimeRow[];
};

export type OneTimeConfirmed = {
  importBatchId: string;
  month: string;
  year: number;
  summary: ImportSummary;
  rows: OneTimeRow[];
};

export type OneTimeList = {
  month: string;
  year: number;
  import: null | { importBatchId: string; fileName: string; confirmedAt: string; summary: ImportSummary; rows: OneTimeRow[] };
};

// ---------- salary revision ----------

export type SalaryPoint = { ctc: number; grossSalary: number; basicSalary: number; components?: Array<{ componentName?: string; name?: string; amount?: number }>; componentOverrides?: StoredOverride[]; defaultComponents?: DefaultComponent[] };
export type StoredOverride = { category: string; code: string; name: string; overrideAmount: number | null; disabled?: boolean };
export type DefaultComponent = { category: string; code: string; name: string; amount: number | null; componentName?: string };

export type RevisionRow = {
  rowNumber: number;
  employeeCode: string;
  employeeName: string;
  employeeId: string | null;
  revisionType: string;
  revisionTypeLabel?: string;
  effectiveFrom: string | null;
  baseSalary: number;
  excelBasicSalary: number | null;
  grossSalary: number | null;
  ctcInput: number | null;
  state: string;
  taxRegime: string;
  paymentFrequency: string;
  arrearsApplicable: boolean;
  arrearsFromDate: string | null;
  autoApprove: boolean;
  autoImplement: boolean;
  remarks: string;
  oldSalary: SalaryPoint;
  newSalary: SalaryPoint;
  incrementAmount: number;
  incrementPercentage: number;
  arrearsAmount: number;
  plannedStatus: string;
  warnings: string[];
  valid: boolean;
  error: string;
  statutoryFlags?: Record<string, boolean>;
  employeeComponentOverrides?: StoredOverride[];
  excelComponentOverrides?: StoredOverride[];
  defaultComponents?: DefaultComponent[];
  revisionId?: string;
  appliedStatus?: string;
};

export type RevisionPreview = {
  importBatchId?: string;
  fileName?: string;
  summary: ImportSummary;
  warning?: string | null;
  preview: RevisionRow[];
};

export type RevisionApplied = {
  rowNumber: number;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  revisionId: string;
  revisionType: string;
  revisionTypeLabel: string;
  status: string;
  oldSalary: SalaryPoint;
  newSalary: SalaryPoint;
  incrementAmount: number;
  incrementPercentage: number;
};

export type RevisionConfirmed = {
  importBatchId: string;
  summary: ImportSummary;
  applied: RevisionApplied[];
  errors: Array<{ rowNumber: number; employeeCode: string; error: string }>;
  note?: string;
};

export type RevisionList = {
  import: null | { importBatchId: string; fileName: string; confirmedAt: string; summary: ImportSummary; rows: RevisionRow[] };
};

// ---------- helpers ----------

/** Legacy parser only treats a file as CSV when its mimetype is exactly `text/csv`; normalise what browsers send. */
export function normaliseUpload(file: File): File {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') && file.type !== 'text/csv') return new File([file], file.name, { type: 'text/csv' });
  if (name.endsWith('.xlsx') && !file.type) return new File([file], file.name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  if (name.endsWith('.xls') && !file.type) return new File([file], file.name, { type: 'application/vnd.ms-excel' });
  return file;
}

export const ACCEPT = '.csv,.xlsx,.xls';

/**
 * Upload a file for preview. The legacy preview endpoints may answer 400 with a
 * full `{ summary, preview }` payload (e.g. "No valid rows found") — surface those
 * rows instead of discarding them.
 */
export async function uploadPreview<T>(path: string, form: FormData): Promise<{ ok: boolean; message: string; data: T | null }> {
  try {
    const env = await pe.upload<T>(path, form);
    return { ok: true, message: env.message, data: env.data };
  } catch (err) {
    if (err instanceof PayrollApiError && err.body && typeof err.body === 'object') {
      const data = (err.body as { data?: unknown }).data;
      if (data && typeof data === 'object' && 'preview' in data) return { ok: false, message: err.message, data: data as T };
    }
    throw err;
  }
}

export function SummaryKpis({ summary, extra }: { summary: ImportSummary; extra?: boolean }) {
  return <KpiGrid>
    <Kpi label="Rows in file" value={summary.totalRows ?? 0} />
    <Kpi label="Valid rows" value={summary.validRows ?? 0} tone="text-green-700" />
    <Kpi label="Rows with errors" value={summary.invalidRows ?? 0} tone={summary.invalidRows ? 'text-red-700' : 'text-gray-950'} sub={summary.invalidRows ? 'Skipped on confirm' : undefined} />
    {extra
      ? <Kpi label="Revisions created" value={summary.revisionsCreated ?? 0} sub={`${summary.approved ?? 0} approved · ${summary.implemented ?? 0} implemented · ${summary.failed ?? 0} failed`} />
      : <Kpi label="Ready to apply" value={summary.validRows ?? 0} sub="Applied on confirm" />}
  </KpiGrid>;
}

export function Notice({ tone, children }: { tone: 'warn' | 'error' | 'info'; children: React.ReactNode }) {
  const cls = { warn: 'border-orange-200 bg-orange-50 text-orange-800', error: 'border-red-200 bg-red-50 text-red-700', info: 'border-blue-100 bg-blue-50 text-blue-800' }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-xs ${cls}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function RowFilter({ value, onChange, counts }: { value: 'all' | 'valid' | 'invalid'; onChange: (v: 'all' | 'valid' | 'invalid') => void; counts: { all: number; valid: number; invalid: number } }) {
  const opts: Array<['all' | 'valid' | 'invalid', string]> = [['all', `All (${counts.all})`], ['valid', `Valid (${counts.valid})`], ['invalid', `Errors (${counts.invalid})`]];
  return <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50" role="group" aria-label="Filter rows">
    {opts.map(([k, label]) => <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
      className={`px-2.5 h-7 rounded-md text-[11px] font-semibold ${value === k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>{label}</button>)}
  </div>;
}
