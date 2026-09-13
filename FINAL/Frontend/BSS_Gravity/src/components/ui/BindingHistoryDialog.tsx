"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { History, X } from "lucide-react";
import type { BindingHistoryEvent } from "@/types/portal";

export type { BindingHistoryEvent };

const noopSubscribe = () => () => {};

function formatWhen(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Timeline of a binding's lifecycle (who requested, accepted, requested unbind,
 * unbound — with timestamps), shared by the worker / contractor / employer
 * binding pages.
 */
export default function BindingHistoryDialog({
  open,
  title,
  subtitle,
  events,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  events: BindingHistoryEvent[];
  onClose: () => void;
}) {
  // Render into <body> so `position: fixed` is relative to the viewport — the
  // portal layouts animate <main> with a transform, which otherwise becomes the
  // containing block and pushes the dialog off-centre.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!open || !mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/65 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto"
        onClick={event => event.stopPropagation()}
      >
        <header className="relative px-6 pt-6 pb-4 border-b border-gray-100">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 w-8 h-8 grid place-items-center rounded-full bg-gray-50 border border-gray-200/60 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
          <span className="w-11 h-11 rounded-2xl bg-[#073B67]/5 text-[#073B67] grid place-items-center">
            <History size={20} />
          </span>
          <h2 className="mt-3 text-lg font-bold text-gray-950">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </header>

        <div className="px-6 py-5 max-h-[55vh] overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No history recorded yet.</p>
          ) : (
            <ol className="relative border-l-2 border-gray-100 ml-1.5 space-y-5">
              {events.map((event, index) => (
                <li key={`${event.label}-${index}`} className="relative pl-5">
                  <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[#073B67] ring-4 ring-white" />
                  <p className="text-sm font-bold text-gray-900">
                    {event.label}
                    {event.by ? <span className="font-medium text-gray-500"> · {event.by}</span> : null}
                  </p>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">{formatWhen(event.at) || "—"}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
