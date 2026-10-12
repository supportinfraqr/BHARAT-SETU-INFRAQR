"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Building2, MapPin, X } from "lucide-react";
import { tabs, type Tab, TAB_FIELDS, LABELS, FIELD_DEFS } from "@/components/site/siteDetailFields";

const noopSubscribe = () => () => {};

export type ContractorSiteDetail = {
  id?: string;
  name: string;
  code: string;
  bssId?: string;
  employer?: string;
  location?: string;
  state?: string;
  status?: string;
  hasAgreement?: boolean;
  agreementName?: string;
  data?: Record<string, unknown>;
};

/** Read-only view of a site's full master details, shown to a contractor for a
 *  site the employer has allotted to them (same fields the employer edits). */
export default function ContractorSiteDetailDialog({
  open,
  site,
  onClose,
}: {
  open: boolean;
  site: ContractorSiteDetail | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("basic");
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!open || !mounted || !site) return null;
  const data = (site.data ?? {}) as Record<string, unknown>;
  const fieldValue = (name: string) => {
    const value = data[name];
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-bss-navy/40 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Site details"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-bss-border overflow-hidden my-auto"
        onClick={event => event.stopPropagation()}
      >
        <header className="relative px-6 pt-6 pb-4 border-b border-bss-border">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 w-9 h-9 grid place-items-center rounded-full bg-bss-bg border border-bss-border text-bss-text-muted hover:bg-bss-blue-tint hover:text-bss-text-primary transition-colors"><X size={18} /></button>
          <span className="w-11 h-11 rounded-2xl bg-bss-blue-tint text-bss-interactive-blue grid place-items-center"><Building2 size={20} /></span>
          <h2 className="mt-3 text-lg font-bold text-bss-text-primary">{site.name}</h2>
          <p className="text-xs text-bss-text-secondary mt-0.5">
            {site.bssId ? <span className="font-mono text-bss-interactive-blue">{site.bssId}</span> : null}
            {site.code ? `${site.bssId ? " · " : ""}${site.code}` : ""}
            {site.employer ? ` · ${site.employer}` : ""}
          </p>
          {(site.location || site.state) && (
            <p className="text-xs text-bss-text-secondary flex items-center gap-1 mt-1"><MapPin size={12} />{[site.location, site.state].filter(Boolean).join(", ")}</p>
          )}
        </header>

        <nav className="flex gap-1 overflow-x-auto px-4 py-2 border-b border-bss-border">
          {tabs.map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${tab === id ? "bg-bss-navy text-white" : "text-bss-text-secondary hover:bg-bss-bg"}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </nav>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
            {TAB_FIELDS[tab].map(name => {
              const def = FIELD_DEFS[name] ?? { label: LABELS[name] ?? name };
              return (
                <div key={name}>
                  <dt className="text-[11px] uppercase font-semibold text-bss-text-muted">{def.label ?? name}</dt>
                  <dd className="text-sm font-medium mt-1 text-bss-text-primary break-words">{fieldValue(name)}</dd>
                </div>
              );
            })}
          </dl>
        </div>

        <footer className="px-6 py-4 border-t border-bss-border flex items-center justify-between gap-3">
          {site.hasAgreement && site.id ? (
            <a href={`/api/site-agreement/${site.id}`}
               target="_blank" rel="noreferrer"
               className="h-10 px-4 rounded-xl border border-bss-border text-sm font-semibold text-bss-interactive-blue hover:bg-bss-blue-tint flex items-center gap-1.5">
              Site agreement (PDF)
            </a>
          ) : <span className="text-xs text-bss-text-muted">No site agreement uploaded.</span>}
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-xl border border-bss-border text-sm font-semibold text-bss-text-primary hover:bg-bss-bg transition-colors">Close</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
