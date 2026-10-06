"use client";
import { useState } from 'react';
import { History } from 'lucide-react';

export type VersionItem = { version: number; isCurrent: boolean; status?: string; date?: string; sub?: string };

// A compact "V# · n" badge that expands into the version history. Used for both
// generated CLRA register batches and submitted audit reports.
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
    <span className="relative inline-block">
      <button type="button" onClick={() => setOpen(o => !o)} title={`${versions.length} versions — view history`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
        <History size={10} />{badge}<span className="text-blue-400">·{versions.length}</span>
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 right-0 w-60 rounded-xl border border-gray-200 bg-white shadow-lg p-2 text-[11px]">
            <p className="px-1 pb-1 font-extrabold text-gray-400 uppercase tracking-wider text-[9px]">Version history</p>
            <ul className="space-y-0.5 max-h-56 overflow-y-auto">
              {ordered.map(v => (
                <li key={v.version} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-gray-50">
                  <span className="font-bold text-gray-700 w-6">V{v.version}</span>
                  <span className="flex-1 text-gray-500 truncate">{v.sub || v.status || ''}</span>
                  {v.date && <span className="text-gray-400 whitespace-nowrap">{v.date}</span>}
                  {v.isCurrent
                    ? <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">Current</span>
                    : <span className="text-[9px] text-gray-400">History</span>}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </span>
  );
}
