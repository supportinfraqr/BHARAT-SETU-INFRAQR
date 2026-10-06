"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";

export type ConfirmDetail = { label: string; value: string };

/**
 * Polished two-step confirmation dialog shared by all binding/binding-request
 * actions (accept / decline / approve / reject / unbind). Centered card with a
 * status icon, a details summary, and a clear primary action.
 */
export default function ConfirmDialog({
  open,
  tone,
  title,
  description,
  details,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  tone: "positive" | "negative";
  title: string;
  description: string;
  details: ConfirmDetail[];
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  const positive = tone === "positive";
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/65 backdrop-blur-md overflow-y-auto"
      onClick={() => { if (!busy) onCancel(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in zoom-in-95 fade-in duration-200"
        onClick={event => event.stopPropagation()}
      >
        {/* Header decoration bar */}
        <div className={`h-2.5 w-full ${positive ? "bg-gradient-to-r from-emerald-500 to-teal-600" : "bg-gradient-to-r from-rose-500 to-red-600"}`} />

        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label="Close"
          className="absolute right-4 top-5 w-8 h-8 grid place-items-center rounded-full bg-gray-50 border border-gray-200/60 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-40"
        >
          <X size={16} />
        </button>

        <div className="p-6 pt-5 text-center">
          <div className={`mx-auto w-14 h-14 rounded-2xl grid place-items-center shadow-inner ${positive ? "bg-emerald-50 text-emerald-600 border border-emerald-100/80" : "bg-rose-50 text-rose-600 border border-rose-100/80"}`}>
            {positive ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
          </div>
          <h2 className="mt-3.5 text-xl font-bold text-gray-900 tracking-tight">{title}</h2>
          <p className="mt-1.5 text-xs sm:text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{description}</p>
        </div>

        {details.length > 0 && (
          <div className="px-6 pb-2">
            <div className="rounded-2xl border border-gray-200/80 bg-slate-50/70 p-1 divide-y divide-gray-200/60 max-h-48 overflow-y-auto">
              {details.map((detail, idx) => (
                <div key={`${detail.label}-${idx}`} className="flex items-start justify-between gap-4 px-4 py-2.5">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400 shrink-0 pt-0.5">{detail.label}</dt>
                  <dd className="text-xs sm:text-sm font-semibold text-gray-900 font-mono text-right break-words max-w-[70%]">{detail.value}</dd>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 pt-4 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 h-11 px-4 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 h-11 px-4 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait ${positive ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20" : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"}`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

