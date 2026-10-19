"use client";

import Link from 'next/link';
import { ArrowRight, Lock, Users } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';

export default function EmployerAdminIndexPage() {
  const { employer } = useEmployer();
  if (!employer.canAccessAdmin) return <section className="bss-card rounded-2xl p-10 text-center"><Lock size={32} className="mx-auto text-bss-text-muted"/><h1 className="mt-4 text-xl font-bold">Admin access required</h1><p className="text-sm text-bss-text-muted mt-2">Your account does not hold the Employer administration permission.</p></section>;
  const cards = [
    { href:'/employer/manage-staff', label:'Staff Accounts', description:'Create Medical / Health & Safety / Security officers', icon:Users },
  ];
  return <div className="space-y-6"><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{cards.map(card => <Link key={card.href} href={card.href} className="bss-card rounded-2xl p-5 hover:bg-bss-bg">{card.icon && <card.icon size={18} className="text-bss-interactive-blue"/>}<div className="flex justify-between items-start mt-4"><div><h2 className="text-sm font-semibold text-bss-text-primary">{card.label}</h2><p className="text-[11px] text-bss-text-muted mt-0.5">{card.description}</p></div><ArrowRight size={15} className="text-bss-text-muted"/></div></Link>)}</div></div>;
}
