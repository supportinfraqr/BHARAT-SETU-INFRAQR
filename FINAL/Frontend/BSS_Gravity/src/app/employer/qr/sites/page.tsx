"use client";

import Link from 'next/link';
import { ArrowRight, Building2, MapPin, QrCode, Users } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';

export default function EmployerQrSitesPage() {
  const { employer } = useEmployer();
  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">QR system</p><h1 className="text-2xl font-bold mt-1">My Sites (QR)</h1><p className="text-sm text-gray-500 mt-1">Site records drawn from the shared site model rather than a separate QR dataset.</p></header>
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {employer.sites.map(site => <article key={site.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="p-5"><div className="flex items-start justify-between gap-3"><span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><QrCode size={19}/></span><span className={`text-[10px] font-bold px-2 py-1 rounded ${site.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{site.status}</span></div><h2 className="font-semibold text-gray-950 mt-4">{site.name}</h2><p className="font-mono text-[11px] text-gray-400 mt-1">{site.code}</p><p className="text-xs text-gray-500 flex items-center gap-1 mt-3"><MapPin size={12}/>{site.location}, {site.state}</p></div>
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-y border-gray-100"><Small icon={Users} value={site.workers} label="Workers"/><Small icon={Building2} value={site.contractorIds.length} label="Contractors"/><Small icon={MapPin} value={`${site.compliance}%`} label="Compliance"/></div>
        <Link href={`/employer/sites/${site.id}`} className="h-10 bg-gray-50 text-xs font-semibold text-[#073B67] flex items-center justify-center gap-1 hover:bg-gray-100">View Site <ArrowRight size={14}/></Link>
      </article>)}
    </div>
  </div>;
}
function Small({ icon:Icon, value, label }: { icon:typeof Users; value:string | number; label:string }) { return <div className="p-3 text-center"><Icon size={13} className="mx-auto text-gray-400"/><strong className="block text-sm mt-1">{value}</strong><span className="text-[9px] uppercase tracking-wider text-gray-400">{label}</span></div>; }
