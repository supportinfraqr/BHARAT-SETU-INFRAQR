import type { ReactNode } from 'react';

/**
 * Branded page hero used across the portals: animated navy→blue gradient,
 * soft glow, eyebrow label, title and optional subtitle + right-side actions.
 * Purely presentational.
 */
export default function PageHero({ eyebrow, title, subtitle, actions, className = '' }: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`relative overflow-hidden rounded-3xl bss-anim-gradient bg-gradient-to-br from-bss-navy via-bss-deep-navy to-bss-interactive-blue text-white p-5 sm:p-6 shadow-lg ${className}`}>
      <div aria-hidden className="absolute -right-8 -top-10 w-44 h-44 rounded-full bg-white/5 blur-2xl" />
      <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">{eyebrow}</p>}
          <h1 className="text-2xl md:text-3xl font-bold mt-1">{title}</h1>
          {subtitle && <p className="text-sm text-white/75 mt-1 max-w-2xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
