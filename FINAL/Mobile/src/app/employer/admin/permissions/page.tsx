"use client";

import { Lock, ShieldCheck } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';

export default function EmployerAdminPermissionsPage() {
  const { employer } = useEmployer();
  if (!employer.canAccessAdmin) return <section className="bss-card rounded-2xl p-10 text-center"><Lock size={32} className="mx-auto text-bss-text-muted"/><h1 className="mt-4 text-xl font-bold">Admin access required</h1><p className="text-sm text-bss-text-muted mt-2">Your account does not hold the Employer administration permission.</p></section>;
  return <div className="space-y-6">
    <header><h2 className="text-lg font-semibold text-bss-text-primary">Permissions</h2><p className="text-sm text-bss-text-muted mt-1">Role → module → permission matrix. Enforcement happens server-side at the API.</p></header>
    <div className="grid lg:grid-cols-2 gap-4">{employer.permissionRoles.map(role => <section key={role.id} className="bss-card rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-bss-border flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-bss-blue-tint text-bss-interactive-blue grid place-items-center"><ShieldCheck size={17}/></span><div><h3 className="text-sm font-semibold text-bss-text-primary">{role.role}</h3><p className="text-[11px] text-bss-text-muted mt-0.5">{role.description}</p></div></header>
      <div className="p-5 space-y-4">{role.modules.map(module => <div key={module.module}><p className="text-[11px] uppercase font-bold text-bss-text-muted">{module.module}</p><div className="flex flex-wrap gap-1.5 mt-2">{module.permissions.map(permission => <span key={permission} className="bg-bss-bg text-bss-text-primary rounded px-2 py-1 text-[10px] font-semibold">{permission}</span>)}</div></div>)}</div>
    </section>)}</div>
  </div>;
}
