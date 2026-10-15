"use client";

import { Lock } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerUser } from '@/types/portal';

const columns: DataColumn<EmployerUser>[] = [
  { id:'user', header:'User', value:row => row.name, render:row => <strong className="text-bss-text-primary">{row.name}</strong> },
  { id:'contact', header:'Contact', value:row => row.contact },
  { id:'role', header:'Role', value:row => row.role },
  { id:'scope', header:'Scope', value:row => row.scope },
  { id:'status', header:'Status', value:row => row.status, render:row => <span className={`px-2 py-1 rounded text-[10px] font-semibold ${row.status === 'Active' ? 'bg-bss-soft-green text-bss-green' : row.status === 'Pending' ? 'bg-bss-soft-orange text-bss-orange' : 'bg-bss-bg text-bss-text-secondary'}`}>{row.status}</span> },
  { id:'lastLogin', header:'Last login', value:row => row.lastLogin?.slice(0, 10) ?? '—' },
];

export default function EmployerAdminUsersPage() {
  const { employer } = useEmployer();
  if (!employer.canAccessAdmin) return <section className="bss-card rounded-2xl p-10 text-center"><Lock size={32} className="mx-auto text-bss-text-muted"/><h1 className="mt-4 text-xl font-bold">Admin access required</h1><p className="text-sm text-bss-text-muted mt-2">Your account does not hold the Employer administration permission.</p></section>;
  return <div className="space-y-6"><header><h2 className="text-lg font-semibold text-bss-text-primary">User Management</h2><p className="text-sm text-bss-text-muted mt-1">Manage internal users, roles, scopes, and their last recorded login.</p></header><EnterpriseDataTable title="Employer users" rows={employer.users} columns={columns} rowKey={row => row.id} filename="employer-users"/></div>;
}
