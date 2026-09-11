"use client";

import { Lock, ShieldCheck } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';

export default function EmployerAdminPermissionsPage() {
  const { employer } = useEmployer();
  if (!employer.canAccessAdmin) return <section className="bg-white border border-gray-200 rounded-2xl p-10 text-center"><Lock size={32} className="mx-auto text-gray-300"/><h1 className="mt-4 text-xl font-bold">Admin access required</h1><p className="text-sm text-gray-500 mt-2">Your account does not hold the Employer administration permission.</p></section>;
  return <div className="space-y-6">
    <header><h2 className="text-lg font-semibold text-gray-900">Permissions</h2><p className="text-sm text-gray-500 mt-1">Role → module → permission matrix. Enforcement happens server-side at the API.</p></header>
    <div className="grid lg:grid-cols-2 gap-4">{employer.permissionRoles.map(role => <section key={role.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 grid place-items-center"><ShieldCheck size={17}/></span><div><h3 className="text-sm font-semibold text-gray-900">{role.role}</h3><p className="text-[11px] text-gray-400 mt-0.5">{role.description}</p></div></header>
      <div className="p-5 space-y-4">{role.modules.map(module => <div key={module.module}><p className="text-[11px] uppercase font-bold text-gray-500">{module.module}</p><div className="flex flex-wrap gap-1.5 mt-2">{module.permissions.map(permission => <span key={permission} className="bg-gray-100 text-gray-700 rounded px-2 py-1 text-[10px] font-semibold">{permission}</span>)}</div></div>)}</div>
    </section>)}</div>
  </div>;
}
