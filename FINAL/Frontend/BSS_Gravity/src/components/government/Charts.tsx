'use client';

export function BarChart({ data, color = '#155E95', height = 180 }: { data: Array<{ label: string; value: number }>; color?: string; height?: number }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return <div className="w-full">
    <div className="flex items-end gap-2" style={{ height }}>{data.map((d, i) => <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d.label}: ${d.value}`}><div className="w-full bg-gray-50 rounded-t-md border-b-2" style={{ height: `${Math.max(2, d.value / max * 100)}%`, backgroundColor: color }} /><span className="text-[10px] text-gray-500 truncate w-full text-center">{shorten(d.label)}</span><span className="text-[10px] font-bold text-gray-700">{d.value}</span></div>)}</div>
    <div className="sr-only">{data.map(d => `${d.label}: ${d.value}`).join(', ')}</div>
  </div>;
}

export function HBar({ data, color = '#155E95' }: { data: Array<{ label: string; value: number }>; color?: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  const cap = 8;
  return <div className="space-y-2">{data.slice(0, cap).map((d, i) => <div key={i}><div className="flex justify-between text-xs mb-1"><span className="text-gray-700 truncate pr-2">{d.label}</span><strong className="text-gray-900">{d.value}</strong></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${d.value / max * 100}%`, backgroundColor: color }}/></div></div>)}</div>;
}

export function Donut({ slices, size = 150, thickness = 26 }: { slices: Array<{ label: string; value: number; color: string }>; size?: number; thickness?: number }) {
  const total = Math.max(1, slices.reduce((s, x) => s + x.value, 0));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const lens = slices.map(s => s.value / total * c);
  const spans = slices.map((_s, i) => ({ len: lens[i], offset: lens.slice(0, i).reduce((a, b) => a + b, 0) }));
  return <div className="flex items-center gap-4"><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={slices.map(s => `${s.label}: ${s.value}`).join(', ')}>
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={thickness} />
    {slices.map((s, i) => <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${spans[i].len} ${c - spans[i].len}`} strokeDashoffset={-spans[i].offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />)}
    <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-900 text-lg font-bold">{total}</text>
  </svg><div className="space-y-1.5">{slices.map((s, i) => <div key={i} className="flex items-center gap-2 text-xs"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}/><span className="text-gray-600">{s.label}</span><strong className="text-gray-900 ml-auto">{s.value}</strong></div>)}</div></div>;
}

export function Kpi({ label, value, tone = 'bg-blue-600' }: { label: string; value: string | number; tone?: string }) {
  const barTone = tone.includes('bg-') ? tone.split(' ')[0] : 'bg-blue-600';
  return <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{label}</span><span className={`w-6 h-1.5 rounded-full ${barTone}`}/></div><strong>{value}</strong></article>;
}

function shorten(label: string): string { return label.length > 9 ? label.slice(0, 9) + '…' : label; }
