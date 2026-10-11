"use client";

import Link from 'next/link';
import { ArrowRight, Building2, MapPin, ShieldCheck, Users } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';

export default function EmployerSiteOverviewPage() {
  const { employer } = useEmployer();
  const active = employer.sites.filter(site => site.status === 'Active');
  const planned = employer.sites.filter(site => site.status === 'Planned');
  const nonCompliant = employer.sites.filter(site => site.compliance < 90);
  const totalWorkers = employer.sites.reduce((sum, site) => sum + site.workers, 0);

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Project network</p><h1 className="text-2xl font-bold mt-1">Site Overview</h1><p className="text-sm text-bss-text-muted mt-1">A consolidated view of every project site in your workforce ecosystem.</p></header>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Total sites" value={employer.sites.length} icon={Building2} tone="bg-bss-blue-tint text-bss-interactive-blue"/><Metric label="Active / planned" value={`${active.length}/${planned.length}`} icon={MapPin} tone="bg-bss-soft-green text-bss-green"/><Metric label="Workers across sites" value={totalWorkers} icon={Users} tone="bg-bss-soft-orange text-bss-orange"/><Metric label="Requires attention" value={nonCompliant.length} icon={ShieldCheck} tone="bg-bss-soft-orange text-bss-error"/></div>

    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {employer.sites.map(site => <article key={site.id} className="bss-card rounded-2xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-bss-border"><div className="flex items-start justify-between gap-3"><span className="w-10 h-10 rounded-xl bg-bss-blue-tint text-bss-interactive-blue grid place-items-center"><Building2 size={19}/></span><Status value={site.status}/></div><h2 className="font-semibold text-bss-text-primary mt-4">{site.name}</h2><p className="font-mono text-[11px] text-bss-text-muted mt-1">{site.code}</p><p className="text-xs text-bss-text-muted flex items-center gap-1 mt-3"><MapPin size={12}/>{site.location}, {site.state}</p></div>
        <div className="flex justify-between items-center px-5 py-3 text-xs text-bss-text-muted"><span><strong className="text-bss-text-primary">{site.contractorIds.length}</strong> contractors</span><span><strong className="text-bss-text-primary">{site.workers}</strong> workers</span></div>
        <div className="px-5 pb-5 mt-auto"><div className="flex justify-between text-xs mb-1.5"><span className="text-bss-text-secondary">Compliance</span><strong className={site.compliance >= 90 ? 'text-bss-green' : site.compliance >= 80 ? 'text-bss-orange' : 'text-bss-error'}>{site.compliance}%</strong></div><div className="h-1.5 bg-bss-bg rounded-full overflow-hidden"><div className={`h-full rounded-full ${site.compliance >= 90 ? 'bg-bss-green' : site.compliance >= 80 ? 'bg-bss-orange' : 'bg-bss-error'}`} style={{ width:`${site.compliance}%` }}/></div></div>
        <Link href={`/employer/sites/${site.id}`} className="h-10 bg-bss-bg text-xs font-semibold text-[#01183A] flex items-center justify-center gap-1 hover:bg-bss-bg">View Site <ArrowRight size={14}/></Link>
      </article>)}
    </div>

    <section className="grid lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 bss-card rounded-2xl p-5"><h2 className="text-sm font-semibold text-bss-text-primary">Workforce by site</h2><p className="text-[11px] text-bss-text-muted mt-0.5">Distribution of connected workers across active sites</p><div className="space-y-4 mt-5">{employer.sites.map(site => <div key={site.id}><div className="flex justify-between text-xs mb-2"><span className="text-bss-text-primary">{site.name}</span><strong>{site.workers}</strong></div><div className="h-2 bg-bss-bg rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#1E3A8A]" style={{ width:`${Math.min(100, site.workers / Math.max(1, totalWorkers) * 100)}%` }}/></div></div>)}</div></section>
      <section className="bss-card rounded-2xl overflow-hidden"><header className="px-5 py-4 border-b border-bss-border"><h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2">Compliance by site</h2></header><div className="divide-y divide-bss-border">{employer.sites.map(site => <div key={site.id} className="px-5 py-3 flex justify-between items-center"><span className="text-xs text-bss-text-primary">{site.name}</span><span className={site.compliance >= 90 ? 'text-bss-green' : site.compliance >= 80 ? 'text-bss-orange' : 'text-bss-error'}>{site.compliance}%</span></div>)}</div></section>
    </section>
  </div>;
}

function Status({ value }: { value:string }) { const tone = value === 'Active' ? 'bg-bss-soft-green text-bss-green' : value === 'Planned' ? 'bg-bss-blue-tint text-bss-interactive-blue' : 'bg-bss-bg text-bss-text-secondary'; return <span className={`text-[10px] font-bold px-2 py-1 rounded ${tone}`}>{value}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:string | number; icon:typeof Building2; tone:string }) { return <div className="bg-white border border-bss-border rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-bss-text-muted">{label}</p></div>; }
