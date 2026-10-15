"use client";

import { Volume2 } from "lucide-react";

/**
 * Opens the "Listen & Learn" voice guide for the current page. The guide itself
 * is rendered app-wide (VoiceGuide); this button just asks it to open, so it can
 * be placed anywhere (e.g. the Scan & Bind header and footer).
 */
export default function ListenButton({ className = "", label = "Listen" }: { className?: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("bss:open-voice-guide"))}
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-bss-border bg-white text-sm font-semibold text-[#01183A] hover:bg-bss-bg ${className}`}
      aria-label="Listen and learn — read this page aloud"
    >
      <Volume2 size={16} />
      {label}
    </button>
  );
}
