'use client';

/** BharatShramSetu-branded chart primitives (bar / hbar / donut).
 *  Same props as government/Charts so they are drop-in replacements.
 *  Palette is taken from the BSS pitch deck: navy, deep navy, blue,
 *  saffron, green on mist surfaces with hairline borders.
 *  Pure SVG/CSS, no chart dependency. */

import { useState } from 'react';

export const BSS = {
  navy: '#01183A', deep: '#022B5E', blue: '#1E3A8A', sky: '#6886C6',
  orange: '#E45D24', green: '#14843C', red: '#DC2626', amber: '#F59E0B',
  mist: '#F2F6FC', line: '#DBE3EF', slate: '#59687F',
};

export function BarChart({ data, color = BSS.blue, height = 180 }: { data: Array<{ label: string; value: number }>; color?: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <p className="text-xs text-bss-text-muted py-6 text-center">No data for this period.</p>;
  const max = Math.max(1, ...data.map(d => d.value));
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  return <div className="w-full">
    <div className="relative" style={{ height }}>
      {/* gridlines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" aria-hidden>
        {[0, 1, 2, 3].map(i => <span key={i} className="block border-t border-dashed" style={{ borderColor: BSS.line }} />)}
      </div>
      <div className="relative h-full flex items-end gap-1.5 sm:gap-2 px-0.5">
        {data.map((d, i) => {
          const isHover = hover === i;
          const isPeak = i === peak && d.value > 0;
          return <div key={i} className="flex-1 h-full flex flex-col items-center justify-end min-w-0" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} title={`${d.label}: ${d.value.toLocaleString('en-IN')}`}>
            <span className={`text-[10px] font-bold leading-none mb-1 transition-colors ${isHover || isPeak ? 'text-bss-text-primary' : 'text-bss-text-muted'}`}>{d.value.toLocaleString('en-IN')}</span>
            <div
              className="w-full max-w-[42px] rounded-t-md transition-all duration-300 origin-bottom"
              style={{
                height: `${Math.max(2, d.value / max * 88)}%`,
                background: isPeak ? `linear-gradient(180deg, ${BSS.orange} 0%, ${BSS.orange}cc 100%)` : `linear-gradient(180deg, ${color} 0%, ${color}b3 100%)`,
                opacity: hover === null || isHover ? 1 : 0.55,
                animation: `bssBarGrow 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 40}ms both`,
              }}
            />
          </div>;
        })}
      </div>
    </div>
    <div className="flex gap-1.5 sm:gap-2 px-0.5 mt-1.5 border-t pt-1.5" style={{ borderColor: BSS.line }}>
      {data.map((d, i) => <span key={i} className={`flex-1 min-w-0 truncate text-center text-[10px] ${hover === i ? 'text-bss-text-primary font-semibold' : 'text-bss-text-muted'}`} title={d.label}>{shorten(d.label)}</span>)}
    </div>
    <div className="sr-only">{data.map(d => `${d.label}: ${d.value}`).join(', ')}</div>
  </div>;
}

export function HBar({ data, color = BSS.blue }: { data: Array<{ label: string; value: number }>; color?: string }) {
  if (!data.length) return <p className="text-xs text-bss-text-muted py-6 text-center">No data for this period.</p>;
  const max = Math.max(1, ...data.map(d => d.value));
  const cap = 8;
  const hidden = data.length - cap;
  return <div className="space-y-2.5">
    {data.slice(0, cap).map((d, i) => (
      <div key={i} className="group grid grid-cols-[20px_1fr] items-center gap-2">
        <span className="w-5 h-5 rounded-full grid place-items-center text-[9px] font-bold text-white shrink-0" style={{ background: i === 0 ? BSS.orange : BSS.navy }}>{i + 1}</span>
        <div className="min-w-0">
          <div className="flex justify-between gap-2 text-xs mb-1">
            <span className="text-bss-text-secondary truncate group-hover:text-bss-text-primary transition-colors" title={d.label}>{d.label}</span>
            <strong className="text-bss-text-primary tabular-nums shrink-0">{d.value.toLocaleString('en-IN')}</strong>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: BSS.mist }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-110"
              style={{
                width: `${d.value / max * 100}%`,
                background: `linear-gradient(90deg, ${color} 0%, ${color}b3 100%)`,
                animation: `bssBarGrowX 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 50}ms both`,
              }}
            />
          </div>
        </div>
      </div>
    ))}
    {hidden > 0 && <p className="text-[10px] text-bss-text-muted pl-7">+{hidden} more not shown</p>}
  </div>;
}

export function Donut({ slices, size = 132, thickness = 16 }: { slices: Array<{ label: string; value: number; color: string }>; size?: number; thickness?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const sum = slices.reduce((s, x) => s + x.value, 0);
  const total = Math.max(1, sum);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gap = slices.filter(s => s.value > 0).length > 1 ? 2 : 0;
  const lens = slices.map(s => s.value / total * c);
  const spans = slices.map((_s, i) => ({ len: lens[i], offset: lens.slice(0, i).reduce((a, b) => a + b, 0) }));
  const focus = hover !== null ? slices[hover] : null;
  return <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
    <div className="relative shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={slices.map(s => `${s.label}: ${s.value}`).join(', ')}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BSS.mist} strokeWidth={thickness} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {slices.map((s, i) => s.value > 0 && (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
              strokeWidth={hover === i ? thickness + 4 : thickness}
              strokeDasharray={`${Math.max(0, spans[i].len - gap)} ${c - Math.max(0, spans[i].len - gap)}`} strokeDashoffset={-spans[i].offset}
              className="transition-[stroke-width,opacity] duration-200 cursor-pointer"
              style={{ opacity: hover === null || hover === i ? 1 : 0.35 }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          ))}
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
        <div>
          <strong className="block text-xl font-extrabold leading-none tabular-nums" style={{ color: focus ? focus.color : BSS.navy }}>{(focus ? focus.value : sum).toLocaleString('en-IN')}</strong>
          <span className="block text-[9px] uppercase tracking-wider text-bss-text-muted mt-1 max-w-[80px] truncate">{focus ? focus.label : 'Total'}</span>
        </div>
      </div>
    </div>
    <ul className="space-y-2 flex-1 min-w-0 w-full">{slices.map((s, i) => (
      <li key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={`rounded-lg px-2 py-1 -mx-2 transition-colors ${hover === i ? 'bg-bss-bg' : ''}`}>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-bss-text-secondary truncate">{s.label}</span>
          </span>
          <strong className="text-bss-text-primary font-semibold shrink-0 tabular-nums">{s.value.toLocaleString('en-IN')}</strong>
        </div>
        <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: BSS.mist }}>
          <div className="h-full rounded-full" style={{ width: `${s.value / total * 100}%`, background: s.color }} />
        </div>
      </li>
    ))}</ul>
  </div>;
}

function shorten(label: string): string { return label.length > 9 ? label.slice(0, 9) + '…' : label; }
