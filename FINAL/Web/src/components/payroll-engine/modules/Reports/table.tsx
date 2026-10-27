"use client";

/**
 * Column specs shared by the report screens: one spec drives the on-screen
 * table, its totals footer and the client-side Excel export, so what you see
 * is exactly what you download.
 */

import type { Column } from '../../ui';
import { fmtDate, fmtDateTime, money, num } from '../../ui';

export type CellKind = 'text' | 'money' | 'num' | 'date' | 'datetime' | 'pct';

export type Spec<T> = {
  label: string;
  value: (row: T) => string | number | boolean | null | undefined;
  kind?: CellKind;
  /** Sum this column in the footer / export totals row. */
  total?: boolean;
  /** Optional custom on-screen rendering (export still uses `value`). */
  render?: (row: T) => React.ReactNode;
};

function display(kind: CellKind | undefined, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  switch (kind) {
    case 'money': return money(v);
    case 'num': return num(v);
    case 'date': return fmtDate(v);
    case 'datetime': return fmtDateTime(v);
    case 'pct': return `${num(v)}%`;
    default: return typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);
  }
}

const numeric = (k?: CellKind) => k === 'money' || k === 'num' || k === 'pct';

export function toColumns<T>(specs: Spec<T>[]): Column<T>[] {
  return specs.map((s, i) => ({
    key: `${i}:${s.label}`,
    label: s.label,
    align: numeric(s.kind) ? 'right' : 'left',
    className: numeric(s.kind) ? 'whitespace-nowrap tabular-nums' : 'whitespace-nowrap',
    render: row => s.render ? s.render(row) : display(s.kind, s.value(row)),
  }));
}

export function sumOf<T>(rows: T[], fn: (row: T) => unknown): number {
  return rows.reduce((acc, r) => acc + (Number(fn(r)) || 0), 0);
}

/** Totals footer row for a DataTable (only when at least one spec has total). */
export function totalsFooter<T>(specs: Spec<T>[], rows: T[]): React.ReactNode {
  if (!rows.length || !specs.some(s => s.total)) return undefined;
  return <tr>{specs.map((s, i) => <td key={i} className={`px-3 py-2 text-gray-900 whitespace-nowrap ${numeric(s.kind) ? 'text-right tabular-nums' : ''}`}>
    {i === 0 ? 'Total' : s.total ? display(s.kind, sumOf(rows, s.value)) : ''}
  </td>)}</tr>;
}

export type Sheet = { name: string; rows: (string | number)[][] };

function cell(kind: CellKind | undefined, v: unknown): string | number {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (numeric(kind)) { const n = Number(v); return Number.isFinite(n) ? n : String(v); }
  if (kind === 'date' || kind === 'datetime') return display(kind, v);
  return typeof v === 'number' ? v : String(v);
}

/** Build a worksheet (header + rows + optional totals row) from specs. */
export function sheet<T>(name: string, specs: Spec<T>[], rows: T[], preface: (string | number)[][] = []): Sheet {
  const out: (string | number)[][] = [...preface];
  if (preface.length) out.push([]);
  out.push(specs.map(s => s.label));
  rows.forEach(r => out.push(specs.map(s => cell(s.kind, s.value(r)))));
  if (rows.length && specs.some(s => s.total)) out.push(specs.map((s, i) => i === 0 ? 'Total' : s.total ? sumOf(rows, s.value) : ''));
  return { name, rows: out };
}

/** Write a multi-sheet .xlsx in the browser (xlsx is loaded lazily). */
export async function exportWorkbook(filename: string, sheets: Sheet[]): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const s of sheets) {
    let name = s.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet';
    while (used.has(name)) name = `${name.slice(0, 28)}_${used.size}`;
    used.add(name);
    const ws = XLSX.utils.aoa_to_sheet(s.rows.length ? s.rows : [['No data']]);
    const width = s.rows.reduce((m, r) => Math.max(m, r.length), 0);
    ws['!cols'] = Array.from({ length: width }, (_, c) => ({ wch: Math.min(48, Math.max(10, s.rows.reduce((m, r) => Math.max(m, String(r[c] ?? '').length), 0) + 2)) }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/** Ordered union of component names across rows (for dynamic earning / deduction columns). */
export function componentNames<T>(rows: T[], pick: (row: T) => Array<{ name: string }> | undefined): string[] {
  const seen = new Set<string>();
  rows.forEach(r => (pick(r) ?? []).forEach(c => { if (c?.name) seen.add(c.name); }));
  return Array.from(seen);
}

export function componentAmount(lines: Array<{ name: string; amount?: number; monthly?: number }> | undefined, name: string): number {
  return (lines ?? []).filter(l => l.name === name).reduce((s, l) => s + (Number(l.amount ?? l.monthly) || 0), 0);
}
