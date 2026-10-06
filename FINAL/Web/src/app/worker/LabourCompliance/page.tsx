"use client";

import { Scale, ShieldCheck, TriangleAlert } from 'lucide-react';
import { ModuleShell } from '@/components/worker/ModuleShell';
import { useWorker } from '@/contexts/WorkerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { RULES } from '@/lib/labour-compliance';
const chips: Record<string, string> = {
  fulfilled: 'bg-green-50 text-green-700',
  pending: 'bg-orange-50 text-orange-700',
  attention: 'bg-red-50 text-red-700',
  exempt: 'bg-gray-100 text-gray-500',
};
const labels: Record<string, string> = { fulfilled: 'Fulfilled', pending: 'In progress', attention: 'Action needed', exempt: 'Not applicable' };

export default function WorkerLabourCompliancePage() {
  const { t } = useLanguage();
  const { portal } = useWorker();
  const byRule = Object.fromEntries(portal.labourLaw.map(item => [item.ruleId, item]));
  const counts = portal.labourLaw.reduce<Record<string, number>>((acc, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc; }, {});

  return <ModuleShell title={t('ui.labourLaw')} description="Central-government compliance results surfaced to you as they occur." icon={Scale}>
    <div className="text-xs bg-blue-50 border border-blue-100 text-blue-800 rounded-xl px-4 py-3">Employer scope: <strong>{portal.govtScope === 'central' ? 'Central Government / PSU / central-govt employer' : 'State Government / state-owned entity'}</strong>. Each rule below reflects the latest status for your record; it updates on the occurrence/event/fulfilment of the condition.</div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Object.entries(counts).map(([status, value]) => <div key={status} className="bg-white border border-gray-200 rounded-xl p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${chips[status]}`}>{labels[status]}</span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">rules</p></div>)}</div>

    <div className="space-y-3">
      {RULES.map(rule => {
        const item = byRule[rule.id];
        const status = item?.status ?? 'exempt';
        return <article key={rule.id} className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-gray-900">{rule.title}</h2><p className="text-[11px] text-gray-400 mt-0.5">{rule.application}</p></div><span className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold ${chips[status]}`}>{labels[status]}</span></div>
          {item ? <p className="text-sm text-gray-700 mt-3">{item.detail}</p> : <p className="text-sm text-gray-500 mt-3">No event recorded yet for this rule.</p>}
          {item && <p className="text-[11px] text-gray-400 mt-2">Updated: {item.updatedAt}</p>}
          <p className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-400">State note: {rule.stateNote}</p>
        </article>;
      })}
    </div>
    <div className="flex flex-wrap gap-2 text-[11px] text-gray-500"><span className="inline-flex items-center gap-1"><ShieldCheck size={12} className="text-green-600"/>Fulfilled</span><span className="inline-flex items-center gap-1"><TriangleAlert size={12} className="text-orange-600"/>Action needed</span></div>
  </ModuleShell>;
}
