"use client";

import { useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Landmark, Network, TriangleAlert, UserRound, Users } from 'lucide-react';
import type { EmployerPortalData, PayrollWorkerRecord } from '@/types/portal';
import { formatInr } from '@/components/contractor/payroll/PayrollCalculator';
import { MatchStateBadge, SourceBadge } from '@/components/contractor/payroll/PayrollProvenance';

/** Employer Payroll Distribution — where Employer-entered payroll routes via
 *  Worker → Site → Contractor mapping. Unmapped workers are flagged, never
 *  silently assigned. */
export default function DistributionView({ portal }: { portal: EmployerPortalData }) {
  const { payroll } = portal;
  const employerRecords = payroll.records.filter(r => r.source === 'Employer');
  const [expanded, setExpanded] = useState<string | null>(null);

  const workerOf = (bssId: string) => portal.workers.find(w => w.bssId === bssId);

  const groups = useMemo(() => {
    const map = new Map<string, PayrollWorkerRecord[]>();
    employerRecords.forEach(record => {
      const contractor = record.contractor ?? workerOf(record.workerId)?.contractor ?? 'Unmapped';
      map.set(contractor, [...(map.get(contractor) ?? []), record]);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [employerRecords, portal.workers]);

  const mapped = employerRecords.filter(r => r.contractor ?? workerOf(r.workerId)?.contractor).length;
  const unmapped = employerRecords.filter(r => !(r.contractor ?? workerOf(r.workerId)?.contractor));
  const totalNet = employerRecords.reduce((s, r) => s + r.netPay, 0);

  return <div className="space-y-5">
    {/* Summary */}
    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Total workers</span><span className="bss-kpi-icon bg-blue-50 text-blue-700"><Users size={16}/></span></div><strong>{employerRecords.length}</strong><p>Employer-entered records</p></article>
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Mapped workers</span><span className="bss-kpi-icon bg-green-50 text-green-700"><Network size={16}/></span></div><strong>{mapped}</strong><p>Worker → Site → Contractor</p></article>
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Unmapped workers</span><span className="bss-kpi-icon bg-red-50 text-red-600"><TriangleAlert size={16}/></span></div><strong>{unmapped.length}</strong><p>MAPPING REQUIRED</p></article>
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Contractors receiving</span><span className="bss-kpi-icon bg-indigo-50 text-indigo-700"><Building2 size={16}/></span></div><strong>{groups.length}</strong><p>Distribution destinations</p></article>
    </section>

    {/* Distribution flow */}
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Distribution · Employer → Site → Contractor</h2><p className="text-xs text-gray-400 mt-0.5">Payroll entered by the Employer is routed automatically using each worker&apos;s binding — no manual redistribution.</p></header>
      <div className="p-5 space-y-3">
        {groups.map(([contractor, records]) => {
          const open = expanded === contractor;
          const net = records.reduce((s, r) => s + r.netPay, 0);
          return <div key={contractor} className="rounded-xl border border-gray-100 overflow-hidden">
            <button onClick={() => setExpanded(open ? null : contractor)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left">
              <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 grid place-items-center flex-shrink-0"><Landmark size={16}/></span>
              <span className="flex-1 min-w-0"><strong className="block text-sm text-gray-900">{contractor}</strong><span className="block text-[11px] text-gray-400 mt-0.5">{records.length} worker{records.length === 1 ? '' : 's'} · net {formatInr(net)}</span></span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{records.length} records</span>
              {open ? <ChevronDown size={15} className="text-gray-300"/> : <ChevronRight size={15} className="text-gray-300"/>}
            </button>
            {open && <div className="border-t border-gray-100 divide-y divide-gray-100">
              {records.map(record => {
                const worker = workerOf(record.workerId);
                return <div key={record.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-gray-50 text-gray-500 grid place-items-center flex-shrink-0"><UserRound size={14}/></span>
                    <div className="min-w-0"><p className="text-sm font-semibold text-gray-900">{record.workerName}</p><p className="text-[11px] text-gray-400">{record.site} · {record.period}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-800">{formatInr(record.netPay)}</span>
                    <SourceBadge source={record.source}/>
                    <MatchStateBadge state={record.matchState}/>
                  </div>
                </div>;
              })}
            </div>}
          </div>;
        })}

        {unmapped.length > 0 && <div className="rounded-xl border border-red-200 bg-red-50/40 overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-red-100 text-red-600 grid place-items-center flex-shrink-0"><TriangleAlert size={16}/></span>
            <div className="flex-1"><strong className="block text-sm text-red-700">MAPPING REQUIRED — {unmapped.length} worker{unmapped.length === 1 ? '' : 's'}</strong><span className="block text-[11px] text-red-500 mt-0.5">No valid Contractor / Site relationship. These workers are not assigned automatically — review each record before release.</span></div>
          </div>
          <div className="border-t border-red-100 divide-y divide-red-50">
            {unmapped.map(record => <div key={record.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0"><span className="w-7 h-7 rounded-lg bg-red-50 text-red-500 grid place-items-center flex-shrink-0"><UserRound size={14}/></span><div className="min-w-0"><p className="text-sm font-semibold text-gray-900">{record.workerName}</p><p className="text-[11px] text-gray-400">{record.site || 'No site'} · {record.period}</p></div></div>
              <div className="flex items-center gap-3"><span className="text-xs font-semibold text-gray-800">{formatInr(record.netPay)}</span><span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">MAPPING REQUIRED</span></div>
            </div>)}
          </div>
        </div>}

        {!employerRecords.length && <p className="py-10 text-center text-sm text-gray-400">No Employer-entered payroll yet. Use Manual Entry or Bulk Upload to create records — they appear here routed by contractor.</p>}
      </div>
      <footer className="px-5 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5"><Landmark size={13}/>Payroll source is <strong className="text-blue-700">Employer Provided</strong> for these records.</span>
        <span>Total net routed: <strong className="text-gray-900">{formatInr(totalNet)}</strong></span>
      </footer>
    </section>
  </div>;
}
