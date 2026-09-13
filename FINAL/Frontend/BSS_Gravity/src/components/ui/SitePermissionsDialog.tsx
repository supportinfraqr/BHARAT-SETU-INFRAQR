"use client";

import type { ReactNode } from "react";
import { Check, MapPin, Plus, ShieldCheck, X } from "lucide-react";

export type SitePermissionStatus = "Approved" | "Pending" | "Rejected" | "None";

export type SitePermissionRow = {
  siteId: number;
  name: string;
  code: string;
  status: SitePermissionStatus;
  source?: string;
  isDefault?: boolean;
  canApprove?: boolean;
  canReject?: boolean;
  canPropose?: boolean;
};

const STATUS_STYLE: Record<SitePermissionStatus, string> = {
  Approved: "bg-green-50 text-green-700 ring-green-100",
  Pending: "bg-orange-50 text-orange-700 ring-orange-100",
  Rejected: "bg-red-50 text-red-700 ring-red-100",
  None: "bg-gray-100 text-gray-500 ring-gray-200",
};

function sourceLabel(source?: string): string {
  if (source === "contractor_request") return "requested by contractor";
  if (source === "employer_allot") return "proposed by employer";
  if (source === "site_qr") return "via site QR";
  return "";
}

/**
 * Polished, site-wise permission dialog shared by the contractor and employer
 * binding-request pages. Renders each site with its two-step allotment status
 * and the actions available to the current party.
 */
export default function SitePermissionsDialog({
  open,
  title,
  subtitle,
  intro,
  rows,
  busy,
  note,
  footer,
  onClose,
  onApprove,
  onReject,
  onPropose,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  intro: string;
  rows: SitePermissionRow[];
  busy: boolean;
  note?: string;
  footer?: ReactNode;
  onClose: () => void;
  onApprove: (siteId: number) => void;
  onReject: (siteId: number) => void;
  onPropose: (siteId: number) => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center p-4 bg-slate-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 fade-in duration-200"
        onClick={event => event.stopPropagation()}
      >
        <header className="relative px-6 pt-6 pb-4 border-b border-gray-100">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 w-9 h-9 grid place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={17} />
          </button>
          <span className="w-11 h-11 rounded-2xl bg-[#073B67]/5 text-[#073B67] grid place-items-center">
            <ShieldCheck size={20} />
          </span>
          <h2 className="mt-3 text-lg font-bold text-gray-950">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </header>

        <div className="px-6 py-4 overflow-y-auto">
          <p className="text-xs text-gray-500 bg-blue-50/60 border border-blue-100 rounded-xl px-3 py-2.5 leading-5">{intro}</p>
          {rows.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No sites yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {rows.map(row => (
                <li key={row.siteId} className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 rounded-2xl px-3.5 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 grid place-items-center flex-shrink-0">
                      <MapPin size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate flex items-center gap-1.5">
                        {row.name}
                        {row.isDefault && <span className="text-[10px] font-bold text-[#F47A32]">Default</span>}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono truncate">
                        {row.code}{sourceLabel(row.source) ? ` · ${sourceLabel(row.source)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ring-1 ${STATUS_STYLE[row.status]}`}>
                      {row.status === "None" ? "Not proposed" : row.status}
                    </span>
                    {row.canApprove && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onApprove(row.siteId)}
                        className="h-8 px-3 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-60 inline-flex items-center gap-1"
                      >
                        <Check size={13} />Approve
                      </button>
                    )}
                    {row.canReject && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onReject(row.siteId)}
                        className="h-8 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-60"
                      >
                        Reject
                      </button>
                    )}
                    {row.canPropose && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onPropose(row.siteId)}
                        className="h-8 px-3 rounded-lg bg-[#073B67] text-white text-xs font-bold hover:bg-[#062D4F] transition-colors disabled:opacity-60 inline-flex items-center gap-1"
                      >
                        <Plus size={13} />Propose
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {note && <p className="text-[11px] text-orange-600 mt-3 leading-5">{note}</p>}
        </div>

        <footer className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          {footer}
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors ml-auto"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
