"use client";

/** Presentation-only building blocks for the employer dashboard, styled after
 *  the BharatShramSetu pitch deck (navy / saffron / green on mist surfaces).
 *  Nothing here fetches data — it only sorts, filters and pages what it is given. */

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

/** Deck-style section heading: numbered saffron disc, bold navy title. */
export function SectionTitle({ index, title, subtitle, icon: Icon, action }: {
  index?: string; title: React.ReactNode; subtitle?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>; action?: React.ReactNode;
}) {
  return <div className="flex flex-wrap items-end justify-between gap-3">
    <div className="flex items-center gap-3 min-w-0">
      {index && <span className="w-9 h-9 rounded-full bg-[#E45D24] text-white grid place-items-center text-xs font-extrabold shadow-[0_6px_14px_-6px_#E45D24] shrink-0">{index}</span>}
      {!index && Icon && <span className="w-9 h-9 rounded-full bg-[#01183A] text-white grid place-items-center shrink-0"><Icon size={16} /></span>}
      <div className="min-w-0">
        <h2 className="text-lg font-extrabold tracking-tight text-[#01183A] flex items-center gap-2">{title}</h2>
        {subtitle && <p className="text-xs text-bss-text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>;
}

/** Card header with a round icon badge, the way the deck draws feature tiles. */
export function PanelHeader({ icon: Icon, tone = 'navy', title, subtitle, right }: {
  icon: React.ComponentType<{ size?: number; className?: string }>; tone?: Tone;
  title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode;
}) {
  return <header className="px-5 py-4 border-b border-[#DBE3EF] flex items-center justify-between gap-3">
    <div className="flex items-center gap-3 min-w-0">
      <span className={`w-9 h-9 rounded-full grid place-items-center shrink-0 text-white ${TONE_BG[tone]}`}><Icon size={16} /></span>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-[#01183A] truncate">{title}</h2>
        {subtitle && <p className="text-[11px] text-bss-text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {right}
  </header>;
}

export type Tone = 'navy' | 'blue' | 'orange' | 'green' | 'red';
export const TONE_BG: Record<Tone, string> = {
  navy: 'bg-[#01183A]', blue: 'bg-[#1E3A8A]', orange: 'bg-[#E45D24]', green: 'bg-[#14843C]', red: 'bg-[#DC2626]',
};
export const TONE_TEXT: Record<Tone, string> = {
  navy: 'text-[#01183A]', blue: 'text-[#1E3A8A]', orange: 'text-[#E45D24]', green: 'text-[#14843C]', red: 'text-[#DC2626]',
};
export const TONE_SOFT: Record<Tone, string> = {
  navy: 'bg-[#F2F6FC]', blue: 'bg-[#EEF2FB]', orange: 'bg-[#FDF0EA]', green: 'bg-[#EAF5EE]', red: 'bg-[#FDECEC]',
};

export function SearchBox({ value, onChange, placeholder, className = '' }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return <label className={`relative block ${className}`}>
    <span className="sr-only">{placeholder}</span>
    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bss-text-muted pointer-events-none" />
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full h-9 rounded-full border border-[#DBE3EF] bg-white pl-8 pr-8 text-xs text-bss-text-primary placeholder:text-bss-text-muted focus:outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15 transition" />
    {value && <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 grid place-items-center rounded-full text-bss-text-muted hover:bg-bss-bg hover:text-bss-text-primary"><X size={12} /></button>}
  </label>;
}

/** Pill filter group. Counts are optional and only shown when supplied. */
export function FilterChips<T extends string>({ options, value, onChange }: { options: Array<{ value: T; label: string; count?: number; dot?: string }>; value: T; onChange: (v: T) => void }) {
  return <div className="flex flex-wrap items-center gap-1.5" role="radiogroup">
    {options.map(o => {
      const on = o.value === value;
      return <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
        className={`h-8 px-3 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1.5 transition-all ${on ? 'bg-[#01183A] text-white border-[#01183A] shadow-sm' : 'bg-white border-[#DBE3EF] text-bss-text-secondary hover:border-[#1E3A8A]/40 hover:text-[#01183A]'}`}>
        {o.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: o.dot }} />}
        {o.label}
        {o.count !== undefined && <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] grid place-items-center ${on ? 'bg-white/15 text-white' : 'bg-[#F2F6FC] text-bss-text-secondary'}`}>{o.count}</span>}
      </button>;
    })}
  </div>;
}

export type SortDir = 'asc' | 'desc';
export type SortState<K extends string> = { key: K | null; dir: SortDir };

/** Client-side sort over already-loaded rows. Clicking a column cycles asc → desc → off. */
export function useSort<R, K extends string>(rows: R[], getters: Record<K, (r: R) => string | number>, initial: SortState<K> = { key: null, dir: 'asc' }) {
  const [sort, setSort] = useState<SortState<K>>(initial);
  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const get = getters[sort.key];
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = get(a), y = get(b);
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * factor;
      return String(x).localeCompare(String(y), 'en-IN', { numeric: true, sensitivity: 'base' }) * factor;
    });
    // getters are static per call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);
  const toggle = (key: K) => setSort(s => s.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : { key: null, dir: 'asc' });
  return { sorted, sort, toggle, setSort };
}

export function SortTh<K extends string>({ k, label, sort, onSort, align = 'left', className = '' }: { k: K; label: React.ReactNode; sort: SortState<K>; onSort: (k: K) => void; align?: 'left' | 'center' | 'right'; className?: string }) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  return <th className={`px-2 sm:px-3 py-2.5 font-bold ${className}`} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
    <button type="button" onClick={() => onSort(k)} className={`w-full inline-flex items-center gap-1 uppercase tracking-wider ${justify} ${active ? 'text-[#01183A]' : 'hover:text-[#01183A]'}`}>
      {label}<Icon size={11} className={active ? 'text-[#E45D24]' : 'opacity-50'} />
    </button>
  </th>;
}

/** Numbered pager used under client-side tables. */
export function Pager({ page, pages, total, noun, onPage }: { page: number; pages: number; total: number; noun: string; onPage: (p: number) => void }) {
  if (pages <= 1) return <p className="text-[11px] text-bss-text-muted px-1">{total} {noun}{total === 1 ? '' : 's'}</p>;
  const nums = pageWindow(page, pages);
  return <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-bss-text-muted">
    <span>{total} {noun}{total === 1 ? '' : 's'} · page {page} of {pages}</span>
    <span className="flex items-center gap-1">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" className="w-7 h-7 grid place-items-center rounded-full border border-[#DBE3EF] bg-white disabled:opacity-40 hover:border-[#1E3A8A]/40"><ChevronLeft size={13} /></button>
      {nums.map((n, i) => n === 0
        ? <span key={`gap${i}`} className="px-1">…</span>
        : <button key={n} type="button" onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined} className={`min-w-7 h-7 px-1.5 rounded-full text-[11px] font-semibold ${n === page ? 'bg-[#01183A] text-white' : 'hover:bg-[#F2F6FC] text-bss-text-secondary'}`}>{n}</button>)}
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page" className="w-7 h-7 grid place-items-center rounded-full border border-[#DBE3EF] bg-white disabled:opacity-40 hover:border-[#1E3A8A]/40"><ChevronRight size={13} /></button>
    </span>
  </div>;
}

function pageWindow(cur: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, cur - 1, cur, cur + 1].filter(n => n >= 1 && n <= total));
  const list = [...set].sort((a, b) => a - b);
  const out: number[] = [];
  list.forEach((n, i) => { if (i && n - list[i - 1] > 1) out.push(0); out.push(n); });
  return out;
}

/** Thin proportional bar used inline in table cells. */
export function InlineBar({ value, max, color = '#1E3A8A' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, value / max * 100) : 0;
  return <span className="block h-1.5 w-full rounded-full bg-[#F2F6FC] overflow-hidden"><span className="block h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} /></span>;
}

/** Shared table chrome: mist header, hairline rows. */
export const TABLE_HEAD = 'bg-[#F2F6FC] text-[10px] uppercase tracking-wider text-bss-text-muted';
export const TABLE_ROW = 'hover:bg-[#F2F6FC]/70 transition-colors';

/** Text to show when filtering produced nothing, with a reset link. */
export function EmptyFiltered({ onReset, label = 'No rows match these filters.' }: { onReset: () => void; label?: string }) {
  return <div className="py-8 text-center text-xs text-bss-text-muted">
    {label} <button type="button" onClick={onReset} className="font-semibold text-[#1E3A8A] hover:underline">Clear filters</button>
  </div>;
}
