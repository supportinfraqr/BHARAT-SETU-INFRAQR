"use client";

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, Banknote, Building2, CheckCircle2, ClipboardCheck, Clock3, Download, FileWarning, HardHat, MapPin, Printer, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CopyButton } from '@/components/ui/CopyButton';
import LicensesPrompt from '@/components/licenses/LicensesPrompt';
import EmployerAnalytics, { type EmployerAnalyticsHandle } from '@/components/employer/EmployerAnalytics';
import type { EmployerSite, EmployerWorker } from '@/types/portal';

export default function EmployerDashboardPage() {
  const { employer, refresh } = useEmployer();
  const { t } = useLanguage();
  const analyticsRef = useRef<EmployerAnalyticsHandle>(null);
  const [refreshing, setRefreshing] = useState(false);
  async function refreshAll() {
    setRefreshing(true);
    try { await Promise.all([refresh(), Promise.resolve(analyticsRef.current?.refresh())]); }
    finally { setRefreshing(false); }
  }
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

  const workersBySite = new Map<string, EmployerWorker[]>();
  employer.workers.forEach(worker => {
    const list = workersBySite.get(worker.siteId);
    if (list) list.push(worker); else workersBySite.set(worker.siteId, [worker]);
  });

  const metrics = [
    { label:t('ui.contractors'), value:employer.stats.totalContractors, icon:Building2, tone:'bg-bss-blue-tint text-bss-interactive-blue', accent:'from-bss-interactive-blue to-bss-deep-navy' },
    { label:t('ui.connectedWorkers'), value:employer.stats.totalWorkers, icon:Users, tone:'bg-bss-soft-orange text-bss-orange', accent:'from-bss-orange to-bss-error' },
    { label:t('ui.activeSites'), value:employer.stats.activeSites, icon:MapPin, tone:'bg-bss-soft-green text-bss-green', accent:'from-bss-green to-[#0f6b30]' },
    { label:t('ui.complianceScore'), value:`${employer.stats.complianceScore}%`, icon:ShieldCheck, tone:'bg-bss-blue-tint text-bss-interactive-blue', accent:'from-bss-interactive-blue to-bss-deep-navy' },
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
        <div className="flex flex-wrap items-center gap-2 self-start">
          <button type="button" onClick={refreshAll} disabled={refreshing} className="h-10 px-4 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-semibold flex items-center gap-2 hover:bg-white/20 transition-colors backdrop-blur-sm disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
          <Link href="/employer/qr/requests" className="h-10 px-4 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-semibold flex items-center gap-2 hover:bg-white/20 transition-colors backdrop-blur-sm">Review approvals <ArrowRight size={15}/></Link>
        </div>
      </div>
    </header>

    <LicensesPrompt endpoint="/api/employer/licenses" href="/employer/licenses" />

    <section className="bss-reveal bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Employer key metrics" style={{ ['--bss-delay' as string]: '80ms' }}>
      {metrics.map(metric => <article key={metric.label} className="bss-card bss-3d rounded-2xl p-4 relative overflow-hidden">
        <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${metric.accent}`} />
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-muted">{metric.label}</span><span className={`bss-kpi-icon ${metric.tone}`}><metric.icon size={16}/></span></div>
        <strong className="block mt-2 text-3xl font-bold text-bss-text-primary leading-none">{metric.value}</strong>
      </article>)}
    </section>

    {actions.length > 0 && <section className="bss-reveal bss-card rounded-2xl overflow-hidden" style={{ ['--bss-delay' as string]: '140ms' }}>
      <header className="px-5 py-4 border-b border-bss-border flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg bg-bss-soft-orange text-bss-orange grid place-items-center"><AlertTriangle size={16}/></span><div><h2 className="text-sm font-semibold text-bss-text-primary">{t('ui.actionRequired')}</h2><p className="text-[11px] text-bss-text-muted mt-0.5">Items that need your attention</p></div></header>
      <div className="p-4 grid sm:grid-cols-2 gap-3">{actions.map(action => {
        const sev = action.severity === 'red' ? { dot:'bg-bss-error', icon:'bg-bss-soft-orange text-bss-error', border:'border-bss-border' }
          : action.severity === 'orange' ? { dot:'bg-bss-orange', icon:'bg-bss-soft-orange text-bss-orange', border:'border-bss-border' }
          : action.severity === 'blue' ? { dot:'bg-bss-interactive-blue', icon:'bg-bss-blue-tint text-bss-interactive-blue', border:'border-bss-border' }
          : { dot:'bg-bss-green', icon:'bg-bss-soft-green text-bss-green', border:'border-bss-border' };
        return <Link key={action.id} href={action.href} className={`group flex items-center gap-3 rounded-xl border ${sev.border} bg-bss-surface-soft px-4 py-3 hover:border-bss-interactive-blue/40 transition-all bss-hover-lift`}>
          <span className={`w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 font-bold text-sm ${sev.icon}`}>{action.count}</span>
          <p className="min-w-0 flex-1 text-xs text-bss-text-secondary leading-snug">{action.label}</p>
          <ArrowRight size={16} className="text-bss-text-muted flex-shrink-0 group-hover:text-bss-interactive-blue group-hover:translate-x-0.5 transition-all"/>
        </Link>;
      })}</div>
    </section>}

    {/* Operational Hub: Contractor Oversight (Full Width) + 4 Balanced Operational Cards (2x2 Grid) */}
    <div className="bss-reveal space-y-5" style={{ ['--bss-delay' as string]: '150ms' }}>
      {/* Contractor Oversight Table - Full Width */}
      <section className="bss-card rounded-2xl overflow-hidden bss-hover-lift transition-all">
        <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-bss-blue-tint text-bss-interactive-blue grid place-items-center">
              <Building2 size={16}/>
            </span>
            <div>
              <h2 className="text-sm font-semibold text-bss-text-primary">{t('ui.contractorOversight')}</h2>
              <p className="text-[11px] text-bss-text-muted mt-0.5">Live workforce and compliance across connected contractors</p>
            </div>
          </div>
          <Link href="/employer/contractors" className="text-xs font-semibold text-bss-interactive-blue hover:underline">{t('ui.viewAll')}</Link>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bss-bg text-[11px] uppercase tracking-wider text-bss-text-muted">
              <tr>
                <th className="px-5 py-3">{t('ui.contractor')}</th>
                <th className="px-4 py-3 text-center">{t('ui.sites')}</th>
                <th className="px-4 py-3 text-center">{t('ui.workers')}</th>
                <th className="px-4 py-3 text-center">{t('ui.compliance')}</th>
                <th className="px-5 py-3 text-right">{t('ui.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bss-border">
              {employer.contractors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs text-bss-text-muted">
                    No connected contractors found.
                  </td>
                </tr>
              ) : (
                employer.contractors.map(contractor => (
                  <tr key={contractor.id} className="hover:bg-bss-bg/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <strong className="text-bss-text-primary block font-semibold">{contractor.name}</strong>
                      <p className="font-mono text-[10px] text-bss-text-muted mt-0.5">{contractor.bssId}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center text-bss-text-secondary">{contractor.siteIds.length}</td>
                    <td className="px-4 py-3.5 text-center font-semibold text-bss-text-primary">{contractor.workers}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${contractor.compliance >= 90 ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-soft-orange text-bss-orange'}`}>
                        {contractor.compliance}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Status value={contractor.status}/>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4 Balanced Operational Cards in 2x2 Grid */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Card 1 (Row 1 Left): Approval Queue */}
        <section className="bss-card rounded-2xl overflow-hidden bss-hover-lift transition-all flex flex-col justify-between h-full">
          <div>
            <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-bss-soft-orange text-bss-orange grid place-items-center">
                  <Clock3 size={16}/>
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-bss-text-primary">{t('ui.approvalQueue')}</h2>
                  <p className="text-[11px] text-bss-text-muted mt-0.5">Pending contractor and worker binding requests</p>
                </div>
              </div>
              {pending.length > 0 && (
                <span className="text-[10px] font-bold text-bss-orange bg-bss-soft-orange px-2 py-0.5 rounded-full">
                  {pending.length} Pending
                </span>
              )}
            </header>
            {pending.length === 0 ? (
              <div className="p-6 text-center text-xs text-bss-text-muted flex flex-col items-center justify-center min-h-[140px]">
                <CheckCircle2 size={24} className="text-bss-green mb-2 opacity-80"/>
                <p className="font-medium text-bss-text-secondary">All requests clear</p>
                <p className="text-[11px] mt-0.5">No binding requests currently awaiting approval.</p>
              </div>
            ) : (
              <div className="divide-y divide-bss-border">
                {pending.slice(0, 3).map(item => (
                  <Link href="/employer/qr/requests" key={item.id} className="block p-4 hover:bg-bss-bg/60 transition-colors">
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-sm font-semibold text-bss-text-primary">{item.name}</p>
                      <span className="text-[9px] font-bold uppercase text-bss-interactive-blue bg-bss-blue-tint rounded px-1.5 py-0.5">
                        {item.entityType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-bss-text-muted mt-1">
                      <span>{item.site}</span>
                      <span className="text-[11px] font-medium text-bss-text-secondary">{item.checks.length} checks awaiting review</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/employer/qr/requests" className="h-10 border-t border-bss-border text-xs font-semibold text-bss-navy bg-bss-bg/50 hover:bg-bss-bg flex items-center justify-center gap-1.5 transition-colors">
            Review {pending.length > 0 ? `all ${pending.length} requests` : 'approval queue'} <ArrowRight size={13}/>
          </Link>
        </section>

        {/* Card 2 (Row 1 Right): Payroll Overview */}
        <section className="bss-card rounded-2xl overflow-hidden bss-hover-lift transition-all flex flex-col justify-between h-full">
          <div>
            <header className="px-5 py-4 border-b border-bss-border flex justify-between items-center">
              <h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-bss-soft-green text-bss-green grid place-items-center">
                  <Banknote size={15}/>
                </span>
                Payroll Overview
              </h2>
              <Link href="/employer/payroll" className="text-xs font-semibold text-bss-interactive-blue hover:underline">
                View Payroll &rarr;
              </Link>
            </header>
            <dl className="p-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-bss-border bg-bss-bg/40 p-3 text-center">
                <dt className="text-bss-text-muted text-[11px]">Workers processed</dt>
                <dd className="font-bold text-bss-text-primary mt-1 text-lg">{payrollRecords.filter(r => r.status === 'Verified').length}</dd>
              </div>
              <div className="rounded-xl border border-bss-border bg-bss-bg/40 p-3 text-center">
                <dt className="text-bss-text-muted text-[11px]">Pending records</dt>
                <dd className="font-bold text-bss-orange mt-1 text-lg">{payrollPending}</dd>
              </div>
              <div className="rounded-xl border border-bss-border bg-bss-bg/40 p-3 text-center">
                <dt className="text-bss-text-muted text-[11px]">Contractors receiving</dt>
                <dd className="font-bold text-bss-text-primary mt-1 text-lg">{payrollContractors}</dd>
              </div>
              <div className="rounded-xl border border-bss-border bg-bss-bg/40 p-3 text-center">
                <dt className="text-bss-text-muted text-[11px]">Exceptions</dt>
                <dd className={`font-bold mt-1 text-lg ${payrollExceptions > 0 ? 'text-bss-error' : 'text-bss-green'}`}>{payrollExceptions}</dd>
              </div>
            </dl>
          </div>
          <Link href="/employer/payroll?tab=distribution" className="h-10 border-t border-bss-border text-xs font-semibold text-bss-navy bg-bss-bg/50 hover:bg-bss-bg flex items-center justify-center gap-1.5 transition-colors">
            <Banknote size={13}/> Review salary distribution
          </Link>
        </section>

        {/* Card 3 (Row 2 Left): Workforce Health */}
        <section className="bss-card rounded-2xl overflow-hidden bss-hover-lift transition-all flex flex-col justify-between h-full">
          <div>
            <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-bss-blue-tint text-bss-interactive-blue grid place-items-center">
                  <Activity size={16}/>
                </span>
                <h2 className="text-sm font-semibold text-bss-text-primary">{t('ui.workforceHealth')}</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-bss-green bg-bss-soft-green px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-bss-green animate-pulse"/> Live sync
              </span>
            </header>
            <div className="p-5 space-y-4">
              <Health label="Active workers" value={`${activeWorkers}/${employer.workers.length}`} percent={employer.workers.length ? Math.round(activeWorkers / employer.workers.length * 100) : 0} tone="from-bss-interactive-blue to-bss-deep-navy"/>
              <Health label="Verified workers" value={String(employer.workers.filter(worker => worker.verified).length)} percent={employer.workers.length ? Math.round(employer.workers.filter(worker => worker.verified).length / employer.workers.length * 100) : 0} tone="from-bss-green to-[#0f6b30]"/>
              <Health label="Records needing attention" value={String(attentionReports)} percent={employer.complianceReports.length ? Math.round(attentionReports / employer.complianceReports.length * 100) : 0} tone="from-bss-orange to-bss-error"/>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-bss-border bg-bss-bg/30 text-[11px] text-bss-text-muted flex items-center justify-between">
            <span>Overall compliance rate</span>
            <strong className="text-bss-green font-bold">{employer.workers.length ? Math.round(employer.workers.filter(w => w.compliance === 'Compliant').length / employer.workers.length * 100) : 100}%</strong>
          </div>
        </section>

        {/* Card 4 (Row 2 Right): Recent Activity */}
        <section className="bss-card rounded-2xl overflow-hidden bss-hover-lift transition-all flex flex-col justify-between h-full">
          <div>
            <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-bss-bg text-bss-text-secondary grid place-items-center">
                  <Activity size={16}/>
                </span>
                {t('ui.recentActivity')}
              </h2>
              <span className="text-[11px] font-mono text-bss-text-muted">Audit stream</span>
            </header>
            <div className="p-4 space-y-3 max-h-56 overflow-y-auto">
              {employer.activities.length === 0 ? (
                <p className="text-xs text-bss-text-muted text-center py-6">No recent activity recorded.</p>
              ) : (
                employer.activities.slice(0, 4).map(activity => (
                  <div key={activity.id} className="flex gap-3 items-start">
                    <span className="mt-0.5 w-7 h-7 rounded-lg bg-bss-bg text-bss-text-muted grid place-items-center shrink-0">
                      {activity.type === 'approval' ? <ClipboardCheck size={14}/> : activity.type === 'compliance' ? <FileWarning size={14}/> : <HardHat size={14}/>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-bss-text-primary truncate">{activity.title}</p>
                      <p className="text-[11px] leading-relaxed text-bss-text-muted mt-0.5 line-clamp-2">{activity.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="px-5 py-3 border-t border-bss-border bg-bss-bg/30 text-[11px] text-bss-text-muted flex items-center justify-between">
            <span>Audit log integrity</span>
            <span className="text-bss-text-secondary font-medium">Logged &amp; Tamper-evident</span>
          </div>
        </section>
      </div>
    </div>

    {/* Sites & Workforce: Balanced Grid with Compact Indicators */}
    <section className="bss-reveal space-y-4" style={{ ['--bss-delay' as string]: '170ms' }} aria-label="Sites and workforce">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-bss-text-primary flex items-center gap-2">
            <MapPin size={16} className="text-bss-green"/> Sites &amp; Workforce
          </h2>
          <p className="text-[11px] text-bss-text-muted mt-0.5">Workers on each site, split by compliance status</p>
        </div>
        <Link href="/employer/sites" className="text-xs font-semibold text-bss-interactive-blue hover:underline flex items-center gap-1">
          All sites <ArrowRight size={14}/>
        </Link>
      </div>
      {employer.sites.length === 0 ? (
        <p className="bss-card rounded-2xl p-6 text-sm text-bss-text-muted text-center">No active sites mapped yet.</p>
      ) : (
        <div className={`grid gap-4 ${employer.sites.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {employer.sites.map(site => (
            <SiteWorkforceCard key={site.id} site={site} workers={workersBySite.get(site.id) ?? []}/>
          ))}
        </div>
      )}
    </section>

    {/* Workforce Analytics: Responsive Deep Dive */}
    <section className="bss-reveal space-y-4" style={{ ['--bss-delay' as string]: '190ms' }} aria-label="Workforce analytics">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-bss-text-primary flex items-center gap-2">
            <Activity size={16} className="text-bss-interactive-blue"/> Workforce Analytics
          </h2>
          <p className="text-[11px] text-bss-text-muted mt-0.5">Live workforce, attendance, payroll and compliance insights</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => analyticsRef.current?.exportExcel()} className="h-9 px-3.5 rounded-xl border border-bss-border bg-white text-xs font-semibold text-bss-text-secondary flex items-center gap-1.5 hover:bg-bss-bg transition-colors shadow-2xs">
            <Download size={14}/> Export Excel
          </button>
          <button type="button" onClick={() => analyticsRef.current?.printPdf()} className="h-9 px-3.5 rounded-xl border border-bss-border bg-white text-xs font-semibold text-bss-text-secondary flex items-center gap-1.5 hover:bg-bss-bg transition-colors shadow-2xs">
            <Printer size={14}/> Print / PDF
          </button>
        </div>
      </div>
      <EmployerAnalytics ref={analyticsRef} />
    </section>
  </div>;
}

function Status({ value }: { value:string }) {
  const tone = value === 'Active' ? 'bg-bss-soft-green text-bss-green' : value === 'Pending' ? 'bg-bss-soft-orange text-bss-orange' : 'bg-bss-soft-orange text-bss-error';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${tone}`}>{value}</span>;
}

function Health({ label, value, percent, tone }: { label:string; value:string; percent:number; tone:string }) {
  return <div>
    <div className="flex justify-between items-baseline text-xs mb-1.5">
      <span className="text-bss-text-secondary">{label}</span>
      <strong className="text-bss-text-primary">{value}</strong>
    </div>
    <div className="h-2 bg-bss-bg rounded-full overflow-hidden border border-bss-border/40">
      <div className={`h-full rounded-full bg-gradient-to-r ${tone} transition-all duration-700`} style={{ width:`${Math.min(100, percent)}%` }}/>
    </div>
  </div>;
}

function SiteWorkforceCard({ site, workers }: { site: EmployerSite; workers: EmployerWorker[] }) {
  const compliant = workers.filter(w => w.compliance === 'Compliant').length;
  const expiring = workers.filter(w => w.compliance === 'Expiring').length;
  const nonCompliant = workers.filter(w => w.compliance === 'Non-compliant').length;
  const active = workers.filter(w => w.status === 'Active').length;
  const total = workers.length || site.workers || 0;
  const pct = total ? Math.round(compliant / total * 100) : (site.compliance ?? 0);
  const ring = pct >= 90 ? '#14843C' : pct >= 70 ? '#EA8A00' : '#DC2626';
  const seg = (n: number) => total ? `${(n / total) * 100}%` : '0%';
  const statusTone = site.status === 'Active' ? 'bg-bss-soft-green text-bss-green' : site.status === 'Planned' ? 'bg-bss-blue-tint text-bss-interactive-blue' : 'bg-bss-bg text-bss-text-secondary';

  return (
    <Link href={`/employer/sites/${site.id}`} className="bss-card bss-hover-lift rounded-2xl p-5 block group flex flex-col border border-bss-border transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-bss-text-primary truncate group-hover:text-bss-interactive-blue transition-colors">{site.name}</h3>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusTone}`}>{site.status}</span>
          </div>
          <p className="text-[11px] text-bss-text-muted mt-1 flex items-center gap-1 truncate">
            <MapPin size={12} className="shrink-0 text-bss-text-muted"/>{site.location}, {site.state}
          </p>
          <span className="inline-block mt-1.5 text-[10px] font-mono bg-bss-bg text-bss-text-secondary rounded px-1.5 py-0.5 border border-bss-border/50">{site.code}</span>
        </div>
        
        {/* Compact, elegant circular compliance gauge */}
        <div className="relative shrink-0 w-12 h-12 flex items-center justify-center">
          <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#eef2f7" strokeWidth="3.2"/>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke={ring} strokeWidth="3.2" strokeLinecap="round" strokeDasharray={`${pct} ${100 - pct}`}/>
          </svg>
          <span className="absolute inset-0 grid place-items-center text-xs font-bold text-bss-text-primary">{pct}%</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-bss-bg/70 py-2 border border-bss-border/40">
          <div className="text-sm font-bold text-bss-text-primary">{total}</div>
          <div className="text-[10px] text-bss-text-muted">Workers</div>
        </div>
        <div className="rounded-xl bg-bss-bg/70 py-2 border border-bss-border/40">
          <div className="text-sm font-bold text-bss-text-primary">{site.contractorIds.length}</div>
          <div className="text-[10px] text-bss-text-muted">Contractors</div>
        </div>
        <div className="rounded-xl bg-bss-bg/70 py-2 border border-bss-border/40">
          <div className="text-sm font-bold text-bss-text-primary">{active}</div>
          <div className="text-[10px] text-bss-text-muted">Active</div>
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-bss-border/60">
        <div className="h-1.5 rounded-full bg-bss-bg overflow-hidden flex border border-bss-border/30">
          <div className="bg-bss-green transition-all duration-500" style={{ width: seg(compliant) }}/>
          <div className="bg-bss-orange transition-all duration-500" style={{ width: seg(expiring) }}/>
          <div className="bg-bss-error transition-all duration-500" style={{ width: seg(nonCompliant) }}/>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[10px] text-bss-text-secondary">
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-bss-green"/>Compliant: <strong className="text-bss-text-primary">{compliant}</strong></span>
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-bss-orange"/>Expiring: <strong className="text-bss-text-primary">{expiring}</strong></span>
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-bss-error"/>Non-compliant: <strong className="text-bss-text-primary">{nonCompliant}</strong></span>
        </div>
      </div>
    </Link>
  );
}
