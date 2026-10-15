"use client";

import Link from 'next/link';
import { ArrowLeft, Scale, ShieldCheck, TriangleAlert } from 'lucide-react';
import { ModuleShell } from '@/components/worker/ModuleShell';
import PageHero from '@/components/portal/PageHero';
import { useWorker } from '@/contexts/WorkerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { RULES } from '@/lib/labour-compliance';
const chips: Record<string, string> = {
  fulfilled: 'bg-bss-soft-green text-bss-green',
  pending: 'bg-bss-soft-orange text-bss-orange',
  attention: 'bg-bss-soft-orange text-bss-error',
  exempt: 'bg-bss-bg text-bss-text-muted',
};
const labels: Record<string, string> = { fulfilled: 'Fulfilled', pending: 'In progress', attention: 'Action needed', exempt: 'Not applicable' };

export default function WorkerLabourCompliancePage() {
  const { t } = useLanguage();
  const { portal } = useWorker();
  const byRule = Object.fromEntries(portal.labourLaw.map(item => [item.ruleId, item]));
  const counts = portal.labourLaw.reduce<Record<string, number>>((acc, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc; }, {});

  return <ModuleShell title={t('ui.labourLaw')} description="Central-government compliance results surfaced to you as they occur." icon={Scale} hero={<PageHero title={t('ui.labourLaw')} subtitle="Central-government compliance results surfaced to you as they occur." actions={<Link href="/worker" aria-label="Back to dashboard" className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"><ArrowLeft size={18}/></Link>} />}>
    <div className="text-xs bg-bss-blue-tint border border-bss-border text-bss-text-primary rounded-xl px-4 py-3">Employer scope: <strong>{portal.govtScope === 'central' ? 'Central Government / PSU / central-govt employer' : 'State Government / state-owned entity'}</strong>. Each rule below reflects the latest status for your record; it updates on the occurrence/event/fulfilment of the condition.</div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Object.entries(counts).map(([status, value]) => <div key={status} className="bss-3d bss-scroll-rise bss-card rounded-2xl p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${chips[status]}`}>{labels[status]}</span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-bss-text-muted">rules</p></div>)}</div>

    <div className="space-y-3">
      {RULES.map(rule => {
        const item = byRule[rule.id];
        const status = item?.status ?? 'exempt';
        return <article key={rule.id} className="bss-3d bss-scroll-rise bss-card rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-bss-text-primary">{rule.title}</h2><p className="text-[11px] text-bss-text-muted mt-0.5">{rule.application}</p></div><span className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold ${chips[status]}`}>{labels[status]}</span></div>
          {item ? <p className="text-sm text-bss-text-secondary mt-3">{item.detail}</p> : <p className="text-sm text-bss-text-muted mt-3">No event recorded yet for this rule.</p>}
          {item && <p className="text-[11px] text-bss-text-muted mt-2">Updated: {item.updatedAt}</p>}
          <p className="mt-3 pt-3 border-t border-bss-border text-[11px] text-bss-text-muted">State note: {rule.stateNote}</p>
        </article>;
      })}
    </div>
    <div className="flex flex-wrap gap-2 text-[11px] text-bss-text-muted"><span className="inline-flex items-center gap-1"><ShieldCheck size={12} className="text-bss-green"/>Fulfilled</span><span className="inline-flex items-center gap-1"><TriangleAlert size={12} className="text-bss-orange"/>Action needed</span></div>
  </ModuleShell>;
}
