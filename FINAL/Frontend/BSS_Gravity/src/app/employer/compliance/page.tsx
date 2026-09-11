"use client";

import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, XCircle } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerComplianceReport } from '@/types/portal';

const columns: DataColumn<EmployerComplianceReport>[] = [
  { id:'contractor', header:'Contractor', value:row => row.contractor, render:row => <div><strong className="text-gray-900">{row.contractor}</strong><p className="font-mono text-[10px] text-gray-400">{row.contractorId}</p></div> },
  { id:'site', header:'Site', value:row => row.site },
  { id:'period', header:'Period', value:row => row.period },
  { id:'pf', header:'PF', value:row => row.pf, render:row => <FilingStatus value={row.pf}/> },
  { id:'esic', header:'ESIC', value:row => row.esic, render:row => <FilingStatus value={row.esic}/> },
  { id:'wage', header:'Wage register', value:row => row.wage, render:row => <FilingStatus value={row.wage}/> },
  { id:'safety', header:'Safety', value:row => row.safety, render:row => <span className={row.safety === 'Compliant' ? 'text-green-700' : row.safety === 'Review' ? 'text-orange-700' : 'text-red-700'}>{row.safety}</span> },
  { id:'score', header:'Score', value:row => row.score, render:row => <strong className={row.score >= 90 ? 'text-green-700' : row.score >= 80 ? 'text-orange-700' : 'text-red-700'}>{row.score}%</strong> },
  { id:'status', header:'Status', value:row => row.status, render:row => <ReportStatus value={row.status}/> },
];

export default function EmployerCompliancePage() {
  const { employer } = useEmployer();
  const compliant = employer.complianceReports.filter(item => item.status === 'Compliant').length;
  const pending = employer.complianceReports.filter(item => item.status === 'Pending').length;
  const nonCompliant = employer.complianceReports.filter(item => item.status === 'Non-compliant').length;
  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Governance controls</p><h1 className="text-2xl font-bold mt-1">Compliance Oversight</h1><p className="text-sm text-gray-500 mt-1">Monthly statutory, wage, and safety status submitted by connected contractors.</p></header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Total reports" value={employer.complianceReports.length} icon={FileCheck2} tone="bg-blue-50 text-blue-700"/><Metric label="Compliant" value={compliant} icon={CheckCircle2} tone="bg-green-50 text-green-700"/><Metric label="Pending" value={pending} icon={Clock3} tone="bg-orange-50 text-orange-700"/><Metric label="Non-compliant" value={nonCompliant} icon={XCircle} tone="bg-red-50 text-red-700"/></div>
    {nonCompliant > 0 && <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3"><AlertTriangle size={18} className="text-red-600 shrink-0"/><div><p className="text-sm font-semibold text-red-900">Immediate review required</p><p className="text-xs text-red-700 mt-1">{nonCompliant} contractor-site report contains an overdue or missing statutory filing.</p></div></div>}
    <EnterpriseDataTable title="Contractor compliance register" rows={employer.complianceReports} columns={columns} rowKey={row => row.id} filename="employer-compliance"/>
  </div>;
}

function FilingStatus({ value }: { value:'Filed' | 'Pending' | 'Overdue' }) { const tone = value === 'Filed' ? 'bg-green-50 text-green-700' : value === 'Pending' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'; return <span className={`px-2 py-1 rounded text-[10px] font-semibold ${tone}`}>{value}</span>; }
function ReportStatus({ value }: { value:EmployerComplianceReport['status'] }) { const tone = value === 'Compliant' ? 'text-green-700' : value === 'Pending' ? 'text-orange-700' : 'text-red-700'; return <span className={`font-semibold ${tone}`}>{value}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof FileCheck2; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
