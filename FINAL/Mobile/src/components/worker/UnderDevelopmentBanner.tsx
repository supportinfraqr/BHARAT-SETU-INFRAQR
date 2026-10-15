import { Construction } from 'lucide-react';

/** A prominent "Under development" banner for worker sections that are still
 *  being built, so figures shown are clearly marked as provisional. */
export default function UnderDevelopmentBanner({ note }: { note?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-bss-border bg-bss-soft-orange px-4 py-3 text-bss-orange">
      <span className="w-9 h-9 rounded-xl bg-bss-soft-orange text-bss-orange grid place-items-center flex-shrink-0">
        <Construction size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold flex items-center gap-2">
          Under development
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bss-soft-orange border border-bss-border text-bss-orange">Preview</span>
        </p>
        <p className="text-xs text-bss-orange/90 mt-0.5">
          {note ?? 'This section is being built. The information shown here is provisional and may change.'}
        </p>
      </div>
    </div>
  );
}
