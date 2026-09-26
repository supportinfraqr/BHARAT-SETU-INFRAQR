"use client";

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Banknote, Building2, CheckCircle2, ClipboardCheck, Clock3, FileWarning, HardHat, MapPin, ShieldCheck, Users } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CopyButton } from '@/components/ui/CopyButton';
import EntityLockerGate from '@/components/auth/EntityLockerGate';

export default function EmployerDashboardPage() {
  const { employer } = useEmployer();
  const { t } = useLanguage();
  const pending = employer.approvals.filter(item => item.status === 'Pending');
  const pendingGate = employer.gatePasses.filter(item => item.status === 'Pending');
  const pendingSubmissions = employer.submissions.filter(item => item.status === 'Pending review');
  const attentionSites = employer.sites.filter(site => site.compliance < 90);
  const activeWorkers = employer.workers.filter(worker => worker.status === 'Active').length;
  const attentionReports = employer.complianceReports.filter(report => report.status !== 'Compliant').length;
  const payrollRecords = employer.payroll?.records ?? [];
  const payrollPending = payrollRecords.filter(r => ['Draft', 'Reviewed', 'Submitted'].includes(r.status)).length;
  const payrollExceptions = payrollRecords.filter(r => r.status === 'Exception' || r.status === 'Returned' || (r.errors && r.errors.length > 0) || r.matchState === 'Needs Review').length;
  const payrollReview = payrollRecords.filter(r => r.matchState === 'Needs Review').length;
  const payrollContractors = new Set(payrollRecords.filter(r => r.contractor).map(r => r.contractor)).size;

  const metrics = [
    { label:t('ui.contractors'), value:employer.stats.totalContractors, icon:Building2, tone:'bg-blue-50 text-blue-700' },
    { label:t('ui.connectedWorkers'), value:employer.stats.totalWorkers, icon:Users, tone:'bg-orange-50 text-orange-700' },
    { label:t('ui.activeSites'), value:employer.stats.activeSites, icon:MapPin, tone:'bg-emerald-50 text-emerald-700' },
    { label:t('ui.complianceScore'), value:`${employer.stats.complianceScore}%`, icon:ShieldCheck, tone:'bg-indigo-50 text-indigo-700' },
  ];

  const actions = [
    { id:'payroll', count:payrollReview, label:'payroll record(s) need review — conflicting Employer / Contractor sources', href:'/employer/payroll?tab=exceptions', severity: payrollReview ? 'red' : 'green' },
    { id:'gatepass', count:pendingGate.length, label:'gate pass requests require approval', href:'/employer/gate-pass?status=Pending', severity: pendingGate.length ? 'orange' : 'green' },
    { id:'approvals', count:pending.length, label:'contractor or worker binding requests pending', href:'/employer/qr/requests', severity: pending.length ? 'orange' : 'green' },
    { id:'submissions', count:pendingSubmissions.length, label:'submission(s) from your contractors require review', href:'/employer/compliance-submission', severity: pendingSubmissions.length ? 'blue' : 'green' },
    { id:'documents', count:employer.workerDocuments.filter(d => ['Expiring','Missing','Pending'].includes(d.status)).length, label:'workers have expiring or missing documents', href:'/employer/admin/documents', severity: employer.workerDocuments.filter(d => ['Expiring','Missing','Pending'].includes(d.status)).length ? 'red' : 'green' },
    { id:'sites', count:attentionSites.length, label:'sites have overdue compliance', href:'/employer/site-overview', severity: attentionSites.length ? 'red' : 'green' },
  ].filter(action => action.count > 0);

  return <div className="space-y-6 pb-10">
    <EntityLockerGate role="employer" />
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">{t('ui.overview')}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">Welcome, {employer.identity.company}</h1>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">Employer Portal</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-sm font-mono text-gray-600">{employer.identity.bssId}</span>
          <CopyButton value={employer.identity.bssId}/>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5"><CheckCircle2 size={11}/> VERIFIED</span>
        </div>
      </div>
      <Link href="/employer/qr/requests" className="h-10 px-4 rounded-lg bg-gray-950 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-black">Review approvals <ArrowRight size={15}/></Link>
    </header>

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Employer key metrics">
      {metrics.map(metric => <article key={metric.label} className="bss-kpi-card">
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{metric.label}</span><span className={`bss-kpi-icon ${metric.tone}`}><metric.icon size={16}/></span></div>
        <strong>{metric.value}</strong>
      </article>)}
    </section>

    {actions.length > 0 && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden"><header className="px-5 py-4 border-b border-gray-100 flex items-center gap-2"><AlertTriangle size={16} className="text-orange-500"/><h2 className="text-sm font-semibold text-gray-950">{t('ui.actionRequired')}</h2></header><div className="divide-y divide-gray-100">{actions.map(action => <Link key={action.id} href={action.href} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"><div className="flex items-center gap-3"><span className={`w-2 h-2 rounded-full ${action.severity === 'red' ? 'bg-red-500' : action.severity === 'orange' ? 'bg-orange-500' : action.severity === 'blue' ? 'bg-blue-500' : 'bg-green-500'}`}/><p className="text-sm text-gray-700"><strong className="text-gray-900">{action.count}</strong> {action.label}</p></div><ArrowRight size={15} className="text-gray-300"/></Link>)}</div></section>}

    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-gray-950">{t('ui.contractorOversight')}</h2><p className="text-[11px] text-gray-400 mt-0.5">Live workforce and compliance across connected contractors</p></div><Link href="/employer/contractors" className="text-xs font-semibold text-blue-700">{t('ui.viewAll')}</Link></header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500"><tr><th className="px-5 py-3">{t('ui.contractor')}</th><th className="px-5 py-3">{t('ui.sites')}</th><th className="px-5 py-3">{t('ui.workers')}</th><th className="px-5 py-3">{t('ui.compliance')}</th><th className="px-5 py-3">{t('ui.status')}</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{employer.contractors.map(contractor => <tr key={contractor.id} className="hover:bg-gray-50"><td className="px-5 py-3"><strong className="text-gray-900">{contractor.name}</strong><p className="font-mono text-[10px] text-gray-400 mt-0.5">{contractor.bssId}</p></td><td className="px-5 py-3 text-gray-600">{contractor.siteIds.length}</td><td className="px-5 py-3 font-semibold text-gray-900">{contractor.workers}</td><td className="px-5 py-3"><span className={contractor.compliance >= 90 ? 'text-green-700' : 'text-orange-700'}>{contractor.compliance}%</span></td><td className="px-5 py-3"><Status value={contractor.status}/></td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100 flex justify-between items-center"><div><h2 className="text-sm font-semibold text-gray-950">{t('ui.sitePerformance')}</h2><p className="text-[11px] text-gray-400 mt-0.5">Connected contractors, workers, and compliance by project</p></div><Link href="/employer/site-overview" className="text-xs font-semibold text-blue-700">{t('ui.viewAll')}</Link></header>
          <div className="divide-y divide-gray-100">{employer.sites.map(site => <div key={site.id} className="p-5 grid sm:grid-cols-[1fr_auto] gap-4 items-center">
            <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-gray-900">{site.name}</h3><span className="text-[10px] font-mono bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{site.code}</span></div><p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><MapPin size={12}/>{site.location}, {site.state}</p><div className="flex gap-4 text-[11px] text-gray-500 mt-3"><span>{site.contractorIds.length} contractors</span><span>{site.workers} workers</span></div></div>
            <div className="sm:text-right"><strong className={site.compliance >= 90 ? 'text-green-700' : 'text-orange-700'}>{site.compliance}%</strong><p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Compliance</p></div>
          </div>)}</div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100 flex justify-between items-center"><h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><Banknote size={15} className="text-bss-green"/>Payroll</h2><Link href="/employer/payroll" className="text-xs font-semibold text-blue-700">View Payroll &rarr;</Link></header>
          <dl className="p-5 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-gray-100 p-3"><dt className="text-gray-400">Workers processed</dt><dd className="font-semibold text-gray-900 mt-1 text-base">{payrollRecords.filter(r => r.status === 'Verified').length}</dd></div>
            <div className="rounded-lg border border-gray-100 p-3"><dt className="text-gray-400">Pending records</dt><dd className="font-semibold text-orange-700 mt-1 text-base">{payrollPending}</dd></div>
            <div className="rounded-lg border border-gray-100 p-3"><dt className="text-gray-400">Contractors receiving</dt><dd className="font-semibold text-gray-900 mt-1 text-base">{payrollContractors}</dd></div>
            <div className="rounded-lg border border-gray-100 p-3"><dt className="text-gray-400">Exceptions</dt><dd className="font-semibold text-red-600 mt-1 text-base">{payrollExceptions}</dd></div>
          </dl>
          <Link href="/employer/payroll?tab=distribution" className="h-10 border-t border-gray-100 text-xs font-semibold text-[#073B67] flex items-center justify-center gap-1.5 hover:bg-gray-50"><Banknote size={13}/>Review distribution</Link>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><Clock3 size={16} className="text-orange-500"/>{t('ui.approvalQueue')}</h2></header>
          <div className="divide-y divide-gray-100">{pending.slice(0, 4).map(item => <Link href="/employer/qr/requests" key={item.id} className="block p-4 hover:bg-gray-50"><div className="flex justify-between gap-2"><p className="text-sm font-semibold text-gray-900">{item.name}</p><span className="text-[9px] font-bold uppercase text-blue-700 bg-blue-50 rounded px-1.5 py-0.5 h-fit">{item.entityType}</span></div><p className="text-xs text-gray-500 mt-1">{item.site}</p><p className="text-[11px] text-gray-400 mt-1">{item.checks.length} checks awaiting review</p></Link>)}</div>
          <Link href="/employer/qr/requests" className="h-11 bg-gray-50 text-xs font-semibold text-[#073B67] flex items-center justify-center">Review {pending.length} pending requests</Link>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-950">{t('ui.workforceHealth')}</h2>
          <div className="space-y-4 mt-4"><Health label="Active workers" value={`${activeWorkers}/${employer.workers.length}`} percent={Math.round(activeWorkers / employer.workers.length * 100)} tone="bg-blue-600"/><Health label="Verified workers" value={String(employer.workers.filter(worker => worker.verified).length)} percent={Math.round(employer.workers.filter(worker => worker.verified).length / employer.workers.length * 100)} tone="bg-green-600"/><Health label="Records needing attention" value={String(attentionReports)} percent={Math.round(attentionReports / employer.complianceReports.length * 100)} tone="bg-orange-500"/></div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">{t('ui.recentActivity')}</h2></header>
          <div className="p-5 space-y-4">{employer.activities.map(activity => <div key={activity.id} className="flex gap-3"><span className="mt-0.5 w-7 h-7 rounded-lg bg-gray-50 text-gray-500 grid place-items-center shrink-0">{activity.type === 'approval' ? <ClipboardCheck size={14}/> : activity.type === 'compliance' ? <FileWarning size={14}/> : <HardHat size={14}/>}</span><div><p className="text-xs font-semibold text-gray-800">{activity.title}</p><p className="text-[11px] leading-relaxed text-gray-500 mt-0.5">{activity.description}</p></div></div>)}</div>
        </section>
      </aside>
    </div>
  </div>;
}

function Status({ value }: { value:string }) {
  const tone = value === 'Active' ? 'bg-green-50 text-green-700' : value === 'Pending' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700';
  return <span className={`inline-flex px-2 py-1 rounded text-[10px] font-semibold ${tone}`}>{value}</span>;
}

function Health({ label, value, percent, tone }: { label:string; value:string; percent:number; tone:string }) {
  return <div><div className="flex justify-between text-xs mb-1.5"><span className="text-gray-600">{label}</span><strong className="text-gray-900">{value}</strong></div><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${tone}`} style={{ width:`${Math.min(100, percent)}%` }}/></div></div>;
}
