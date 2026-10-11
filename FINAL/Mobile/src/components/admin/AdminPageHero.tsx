import type { ReactNode } from 'react';

/**
 * Branded admin page hero — the same treatment the worker/contractor/employer
 * portals use (navy gradient, soft elevation, gentle reveal). Keeps every admin
 * page's header consistent.
 */
export default function AdminPageHero({ eyebrow, title, description, icon, actions }: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return <header className="bss-reveal bss-gradient-hero bss-elevated relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white">
    <div className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/5" />
    <div className="pointer-events-none absolute right-24 -bottom-20 w-48 h-48 rounded-full bg-white/5" />
    <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-bss-soft-green uppercase tracking-[0.14em] flex items-center gap-1.5">{icon}{eyebrow}</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">{title}</h1>
        {description && <p className="text-sm text-white/70 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 self-start shrink-0">{actions}</div>}
    </div>
  </header>;
}
