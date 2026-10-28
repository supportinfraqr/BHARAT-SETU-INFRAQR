"use client";

import type { EmployerPortalData } from '@/types/portal';

type Coverage = NonNullable<EmployerPortalData['faceCoverage']>;

export default function FaceDataCoverage({ coverage, siteId, compact = false }: {
  coverage?: Coverage;
  siteId?: string;
  compact?: boolean;
}) {
  if (!coverage) return null;
  const site = siteId ? Number(siteId) : null;
  const workers = coverage.workers.filter(worker => !site || worker.siteIds.includes(site));
  const manual = workers.filter(worker => worker.manualCount > 0);
  const self = workers.filter(worker => worker.selfCount > 0);
  const activeManual = workers.filter(worker => worker.matchSource === 'MANUAL').length;
  const activeSelf = workers.filter(worker => worker.matchSource !== 'MANUAL').length;
  const manualInactive = workers.filter(worker => worker.manualCount > 0 && worker.matchSource !== 'MANUAL').length;
  const metrics: Array<[string, number]> = [
    ['Manual available', manual.length],
    ['Self available', self.length],
    ['Both', workers.filter(worker => worker.manualCount > 0 && worker.selfCount > 0).length],
    ['Active Manual', activeManual],
    ['Active Self', activeSelf],
    ['No face data', workers.filter(worker => worker.manualCount + worker.selfCount === 0).length],
  ];
  return <section className="bss-reveal rounded-3xl border border-[#DBE3EF] bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
      <div>
        <h2 className="text-base font-extrabold text-[#01183A]">Face data coverage</h2>
        <p className="text-[11px] text-bss-text-muted">Manual = client CCTV camera enrollment · Self = worker profile photos. Only the selected source is used for matching.</p>
      </div>
      <span className="text-[11px] font-bold text-[#1E3A8A] bg-[#EEF4FF] border border-[#DBE3EF] rounded-full px-2.5 py-1">{workers.length} bound workers</span>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-[#DBE3EF] bg-[#F8FAFD] p-3">
        <span className="text-[10px] font-bold uppercase tracking-wide text-bss-text-muted">{label}</span>
        <strong className="block mt-1 text-xl text-[#01183A]">{value}</strong>
      </div>)}
    </div>
    {!compact && <div className="mt-4 overflow-x-auto">
      {manual.length ? <table className="w-full text-left text-xs">
        <thead className="text-[10px] uppercase text-bss-text-muted border-b border-[#DBE3EF]">
          <tr><th className="py-2 pr-4">Worker with manual CCTV embeddings</th><th className="py-2 pr-4">BSS ID</th><th className="py-2 pr-4">Manual</th><th className="py-2 pr-4">Self</th><th className="py-2 pr-4">Active source</th><th className="py-2">Last capture</th></tr>
        </thead>
        <tbody>{manual.map(worker => <tr key={worker.bssWorkerId} className="border-b border-[#EEF2F8] last:border-0">
          <td className="py-2 pr-4 font-semibold text-bss-text-primary">{worker.name || worker.bssWorkerId}</td>
          <td className="py-2 pr-4 font-mono text-[11px] text-bss-text-muted">{worker.bssWorkerId}</td>
          <td className="py-2 pr-4">{worker.manualCount}</td>
          <td className="py-2 pr-4">{worker.selfCount}</td>
          <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${worker.matchSource === 'MANUAL' ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-soft-orange text-bss-orange'}`}>{worker.matchSource}</span></td>
          <td className="py-2 text-bss-text-muted">{worker.lastManualCaptureAt ? new Date(worker.lastManualCaptureAt).toLocaleDateString('en-IN') : '—'}</td>
        </tr>)}</tbody>
      </table> : <p className="text-xs text-bss-text-muted">No worker has manual camera embeddings yet.</p>}
    </div>}
    {manualInactive > 0 && <p className="mt-3 text-[11px] font-semibold text-bss-orange">{manualInactive} worker(s) have manual embeddings stored but Self is selected.</p>}
  </section>;
}
