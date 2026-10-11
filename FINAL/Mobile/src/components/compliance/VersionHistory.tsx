"use client";
import { useState } from 'react';
import { formatDate } from '@/lib/date';
import { History, X } from 'lucide-react';

export type VersionItem = { version: number; isCurrent: boolean; status?: string; date?: string; sub?: string };

// A compact "V# · n" badge that opens the version history. Rendered as a
// centered modal (not an absolute popover) so it is never clipped by the
// scrollable tables it sits in — and it fits mobile screens.
export default function VersionHistory({ versions }: { versions?: VersionItem[] }) {
  const [open, setOpen] = useState(false);
  if (!versions || versions.length === 0) return null;
  const current = versions.find(v => v.isCurrent) ?? versions[versions.length - 1];
  const badge = `V${current.version}`;
  if (versions.length === 1) {
    return <span title={`Version ${current.version}`} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">{badge}</span>;
  }
  const ordered = [...versions].sort((a, b) => a.version - b.version);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={`${versions.length} versions — view history`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
        <History size={10} />{badge}<span className="text-blue-400">·{versions.length}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Version history" onClick={() => setOpen(false)}>
          <div className="flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Version history <span className="text-gray-300">· {ordered.length}</span></p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-50"><X size={15} /></button>
            </header>
            <ul className="divide-y divide-gray-50 overflow-y-auto p-2 text-xs">
              {ordered.map(v => (
                <li key={v.version} className="flex items-center gap-2 px-2 py-2">
                  <span className="w-7 shrink-0 font-bold text-gray-700">V{v.version}</span>
                  <span className="min-w-0 flex-1 truncate text-gray-500">{v.sub || v.status || ''}</span>
                  {v.date && <span className="whitespace-nowrap text-gray-400">{formatDate(v.date)}</span>}
                  {v.isCurrent
                    ? <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">Current</span>
                    : <span className="shrink-0 text-[9px] text-gray-400">History</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
