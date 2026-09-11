"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, CalendarDays, MapPin, Plus, ShieldCheck, Users } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerSite } from '@/types/portal';
import SiteCreateForm from '@/components/employer/SiteCreateForm';

export default function EmployerSitesPage() {
  const { employer, replaceEmployer, mutate } = useEmployer();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const result = await mutate<{ success?: boolean; data?: Partial<EmployerSite> }>('sites', 'POST', payload);
      const created: EmployerSite = {
        id: result?.data?.id != null ? String(result.data.id) : `SITE-${Date.now()}`,
        code: String(payload.code ?? ''),
        name: String(payload.name ?? ''),
        location: String(payload.location ?? ''),
        state: String(payload.state ?? ''),
        startDate: String(payload.startDate ?? ''),
        endDate: String(payload.endDate ?? ''),
        status: (String(payload.status ?? 'Active')) as EmployerSite['status'],
        contractorIds: [], workers: 0, compliance: 0, details: {} as EmployerSite['details'],
      };
      replaceEmployer({ ...employer, sites: [created, ...employer.sites], stats: { ...employer.stats, activeSites: employer.stats.activeSites + (created.status === 'Active' ? 1 : 0) } });
      setOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Site could not be created.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <header className="flex flex-col sm:flex-row justify-between gap-4"><div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Project network</p><h1 className="text-2xl font-bold mt-1">Sites</h1><p className="text-sm text-gray-500 mt-1">Projects linking your contractors, workers, and compliance records.</p></div><button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg bg-gray-950 text-white text-sm font-semibold flex items-center justify-center gap-2"><Plus size={16}/>Add site</button></header>

    <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {employer.sites.map(site => <article key={site.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100"><div className="flex items-start justify-between gap-3"><span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><Building2 size={19}/></span><span className={`text-[10px] font-bold px-2 py-1 rounded ${site.status === 'Active' ? 'bg-green-50 text-green-700' : site.status === 'Planned' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{site.status}</span></div><h2 className="font-semibold text-gray-950 mt-4">{site.name}</h2><p className="font-mono text-[11px] text-gray-400 mt-1">{site.code}</p><p className="text-xs text-gray-500 flex items-center gap-1 mt-3"><MapPin size={12}/>{site.location}, {site.state}</p></div>
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100"><SmallMetric icon={Users} value={site.workers} label="Workers"/><SmallMetric icon={Building2} value={site.contractorIds.length} label="Contractors"/><SmallMetric icon={ShieldCheck} value={`${site.compliance}%`} label="Compliance"/></div>
        <div className="p-4 text-[11px] text-gray-500 flex items-center gap-2"><CalendarDays size={13}/><span>{site.startDate}</span><span>to</span><span>{site.endDate}</span></div>
        <Link href={`/employer/sites/${site.id}`} className="h-9 bg-gray-50 text-xs font-semibold text-[#073B67] flex items-center justify-center gap-1 hover:bg-gray-100">View Site <ArrowRight size={14}/></Link>
      </article>)}
    </section>

    {open && <SiteCreateForm busy={busy} error={error} onSubmit={submit} onClose={() => setOpen(false)} />}
  </div>;
}

function SmallMetric({ icon:Icon, value, label }: { icon:typeof Users; value:string | number; label:string }) { return <div className="p-3 text-center"><Icon size={13} className="mx-auto text-gray-400"/><strong className="block text-sm mt-1">{value}</strong><span className="text-[9px] uppercase tracking-wider text-gray-400">{label}</span></div>; }
