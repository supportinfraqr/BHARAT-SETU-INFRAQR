"use client";

import { useMemo } from 'react';
import { FileCheck2, ShieldCheck } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerComplianceReport } from '@/types/portal';

const columns: DataColumn<EmployerComplianceReport>[] = [
  { id:'site', header:'Site', value:row => row.site },
  { id:'contractor', header:'Contractor', value:row => row.contractor, render:row => <div><strong className="text-gray-900">{row.contractor}</strong><p className="font-mono text-[10px] text-gray-400">{row.contractorId}</p></div> },
  { id:'period', header:'Period', value:row => row.period },
  { id:'pf', header:'PF', value:row => row.pf, render:row => <FilingStatus value={row.pf}/> },
  { id:'esic', header:'ESIC', value:row => row.esic, render:row => <FilingStatus value={row.esic}/> },
  { id:'wage', header:'Wage register', value:row => row.wage, render:row => <FilingStatus value={row.wage}/> },
  { id:'safety', header:'Safety', value:row => row.safety, render:row => <span className={row.safety === 'Compliant' ? 'text-green-700' : row.safety === 'Review' ? 'text-orange-700' : 'text-red-700'}>{row.safety}</span> },
  { id:'score', header:'Score', value:row => row.score, render:row => <strong className={row.score >= 90 ? 'text-green-700' : row.score >= 80 ? 'text-orange-700' : 'text-red-700'}>{row.score}%</strong> },
  { id:'status', header:'Status', value:row => row.status, render:row => <span className={row.status === 'Compliant' ? 'text-green-700' : row.status === 'Pending' ? 'text-orange-700' : 'text-red-700'}>{row.status}</span> },
];

export default function EmployerComplianceReportPage() {
  const { employer } = useEmployer();
  const rows = employer.complianceReports;
  const compliant = rows.filter(item => item.status === 'Compliant').length;
  const pending = rows.filter(item => item.status === 'Pending').length;
  const nonCompliant = rows.filter(item => item.status === 'Non-compliant').length;
  const sites = useMemo(() => Array.from(new Set(rows.map(row => row.site))), [rows]);
  const contractors = useMemo(() => Array.from(new Set(rows.map(row => row.contractor))), [rows]);

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Compliance reporting</p><h1 className="text-2xl font-bold mt-1">Compliance Report</h1><p className="text-sm text-gray-500 mt-1">Filter, export, and share the contractor statutory and safety register.</p></header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Total records" value={rows.length} icon={FileCheck2} tone="bg-blue-50 text-blue-700"/><Metric label="Compliant" value={compliant} icon={ShieldCheck} tone="bg-green-50 text-green-700"/><Metric label="Pending" value={pending} icon={ShieldCheck} tone="bg-orange-50 text-orange-700"/><Metric label="Non-compliant" value={nonCompliant} icon={ShieldCheck} tone="bg-red-50 text-red-700"/></div>
    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-900">Use the table tools to filter by Site, Contractor, filing status, period, or compliance score before exporting.</div>
    <EnterpriseDataTable title="Compliance report" rows={rows} columns={columns} rowKey={row => row.id} filename="employer-compliance-report"/>
    <div className="flex flex-wrap gap-4 text-[11px] text-gray-500"><span>Available site filters: {sites.join(', ')}</span><span>Available contractor filters: {contractors.join(', ')}</span></div>
  </div>;
}

function FilingStatus({ value }: { value:'Filed' | 'Pending' | 'Overdue' }) { const tone = value === 'Filed' ? 'bg-green-50 text-green-700' : value === 'Pending' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'; return <span className={`px-2 py-1 rounded text-[10px] font-semibold ${tone}`}>{value}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof FileCheck2; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
