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
      <article className="bss-kpi-card bss-hover-lift"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-muted">Total workers</span><span className="bss-kpi-icon bg-bss-blue-tint text-bss-interactive-blue"><Users size={16}/></span></div><strong>{employerRecords.length}</strong><p>Employer-entered records</p></article>
      <article className="bss-kpi-card bss-hover-lift"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-muted">Mapped workers</span><span className="bss-kpi-icon bg-bss-soft-green text-bss-green"><Network size={16}/></span></div><strong>{mapped}</strong><p>Worker → Site → Contractor</p></article>
      <article className="bss-kpi-card bss-hover-lift"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-muted">Unmapped workers</span><span className="bss-kpi-icon bg-bss-soft-orange text-bss-error"><TriangleAlert size={16}/></span></div><strong>{unmapped.length}</strong><p>MAPPING REQUIRED</p></article>
      <article className="bss-kpi-card bss-hover-lift"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-muted">Contractors receiving</span><span className="bss-kpi-icon bg-bss-blue-tint text-bss-interactive-blue"><Building2 size={16}/></span></div><strong>{groups.length}</strong><p>Distribution destinations</p></article>
    </section>

    {/* Distribution flow */}
    <section className="bss-card rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-bss-border"><h2 className="text-sm font-semibold text-bss-text-primary">Distribution · Employer → Site → Contractor</h2><p className="text-xs text-bss-text-muted mt-0.5">Payroll entered by the Employer is routed automatically using each worker&apos;s binding — no manual redistribution.</p></header>
      <div className="p-5 space-y-3">
        {groups.map(([contractor, records]) => {
          const open = expanded === contractor;
          const net = records.reduce((s, r) => s + r.netPay, 0);
          return <div key={contractor} className="rounded-xl border border-bss-border overflow-hidden">
            <button onClick={() => setExpanded(open ? null : contractor)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-bss-bg text-left">
              <span className="w-9 h-9 rounded-lg bg-bss-blue-tint text-bss-interactive-blue grid place-items-center flex-shrink-0"><Landmark size={16}/></span>
              <span className="flex-1 min-w-0"><strong className="block text-sm text-bss-text-primary">{contractor}</strong><span className="block text-[11px] text-bss-text-muted mt-0.5">{records.length} worker{records.length === 1 ? '' : 's'} · net {formatInr(net)}</span></span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bss-blue-tint text-bss-interactive-blue">{records.length} records</span>
              {open ? <ChevronDown size={15} className="text-bss-text-muted"/> : <ChevronRight size={15} className="text-bss-text-muted"/>}
            </button>
            {open && <div className="border-t border-bss-border divide-y divide-bss-border">
              {records.map(record => {
                const worker = workerOf(record.workerId);
                return <div key={record.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-bss-bg text-bss-text-muted grid place-items-center flex-shrink-0"><UserRound size={14}/></span>
                    <div className="min-w-0"><p className="text-sm font-semibold text-bss-text-primary">{record.workerName}</p><p className="text-[11px] text-bss-text-muted">{record.site} · {record.period}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-bss-text-primary">{formatInr(record.netPay)}</span>
                    <SourceBadge source={record.source}/>
                    <MatchStateBadge state={record.matchState}/>
                  </div>
                </div>;
              })}
            </div>}
          </div>;
        })}

        {unmapped.length > 0 && <div className="rounded-xl border border-bss-border bg-bss-soft-orange/40 overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-bss-soft-orange text-bss-error grid place-items-center flex-shrink-0"><TriangleAlert size={16}/></span>
            <div className="flex-1"><strong className="block text-sm text-bss-error">MAPPING REQUIRED — {unmapped.length} worker{unmapped.length === 1 ? '' : 's'}</strong><span className="block text-[11px] text-bss-error mt-0.5">No valid Contractor / Site relationship. These workers are not assigned automatically — review each record before release.</span></div>
          </div>
          <div className="border-t border-bss-border divide-y divide-bss-border">
            {unmapped.map(record => <div key={record.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0"><span className="w-7 h-7 rounded-lg bg-bss-soft-orange text-bss-error grid place-items-center flex-shrink-0"><UserRound size={14}/></span><div className="min-w-0"><p className="text-sm font-semibold text-bss-text-primary">{record.workerName}</p><p className="text-[11px] text-bss-text-muted">{record.site || 'No site'} · {record.period}</p></div></div>
              <div className="flex items-center gap-3"><span className="text-xs font-semibold text-bss-text-primary">{formatInr(record.netPay)}</span><span className="text-[10px] font-bold text-bss-error bg-bss-soft-orange border border-bss-border rounded-full px-2 py-0.5">MAPPING REQUIRED</span></div>
            </div>)}
          </div>
        </div>}

        {!employerRecords.length && <p className="py-10 text-center text-sm text-bss-text-muted">No Employer-entered payroll yet. Use Manual Entry or Bulk Upload to create records — they appear here routed by contractor.</p>}
      </div>
      <footer className="px-5 py-3 border-t border-bss-border flex flex-wrap items-center justify-between gap-2 text-xs text-bss-text-muted">
        <span className="inline-flex items-center gap-1.5"><Landmark size={13}/>Payroll source is <strong className="text-bss-interactive-blue">Employer Provided</strong> for these records.</span>
        <span>Total net routed: <strong className="text-bss-text-primary">{formatInr(totalNet)}</strong></span>
      </footer>
    </section>
  </div>;
}
