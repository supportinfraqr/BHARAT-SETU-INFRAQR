"use client";

import { Lock } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerAudit } from '@/types/portal';

const columns: DataColumn<EmployerAudit>[] = [
  { id:'timestamp', header:'Timestamp', value:row => row.timestamp },
  { id:'actor', header:'Actor', value:row => row.actor },
  { id:'action', header:'Action', value:row => row.action },
  { id:'entity', header:'Module / entity', value:row => row.entity },
  { id:'status', header:'Status', value:row => row.status, render:row => <span className={row.status === 'Success' ? 'text-bss-green' : row.status === 'Failed' ? 'text-bss-error' : 'text-bss-orange'}>{row.status}</span> },
];

export default function EmployerAdminAuditPage() {
  const { employer } = useEmployer();
  if (!employer.canAccessAdmin) return <section className="bss-card rounded-2xl p-10 text-center"><Lock size={32} className="mx-auto text-bss-text-muted"/><h1 className="mt-4 text-xl font-bold">Admin access required</h1><p className="text-sm text-bss-text-muted mt-2">Your account does not hold the Employer administration permission.</p></section>;
  return <div className="space-y-6"><header><h2 className="text-lg font-semibold text-bss-text-primary">Audit / Log Report</h2><p className="text-sm text-bss-text-muted mt-1">A chronological enterprise audit record of actions taken within the Employer workspace.</p></header><EnterpriseDataTable title="Audit log" rows={employer.auditLogs} columns={columns} rowKey={row => row.id} filename="employer-audit-log"/></div>;
}
