"use client";

/**
 * Shared UI kit for the payroll engine screens. Every module uses these so the
 * whole payroll app looks and behaves the same (BSS tokens, Tailwind).
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { errorMessage, pe } from '@/lib/payroll-engine/api';
import type { PayrollEmployee } from '@/lib/payroll-engine/types';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
export function money(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? inr.format(n) : '—';
}
export function num(value: unknown, digits = 2): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: digits }) : '—';
}
export function fmtDate(value: unknown): string {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(value: unknown): string {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function isoDate(value: unknown): string {
  if (!value) return '';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
export function employeeName(emp: Partial<PayrollEmployee> | null | undefined): string {
  if (!emp) return '—';
  return [emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.displayName || emp.uniqueId || '—';
}
/** Current Indian financial year "2025-26" style. */
export function currentFinancialYear(date = new Date()): string {
  const y = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Data hooks
// ---------------------------------------------------------------------------

/** Load data from the engine; re-runs when `deps` change (keeps showing the previous data while reloading). */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[]): { data: T | null; error: string; loading: boolean; reload: () => void; setData: (v: T | null) => void } {
  const [state, setState] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: '', loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => { if (active) setState(s => ({ ...s, loading: true, error: '' })); })
      .then(() => loader())
      .then(value => { if (active) setState({ data: value, error: '', loading: false }); })
      .catch(err => { if (active) setState(s => ({ ...s, error: errorMessage(err), loading: false })); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass the loader's inputs as deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick(t => t + 1), []);
  const setData = useCallback((v: T | null) => setState(s => ({ ...s, data: v })), []);
  return { ...state, reload, setData };
}

/** Run a mutation with busy state + toast. Returns the result or undefined on error. */
export function useAction(notify: Notify) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
    setBusy(true);
    try {
      const out = await fn();
      if (success) notify(success, 'success');
      return out;
    } catch (err) {
      notify(errorMessage(err), 'error');
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [notify]);
  return { busy, run };
}

export type Notify = (message: string, tone?: 'success' | 'error') => void;

/** Active employees of the org (cached per mount). */
export function useEmployees(status?: string) {
  return useLoad(() => pe.get<PayrollEmployee[]>('employees', { status }), [status]);
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function Section({ title, subtitle, right, children, className }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`bg-white border border-gray-200 rounded-2xl overflow-hidden ${className ?? ''}`}>
    <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-sm font-semibold text-gray-950">{title}</h2>{subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}</div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </header>
    <div>{children}</div>
  </section>;
}

export function Kpi({ label, value, sub, tone = 'text-gray-950' }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string }) {
  return <article className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
    <p className="text-xs font-medium text-gray-500">{label}</p>
    <p className={`text-lg font-bold mt-1 ${tone}`}>{value}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
  </article>;
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>;
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return <div className="px-5 py-10 text-center"><p className="text-sm font-semibold text-gray-600">{title}</p>{text && <p className="text-xs text-gray-400 mt-1">{text}</p>}</div>;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="px-5 py-10 flex items-center justify-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" />{label}</div>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
    <span>{message}</span>
    {onRetry && <button type="button" onClick={onRetry} className="text-xs font-semibold underline">Retry</button>}
  </div>;
}

/** Wraps loading / error / content for a `useLoad` result. */
export function Async<T>({ state, children, empty }: { state: { data: T | null; error: string; loading: boolean; reload: () => void }; children: (data: T) => React.ReactNode; empty?: React.ReactNode }) {
  if (state.loading && state.data === null) return <Loading />;
  if (state.error) return <ErrorBox message={state.error} onRetry={state.reload} />;
  if (state.data === null || (Array.isArray(state.data) && state.data.length === 0 && empty)) return <>{empty ?? <Empty title="No data" />}</>;
  return <>{children(state.data)}</>;
}

export function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"><span className="text-gray-500 text-xs">{label}</span><span className={`text-xs font-semibold text-gray-800 text-right ${tone ?? ''}`}>{value}</span></div>;
}

const TONES: Record<string, string> = {
  green: 'bg-green-50 text-green-700', red: 'bg-red-50 text-red-700', orange: 'bg-orange-50 text-orange-700',
  blue: 'bg-blue-50 text-blue-700', gray: 'bg-gray-100 text-gray-600', purple: 'bg-purple-50 text-purple-700',
};
const STATUS_TONE: Record<string, keyof typeof TONES> = {
  paid: 'green', approved: 'green', active: 'green', completed: 'green', verified: 'green', implemented: 'green', finalized: 'green', closed: 'gray', settled: 'green', locked: 'blue', processed: 'blue', confirmed: 'blue',
  pending: 'orange', draft: 'gray', submitted: 'orange', on_hold: 'orange', requested: 'orange', partial: 'blue', preview: 'gray', 'in-progress': 'blue', in_progress: 'blue',
  rejected: 'red', cancelled: 'red', failed: 'red', stopped: 'gray', inactive: 'gray', none: 'gray', overdue: 'red',
};
export function Badge({ status, children }: { status?: string; children?: React.ReactNode }) {
  const key = String(status ?? '').toLowerCase().replace(/\s+/g, '_');
  const tone = TONES[STATUS_TONE[key] ?? STATUS_TONE[key.replace(/_/g, '-')] ?? 'gray'];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${tone}`}>{children ?? status ?? '—'}</span>;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export type Column<T> = { key: string; label: string; render?: (row: T, index: number) => React.ReactNode; align?: 'left' | 'right' | 'center'; className?: string };

export function DataTable<T>({ columns, rows, rowKey, empty = 'No records', onRowClick, footer }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T, index: number) => string; empty?: string; onRowClick?: (row: T) => void; footer?: React.ReactNode }) {
  if (!rows.length) return <Empty title={empty} />;
  return <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead className="bg-gray-50 text-gray-500">
        <tr>{columns.map(c => <th key={c.key} className={`px-3 py-2 font-semibold whitespace-nowrap text-${c.align ?? 'left'}`}>{c.label}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row, i) => <tr key={rowKey(row, i)} className={onRowClick ? 'hover:bg-blue-50/40 cursor-pointer' : ''} onClick={onRowClick ? () => onRowClick(row) : undefined}>
          {columns.map(c => <td key={c.key} className={`px-3 py-2 text-gray-800 text-${c.align ?? 'left'} ${c.className ?? ''}`}>{c.render ? c.render(row, i) : String((row as Record<string, unknown>)[c.key] ?? '—')}</td>)}
        </tr>)}
      </tbody>
      {footer && <tfoot className="bg-gray-50 font-semibold">{footer}</tfoot>}
    </table>
  </div>;
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export const inputClass = 'w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[var(--color-bss-interactive-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500';

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className ?? ''}`}>
    <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
  </label>;
}

export function TextInput({ value, onChange, type = 'text', ...rest }: { value: string | number | null | undefined; onChange: (v: string) => void; type?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <input {...rest} type={type} className={`${inputClass} ${rest.className ?? ''}`} value={value ?? ''} onChange={e => onChange(e.target.value)} />;
}

export function NumberInput({ value, onChange, ...rest }: { value: number | string | null | undefined; onChange: (v: number) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <input {...rest} type="number" className={`${inputClass} ${rest.className ?? ''}`} value={value ?? ''} onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />;
}

export function Select({ value, onChange, options, placeholder, ...rest }: { value: string | null | undefined; onChange: (v: string) => void; options: Array<string | { value: string; label: string }>; placeholder?: string } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'>) {
  return <select {...rest} className={`${inputClass} ${rest.className ?? ''}`} value={value ?? ''} onChange={e => onChange(e.target.value)}>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return <label className={`inline-flex items-center gap-2 text-sm ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-[var(--color-bss-interactive-blue)]" checked={!!checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
    {label && <span className="text-gray-700">{label}</span>}
  </label>;
}

export function Btn({ variant = 'primary', busy, children, ...rest }: { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; busy?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: 'bg-[var(--color-bss-interactive-blue)] text-white hover:bg-[var(--color-bss-navy)]',
    secondary: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-[var(--color-bss-interactive-blue)] hover:bg-blue-50',
  }[variant];
  return <button type="button" {...rest} disabled={rest.disabled || busy}
    className={`inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${styles} ${rest.className ?? ''}`}>
    {busy && <Loader2 size={14} className="animate-spin" />}{children}
  </button>;
}

export function FormGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const cls = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }[cols];
  return <div className={`grid grid-cols-1 ${cls} gap-3`}>{children}</div>;
}

export function Modal({ title, subtitle, onClose, children, footer, width = 'max-w-2xl' }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; width?: string }) {
  return <div className="fixed inset-0 z-[90] bg-black/50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
    <div className={`bg-white rounded-2xl w-full ${width} max-h-[92vh] flex flex-col shadow-2xl`}>
      <header className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div><h3 className="text-sm font-semibold text-gray-950">{title}</h3>{subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}</div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
      </header>
      <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
      {footer && <footer className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">{footer}</footer>}
    </div>
  </div>;
}

export function Confirm({ title, message, onConfirm, onClose, busy, danger }: { title: string; message: React.ReactNode; onConfirm: () => void; onClose: () => void; busy?: boolean; danger?: boolean }) {
  return <Modal title={title} onClose={onClose} width="max-w-md" footer={<>
    <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
    <Btn variant={danger ? 'danger' : 'primary'} busy={busy} onClick={onConfirm}>Confirm</Btn>
  </>}><div className="text-sm text-gray-700">{message}</div></Modal>;
}

/** Month + year picker (legacy APIs take month "Jan".."Dec" and a numeric year). */
export function PeriodPicker({ month, year, onChange, monthFormat = 'short' }: { month: string; year: number; onChange: (month: string, year: number) => void; monthFormat?: 'short' | 'long' }) {
  const names = monthFormat === 'long' ? MONTHS_LONG : MONTHS;
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => thisYear - 4 + i);
  return <div className="flex items-center gap-2">
    <select className={`${inputClass} w-28`} value={month} onChange={e => onChange(e.target.value, year)} aria-label="Month">
      {names.map(m => <option key={m} value={m}>{m}</option>)}
    </select>
    <select className={`${inputClass} w-24`} value={year} onChange={e => onChange(month, Number(e.target.value))} aria-label="Year">
      {years.map(y => <option key={y} value={y}>{y}</option>)}
    </select>
  </div>;
}

export function FinancialYearPicker({ value, onChange }: { value: string; onChange: (fy: string) => void }) {
  const start = new Date().getFullYear() + 1;
  const years = Array.from({ length: 6 }, (_, i) => { const y = start - i; return `${y - 1}-${String(y % 100).padStart(2, '0')}`; });
  return <select className={`${inputClass} w-32`} value={value} onChange={e => onChange(e.target.value)} aria-label="Financial year">
    {years.map(y => <option key={y} value={y}>FY {y}</option>)}
  </select>;
}

export function EmployeePicker({ value, onChange, employees, placeholder = 'Select employee', includeInactive = true }: { value: string; onChange: (id: string, emp?: PayrollEmployee) => void; employees: PayrollEmployee[]; placeholder?: string; includeInactive?: boolean }) {
  const list = includeInactive ? employees : employees.filter(e => e.status !== 'Inactive');
  return <select className={inputClass} value={value} onChange={e => onChange(e.target.value, list.find(x => x._id === e.target.value))}>
    <option value="">{placeholder}</option>
    {list.map(e => <option key={e._id} value={e._id}>{employeeName(e)} · {e.customId || e.uniqueId}{e.status === 'Inactive' ? ' (exited)' : ''}</option>)}
  </select>;
}

export function FileInput({ accept, multiple, onFiles, label = 'Choose file' }: { accept?: string; multiple?: boolean; onFiles: (files: File[]) => void; label?: string }) {
  return <label className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-dashed border-gray-300 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-50">
    {label}
    <input type="file" className="hidden" accept={accept} multiple={multiple} onChange={e => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
  </label>;
}

export function Tabs({ tabs, active, onChange }: { tabs: Array<{ key: string; label: string }>; active: string; onChange: (key: string) => void }) {
  return <div className="flex flex-wrap gap-1 border-b border-gray-200">
    {tabs.map(t => <button key={t.key} type="button" onClick={() => onChange(t.key)}
      className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px ${active === t.key ? 'border-[var(--color-bss-interactive-blue)] text-[var(--color-bss-interactive-blue)]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{t.label}</button>)}
  </div>;
}

/** Pretty-print any JSON payload (used for audit diffs / raw previews). */
export function JsonView({ value }: { value: unknown }) {
  return <pre className="text-[11px] bg-gray-50 border border-gray-100 rounded-lg p-3 overflow-auto max-h-80">{JSON.stringify(value, null, 2)}</pre>;
}
