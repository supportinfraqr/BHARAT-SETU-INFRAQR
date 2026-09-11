"use client";

import { useState } from 'react';
import { QrCode, X } from 'lucide-react';
import WorkerQr from '@/components/qr/WorkerQr';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerContractor } from '@/types/portal';

export default function EmployerQrContractorsPage() {
  const { employer } = useEmployer();
  const [selected, setSelected] = useState<EmployerContractor | null>(null);
  const columns: DataColumn<EmployerContractor>[] = [
    { id:'contractor', header:'Contractor', value:row => row.name, render:row => <div><strong className="text-gray-900">{row.name}</strong><p className="font-mono text-[10px] text-gray-400">{row.bssId}</p></div> },
    { id:'sites', header:'Sites', value:row => row.siteIds.length },
    { id:'workers', header:'Workers', value:row => row.workers },
    { id:'status', header:'Status', value:row => row.status },
    { id:'qr', header:'QR', filterable:false, value:row => row.bssId, render:row => <button onClick={() => setSelected(row)} className="inline-flex gap-1 text-blue-700 font-semibold"><QrCode size={15}/>View QR</button> },
  ];

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">QR system</p><h1 className="text-2xl font-bold mt-1">My Contractors</h1><p className="text-sm text-gray-500 mt-1">Contractors bound to your organisation with their site assignments and QR identity.</p></header>
    <EnterpriseDataTable title="Bound contractor identities" rows={employer.contractors} columns={columns} rowKey={row => row.id} filename="employer-contractor-qr"/>
    {selected && <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"><section role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-sm text-center relative"><button onClick={() => setSelected(null)} aria-label="Close" className="absolute right-4 top-4"><X/></button><h2 className="font-semibold">{selected.name}</h2><p className="text-xs font-mono text-gray-500">{selected.bssId}</p><WorkerQr bssId={selected.bssId} className="w-56 h-56 mx-auto mt-5"/><p className="text-xs text-gray-500 mt-4">Verification still applies server-side disclosure rules.</p></section></div>}
  </div>;
}
