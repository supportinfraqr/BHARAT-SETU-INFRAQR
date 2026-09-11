"use client";

import { BarChart3, Building2, HardHat, MapPin, ShieldCheck } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';

type SiteReport = { id:string; site:string; location:string; contractors:number; workers:number; activeWorkers:number; attendance:number; compliance:number };
const columns: DataColumn<SiteReport>[] = [
  { id:'site', header:'Site', value:row => row.site, render:row => <div><strong className="text-gray-900">{row.site}</strong><p className="text-[11px] text-gray-500">{row.location}</p></div> },
  { id:'contractors', header:'Contractors', value:row => row.contractors },
  { id:'workers', header:'Workers', value:row => row.workers },
  { id:'active', header:'Active workers', value:row => row.activeWorkers },
  { id:'attendance', header:'Avg. attendance', value:row => row.attendance, render:row => <span className={row.attendance >= 90 ? 'text-green-700' : 'text-orange-700'}>{row.attendance}%</span> },
  { id:'compliance', header:'Compliance', value:row => row.compliance, render:row => <strong className={row.compliance >= 90 ? 'text-green-700' : 'text-orange-700'}>{row.compliance}%</strong> },
];

export default function EmployerReportsPage() {
  const { employer } = useEmployer();
  const siteRows: SiteReport[] = employer.sites.map(site => {
    const workers = employer.workers.filter(worker => worker.siteId === site.id);
    return { id:site.id, site:site.name, location:`${site.location}, ${site.state}`, contractors:site.contractorIds.length, workers:workers.length, activeWorkers:workers.filter(worker => worker.status === 'Active').length, attendance:workers.length ? Math.round(workers.reduce((sum, worker) => sum + worker.attendance, 0) / workers.length) : 0, compliance:site.compliance };
  });
  const maxWorkers = Math.max(1, ...employer.contractors.map(contractor => contractor.workers));
  const averageAttendance = employer.workers.length ? Math.round(employer.workers.reduce((sum, worker) => sum + worker.attendance, 0) / employer.workers.length) : 0;

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Operational intelligence</p><h1 className="text-2xl font-bold mt-1">Workforce Reports</h1><p className="text-sm text-gray-500 mt-1">Filter, export, and share connected workforce performance across sites.</p></header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Sites reported" value={siteRows.length} icon={MapPin}/><Metric label="Contractors" value={employer.contractors.length} icon={Building2}/><Metric label="Workers" value={employer.workers.length} icon={HardHat}/><Metric label="Avg. attendance" value={`${averageAttendance}%`} icon={BarChart3}/></div>
    <div className="grid lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-gray-900">Workers by contractor</h2><p className="text-[11px] text-gray-400 mt-0.5">Current connected workforce distribution</p></div><HardHat size={18} className="text-gray-300"/></div><div className="space-y-5 mt-6">{employer.contractors.map(contractor => <div key={contractor.id}><div className="flex justify-between text-xs mb-2"><span className="font-medium text-gray-700">{contractor.name}</span><strong>{contractor.workers}</strong></div><div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#155E95]" style={{ width:`${contractor.workers / maxWorkers * 100}%` }}/></div></div>)}</div></section>
      <section className="bg-[#073B67] text-white rounded-2xl p-5"><span className="w-10 h-10 bg-white/10 rounded-xl grid place-items-center"><ShieldCheck size={19}/></span><p className="text-xs text-blue-100 mt-5">Organisation compliance</p><strong className="text-4xl block mt-1">{employer.stats.complianceScore}%</strong><div className="h-1.5 bg-white/15 rounded-full overflow-hidden mt-5"><div className="h-full bg-white rounded-full" style={{ width:`${employer.stats.complianceScore}%` }}/></div><p className="text-xs text-blue-100 leading-relaxed mt-5">Calculated from statutory filings, wage registers, safety controls, and connected worker verification.</p></section>
    </div>
    <EnterpriseDataTable title="Site performance report" rows={siteRows} columns={columns} rowKey={row => row.id} filename="employer-site-performance"/>
  </div>;
}

function Metric({ label, value, icon:Icon }: { label:string; value:string | number; icon:typeof MapPin }) { return <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 grid place-items-center"><Icon size={17}/></span><div><strong className="text-xl">{value}</strong><p className="text-xs text-gray-500">{label}</p></div></div>; }
