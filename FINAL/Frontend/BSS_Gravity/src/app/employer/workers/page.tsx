"use client";

import { useState } from 'react';
import { CheckCircle2, FileText, QrCode, ShieldAlert, UserCheck, Users, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import WorkerQr from '@/components/qr/WorkerQr';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerWorker } from '@/types/portal';
import { useEmployerDocView } from '@/components/documentEngine/portalAdapters';
import { WorkerDocumentsDrawer } from '@/components/documentEngine/DocumentFlow';

const columns: DataColumn<EmployerWorker>[] = [
  { id:'name', header:'Worker', value:row => row.name, render:row => <div><strong className="text-gray-900">{row.name}</strong><p className="font-mono text-[11px] text-gray-500">{row.bssId}</p></div> },
  { id:'contractor', header:'Contractor', value:row => row.contractor, render:row => <div><span className="font-medium text-gray-800">{row.contractor}</span><p className="text-[10px] font-mono text-gray-400">{row.contractorId}</p></div> },
  { id:'site', header:'Site', value:row => row.site, export:{split:','} },
  { id:'designation', header:'Designation', value:row => row.designation },
  { id:'compliance', header:'Compliance', value:row => row.compliance, render:row => <span className={row.compliance === 'Compliant' ? 'text-green-700' : row.compliance === 'Expiring' ? 'text-orange-700' : 'text-red-700'}>{row.compliance}</span> },
  { id:'verified', header:'Verification', value:row => row.verified ? 'Verified' : 'Pending', render:row => <span className={row.verified ? 'text-green-700' : 'text-orange-700'}>{row.verified ? 'Verified' : 'Pending'}</span> },
  { id:'status', header:'Status', value:row => row.status },
];

export default function EmployerWorkersPage() {
  const { employer } = useEmployer();
  const docCtx = useEmployerDocView();
  const [docsWorker, setDocsWorker] = useState<EmployerWorker | null>(null);
  const [qrWorker, setQrWorker] = useState<EmployerWorker | null>(null);
  const active = employer.workers.filter(worker => worker.status === 'Active').length;
  const verified = employer.workers.filter(worker => worker.verified).length;
  const attention = employer.workers.filter(worker => worker.compliance !== 'Compliant').length;
  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Connected workforce</p><h1 className="text-2xl font-bold mt-1">Workers</h1><p className="text-sm text-gray-500 mt-1">A consolidated, read-only view of workers supplied by every connected contractor — with their QR identity.</p></header>
    <div className="grid grid-cols-3 gap-3"><Metric label="Total connected" value={employer.workers.length} icon={Users} tone="bg-blue-50 text-blue-700"/><Metric label="Active and verified" value={Math.min(active, verified)} icon={UserCheck} tone="bg-green-50 text-green-700"/><Metric label="Compliance attention" value={attention} icon={ShieldAlert} tone="bg-orange-50 text-orange-700"/></div>
    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex gap-3 text-xs text-blue-900"><CheckCircle2 size={16} className="shrink-0 mt-0.5"/><p>Worker records remain owned by their contractor. Employer approvals and compliance decisions are applied from the Governance workspace and synchronized through the Employer API.</p></div>
    <EnterpriseDataTable title="Connected worker directory" rows={employer.workers} columns={[...columns, { id:'qr', header:'QR', filterable:false, value:row => row.bssId, render:row => <button onClick={() => setQrWorker(row)} className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold inline-flex items-center gap-1 hover:border-[#073B67] hover:text-[#073B67]"><QrCode size={12}/>QR</button> }, { id:'docs', header:'Documents', filterable:false, value:row => row.id, render:row => <button onClick={() => setDocsWorker(row)} className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold inline-flex items-center gap-1 hover:border-[#073B67] hover:text-[#073B67]"><FileText size={12}/>Documents</button> }]} rowKey={row => `${row.id}-${row.contractorId}-${row.siteId}`} filename="employer-connected-workers"/>
    {qrWorker && <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={() => setQrWorker(null)}><section role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-sm text-center relative" onClick={e => e.stopPropagation()}><button onClick={() => setQrWorker(null)} aria-label="Close" className="absolute right-4 top-4"><X/></button><h2 className="font-semibold">{qrWorker.name}</h2><p className="text-xs font-mono text-gray-500">{qrWorker.bssId}</p><div className="relative w-56 h-56 mx-auto mt-5"><WorkerQr bssId={qrWorker.bssId} className="w-full h-full"/><span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[44px] h-[44px] bg-white rounded-[8px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[34px] h-[34px] object-contain"/></span></span></div><p className="text-xs text-gray-500 mt-4">Verification still applies server-side disclosure rules.</p></section></div>}
    {docsWorker && <WorkerDocumentsDrawer owner={docCtx.owner} view={docCtx.view} worker={{ id: docsWorker.id, name: docsWorker.name, bssId: docsWorker.bssId, site: docsWorker.site, siteId: docsWorker.siteId, employer: employer.identity.company, contractor: docsWorker.contractor, contractorId: docsWorker.contractorId, designation: docsWorker.designation, doj: docsWorker.doj, status: docsWorker.status, verified: docsWorker.verified }} onClose={() => setDocsWorker(null)}/>}
  </div>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Users; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
