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
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Project network</p><h1 className="text-2xl font-bold mt-1">Site Overview</h1><p className="text-sm text-gray-500 mt-1">A consolidated view of every project site in your workforce ecosystem.</p></header>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Total sites" value={employer.sites.length} icon={Building2} tone="bg-blue-50 text-blue-700"/><Metric label="Active / planned" value={`${active.length}/${planned.length}`} icon={MapPin} tone="bg-emerald-50 text-emerald-700"/><Metric label="Workers across sites" value={totalWorkers} icon={Users} tone="bg-orange-50 text-orange-700"/><Metric label="Requires attention" value={nonCompliant.length} icon={ShieldCheck} tone="bg-red-50 text-red-700"/></div>

    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {employer.sites.map(site => <article key={site.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100"><div className="flex items-start justify-between gap-3"><span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><Building2 size={19}/></span><Status value={site.status}/></div><h2 className="font-semibold text-gray-950 mt-4">{site.name}</h2><p className="font-mono text-[11px] text-gray-400 mt-1">{site.code}</p><p className="text-xs text-gray-500 flex items-center gap-1 mt-3"><MapPin size={12}/>{site.location}, {site.state}</p></div>
        <div className="flex justify-between items-center px-5 py-3 text-xs text-gray-500"><span><strong className="text-gray-900">{site.contractorIds.length}</strong> contractors</span><span><strong className="text-gray-900">{site.workers}</strong> workers</span></div>
        <div className="px-5 pb-5 mt-auto"><div className="flex justify-between text-xs mb-1.5"><span className="text-gray-600">Compliance</span><strong className={site.compliance >= 90 ? 'text-green-700' : site.compliance >= 80 ? 'text-orange-700' : 'text-red-700'}>{site.compliance}%</strong></div><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${site.compliance >= 90 ? 'bg-green-600' : site.compliance >= 80 ? 'bg-orange-500' : 'bg-red-600'}`} style={{ width:`${site.compliance}%` }}/></div></div>
        <Link href={`/employer/sites/${site.id}`} className="h-10 bg-gray-50 text-xs font-semibold text-[#073B67] flex items-center justify-center gap-1 hover:bg-gray-100">View Site <ArrowRight size={14}/></Link>
      </article>)}
    </div>

    <section className="grid lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5"><h2 className="text-sm font-semibold text-gray-900">Workforce by site</h2><p className="text-[11px] text-gray-400 mt-0.5">Distribution of connected workers across active sites</p><div className="space-y-4 mt-5">{employer.sites.map(site => <div key={site.id}><div className="flex justify-between text-xs mb-2"><span className="text-gray-700">{site.name}</span><strong>{site.workers}</strong></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#155E95]" style={{ width:`${Math.min(100, site.workers / Math.max(1, totalWorkers) * 100)}%` }}/></div></div>)}</div></section>
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden"><header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">Compliance by site</h2></header><div className="divide-y divide-gray-100">{employer.sites.map(site => <div key={site.id} className="px-5 py-3 flex justify-between items-center"><span className="text-xs text-gray-700">{site.name}</span><span className={site.compliance >= 90 ? 'text-green-700' : site.compliance >= 80 ? 'text-orange-700' : 'text-red-700'}>{site.compliance}%</span></div>)}</div></section>
    </section>
  </div>;
}

function Status({ value }: { value:string }) { const tone = value === 'Active' ? 'bg-green-50 text-green-700' : value === 'Planned' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'; return <span className={`text-[10px] font-bold px-2 py-1 rounded ${tone}`}>{value}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:string | number; icon:typeof Building2; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
