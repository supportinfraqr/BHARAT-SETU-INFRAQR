"use client";

/**
 * Camera viewfinder overlay: dims everything except a clear square window with
 * corner brackets and an animated scan line — gives the scanner a "real
 * scanner" feel. Purely decorative (pointer-events: none).
 */
export default function ScanFrame({ active, className = "" }: { active: boolean; className?: string }) {
  if (!active) return null;
  const corners = [
    "left-0 top-0 border-l-2 border-t-2 rounded-tl-xl",
    "right-0 top-0 border-r-2 border-t-2 rounded-tr-xl",
    "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-xl",
    "right-0 bottom-0 border-r-2 border-b-2 rounded-br-xl",
  ];
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-10 overflow-hidden flex items-center justify-center ${className}`}>
      {/* clear window + dimmed surroundings */}
      <div className="relative h-48 w-48 sm:h-56 sm:w-56 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
        {/* corner brackets */}
        <div className="absolute inset-0">
          {corners.map(c => <span key={c} className={`bss-glow absolute h-7 w-7 sm:h-8 sm:w-8 border-[#F47A32] ${c}`} />)}
        </div>
        {/* animated scan line bounded inside window. The keyframes animate `top`
            (percentage of the window); horizontal centring uses Tailwind
            -translate-x-1/2, so there is no transform conflict. */}
        <span className="bss-scanline absolute left-1/2 -translate-x-1/2 h-0.5 w-40 sm:w-48 rounded-full bg-[#F47A32] shadow-[0_0_12px_3px_rgba(244,122,50,0.8)]" />
      </div>
    </div>
  );
}
