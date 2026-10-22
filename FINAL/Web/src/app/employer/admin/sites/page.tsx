"use client";

import Link from 'next/link';
import { ArrowRight, Building2, Lock, MapPin, Users } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';

export default function EmployerAdminSitesPage() {
  const { employer } = useEmployer();
  if (!employer.canAccessAdmin) return <section className="bss-card rounded-2xl p-10 text-center"><Lock size={32} className="mx-auto text-bss-text-muted"/><h1 className="mt-4 text-xl font-bold">Admin access required</h1><p className="text-sm text-bss-text-muted mt-2">Your account does not hold the Employer administration permission.</p></section>;
  return <div className="space-y-6">
    <header><h2 className="text-lg font-semibold text-bss-text-primary">Site Management</h2><p className="text-sm text-bss-text-muted mt-1">Manage organisation sites and their relationships to contractors and workers.</p></header>
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{employer.sites.map(site => <article key={site.id} className="bss-card rounded-2xl overflow-hidden">
      <div className="p-5"><div className="flex items-start justify-between gap-3"><span className="w-10 h-10 rounded-xl bg-bss-blue-tint text-bss-interactive-blue grid place-items-center"><Building2 size={19}/></span><span className={`text-[10px] font-bold px-2 py-1 rounded ${site.status === 'Active' ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-bg text-bss-text-secondary'}`}>{site.status}</span></div><h2 className="font-semibold text-bss-text-primary mt-4">{site.name}</h2><p className="font-mono text-[11px] text-bss-text-muted mt-1">{site.bssId}</p><p className="text-xs text-bss-text-muted flex items-center gap-1 mt-3"><MapPin size={12}/>{site.location}, {site.state}</p></div>
      <div className="grid grid-cols-2 divide-x divide-bss-border border-y border-bss-border"><div className="p-3 text-center"><Users size={13} className="mx-auto text-bss-text-muted"/><strong className="block text-sm mt-1">{site.workers}</strong><span className="text-[9px] uppercase tracking-wider text-bss-text-muted">Workers</span></div><div className="p-3 text-center"><Building2 size={13} className="mx-auto text-bss-text-muted"/><strong className="block text-sm mt-1">{site.contractorIds.length}</strong><span className="text-[9px] uppercase tracking-wider text-bss-text-muted">Contractors</span></div></div>
      <Link href={`/employer/sites/${site.id}`} className="h-10 bg-bss-bg text-xs font-semibold text-[#01183A] flex items-center justify-center gap-1 hover:bg-bss-bg">Manage Site <ArrowRight size={14}/></Link>
    </article>)}</div>
  </div>;
}
