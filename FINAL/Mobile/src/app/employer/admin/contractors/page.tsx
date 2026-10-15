"use client";

import { Lock } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerContractor } from '@/types/portal';

const columns: DataColumn<EmployerContractor>[] = [
  { id:'contractor', header:'Contractor', value:row => row.name, render:row => <div><strong className="text-bss-text-primary">{row.name}</strong><p className="font-mono text-[10px] text-bss-text-muted">{row.bssId}</p></div> },
  { id:'contact', header:'Contact', value:row => row.contact, render:row => <div><span>{row.contact}</span><p className="text-[10px] text-bss-text-muted mt-0.5">{row.email}</p></div> },
  { id:'sites', header:'Sites', value:row => row.siteIds.length },
  { id:'workers', header:'Workers', value:row => row.workers },
  { id:'compliance', header:'Compliance', value:row => row.compliance, render:row => <strong className={row.compliance >= 90 ? 'text-bss-green' : 'text-bss-orange'}>{row.compliance}%</strong> },
  { id:'status', header:'Status', value:row => row.status },
];

export default function EmployerAdminContractorsPage() {
  const { employer } = useEmployer();
  if (!employer.canAccessAdmin) return <section className="bss-card rounded-2xl p-10 text-center"><Lock size={32} className="mx-auto text-bss-text-muted"/><h1 className="mt-4 text-xl font-bold">Admin access required</h1><p className="text-sm text-bss-text-muted mt-2">Your account does not hold the Employer administration permission.</p></section>;
  return <div className="space-y-6"><header><h2 className="text-lg font-semibold text-bss-text-primary">Contractor Management</h2><p className="text-sm text-bss-text-muted mt-1">Search and manage contractor records, associations, and status.</p></header><EnterpriseDataTable title="Contractor directory" rows={employer.contractors} columns={columns} rowKey={row => row.id} filename="admin-contractors"/></div>;
}
