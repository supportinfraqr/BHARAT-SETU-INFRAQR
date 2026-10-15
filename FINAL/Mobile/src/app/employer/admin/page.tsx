"use client";

import Link from 'next/link';
import { ArrowRight, Building2, FileCheck2, Lock, MapPin, Users } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';

export default function EmployerAdminIndexPage() {
  const { employer } = useEmployer();
  if (!employer.canAccessAdmin) return <section className="bss-card rounded-2xl p-10 text-center"><Lock size={32} className="mx-auto text-bss-text-muted"/><h1 className="mt-4 text-xl font-bold">Admin access required</h1><p className="text-sm text-bss-text-muted mt-2">Your account does not hold the Employer administration permission.</p></section>;
  const cards = [
    { href:'/employer/admin/contractors', label:'Contractor Management', description:`${employer.contractors.length} contractors`, icon:Building2 },
    { href:'/employer/admin/users', label:'User Management', description:`${employer.users.length} users`, icon:Users },
    { href:'/employer/admin/permissions', label:'Permissions', description:`${employer.permissionRoles.length} roles`, icon:Lock },
    { href:'/employer/admin/sites', label:'Site Management', description:`${employer.sites.length} sites`, icon:MapPin },
    { href:'/employer/admin/documents', label:'Worker Compliance Documents', description:`${employer.workerDocuments.length} records`, icon:FileCheck2 },
  ];
  return <div className="space-y-6"><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{cards.map(card => <Link key={card.href} href={card.href} className="bss-card rounded-2xl p-5 hover:bg-bss-bg">{card.icon && <card.icon size={18} className="text-bss-interactive-blue"/>}<div className="flex justify-between items-start mt-4"><div><h2 className="text-sm font-semibold text-bss-text-primary">{card.label}</h2><p className="text-[11px] text-bss-text-muted mt-0.5">{card.description}</p></div><ArrowRight size={15} className="text-bss-text-muted"/></div></Link>)}</div></div>;
}
