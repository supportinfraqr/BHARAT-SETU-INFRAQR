"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users, Building2, ShieldCheck, Clock, MapPin, FileText, Activity, AlertCircle, ArrowRight, CheckCircle2, XCircle, X, Briefcase,
  Upload, BadgeCheck, ScanLine, Handshake, Landmark, Banknote, FileClock, TriangleAlert, UserRoundCheck,
} from 'lucide-react';

import { useContractor } from '@/contexts/ContractorContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CopyButton } from '@/components/ui/CopyButton';
import { formatDate } from '@/lib/date';
import LicensesPrompt from '@/components/licenses/LicensesPrompt';
import type { GatePassEligibility } from '@/types/portal';

/** Render a stored date (YYYY-MM-DD) as DD/MM/YYYY for display. */
function fmtDate(value?: string): string {
  return formatDate(value);
}

export default function ContractorDashboardPage() {
  const { contractor, employerScope, setEmployerScope, scoped } = useContractor();
  const { t } = useLanguage();

  const sites = scoped(contractor.sites, s => s.employer);
  const workers = scoped(contractor.workers, w => w.employer);
  const compliances = scoped(contractor.compliances, c => c.employer);
  const recentSubmissions = scoped(contractor.submissions.documents, d => d.employer).slice(0, 3);
  const activeWorkers = workers.filter(worker => worker.status === 'Accepted').length;
  const pendingWorkers = workers.filter(worker => worker.status === 'Pending').length;
  const expiringCompliance = compliances.filter(item => item.status === 'Expiring' || item.status === 'Expired').length;
  const activeLicenses = contractor.licenses.filter(l => l.status === 'Active').length;
  const pendingBinding = contractor.bindingRequests.filter(r => r.status === 'Pending');
  const pendingPayroll = contractor.payroll.records.filter(r => ['Draft', 'Reviewed', 'Submitted'].includes(r.status)).length;
  const payrollExceptions = contractor.payroll.records.filter(r => r.status === 'Exception' || r.status === 'Returned' || (r.errors && r.errors.length > 0)).length;
  const openGrievances = scoped(contractor.grievances, g => g.employer).filter(g => g.status === 'Open' || g.status === 'In Progress' || g.status === 'Reopened').length;
  const totalJobs = contractor.jobHistory.length;
  const totalApplications = contractor.jobHistory.reduce((s, j) => s + j.applications, 0);
  const totalHires = contractor.jobHistory.reduce((s, j) => s + j.hires, 0);
  const selectedEmployer = employerScope === 'all' ? null : contractor.employers.find(e => e.name === employerScope) ?? null;

  const kpis: Array<{ label: string; value: string; icon: typeof Users; tone: 'blue' | 'orange' | 'green' | 'indigo' | 'red'; href?: string; action?: string }> = [
    { label: t('ui.totalWorkers'), value: workers.length.toLocaleString('en-IN'), icon: Users, tone: 'blue', href: '/contractor/workers', action: 'View workers' },
    { label: 'Active Sites / Total', value: `${sites.filter(s => s.workers > 0).length || sites.length}/${sites.length}`, icon: Building2, tone: 'orange', href: '/contractor/qr/sites', action: 'View sites' },
    { label: 'Active Licenses', value: activeLicenses.toString(), icon: Landmark, tone: 'green', href: '/contractor/profile?tab=licences', action: 'View licences' },
    { label: 'Open Grievances', value: openGrievances.toString(), icon: AlertCircle, tone: 'red', href: '/contractor/grievances', action: openGrievances > 0 ? 'Needs attention' : 'All clear' },
  ];

  const [growthRange, setGrowthRange] = useState<'6' | '12'>('6');
  const growth = useMemo(() => growthRange === '6' ? contractor.workforceGrowth.sixMonths : contractor.workforceGrowth.oneYear, [contractor.workforceGrowth, growthRange]);
  const maxWorkers = Math.max(1, ...growth.map(p => p.workers));

  // The three gate-pass eligibility categories (Gate Pass Management System).
  // Counted across the contractor's bound workers.
  const docChecks: Array<[string, (e?: GatePassEligibility) => boolean]> = [
    ['Medical', e => e?.medical === 'Done'],
    ['Health & Safety', e => e?.healthSafety === 'Done'],
    ['Compliance', e => e?.compliance === 'Done'],
  ];
  const docSummary = docChecks.map(([name, test]) => {
    const verified = workers.filter(worker => test(worker.eligibility)).length;
    return { name, total: workers.length, verified, done: workers.length > 0 && verified === workers.length, missing: workers.length === 0 };
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">{t('ui.overview')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-bss-text-primary">
              Welcome, {contractor.identity.company}
            </h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-bss-interactive-blue bg-bss-blue-tint border border-bss-border rounded-full px-2 py-0.5">Contractor Portal</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-mono text-bss-text-secondary">{contractor.identity.bssId}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-bss-green bg-bss-soft-green border border-bss-border rounded-full px-2 py-0.5">
              <CheckCircle2 size={11}/> {(contractor.identity.accountStatus ?? 'ACTIVE').toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-bss-interactive-blue bg-bss-blue-tint border border-bss-border rounded-full px-2 py-0.5">
              <BadgeCheck size={11}/> RATING {contractor.identity.rating.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/contractor/compliance" className="h-10 px-4 rounded-lg border border-bss-border bg-white text-bss-text-primary text-sm font-semibold flex items-center gap-2 hover:bg-bss-bg">
            <Upload size={15}/> Upload data
          </Link>
          <Link href="/contractor/workers" className="h-10 px-4 rounded-lg bg-bss-navy text-white text-sm font-semibold flex items-center gap-2 hover:bg-bss-deep-navy shadow-sm">
            Find Workers <ArrowRight size={15}/>
          </Link>
        </div>
      </header>

      <LicensesPrompt endpoint="/api/contractor/licenses" href="/contractor/licenses" />

      {/* Contractor identity + Principal Employer */}
      <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
        <div className="grid md:grid-cols-[1fr_1.4fr] divide-y md:divide-y-0 md:divide-x divide-bss-border">
          <div className="p-4 sm:p-5 flex items-center gap-4">
            {contractor.identity.photoUrl ? <img src={contractor.identity.photoUrl} alt={contractor.identity.company} className="w-14 h-14 rounded-xl object-cover border border-bss-border flex-shrink-0"/> : <span className="w-14 h-14 rounded-xl bg-bss-blue-tint text-bss-navy grid place-items-center text-xl font-bold flex-shrink-0">{contractor.identity.company.charAt(0)}</span>}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Contractor Information</p>
              <h2 className="font-semibold text-bss-text-primary mt-0.5">{contractor.identity.company}</h2>
              <div className="flex items-center gap-2 mt-1"><p className="text-xs text-bss-text-secondary font-mono">{contractor.identity.bssId}</p><CopyButton value={contractor.identity.bssId}/></div>
              <p className="text-[11px] text-bss-text-muted mt-1">{contractor.identity.entity} · Incorp. {fmtDate(contractor.identity.incorpDate)}</p>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted flex items-center gap-1.5"><Landmark size={11}/>Principal Employers</p>
              {contractor.employers.length > 0 && (
                <select
                  value={employerScope}
                  onChange={e => setEmployerScope(e.target.value)}
                  className="h-8 rounded-lg border border-bss-border bg-white px-2 text-xs font-medium text-bss-text-primary max-w-[190px]"
                >
                  <option value="all">All employers ({contractor.employers.length})</option>
                  {contractor.employers.map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              )}
            </div>

            {contractor.employers.length === 0 ? (
              <p className="text-sm text-bss-text-muted mt-2">Not bound to any employer yet.</p>
            ) : selectedEmployer ? (
              <>
                <p className="text-sm font-semibold text-bss-text-primary mt-2">{selectedEmployer.name}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  <div><dt className="text-bss-text-muted">Code</dt><dd className="font-semibold font-mono text-bss-text-secondary mt-0.5">{selectedEmployer.code || selectedEmployer.employerId || '—'}</dd></div>
                  <div><dt className="text-bss-text-muted">Industry</dt><dd className="font-semibold text-bss-text-secondary mt-0.5">{selectedEmployer.industry || '—'}</dd></div>
                  <div><dt className="text-bss-text-muted">Email</dt><dd className="font-semibold text-bss-text-secondary mt-0.5 truncate">{selectedEmployer.email || '—'}</dd></div>
                  <div><dt className="text-bss-text-muted">LIN</dt><dd className="font-semibold font-mono text-bss-text-secondary mt-0.5">{selectedEmployer.lin || '—'}</dd></div>
                </dl>
              </>
            ) : (
              <ul className="mt-2 divide-y divide-bss-border">
                {contractor.employers.map(emp => (
                  <li key={emp.id} className="py-2 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-bss-blue-tint text-bss-navy grid place-items-center text-xs font-bold flex-shrink-0">{emp.name.charAt(0)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-bss-text-primary truncate">{emp.name}</p>
                      <p className="text-[11px] text-bss-text-muted font-mono truncate">{emp.code || emp.employerId}{emp.industry ? ` · ${emp.industry}` : ''}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-bss-text-muted flex-shrink-0">{emp.sites.length} site{emp.sites.length === 1 ? '' : 's'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* KPI Strip */}
      <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => {
          const inner = (
            <>
              <div className="flex items-center gap-2">
                <span className={`bss-kpi-icon ${
                  kpi.tone === 'blue' ? 'bg-bss-blue-tint text-bss-interactive-blue' :
                  kpi.tone === 'orange' ? 'bg-bss-soft-orange text-bss-orange' :
                  kpi.tone === 'green' ? 'bg-bss-soft-green text-bss-green' :
                  kpi.tone === 'red' ? 'bg-bss-soft-orange text-bss-error' : 'bg-bss-blue-tint text-bss-interactive-blue'
                }`}>
                  <kpi.icon size={16} />
                </span>
                <span className="text-xs font-medium text-bss-text-secondary">{kpi.label}</span>
              </div>
              <strong>{kpi.value}</strong>
              {kpi.action && <p className={kpi.tone === 'red' && openGrievances > 0 ? 'font-semibold text-bss-error' : 'font-semibold text-bss-text-secondary'}>{kpi.action}</p>}
            </>
          );
          return kpi.href
            ? <Link key={i} href={kpi.href} className="bss-kpi-card hover:border-bss-orange">{inner}</Link>
            : <article key={i} className="bss-kpi-card bss-hover-lift">{inner}</article>;
        })}
      </section>

      {/* Action Required */}
      <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bss-border">
          <h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2">
            <AlertCircle size={16} className="text-bss-error" /> {t('ui.actionRequired')}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-bss-border">
          <ActionItem href="/contractor/compliance" icon={FileClock} tone="bg-bss-soft-orange text-bss-error" title={`${expiringCompliance} compliance record${expiringCompliance === 1 ? '' : 's'} expiring`} text="Compliance expiring · Review Now" />
          <ActionItem href="/contractor/workers" icon={UserRoundCheck} tone="bg-bss-soft-orange text-bss-orange" title={`${pendingWorkers} workers pending verification`} text="Verify Workers" />
          <ActionItem href="/contractor/qr/requests" icon={Handshake} tone="bg-bss-blue-tint text-bss-interactive-blue" title={`${pendingBinding.length} pending binding request${pendingBinding.length === 1 ? '' : 's'}`} text={pendingBinding.length ? `${pendingBinding[0].entityName} · ${pendingBinding[0].site}` : 'Contractor ↔ Worker / Employer'} />
          <ActionItem href="/contractor/payroll" icon={TriangleAlert} tone="bg-bss-soft-orange text-bss-orange" title={`${payrollExceptions} payroll exception${payrollExceptions === 1 ? '' : 's'}`} text="Records needing correction" />
        </div>
      </section>

      {/* Workforce Health — 3-column stat row (moved out of sidebar) */}
      <div className="grid sm:grid-cols-3 gap-3">
        <HealthStat label="Active Workers" value={activeWorkers} total={Math.max(1, workers.length)} tone="bg-bss-interactive-blue" />
        <HealthStat label="Pending Verification" value={pendingWorkers} total={Math.max(1, workers.length)} tone="bg-bss-orange" />
        <HealthStat label="Expiring Compliance" value={expiringCompliance} total={Math.max(1, compliances.length)} tone="bg-bss-error" />
      </div>

      <div className="bss-masonry">

          {/* Site-wise Workers */}
          <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-bss-border flex justify-between items-center">
              <h2 className="text-sm font-semibold text-bss-text-primary">{t('ui.sites')} · Site-wise Workers</h2>
              <Link href="/contractor/qr/sites" className="text-xs font-medium text-bss-interactive-blue hover:underline">{t('ui.viewAll')}</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-bss-bg text-xs text-bss-text-secondary font-semibold border-b border-bss-border">
                  <tr>
                    <th className="px-5 py-3">Site / Code</th>
                    <th className="px-5 py-3">{t('ui.byState')}</th>
                    <th className="px-5 py-3">{t('ui.employer')}</th>
                    <th className="px-5 py-3">{t('ui.workers')}</th>
                    <th className="px-5 py-3">{t('ui.compliance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bss-border">
                  {sites.map(site => (
                    <tr key={site.id} className="hover:bg-bss-bg">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-bss-text-primary">{site.name}</p>
                        <p className="text-[11px] font-mono text-bss-text-muted mt-0.5">{site.bssId}</p>
                      </td>
                      <td className="px-5 py-3 text-bss-text-secondary"><span className="inline-flex items-center gap-1 text-xs"><MapPin size={12}/>{site.location}</span></td>
                      <td className="px-5 py-3 text-bss-text-secondary">{site.employer}</td>
                      <td className="px-5 py-3 font-medium text-bss-text-primary">{site.workers}</td>
                      <td className="px-5 py-3">
                        {site.compliance != null ? (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${site.compliance >= 95 ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-soft-orange text-bss-orange'}`}>
                            {site.compliance}%
                          </span>
                        ) : <span className="px-2 py-1 rounded text-xs font-semibold bg-bss-bg text-bss-text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Workforce Growth Trend */}
          <section className="bss-card bss-3d bss-scroll-rise rounded-2xl p-5">
            <div className="flex justify-between items-center">
              <div><h2 className="text-sm font-semibold text-bss-text-primary">Workforce Growth Trend</h2><p className="text-xs text-bss-text-muted mt-0.5">Active workers · last 6 months</p></div>
              <div className="flex gap-1">
                <button onClick={() => setGrowthRange('6')} className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${growthRange === '6' ? 'text-bss-interactive-blue bg-bss-blue-tint border-bss-border' : 'text-bss-text-muted border-bss-border'}`}>6 Months</button>
                <button onClick={() => setGrowthRange('12')} className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${growthRange === '12' ? 'text-bss-interactive-blue bg-bss-blue-tint border-bss-border' : 'text-bss-text-muted border-bss-border'}`}>1 Year</button>
              </div>
            </div>
            <div className="mt-4 flex items-end gap-2 h-28">
              {growth.map(point => (
                <div key={point.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-bss-text-secondary">{point.workers}</span>
                  <div className="w-full bg-bss-interactive-blue rounded-t-md" style={{ height: `${(point.workers / maxWorkers) * 100}%`, minHeight: 4 }} />
                  <span className="text-[9px] text-bss-text-muted">{point.month}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Applicability */}
          <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-bss-border"><h2 className="text-sm font-semibold text-bss-text-primary">Applicability</h2></div>
            <ul className="divide-y divide-bss-border">{contractor.applicability.map(a => (
              <li key={a.act} className="px-5 py-3 flex items-start justify-between gap-4">
                <div><p className="text-sm font-medium text-bss-text-primary">{a.act}</p><p className="text-xs text-bss-text-muted mt-0.5">{a.note}</p></div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 flex-shrink-0 ${a.applies ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-bg text-bss-text-muted'}`}>{a.applies ? <CheckCircle2 size={11}/> : <X size={11}/>}{a.applies ? 'Applies' : 'Not applicable'}</span>
              </li>
            ))}</ul>
          </section>

          {/* Compliance Submissions */}
          <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-bss-border flex justify-between items-center">
              <h2 className="text-sm font-semibold text-bss-text-primary">Compliance Submission List</h2>
              <Link href="/contractor/compliance" className="text-xs font-medium text-bss-interactive-blue hover:underline">{t('ui.viewAll')}</Link>
            </div>
            <div className="divide-y divide-bss-border">
              {recentSubmissions.map((submission) => (
                <div key={submission.id} className="px-5 py-3 flex items-center justify-between hover:bg-bss-bg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-bss-blue-tint text-bss-interactive-blue flex items-center justify-center"><FileText size={16} /></div>
                    <div>
                      <p className="text-sm font-semibold text-bss-text-primary">{submission.type} · {submission.period}</p>
                      <p className="text-xs text-bss-text-secondary">{submission.site} · {submission.uniqueNo ? `Unique No. ${submission.uniqueNo}` : ''} · {new Date(submission.submittedAt).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    ['Verified', 'Approved', 'Submitted'].includes(submission.status)
                      ? 'bg-bss-soft-green text-bss-green border-bss-border'
                      : ['Pending', 'Pending review', 'Under Review'].includes(submission.status)
                      ? 'bg-bss-soft-orange text-bss-orange border-bss-border'
                      : submission.status === 'Rejected'
                      ? 'bg-bss-soft-orange text-bss-error border-bss-border'
                      : 'bg-bss-blue-tint text-bss-interactive-blue border-bss-border'
                  }`}>
                    {['Verified', 'Approved', 'Submitted'].includes(submission.status) ? <CheckCircle2 size={13} className="text-bss-green"/> : ['Pending', 'Pending review', 'Under Review'].includes(submission.status) ? <Clock size={13} className="text-bss-orange"/> : submission.status === 'Rejected' ? <XCircle size={13} className="text-bss-error"/> : <FileText size={13}/>}
                    {submission.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Payroll summary */}
          <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-bss-border flex justify-between items-center">
              <h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2"><Banknote size={15} className="text-bss-green"/>Payroll</h2>
              <Link href="/contractor/payroll" className="text-xs font-semibold text-bss-interactive-blue">View Payroll &rarr;</Link>
            </div>
            <dl className="p-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-bss-border p-3"><dt className="text-bss-text-muted">Workers processed</dt><dd className="font-semibold text-bss-text-primary mt-1 text-base">{contractor.payroll.records.filter(r => r.status === 'Verified').length}</dd></div>
              <div className="rounded-lg border border-bss-border p-3"><dt className="text-bss-text-muted">Pending records</dt><dd className="font-semibold text-bss-orange mt-1 text-base">{pendingPayroll}</dd></div>
              <div className="rounded-lg border border-bss-border p-3"><dt className="text-bss-text-muted">Current period</dt><dd className="font-semibold text-bss-text-primary mt-1 text-base">Aug 26</dd></div>
              <div className="rounded-lg border border-bss-border p-3"><dt className="text-bss-text-muted">Exceptions</dt><dd className="font-semibold text-bss-error mt-1 text-base">{payrollExceptions}</dd></div>
            </dl>
          </section>

          {/* Binding highlights */}
          <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-bss-border flex justify-between items-center">
              <h2 className="text-sm font-semibold text-bss-text-primary">Worker Highlights</h2>
              <Link href="/contractor/qr/requests" className="text-xs font-semibold text-bss-interactive-blue">View all</Link>
            </div>
            <div className="divide-y divide-bss-border">
              {pendingBinding.length ? pendingBinding.map(req => (
                <div key={req.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="text-sm font-semibold text-bss-text-primary truncate">{req.entityName}</p><p className="text-xs text-bss-text-muted">{req.type} binding · {req.site}</p></div>
                  <span className="text-[10px] font-bold text-bss-orange bg-bss-soft-orange px-2 py-0.5 rounded-full flex-shrink-0">Pending</span>
                </div>
              )) : <p className="p-4 text-xs text-bss-text-muted text-center">No pending binding requests.</p>}
              <Link href="/contractor/scan" className="px-5 py-3 flex items-center gap-2 text-xs font-semibold text-bss-navy hover:bg-bss-bg"><ScanLine size={14}/>Scan QR to bind worker / employer</Link>
            </div>
          </section>

          {/* Worker Verified Documents */}
          <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-bss-border flex justify-between items-center">
              <h2 className="text-sm font-semibold text-bss-text-primary">Worker Verified Documents</h2>
              <Link href="/contractor/workers" className="text-xs font-semibold text-bss-interactive-blue">Workers &rarr;</Link>
            </div>
            <ul className="p-4 space-y-2.5">{docSummary.map(doc => (
              <li key={doc.name} className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 ${doc.done ? 'bg-bss-soft-green text-bss-green' : doc.missing ? 'bg-bss-bg text-bss-text-muted' : 'bg-bss-soft-orange text-bss-orange'}`}>{doc.done ? <BadgeCheck size={14}/> : <Clock size={13}/>}</span>
                <span className="flex-1 text-xs font-medium text-bss-text-secondary">{doc.name}</span>
                {doc.total > 0
                  ? <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 flex-shrink-0 ${doc.done ? 'text-bss-green bg-bss-soft-green' : 'text-bss-orange bg-bss-soft-orange'}`}>{doc.verified}/{doc.total}</span>
                  : <span className="text-[10px] font-semibold text-bss-text-muted flex-shrink-0">Not uploaded</span>}
              </li>
            ))}<p className="pt-2 text-[11px] text-bss-text-muted">Medical · Health &amp; Safety · Compliance — verified across bound workers</p></ul>
          </section>

          {/* Worker Compliance Overview */}
          <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-bss-border"><h2 className="text-sm font-semibold text-bss-text-primary">Welfare &amp; Safety Overview</h2></div>
            <div className="grid grid-cols-3 divide-x divide-bss-border">
              {(['gatePass', 'medical', 'healthSafety'] as const).map(key => {
                const label = key === 'gatePass' ? 'Gate Pass' : key === 'medical' ? 'Medical Exam' : 'Health & Safety';
                const done = contractor.workerCompliance.filter(w => w[key] === 'Active' || w[key] === 'Done').length;
                const total = contractor.workerCompliance.length || 1;
                return <div key={key} className="px-3 py-4 text-center">
                  <strong className="block text-lg text-bss-text-primary">{done}/{total}</strong>
                  <p className="text-[10px] uppercase tracking-wide text-bss-text-muted mt-1">{label}</p>
                </div>;
              })}
            </div>
            <div className="px-5 py-3 border-t border-bss-border flex justify-between items-center text-xs">
              <span className="text-bss-text-secondary">{contractor.workerCompliance.filter(w => w.gatePass === 'Pending' || w.medical === 'Expired').length} worker(s) need eligibility action</span>
              <Link href="/contractor/gate-pass" className="font-semibold text-bss-interactive-blue">Gate Pass &rarr;</Link>
            </div>
          </section>

          {/* Recent Activity — timeline */}
          <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-bss-border"><h2 className="text-sm font-semibold text-bss-text-primary">{t('ui.recentActivity')}</h2></div>
            <ul className="px-5 py-4">
              {(contractor.recentActivities && contractor.recentActivities.length > 0 ? contractor.recentActivities : [
                { title: 'New Gate Pass issued', time: '2 hours ago', type: 'gate_pass' },
                { title: 'PF challan verified', time: '5 hours ago', type: 'compliance' },
                { title: '3 workers bound via QR', time: '1 day ago', type: 'binding' },
                { title: `Job posted · ${totalJobs} active`, time: '2 days ago', type: 'job' },
              ]).map((act, i, arr) => {
                const title = act.title.toLowerCase();
                const isGate = act.type === 'gate_pass';
                const isBinding = act.type === 'binding';
                const isCompliance = act.type === 'compliance';
                const rejected = /reject|denied|declined|failed|cancelled/.test(title);
                const accepted = /accept|approved|verified|issued|bound|passed/.test(title);
                const IconComponent = isGate ? ShieldCheck : isBinding ? Activity : isCompliance ? FileText : FileText;
                const dotTone = rejected ? 'bg-bss-error ring-bss-soft-orange' : accepted ? 'bg-bss-green ring-bss-soft-green' : 'bg-bss-interactive-blue ring-bss-blue-tint';
                return (
                  <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < arr.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-bss-border" />}
                    <span className={`relative z-10 w-7 h-7 rounded-full grid place-items-center flex-shrink-0 ring-4 ${dotTone}`}>
                      <IconComponent size={13} className="text-white" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-sm font-medium text-bss-text-primary leading-snug">{act.title}</p>
                      <p className="text-[11px] text-bss-text-muted mt-0.5 font-medium">{act.time}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Rozgar snapshot — mini dashboard */}
          <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-bss-border flex justify-between items-center"><h2 className="text-sm font-semibold text-bss-text-primary">Rozgar Setu</h2><Link href="/contractor/rozgar" className="text-xs font-semibold text-bss-interactive-blue">Manage &rarr;</Link></div>
            {totalJobs === 0 && totalApplications === 0 && totalHires === 0 ? (
              <div className="px-5 py-6 text-center">
                <span className="w-11 h-11 rounded-xl bg-bss-bg text-bss-text-muted grid place-items-center mx-auto"><Briefcase size={20}/></span>
                <p className="text-sm font-medium text-bss-text-primary mt-3">No jobs posted yet</p>
                <p className="text-xs text-bss-text-muted mt-1">Reach India&apos;s verified workforce and hire faster.</p>
                <Link href="/contractor/rozgar" className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-bss-navy text-white text-xs font-semibold hover:bg-bss-deep-navy transition-colors">Post your first job <ArrowRight size={14}/></Link>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 p-4">
                <Stat value={totalJobs} label="Jobs posted" />
                <Stat value={totalApplications} label="Applications" />
                <Stat value={totalHires} label="Hires" />
              </div>
            )}
            {openGrievances > 0 && <Link href="/contractor/grievances" className="mx-4 mb-4 flex items-center gap-2 text-xs font-semibold text-bss-error bg-bss-soft-orange border border-bss-border rounded-xl px-3 py-2.5"><AlertCircle size={14}/>{openGrievances} grievance(s) need attention</Link>}
          </section>
      </div>
    </div>
  );
}

function ActionItem({ href, icon:Icon, tone, title, text }: { href:string; icon:typeof AlertCircle; tone:string; title:string; text:string }) {
  return <Link href={href} className="px-5 py-4 flex items-center gap-3 hover:bg-bss-bg group min-h-16">
    <span className={`w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 ${tone}`}><Icon size={17}/></span>
    <span className="min-w-0"><strong className="block text-sm font-semibold text-bss-text-primary">{title}</strong><small className="block text-[11px] text-bss-text-muted mt-0.5">{text}</small></span>
    <ArrowRight size={15} className="text-bss-text-muted ml-auto flex-shrink-0 group-hover:text-bss-orange"/>
  </Link>;
}
function HealthBar({ label, value, total, tone }: { label:string; value:number; total:number; tone:string }) {
  const width = Math.round((value / total) * 100);
  return <div>
    <div className="flex items-baseline justify-between mb-1.5"><span className="text-xs text-bss-text-secondary">{label}</span><span className="text-base font-bold text-bss-text-primary leading-none">{value}</span></div>
    <div className="w-full bg-bss-surface rounded-full h-2"><div className={`${tone} h-2 rounded-full transition-all`} style={{ width: `${Math.min(100, width)}%` }} /></div>
  </div>;
}
function HealthStat({ label, value, total, tone }: { label:string; value:number; total:number; tone:string }) {
  const pct = Math.round((value / total) * 100);
  return <div className="bss-card bss-3d bss-scroll-rise rounded-2xl p-4">
    <div className="flex items-baseline justify-between">
      <span className="text-xs font-medium text-bss-text-secondary">{label}</span>
      <span className="text-2xl font-bold text-bss-text-primary leading-none">{value}</span>
    </div>
    <div className="w-full bg-bss-surface rounded-full h-2 mt-3"><div className={`${tone} h-2 rounded-full transition-all`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
    <p className="text-[11px] text-bss-text-muted mt-2">{pct}% of {total}</p>
  </div>;
}
function Stat({ value, label }: { value:number; label:string }) {
  return <div className="text-center rounded-lg px-2 py-3"><strong className="block text-xl font-bold text-bss-text-primary leading-none">{value}</strong><span className="block text-[10px] uppercase tracking-wide text-bss-text-muted mt-1.5">{label}</span></div>;
}
