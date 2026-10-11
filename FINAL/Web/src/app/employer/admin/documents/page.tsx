"use client";

import { Lock } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerWorkerDocument } from '@/types/portal';

const columns: DataColumn<EmployerWorkerDocument>[] = [
  { id:'worker', header:'Worker', value:row => row.worker, render:row => <div><strong className="text-bss-text-primary">{row.worker}</strong><p className="font-mono text-[10px] text-bss-text-muted">{row.workerId}</p></div> },
  { id:'contractor', header:'Contractor', value:row => row.contractor },
  { id:'site', header:'Site', value:row => row.site },
  { id:'document', header:'Document', value:row => row.document },
  { id:'status', header:'Status', value:row => row.status, render:row => <span className={row.status === 'Verified' ? 'text-bss-green' : row.status === 'Pending' ? 'text-bss-orange' : row.status === 'Expiring' ? 'text-bss-orange' : row.status === 'Missing' ? 'text-bss-error' : 'text-bss-error'}>{row.status}</span> },
  { id:'expiry', header:'Expiry', value:row => row.expiry ?? '—' },
];

export default function EmployerAdminDocumentsPage() {
  const { employer } = useEmployer();
  if (!employer.canAccessAdmin) return <section className="bss-card rounded-2xl p-10 text-center"><Lock size={32} className="mx-auto text-bss-text-muted"/><h1 className="mt-4 text-xl font-bold">Admin access required</h1><p className="text-sm text-bss-text-muted mt-2">Your account does not hold the Employer administration permission.</p></section>;
  return <div className="space-y-6"><header><h2 className="text-lg font-semibold text-bss-text-primary">Worker Compliance Documents</h2><p className="text-sm text-bss-text-muted mt-1">Review worker document and compliance record states across connected contractors.</p></header><EnterpriseDataTable title="Worker compliance document register" rows={employer.workerDocuments} columns={columns} rowKey={row => row.id} filename="worker-compliance-documents"/></div>;
}
