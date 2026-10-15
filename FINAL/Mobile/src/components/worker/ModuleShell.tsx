import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Database } from 'lucide-react';

export function ModuleShell({ title, description, icon: Icon, children, watermark, hero }: { title: string; description: string; icon: LucideIcon; children: React.ReactNode; watermark?: string; hero?: React.ReactNode }) {
  return <div className="space-y-5 pb-12">
    {hero ?? <header className="flex items-start gap-3">
      <Link href="/worker" aria-label="Back to dashboard" className="mt-1 w-9 h-9 rounded-lg border border-bss-border bg-white flex items-center justify-center text-bss-text-muted hover:text-bss-navy"><ArrowLeft size={17}/></Link>
      <span className="w-11 h-11 rounded-xl bg-bss-blue-tint text-bss-navy flex items-center justify-center"><Icon size={21}/></span>
      <div><h1 className="text-2xl font-semibold text-bss-text-primary">{title}</h1><p className="text-sm text-bss-text-muted mt-1">{description}</p></div>
    </header>}
    {watermark ? <div className="relative">
      <div aria-hidden className="pointer-events-none select-none absolute inset-0 z-20 overflow-hidden">
        <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-x-20 gap-y-28 -rotate-[24deg] scale-[1.6]">
          {Array.from({ length: 14 }).map((_, i) => <span key={i} className="text-2xl sm:text-3xl font-black uppercase tracking-[0.28em] text-black/5 whitespace-nowrap">{watermark}</span>)}
        </div>
      </div>
      {children}
    </div> : children}
  </div>;
}

export function EmptySource({ source, label = 'No records available' }: { source: string; label?: string }) {
  return <div className="rounded-2xl border border-dashed border-bss-border bg-white p-8 text-center">
    <span className="mx-auto w-10 h-10 rounded-xl bg-bss-blue-tint text-bss-interactive-blue flex items-center justify-center"><Database size={19}/></span>
    <h2 className="mt-3 text-sm font-semibold text-bss-text-primary">{label}</h2>
    <p className="mt-1 text-xs text-bss-text-muted">Records will appear here when the authoritative data source is connected.</p>
    <p className="mt-3 text-[11px] text-bss-text-muted">Required source: {source}</p>
  </div>;
}

export const fieldClass = 'h-10 rounded-lg border border-bss-border bg-white px-3 text-sm text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20';
