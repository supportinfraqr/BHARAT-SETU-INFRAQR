"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A dropdown that ALWAYS opens downward (native <select> popups are positioned
 * by the browser and can flip upward near the viewport bottom). Renders a
 * hidden input carrying `name` so it still works with FormData-based saves.
 */
export default function DownSelect({
  name, value, onChange, options, disabled = false, placeholder = "Select", className = "",
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const normalized = options.map(o => (typeof o === "string" ? { value: o, label: o } : o));
  const selected = normalized.find(o => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full h-full min-h-[42px] bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium flex items-center justify-between gap-2 text-left focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] disabled:bg-[#F5F5F7] disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        <span className={`truncate ${selected ? "text-[#1D1D1F]" : "text-gray-400"}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {normalized.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
                // Let the surrounding <form> know a value changed (its
                // onChange/onInput handlers drive the Save-enabled state).
                ref.current?.dispatchEvent(new Event("input", { bubbles: true }));
                ref.current?.dispatchEvent(new Event("change", { bubbles: true }));
              }}
              className={`block w-full px-4 py-2 text-left text-[13px] hover:bg-gray-50 ${value === o.value ? "bg-blue-50 font-semibold text-[#073B67]" : "text-gray-700"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
