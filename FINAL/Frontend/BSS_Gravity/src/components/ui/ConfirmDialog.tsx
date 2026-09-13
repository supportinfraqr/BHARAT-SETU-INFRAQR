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
      className="fixed inset-0 z-[95] grid place-items-center p-4 bg-slate-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => { if (!busy) onCancel(); }}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl ring-1 ring-black/5 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={event => event.stopPropagation()}
      >
        <div className="relative p-6 pb-5 text-center">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
            className="absolute right-4 top-4 w-9 h-9 grid place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-40"
          >
            <X size={17} />
          </button>
          <span className={`mx-auto w-16 h-16 rounded-full grid place-items-center ${positive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
            {positive ? <CheckCircle2 size={30} /> : <XCircle size={30} />}
          </span>
          <h2 className="mt-4 text-lg font-bold text-gray-950">{title}</h2>
          <p className="mt-1.5 text-sm text-gray-500 leading-6">{description}</p>
        </div>

        {details.length > 0 && (
          <div className="px-6">
            <dl className="rounded-2xl border border-gray-100 bg-gray-50/70 divide-y divide-gray-100 overflow-hidden">
              {details.map(detail => (
                <div key={detail.label} className="flex items-center justify-between gap-4 px-4 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{detail.label}</dt>
                  <dd className="text-sm font-semibold text-gray-800 text-right break-words">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="p-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-11 px-5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`h-11 px-6 rounded-xl text-white text-sm font-bold shadow-sm transition-all disabled:opacity-60 disabled:cursor-wait ${positive ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
