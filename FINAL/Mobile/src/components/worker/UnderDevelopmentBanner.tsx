import { Construction } from 'lucide-react';

/** A prominent "Under development" banner for worker sections that are still
 *  being built, so figures shown are clearly marked as provisional. */
export default function UnderDevelopmentBanner({ note }: { note?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 grid place-items-center flex-shrink-0">
        <Construction size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold flex items-center gap-2">
          Under development
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-700">Preview</span>
        </p>
        <p className="text-xs text-amber-800/90 mt-0.5">
          {note ?? 'This section is being built. The information shown here is provisional and may change.'}
        </p>
      </div>
    </div>
  );
}
