'use client';

/** Shared chart primitives (bar / hbar / donut / kpi). Enhanced with soft
 *  brand colors, rounded geometry, gentle grow-in animations and hover states.
 *  Kept dependency-free (pure SVG/CSS) so they render anywhere. */

const BRAND = { navy: '#01183A', deep: '#022B5E', blue: '#1E3A8A', orange: '#E45D24', green: '#14843C', mist: '#F2F6FC', line: '#DBE3EF' };

export function BarChart({ data, color = BRAND.blue, height = 180 }: { data: Array<{ label: string; value: number }>; color?: string; height?: number }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return <div className="w-full">
    <div className="flex items-end gap-2" style={{ height }}>{data.map((d, i) => (
      <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 group" title={`${d.label}: ${d.value}`}>
        <div
          className="w-full rounded-t-lg transition-all duration-500 ease-out group-hover:opacity-90 group-hover:-translate-y-0.5 origin-bottom"
          style={{
            height: `${Math.max(2, d.value / max * 100)}%`,
            background: `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`,
            boxShadow: `0 -6px 16px -8px ${color}99`,
            animation: `bssBarGrow 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 40}ms both`,
          }}
        />
        <span className="text-[10px] text-bss-text-muted truncate w-full text-center">{shorten(d.label)}</span>
        <span className="text-[10px] font-bold text-bss-text-primary">{d.value}</span>
      </div>
    ))}</div>
    <div className="sr-only">{data.map(d => `${d.label}: ${d.value}`).join(', ')}</div>
  </div>;
}

export function HBar({ data, color = BRAND.blue }: { data: Array<{ label: string; value: number }>; color?: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  const cap = 8;
  return <div className="space-y-2.5">{data.slice(0, cap).map((d, i) => (
    <div key={i} className="group">
      <div className="flex justify-between text-xs mb-1"><span className="text-bss-text-secondary truncate pr-2">{d.label}</span><strong className="text-bss-text-primary">{d.value}</strong></div>
      <div className="h-2 bg-bss-bg rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-110"
          style={{
            width: `${d.value / max * 100}%`,
            background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
            animation: `bssBarGrowX 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 50}ms both`,
          }}
        />
      </div>
    </div>
  ))}</div>;
}

export function Donut({ slices, size = 150, thickness = 26 }: { slices: Array<{ label: string; value: number; color: string }>; size?: number; thickness?: number }) {
  const total = Math.max(1, slices.reduce((s, x) => s + x.value, 0));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const lens = slices.map(s => s.value / total * c);
  const spans = slices.map((_s, i) => ({ len: lens[i], offset: lens.slice(0, i).reduce((a, b) => a + b, 0) }));
  return <div className="flex items-center gap-4">
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={slices.map(s => `${s.label}: ${s.value}`).join(', ')}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BRAND.mist} strokeWidth={thickness} />
      {slices.map((s, i) => (
        <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={`${spans[i].len} ${c - spans[i].len}`} strokeDashoffset={-spans[i].offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ animation: `bssBarGrowX 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 90}ms both` }} />
      ))}
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="fill-bss-text-primary text-lg font-bold">{total}</text>
    </svg>
    <div className="space-y-1.5">{slices.map((s, i) => (
      <div key={i} className="flex items-center gap-2 text-xs"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}/><span className="text-bss-text-secondary">{s.label}</span><strong className="text-bss-text-primary ml-auto">{s.value}</strong></div>
    ))}</div>
  </div>;
}

export function Kpi({ label, value, tone = 'bg-bss-interactive-blue' }: { label: string; value: string | number; tone?: string }) {
  const barTone = tone.includes('bg-') ? tone.split(' ')[0] : 'bg-bss-interactive-blue';
  return <article className="bss-kpi-card bss-hover-lift"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-muted">{label}</span><span className={`w-6 h-1.5 rounded-full ${barTone}`}/></div><strong>{value}</strong></article>;
}

function shorten(label: string): string { return label.length > 9 ? label.slice(0, 9) + '…' : label; }
