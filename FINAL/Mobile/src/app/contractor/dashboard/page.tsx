"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users, Building2, ShieldCheck, Clock, MapPin, FileText, Activity, AlertCircle, ArrowRight, CheckCircle2, X,
  Upload, BadgeCheck, ScanLine, Handshake, Landmark, Banknote, FileClock, TriangleAlert, UserRoundCheck,
} from 'lucide-react';

import { useContractor } from '@/contexts/ContractorContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CopyButton } from '@/components/ui/CopyButton';
import type { GatePassEligibility } from '@/types/portal';

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
    { label: t('ui.totalWorkers'), value: workers.length.toLocaleString('en-IN'), icon: Users, tone: 'blue' },
    { label: 'Active Sites / Total', value: `${sites.filter(s => s.workers > 0).length || sites.length}/${sites.length}`, icon: Building2, tone: 'orange' },
    { label: 'Active Licenses', value: activeLicenses.toString(), icon: Landmark, tone: 'green' },
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
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">{t('ui.overview')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">
              Welcome, {contractor.identity.company}
            </h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">Contractor Portal</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-mono text-gray-600">{contractor.identity.bssId}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
              <CheckCircle2 size={11}/> {(contractor.identity.accountStatus ?? 'ACTIVE').toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
              <BadgeCheck size={11}/> RATING {contractor.identity.rating.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/contractor/compliance" className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50">
            <Upload size={15}/> Upload data
          </Link>
          <Link href="/contractor/workers" className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black">
            Find Workers <ArrowRight size={15}/>
          </Link>
        </div>
      </header>

      {/* Contractor identity + Principal Employer */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="grid md:grid-cols-[1fr_1.4fr] divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-4 sm:p-5 flex items-center gap-4">
            <span className="w-14 h-14 rounded-xl bg-blue-50 text-blue-700 grid place-items-center text-xl font-bold flex-shrink-0">{contractor.identity.company.charAt(0)}</span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Contractor Information</p>
              <h2 className="font-semibold text-gray-950 mt-0.5">{contractor.identity.company}</h2>
              <div className="flex items-center gap-2 mt-1"><p className="text-xs text-gray-500 font-mono">{contractor.identity.bssId}</p><CopyButton value={contractor.identity.bssId}/></div>
              <p className="text-[11px] text-gray-400 mt-1">{contractor.identity.entity} · Incorp. {contractor.identity.incorpDate}</p>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5"><Landmark size={11}/>Principal Employers</p>
              {contractor.employers.length > 0 && (
                <select
                  value={employerScope}
                  onChange={e => setEmployerScope(e.target.value)}
                  className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 max-w-[190px]"
                >
                  <option value="all">All employers ({contractor.employers.length})</option>
                  {contractor.employers.map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              )}
            </div>

            {contractor.employers.length === 0 ? (
              <p className="text-sm text-gray-400 mt-2">Not bound to any employer yet.</p>
            ) : selectedEmployer ? (
              <>
                <p className="text-sm font-semibold text-gray-900 mt-2">{selectedEmployer.name}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  <div><dt className="text-gray-400">Code</dt><dd className="font-semibold font-mono text-gray-700 mt-0.5">{selectedEmployer.code || selectedEmployer.employerId || '—'}</dd></div>
                  <div><dt className="text-gray-400">Industry</dt><dd className="font-semibold text-gray-700 mt-0.5">{selectedEmployer.industry || '—'}</dd></div>
                  <div><dt className="text-gray-400">Email</dt><dd className="font-semibold text-gray-700 mt-0.5 truncate">{selectedEmployer.email || '—'}</dd></div>
                  <div><dt className="text-gray-400">LIN</dt><dd className="font-semibold font-mono text-gray-700 mt-0.5">{selectedEmployer.lin || '—'}</dd></div>
                </dl>
              </>
            ) : (
              <ul className="mt-2 divide-y divide-gray-100">
                {contractor.employers.map(emp => (
                  <li key={emp.id} className="py-2 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 grid place-items-center text-xs font-bold flex-shrink-0">{emp.name.charAt(0)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{emp.name}</p>
                      <p className="text-[11px] text-gray-400 font-mono truncate">{emp.code || emp.employerId}{emp.industry ? ` · ${emp.industry}` : ''}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 flex-shrink-0">{emp.sites.length} site{emp.sites.length === 1 ? '' : 's'}</span>
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
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-500">{kpi.label}</span>
                <span className={`bss-kpi-icon ${
                  kpi.tone === 'blue' ? 'bg-blue-50 text-blue-700' :
                  kpi.tone === 'orange' ? 'bg-orange-50 text-orange-700' :
                  kpi.tone === 'green' ? 'bg-green-50 text-green-700' :
                  kpi.tone === 'red' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-700'
                }`}>
                  <kpi.icon size={16} />
                </span>
              </div>
              <strong>{kpi.value}</strong>
              {kpi.action && <p className={kpi.tone === 'red' && openGrievances > 0 ? 'font-semibold text-red-600' : 'font-semibold'}>{kpi.action}</p>}
            </>
          );
          return kpi.href
            ? <Link key={i} href={kpi.href} className="bss-kpi-card hover:border-red-200">{inner}</Link>
            : <article key={i} className="bss-kpi-card">{inner}</article>;
        })}
      </section>

      {/* Action Required */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" /> {t('ui.actionRequired')}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-gray-100">
          <ActionItem href="/contractor/compliance" icon={FileClock} tone="bg-red-50 text-red-600" title={`${expiringCompliance} compliance record${expiringCompliance === 1 ? '' : 's'} expiring`} text="Compliance expiring · Review Now" />
          <ActionItem href="/contractor/workers" icon={UserRoundCheck} tone="bg-orange-50 text-orange-600" title={`${pendingWorkers} workers pending verification`} text="Verify Workers" />
          <ActionItem href="/contractor/qr/requests" icon={Handshake} tone="bg-blue-50 text-blue-700" title={`${pendingBinding.length} pending binding request${pendingBinding.length === 1 ? '' : 's'}`} text={pendingBinding.length ? `${pendingBinding[0].entityName} · ${pendingBinding[0].site}` : 'Contractor ↔ Worker / Employer'} />
          <ActionItem href="/contractor/payroll" icon={TriangleAlert} tone="bg-amber-50 text-amber-600" title={`${payrollExceptions} payroll exception${payrollExceptions === 1 ? '' : 's'}`} text="Records needing correction" />
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Site-wise Workers */}
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-950">{t('ui.sites')} · Site-wise Workers</h2>
              <Link href="/contractor/qr/sites" className="text-xs font-medium text-[#0066CC] hover:underline">{t('ui.viewAll')}</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3">Site / Code</th>
                    <th className="px-5 py-3">{t('ui.byState')}</th>
                    <th className="px-5 py-3">{t('ui.employer')}</th>
                    <th className="px-5 py-3">{t('ui.workers')}</th>
                    <th className="px-5 py-3">{t('ui.compliance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sites.map(site => (
                    <tr key={site.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-900">{site.name}</p>
                        <p className="text-[11px] font-mono text-gray-400 mt-0.5">{site.code}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-600"><span className="inline-flex items-center gap-1 text-xs"><MapPin size={12}/>{site.location}</span></td>
                      <td className="px-5 py-3 text-gray-600">{site.employer}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{site.workers}</td>
                      <td className="px-5 py-3">
                        {site.compliance != null ? (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${site.compliance >= 95 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                            {site.compliance}%
                          </span>
                        ) : <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-50 text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Workforce Growth Trend */}
          <section className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex justify-between items-center">
              <div><h2 className="text-sm font-semibold text-gray-950">Workforce Growth Trend</h2><p className="text-xs text-gray-400 mt-0.5">Active workers · last 6 months</p></div>
              <div className="flex gap-1">
                <button onClick={() => setGrowthRange('6')} className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${growthRange === '6' ? 'text-blue-700 bg-blue-50 border-blue-100' : 'text-gray-400 border-gray-200'}`}>6 Months</button>
                <button onClick={() => setGrowthRange('12')} className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${growthRange === '12' ? 'text-blue-700 bg-blue-50 border-blue-100' : 'text-gray-400 border-gray-200'}`}>1 Year</button>
              </div>
            </div>
            <div className="mt-4 flex items-end gap-2 h-28">
              {growth.map(point => (
                <div key={point.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-gray-500">{point.workers}</span>
                  <div className="w-full bg-blue-100 rounded-t-md" style={{ height: `${(point.workers / maxWorkers) * 100}%`, minHeight: 4 }} />
                  <span className="text-[9px] text-gray-400">{point.month}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Applicability */}
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Applicability</h2></div>
            <ul className="divide-y divide-gray-100">{contractor.applicability.map(a => (
              <li key={a.act} className="px-5 py-3 flex items-start justify-between gap-4">
                <div><p className="text-sm font-medium text-gray-800">{a.act}</p><p className="text-xs text-gray-400 mt-0.5">{a.note}</p></div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 flex-shrink-0 ${a.applies ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{a.applies ? <CheckCircle2 size={11}/> : <X size={11}/>}{a.applies ? 'Applies' : 'Not applicable'}</span>
              </li>
            ))}</ul>
          </section>

          {/* Compliance Submissions */}
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-950">Compliance Submission List</h2>
              <Link href="/contractor/compliance" className="text-xs font-medium text-[#0066CC] hover:underline">{t('ui.viewAll')}</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentSubmissions.map((submission) => (
                <div key={submission.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><FileText size={16} /></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{submission.type} · {submission.period}</p>
                      <p className="text-xs text-gray-500">{submission.site} · {submission.uniqueNo ? `Unique No. ${submission.uniqueNo}` : ''} · {new Date(submission.submittedAt).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    ['Verified', 'Approved', 'Submitted'].includes(submission.status)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : ['Pending', 'Pending review', 'Under Review'].includes(submission.status)
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : submission.status === 'Rejected'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {submission.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">

          {/* Payroll summary */}
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><Banknote size={15} className="text-bss-green"/>Payroll</h2>
              <Link href="/contractor/payroll" className="text-xs font-semibold text-blue-700">View Payroll &rarr;</Link>
            </div>
            <dl className="p-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-gray-100 p-3"><dt className="text-gray-400">Workers processed</dt><dd className="font-semibold text-gray-900 mt-1 text-base">{contractor.payroll.records.filter(r => r.status === 'Verified').length}</dd></div>
              <div className="rounded-lg border border-gray-100 p-3"><dt className="text-gray-400">Pending records</dt><dd className="font-semibold text-orange-700 mt-1 text-base">{pendingPayroll}</dd></div>
              <div className="rounded-lg border border-gray-100 p-3"><dt className="text-gray-400">Current period</dt><dd className="font-semibold text-gray-900 mt-1 text-base">Aug 26</dd></div>
              <div className="rounded-lg border border-gray-100 p-3"><dt className="text-gray-400">Exceptions</dt><dd className="font-semibold text-red-600 mt-1 text-base">{payrollExceptions}</dd></div>
            </dl>
          </section>

          {/* Binding highlights */}
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-950">Worker Highlights</h2>
              <Link href="/contractor/qr/requests" className="text-xs font-semibold text-blue-700">View all</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingBinding.length ? pendingBinding.map(req => (
                <div key={req.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{req.entityName}</p><p className="text-xs text-gray-400">{req.type} binding · {req.site}</p></div>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full flex-shrink-0">Pending</span>
                </div>
              )) : <p className="p-4 text-xs text-gray-400 text-center">No pending binding requests.</p>}
              <Link href="/contractor/scan" className="px-5 py-3 flex items-center gap-2 text-xs font-semibold text-[#073B67] hover:bg-gray-50"><ScanLine size={14}/>Scan QR to bind worker / employer</Link>
            </div>
          </section>

          {/* Worker Verified Documents */}
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-950">Worker Verified Documents</h2>
              <Link href="/contractor/workers" className="text-xs font-semibold text-blue-700">Workers &rarr;</Link>
            </div>
            <ul className="p-4 space-y-2.5">{docSummary.map(doc => (
              <li key={doc.name} className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 ${doc.done ? 'bg-green-50 text-green-700' : doc.missing ? 'bg-gray-50 text-gray-400' : 'bg-orange-50 text-orange-500'}`}>{doc.done ? <BadgeCheck size={14}/> : <Clock size={13}/>}</span>
                <span className="flex-1 text-xs font-medium text-gray-700">{doc.name}</span>
                {doc.total > 0
                  ? <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 flex-shrink-0 ${doc.done ? 'text-green-700 bg-green-50' : 'text-orange-700 bg-orange-50'}`}>{doc.verified}/{doc.total}</span>
                  : <span className="text-[10px] font-semibold text-gray-400 flex-shrink-0">Not uploaded</span>}
              </li>
            ))}<p className="pt-2 text-[11px] text-gray-400">Medical · Health &amp; Safety · Compliance — verified across bound workers</p></ul>
          </section>

          {/* Worker Compliance Overview */}
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Welfare &amp; Safety Overview</h2></div>
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              {(['gatePass', 'medical', 'healthSafety'] as const).map(key => {
                const label = key === 'gatePass' ? 'Gate Pass' : key === 'medical' ? 'Medical Exam' : 'Health & Safety';
                const done = contractor.workerCompliance.filter(w => w[key] === 'Active' || w[key] === 'Done').length;
                const total = contractor.workerCompliance.length || 1;
                return <div key={key} className="px-3 py-4 text-center">
                  <strong className="block text-lg text-gray-900">{done}/{total}</strong>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">{label}</p>
                </div>;
              })}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center text-xs">
              <span className="text-gray-500">{contractor.workerCompliance.filter(w => w.gatePass === 'Pending' || w.medical === 'Expired').length} worker(s) need eligibility action</span>
              <Link href="/contractor/gate-pass" className="font-semibold text-blue-700">Gate Pass &rarr;</Link>
            </div>
          </section>

          {/* Workforce Health */}
          <section className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-950 mb-4">{t('ui.workforceHealth')}</h2>
            <div className="space-y-4">
              <HealthBar label="Active Workers" value={activeWorkers} total={Math.max(1, workers.length)} tone="bg-blue-600" />
              <HealthBar label="Pending Verification" value={pendingWorkers} total={Math.max(1, workers.length)} tone="bg-orange-500" />
              <HealthBar label="Expiring Compliance" value={expiringCompliance} total={Math.max(1, compliances.length)} tone="bg-red-500" />
            </div>
          </section>

          {/* Recent Activity */}
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">{t('ui.recentActivity')}</h2></div>
            <div className="p-5 space-y-4">
              {(contractor.recentActivities && contractor.recentActivities.length > 0 ? contractor.recentActivities : [
                { title: 'New Gate Pass issued', time: '2 hours ago', type: 'gate_pass' },
                { title: 'PF challan verified', time: '5 hours ago', type: 'compliance' },
                { title: '3 workers bound via QR', time: '1 day ago', type: 'binding' },
                { title: `Job posted · ${totalJobs} active`, time: '2 days ago', type: 'job' },
              ]).map((act, i) => {
                const IconComponent = act.type === 'gate_pass' ? ShieldCheck : act.type === 'binding' ? Activity : act.type === 'job' ? FileText : FileText;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="mt-0.5"><IconComponent size={14} className="text-gray-400" /></div>
                    <div><p className="text-sm font-medium text-gray-800">{act.title}</p><p className="text-xs text-gray-400">{act.time}</p></div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Rozgar snapshot */}
          <section className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex justify-between items-center"><h2 className="text-sm font-semibold text-gray-950">Rozgar Setu</h2><Link href="/contractor/rozgar" className="text-xs font-semibold text-blue-700">Manage &rarr;</Link></div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <Stat value={totalJobs} label="Jobs posted" />
              <Stat value={totalApplications} label="Applications" />
              <Stat value={totalHires} label="Hires" />
            </div>
            {openGrievances > 0 && <Link href="/contractor/grievances" className="mt-4 flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5"><AlertCircle size={14}/>{openGrievances} grievance(s) need attention</Link>}
          </section>
        </div>
      </div>
    </div>
  );
}

function ActionItem({ href, icon:Icon, tone, title, text }: { href:string; icon:typeof AlertCircle; tone:string; title:string; text:string }) {
  return <Link href={href} className="px-5 py-4 flex items-center gap-3 hover:bg-gray-50 group min-h-16">
    <span className={`w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 ${tone}`}><Icon size={17}/></span>
    <span className="min-w-0"><strong className="block text-sm font-semibold text-gray-850">{title}</strong><small className="block text-[11px] text-gray-400 mt-0.5">{text}</small></span>
    <ArrowRight size={15} className="text-gray-300 ml-auto flex-shrink-0 group-hover:text-gray-500"/>
  </Link>;
}
function HealthBar({ label, value, total, tone }: { label:string; value:number; total:number; tone:string }) {
  const width = Math.round((value / total) * 100);
  return <div>
    <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{label}</span><span className="font-semibold text-gray-900">{value}</span></div>
    <div className="w-full bg-gray-100 rounded-full h-1.5"><div className={`${tone} h-1.5 rounded-full`} style={{ width: `${Math.min(100, width)}%` }} /></div>
  </div>;
}
function Stat({ value, label }: { value:number; label:string }) {
  return <div className="text-center"><strong className="block text-lg text-gray-900">{value}</strong><span className="text-[10px] uppercase tracking-wide text-gray-400">{label}</span></div>;
}
