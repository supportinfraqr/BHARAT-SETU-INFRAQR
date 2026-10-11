"use client";

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Banknote, Building2, CheckCircle2, ClipboardCheck, Clock3, FileWarning, HardHat, MapPin, Users } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CopyButton } from '@/components/ui/CopyButton';

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
    { label:t('ui.contractors'), value:employer.stats.totalContractors, icon:Building2, tone:'bg-bss-blue-tint text-bss-interactive-blue' },
    { label:t('ui.connectedWorkers'), value:employer.stats.totalWorkers, icon:Users, tone:'bg-bss-soft-orange text-bss-orange' },
    { label:t('ui.activeSites'), value:employer.stats.activeSites, icon:MapPin, tone:'bg-bss-soft-green text-bss-green' },
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
    <header className="bss-reveal bss-gradient-hero bss-elevated relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white">
      <div className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute right-24 -bottom-20 w-48 h-48 rounded-full bg-white/5" />
      <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-bss-soft-green uppercase tracking-[0.14em]">{t('ui.overview')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome, {employer.identity.company}</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-white/10 border border-white/20 rounded-full px-2 py-0.5 backdrop-blur-sm">Employer Portal</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-sm font-mono text-white/70">{employer.identity.bssId}</span>
            <CopyButton value={employer.identity.bssId}/>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-bss-soft-green bg-white/10 border border-white/15 rounded-full px-2 py-0.5"><CheckCircle2 size={11}/> VERIFIED</span>
          </div>
        </div>
        <Link href="/employer/qr/requests" className="h-10 px-4 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors backdrop-blur-sm self-start">Review approvals <ArrowRight size={15}/></Link>
      </div>
    </header>

    <section className="bss-reveal bss-kpi-grid grid grid-cols-2 md:grid-cols-3 gap-3" aria-label="Employer key metrics" style={{ ['--bss-delay' as string]: '80ms' }}>
      {metrics.map(metric => <article key={metric.label} className="bss-kpi-card bss-hover-lift">
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-muted">{metric.label}</span><span className={`bss-kpi-icon ${metric.tone}`}><metric.icon size={16}/></span></div>
        <strong>{metric.value}</strong>
      </article>)}
    </section>

    {actions.length > 0 && <section className="bss-reveal bss-card rounded-2xl overflow-hidden" style={{ ['--bss-delay' as string]: '140ms' }}><header className="px-5 py-4 border-b border-bss-border flex items-center gap-2"><AlertTriangle size={16} className="text-bss-orange"/><h2 className="text-sm font-semibold text-bss-text-primary">{t('ui.actionRequired')}</h2></header><div className="divide-y divide-bss-border">{actions.map(action => <Link key={action.id} href={action.href} className="flex items-center justify-between px-5 py-3 hover:bg-bss-bg"><div className="flex items-center gap-3"><span className={`w-2 h-2 rounded-full ${action.severity === 'red' ? 'bg-bss-error' : action.severity === 'orange' ? 'bg-bss-orange' : action.severity === 'blue' ? 'bg-bss-interactive-blue' : 'bg-bss-green'}`}/><p className="text-sm text-bss-text-primary"><strong className="text-bss-text-primary">{action.count}</strong> {action.label}</p></div><ArrowRight size={15} className="text-bss-text-muted"/></Link>)}</div></section>}

    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <section className="bss-card rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between"><div><h2 className="text-sm font-semibold text-bss-text-primary">{t('ui.contractorOversight')}</h2><p className="text-[11px] text-bss-text-muted mt-0.5">Live workforce and compliance across connected contractors</p></div><Link href="/employer/contractors" className="text-xs font-semibold text-bss-interactive-blue">{t('ui.viewAll')}</Link></header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-bss-bg text-[11px] uppercase tracking-wider text-bss-text-muted"><tr><th className="px-5 py-3">{t('ui.contractor')}</th><th className="px-5 py-3">{t('ui.sites')}</th><th className="px-5 py-3">{t('ui.workers')}</th><th className="px-5 py-3">{t('ui.compliance')}</th><th className="px-5 py-3">{t('ui.status')}</th></tr></thead>
              <tbody className="divide-y divide-bss-border">{employer.contractors.map(contractor => <tr key={contractor.id} className="hover:bg-bss-bg"><td className="px-5 py-3"><strong className="text-bss-text-primary">{contractor.name}</strong><p className="font-mono text-[10px] text-bss-text-muted mt-0.5">{contractor.bssId}</p></td><td className="px-5 py-3 text-bss-text-secondary">{contractor.siteIds.length}</td><td className="px-5 py-3 font-semibold text-bss-text-primary">{contractor.workers}</td><td className="px-5 py-3"><span className={contractor.compliance >= 90 ? 'text-bss-green' : 'text-bss-orange'}>{contractor.compliance}%</span></td><td className="px-5 py-3"><Status value={contractor.status}/></td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="bss-card rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-bss-border flex justify-between items-center"><div><h2 className="text-sm font-semibold text-bss-text-primary">{t('ui.sitePerformance')}</h2><p className="text-[11px] text-bss-text-muted mt-0.5">Connected contractors, workers, and compliance by project</p></div><Link href="/employer/site-overview" className="text-xs font-semibold text-bss-interactive-blue">{t('ui.viewAll')}</Link></header>
          <div className="divide-y divide-bss-border">{employer.sites.map(site => <div key={site.id} className="p-5 grid sm:grid-cols-[1fr_auto] gap-4 items-center">
            <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-bss-text-primary">{site.name}</h3><span className="text-[10px] font-mono bg-bss-bg text-bss-text-secondary rounded px-1.5 py-0.5">{site.code}</span></div><p className="text-xs text-bss-text-muted mt-1 flex items-center gap-1"><MapPin size={12}/>{site.location}, {site.state}</p><div className="flex gap-4 text-[11px] text-bss-text-muted mt-3"><span>{site.contractorIds.length} contractors</span><span>{site.workers} workers</span></div></div>
            <div className="sm:text-right"><strong className={site.compliance >= 90 ? 'text-bss-green' : 'text-bss-orange'}>{site.compliance}%</strong><p className="text-[10px] text-bss-text-muted uppercase tracking-wider mt-1">Compliance</p></div>
          </div>)}</div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="bss-card rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-bss-border flex justify-between items-center"><h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2"><Banknote size={15} className="text-bss-green"/>Payroll</h2><Link href="/employer/payroll" className="text-xs font-semibold text-bss-interactive-blue">View Payroll &rarr;</Link></header>
          <dl className="p-5 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-bss-border p-3"><dt className="text-bss-text-muted">Workers processed</dt><dd className="font-semibold text-bss-text-primary mt-1 text-base">{payrollRecords.filter(r => r.status === 'Verified').length}</dd></div>
            <div className="rounded-lg border border-bss-border p-3"><dt className="text-bss-text-muted">Pending records</dt><dd className="font-semibold text-bss-orange mt-1 text-base">{payrollPending}</dd></div>
            <div className="rounded-lg border border-bss-border p-3"><dt className="text-bss-text-muted">Contractors receiving</dt><dd className="font-semibold text-bss-text-primary mt-1 text-base">{payrollContractors}</dd></div>
            <div className="rounded-lg border border-bss-border p-3"><dt className="text-bss-text-muted">Exceptions</dt><dd className="font-semibold text-bss-error mt-1 text-base">{payrollExceptions}</dd></div>
          </dl>
          <Link href="/employer/payroll?tab=distribution" className="h-10 border-t border-bss-border text-xs font-semibold text-[#01183A] flex items-center justify-center gap-1.5 hover:bg-bss-bg"><Banknote size={13}/>Review distribution</Link>
        </section>

        <section className="bss-card rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-bss-border"><h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2"><Clock3 size={16} className="text-bss-orange"/>{t('ui.approvalQueue')}</h2></header>
          <div className="divide-y divide-bss-border">{pending.slice(0, 4).map(item => <Link href="/employer/qr/requests" key={item.id} className="block p-4 hover:bg-bss-bg"><div className="flex justify-between gap-2"><p className="text-sm font-semibold text-bss-text-primary">{item.name}</p><span className="text-[9px] font-bold uppercase text-bss-interactive-blue bg-bss-blue-tint rounded px-1.5 py-0.5 h-fit">{item.entityType}</span></div><p className="text-xs text-bss-text-muted mt-1">{item.site}</p><p className="text-[11px] text-bss-text-muted mt-1">{item.checks.length} checks awaiting review</p></Link>)}</div>
          <Link href="/employer/qr/requests" className="h-11 bg-bss-bg text-xs font-semibold text-[#01183A] flex items-center justify-center">Review {pending.length} pending requests</Link>
        </section>

        <section className="bss-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-bss-text-primary">{t('ui.workforceHealth')}</h2>
          <div className="space-y-4 mt-4"><Health label="Active workers" value={`${activeWorkers}/${employer.workers.length}`} percent={Math.round(activeWorkers / employer.workers.length * 100)} tone="bg-bss-interactive-blue"/><Health label="Verified workers" value={String(employer.workers.filter(worker => worker.verified).length)} percent={Math.round(employer.workers.filter(worker => worker.verified).length / employer.workers.length * 100)} tone="bg-bss-green"/><Health label="Records needing attention" value={String(attentionReports)} percent={Math.round(attentionReports / employer.complianceReports.length * 100)} tone="bg-bss-orange"/></div>
        </section>

        <section className="bss-card rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-bss-border"><h2 className="text-sm font-semibold text-bss-text-primary">{t('ui.recentActivity')}</h2></header>
          <div className="p-5 space-y-4">{employer.activities.map(activity => <div key={activity.id} className="flex gap-3"><span className="mt-0.5 w-7 h-7 rounded-lg bg-bss-bg text-bss-text-muted grid place-items-center shrink-0">{activity.type === 'approval' ? <ClipboardCheck size={14}/> : activity.type === 'compliance' ? <FileWarning size={14}/> : <HardHat size={14}/>}</span><div><p className="text-xs font-semibold text-bss-text-primary">{activity.title}</p><p className="text-[11px] leading-relaxed text-bss-text-muted mt-0.5">{activity.description}</p></div></div>)}</div>
        </section>
      </aside>
    </div>
  </div>;
}

function Status({ value }: { value:string }) {
  const tone = value === 'Active' ? 'bg-bss-soft-green text-bss-green' : value === 'Pending' ? 'bg-bss-soft-orange text-bss-orange' : 'bg-bss-soft-orange text-bss-error';
  return <span className={`inline-flex px-2 py-1 rounded text-[10px] font-semibold ${tone}`}>{value}</span>;
}

function Health({ label, value, percent, tone }: { label:string; value:string; percent:number; tone:string }) {
  return <div><div className="flex justify-between text-xs mb-1.5"><span className="text-bss-text-secondary">{label}</span><strong className="text-bss-text-primary">{value}</strong></div><div className="h-1.5 bg-bss-bg rounded-full overflow-hidden"><div className={`h-full rounded-full ${tone}`} style={{ width:`${Math.min(100, percent)}%` }}/></div></div>;
}
