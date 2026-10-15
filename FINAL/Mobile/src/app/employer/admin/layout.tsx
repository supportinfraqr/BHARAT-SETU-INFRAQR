"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, FileClock, FileCheck2, Lock, MapPin, ShieldCheck, Truck, Users } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';

const sections = [
  ['/employer/admin/contractors','Contractor Management',Building2],
  ['/employer/admin/users','User Management',Users],
  ['/employer/admin/permissions','Permissions',Lock],
  ['/employer/admin/sites','Site Management',MapPin],
  ['/employer/admin/documents','Worker Compliance Documents',FileCheck2],
  ['/employer/admin/audit','Audit Log',FileClock],
  ['/employer/admin/transport','Transport Management',Truck],
] as const;

export default function EmployerAdminLayout({ children }: { children: React.ReactNode }) {
  const { employer } = useEmployer();
  const pathname = usePathname();

  if (!employer.canAccessAdmin) return <div className="space-y-6"><section className="bss-card rounded-2xl p-10 text-center"><ShieldCheck size={32} className="mx-auto text-bss-text-muted"/><h1 className="mt-4 text-xl font-bold text-bss-text-primary">Admin access required</h1><p className="text-sm text-bss-text-muted mt-2 max-w-md mx-auto">This area is restricted to Employer administrators. Your current account does not hold the required module permission.</p></section></div>;

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Administration</p><h1 className="text-2xl font-bold mt-1">Employer Administration</h1><p className="text-sm text-bss-text-muted mt-1">Manage users, permissions, contractors, sites, and compliance across your organisation.</p></header>
    <nav className="flex gap-1 overflow-x-auto bss-card rounded-2xl p-2">{sections.map(([href, label, Icon]) => <Link key={href} href={href} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap ${pathname === href ? 'bg-bss-navy text-white' : 'text-bss-text-secondary hover:bg-bss-bg'}`}><Icon size={16}/>{label}</Link>)}</nav>
    {children}
  </div>;
}
