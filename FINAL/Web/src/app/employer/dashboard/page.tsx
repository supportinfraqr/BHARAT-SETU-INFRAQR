"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, AlertTriangle, ArrowRight, Banknote, Building2, CheckCircle2, ClipboardCheck, Clock3, Download, FileWarning, HardHat, Stethoscope, LayoutGrid, MapPin, Database, Printer, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CopyButton } from '@/components/ui/CopyButton';
import LicensesPrompt from '@/components/licenses/LicensesPrompt';
import EmployerAnalytics, { WorkerDetailDialog, WorkersTable, type EmployerAnalyticsHandle, type WorkerRow } from '@/components/employer/EmployerAnalytics';
import MedicalTab from '@/components/employer/medical/MedicalTab';
import SafetyTrainingTab from '@/components/employer/medical/SafetyTrainingTab';
import { LivePulse, useLiveFeed } from '@/components/employer/LivePulse';
import { EmptyFiltered, FilterChips, InlineBar, Pager, PanelHeader, SearchBox, SectionTitle, SortTh, TABLE_HEAD, TABLE_ROW, TONE_BG, TONE_SOFT, TONE_TEXT, useSort, type Tone } from '@/components/employer/DashboardUI';
import type { EmployerSite, EmployerWorker } from '@/types/portal';

export default function EmployerDashboardPage() {
  const { employer, refresh } = useEmployer();
  const router = useRouter();
  const { t } = useLanguage();
  const analyticsRef = useRef<EmployerAnalyticsHandle>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Two workspaces on one page. Analytics stays mounted while hidden so its
  // fetch / 30s live refresh / export handle behave exactly as before.
  type View = 'overview' | 'analytics' | 'workers' | 'medical' | 'safety';
  const [view, setView] = useState<View>('overview');
  const live = useLiveFeed();
  // Staff sub-accounts never see the full employer dashboard — send them to the
  // first workspace they are permitted to use.
  useEffect(() => {
    if (!employer.isStaff) return;
    const perms = employer.staffPermissions ?? [];
    const target = perms.includes('medical') ? '/employer/worker-compliance-checklists?tab=medical'
      : perms.includes('safety') ? '/employer/worker-compliance-checklists?tab=safety'
        : perms.includes('gate_pass') ? '/employer/gate-pass'
          : perms.includes('compliance') ? '/employer/compliance-submission' : '/employer/no-workspace';
    router.replace(target);
  }, [employer.isStaff, employer.staffPermissions, router]);
  const [drill, setDrill] = useState<WorkerRow | null>(null);
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === '#workforce-analytics') {
        setView('analytics');
        requestAnimationFrame(() => document.getElementById('workforce-analytics')?.scrollIntoView({ behavior: 'smooth' }));
      } else if (window.location.hash === '#worker-database') {
        setView('workers');
      } else if (window.location.hash === '#medical') {
        setView('medical');
      } else if (window.location.hash === '#health-safety') {
        setView('safety');
      }
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  function openView(next: View) {
    setView(next);
    document.getElementById('dashboard-views')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function refreshAll() {
    setRefreshing(true);
    try { await Promise.all([refresh(), Promise.resolve(analyticsRef.current?.refresh()), live.reload()]); }
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
  const docsAttention = employer.workerDocuments.filter(d => ['Expiring','Missing','Pending'].includes(d.status)).length;

  const workersBySite = new Map<string, EmployerWorker[]>();
  employer.workers.forEach(worker => {
    const list = workersBySite.get(worker.siteId);
    if (list) list.push(worker); else workersBySite.set(worker.siteId, [worker]);
  });

  const metrics: Array<{ label: string; value: string | number; icon: typeof Users; tone: Tone }> = [
    { label:t('ui.contractors'), value:employer.stats.totalContractors, icon:Building2, tone:'blue' },
    { label:t('ui.connectedWorkers'), value:employer.stats.totalWorkers, icon:Users, tone:'orange' },
    { label:t('ui.activeSites'), value:employer.stats.activeSites, icon:MapPin, tone:'green' },
    { label:t('ui.complianceScore'), value:`${employer.stats.complianceScore}%`, icon:ShieldCheck, tone:'blue' },
  ];

  const SEV_ORDER = { red: 0, orange: 1, blue: 2, green: 3 } as const;
  const actions = [
    { id:'payroll', count:payrollReview, label:'payroll record(s) need review — conflicting Employer / Contractor sources', href:'/employer/payroll?tab=exceptions', severity: payrollReview ? 'red' : 'green', icon: Banknote },
    { id:'gatepass', count:pendingGate.length, label:'gate pass requests require approval', href:'/employer/gate-pass?status=Pending', severity: pendingGate.length ? 'orange' : 'green', icon: ShieldCheck },
    { id:'approvals', count:pending.length, label:'contractor or worker binding requests pending', href:'/employer/qr/requests', severity: pending.length ? 'orange' : 'green', icon: ClipboardCheck },
    { id:'submissions', count:pendingSubmissions.length, label:'submission(s) from your contractors require review', href:'/employer/compliance-submission', severity: pendingSubmissions.length ? 'blue' : 'green', icon: FileWarning },
    { id:'documents', count:docsAttention, label:'workers have expiring or missing documents', href:'/employer/admin/documents', severity: docsAttention ? 'red' : 'green', icon: FileWarning },
    { id:'sites', count:attentionSites.length, label:'sites have overdue compliance', href:'/employer/site-overview', severity: attentionSites.length ? 'red' : 'green', icon: MapPin },
  ].filter(action => action.count > 0)
   .sort((a, b) => SEV_ORDER[a.severity as keyof typeof SEV_ORDER] - SEV_ORDER[b.severity as keyof typeof SEV_ORDER]);

  const verifiedWorkers = employer.workers.filter(worker => worker.verified).length;
  const workerTotal = employer.workers.length;

  if (employer.isStaff) return null;

  return <div className="space-y-8 pb-10">
    {/* ── Hero: identity + headline KPIs, styled like the BSS deck cover ── */}
    <header className="bss-reveal relative overflow-hidden rounded-3xl text-white shadow-[0_24px_48px_-24px_rgba(1,24,58,0.55)]" style={{ background: 'linear-gradient(135deg, #01183A 0%, #022B5E 62%, #1E3A8A 130%)' }}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
      <div className="pointer-events-none absolute -right-24 -top-24 w-80 h-80 rounded-full border-[28px] border-white/[0.04]" />
      <div className="pointer-events-none absolute right-40 -bottom-28 w-64 h-64 rounded-full bg-[#E45D24]/10 blur-2xl" />

      <div className="relative p-5 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-extrabold tracking-tight shadow-sm">
                <span className="text-[#01183A]">Bharat</span><span className="-ml-1.5 text-[#E45D24]">Shram</span><span className="-ml-1.5 text-[#14843C]">Setu</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">{t('ui.overview')} · Employer Portal</span>
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl md:text-[34px] font-extrabold tracking-tight leading-tight">Welcome, {employer.identity.company}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center rounded-lg bg-white/10 border border-white/15 px-2.5 py-1 text-sm font-mono text-white/85">{employer.identity.bssId}</span>
              <CopyButton value={employer.identity.bssId} tone="dark"/>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#14843C] rounded-full px-2.5 py-1"><CheckCircle2 size={11}/> VERIFIED</span>
            </div>
            <p className="mt-3 text-xs text-white/55">One Nation, One ID, One Platform</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            <button type="button" onClick={refreshAll} disabled={refreshing} className="h-10 px-4 rounded-full bg-white/10 border border-white/20 text-white text-sm font-semibold flex items-center gap-2 hover:bg-white/20 transition-colors backdrop-blur-sm disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
            <Link href="/employer/qr/requests" className="h-10 px-4 rounded-full bg-[#E45D24] text-white text-sm font-bold flex items-center gap-2 hover:bg-[#C94D18] transition-colors shadow-[0_8px_20px_-8px_#E45D24]">Review approvals <ArrowRight size={15}/></Link>
          </div>
        </div>

        <section className="bss-kpi-grid mt-6 grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Employer key metrics">
          {metrics.map(metric => <article key={metric.label} className="group relative rounded-2xl bg-white/[0.06] border border-white/10 p-4 backdrop-blur-sm hover:bg-white/[0.1] transition-colors overflow-hidden">
            <span className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${metric.tone === 'blue' ? 'bg-[#6886C6]' : TONE_BG[metric.tone]}`} />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{metric.label}</span>
              <span className={`w-8 h-8 rounded-full grid place-items-center text-white ${metric.tone === 'blue' ? 'bg-[#6886C6]' : TONE_BG[metric.tone]}`}><metric.icon size={15}/></span>
            </div>
            <strong className="block mt-2 text-3xl sm:text-4xl font-extrabold leading-none tabular-nums">{metric.value}</strong>
          </article>)}
        </section>
      </div>
      <div className="relative flex h-1.5" aria-hidden><span className="flex-1 bg-[#E45D24]"/><span className="flex-1 bg-white/80"/><span className="flex-1 bg-[#14843C]"/></div>
    </header>

    <LicensesPrompt endpoint="/api/employer/licenses" href="/employer/licenses" />

    {/* ── Workspace switch ── */}
    <nav id="dashboard-views" aria-label="Dashboard views" className="scroll-mt-[calc(var(--bss-header-height,0px)+1rem)]">
      <div className="space-y-2 rounded-3xl bg-[#F5F7FB]/85 backdrop-blur p-1 -m-1">
      <div role="tablist" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 rounded-2xl bg-white/95 border border-[#DBE3EF] p-1.5 shadow-[0_10px_24px_-16px_rgba(1,24,58,0.35)]">
        <ViewTab active={view === 'overview'} onClick={() => openView('overview')} icon={LayoutGrid} title="Overview" short="Overview"
          hint="Actions · operations · sites · contractors" badge={actions.length ? `${actions.length} to act on` : undefined} />
        <ViewTab active={view === 'analytics'} onClick={() => openView('analytics')} icon={Activity} title="Workforce Analytics" short="Analytics"
          hint="Trends · compliance · explorer · exports" />
        <ViewTab active={view === 'workers'} onClick={() => openView('workers')} icon={Database} title="Worker Database" short="Workers"
          hint="Every bound worker · today's status" badge={live.data?.workers ? String(live.data.workers.length) : undefined} />
        <ViewTab active={view === 'medical'} onClick={() => openView('medical')} icon={Stethoscope} title="Medical" short="Medical"
          hint="Health examinations · Form-VIII/IX · certificates" />
        <ViewTab active={view === 'safety'} onClick={() => openView('safety')} icon={HardHat} title="Health & Safety Training" short="Safety"
          hint="PPE kit · safety training · compliance" />
      </div>
      <LivePulse feed={live} onWorker={setDrill} />
      </div>
    </nav>

    <div hidden={view !== 'overview'} className="space-y-8">
    {/* ── Action required ── */}
    {actions.length > 0 && <section className="bss-reveal rounded-3xl border border-[#F5C6B2] bg-[#FDF0EA]/60 p-4 sm:p-5" style={{ ['--bss-delay' as string]: '80ms' }}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-[#E45D24] text-white grid place-items-center shadow-[0_6px_14px_-6px_#E45D24]"><AlertTriangle size={16}/></span>
          <div><h2 className="text-base font-extrabold text-[#01183A]">{t('ui.actionRequired')}</h2><p className="text-[11px] text-bss-text-muted">Items that need your attention · most urgent first</p></div>
        </div>
        <span className="text-[11px] font-bold text-[#E45D24] bg-white border border-[#F5C6B2] rounded-full px-2.5 py-1 whitespace-nowrap">{actions.length} open</span>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{actions.map(action => {
        const tone: Tone = action.severity === 'red' ? 'red' : action.severity === 'orange' ? 'orange' : action.severity === 'blue' ? 'blue' : 'green';
        return <Link key={action.id} href={action.href} className="group relative flex items-center gap-3 rounded-2xl bg-white border border-[#DBE3EF] pl-4 pr-3 py-3 overflow-hidden hover:border-[#1E3A8A]/40 hover:shadow-md transition-all">
          <span className={`absolute left-0 inset-y-0 w-1 ${TONE_BG[tone]}`}/>
          <span className={`w-11 h-11 rounded-full grid place-items-center flex-shrink-0 font-extrabold text-base ${TONE_SOFT[tone]} ${TONE_TEXT[tone]}`}>{action.count}</span>
          <p className="min-w-0 flex-1 text-xs text-bss-text-secondary leading-snug">{action.label}</p>
          <span className="w-7 h-7 rounded-full grid place-items-center bg-[#F2F6FC] text-bss-text-muted group-hover:bg-[#01183A] group-hover:text-white transition-colors flex-shrink-0"><ArrowRight size={14}/></span>
        </Link>;
      })}</div>
    </section>}

    {/* ── 01 Operations at a glance ── */}
    <section className="bss-reveal space-y-4" style={{ ['--bss-delay' as string]: '120ms' }} aria-label="Operations">
      <SectionTitle index="01" title="Operations at a glance" subtitle="Approvals, payroll, workforce health and the audit stream" />
      <div className="grid md:grid-cols-2 gap-5">
        {/* Approval Queue */}
        <section className="rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden flex flex-col justify-between h-full hover:shadow-lg transition-shadow">
          <div>
            <PanelHeader icon={Clock3} tone="orange" title={t('ui.approvalQueue')} subtitle="Pending contractor and worker binding requests"
              right={pending.length > 0 && <span className="text-[10px] font-bold text-white bg-[#E45D24] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">{pending.length} Pending</span>} />
            {pending.length === 0 ? (
              <div className="p-6 text-center text-xs text-bss-text-muted flex flex-col items-center justify-center min-h-[160px]">
                <span className="w-12 h-12 rounded-full bg-[#EAF5EE] grid place-items-center mb-2"><CheckCircle2 size={22} className="text-[#14843C]"/></span>
                <p className="font-semibold text-[#01183A]">All requests clear</p>
                <p className="text-[11px] mt-0.5">No binding requests currently awaiting approval.</p>
              </div>
            ) : (
              <ul className="p-3 space-y-2">
                {pending.slice(0, 3).map(item => (
                  <li key={item.id}>
                    <Link href="/employer/qr/requests" className="flex items-center gap-3 rounded-2xl border border-[#DBE3EF] bg-[#F2F6FC]/50 p-3 hover:bg-[#F2F6FC] hover:border-[#1E3A8A]/30 transition-colors">
                      <span className="w-9 h-9 rounded-full bg-[#01183A] text-white grid place-items-center text-xs font-bold shrink-0">{initials(item.name)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center gap-2">
                          <p className="text-sm font-semibold text-[#01183A] truncate">{item.name}</p>
                          <span className="text-[9px] font-bold uppercase text-[#1E3A8A] bg-[#EEF2FB] rounded-full px-2 py-0.5 shrink-0">{item.entityType}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-bss-text-muted mt-0.5">
                          <span className="truncate">{item.site}</span>
                          <span className="font-medium text-bss-text-secondary shrink-0">{item.checks.length} checks awaiting review</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link href="/employer/qr/requests" className="h-11 border-t border-[#DBE3EF] text-xs font-bold text-[#01183A] bg-[#F2F6FC]/60 hover:bg-[#01183A] hover:text-white flex items-center justify-center gap-1.5 transition-colors">
            Review {pending.length > 0 ? `all ${pending.length} requests` : 'approval queue'} <ArrowRight size={13}/>
          </Link>
        </section>

        {/* Payroll Overview */}
        <section className="rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden flex flex-col justify-between h-full hover:shadow-lg transition-shadow">
          <div>
            <PanelHeader icon={Banknote} tone="green" title="Payroll Overview"
              right={<Link href="/employer/payroll" className="text-xs font-semibold text-[#1E3A8A] hover:underline shrink-0">View Payroll &rarr;</Link>} />
            <dl className="p-4 grid grid-cols-2 gap-3 text-xs">
              <PayrollTile label="Workers processed" value={payrollRecords.filter(r => r.status === 'Verified').length} tone="green" />
              <PayrollTile label="Pending records" value={payrollPending} tone="orange" />
              <PayrollTile label="Contractors receiving" value={payrollContractors} tone="blue" />
              <PayrollTile label="Exceptions" value={payrollExceptions} tone={payrollExceptions > 0 ? 'red' : 'green'} />
            </dl>
          </div>
          <Link href="/employer/payroll?tab=distribution" className="h-11 border-t border-[#DBE3EF] text-xs font-bold text-[#01183A] bg-[#F2F6FC]/60 hover:bg-[#01183A] hover:text-white flex items-center justify-center gap-1.5 transition-colors">
            <Banknote size={13}/> Review salary distribution
          </Link>
        </section>

        {/* Workforce Health — concentric ring infographic */}
        <section className="rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden flex flex-col justify-between h-full hover:shadow-lg transition-shadow">
          <div>
            <PanelHeader icon={Activity} tone="blue" title={t('ui.workforceHealth')}
              right={<span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#14843C] bg-[#EAF5EE] px-2.5 py-1 rounded-full shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-[#14843C] animate-pulse"/> Live sync</span>} />
            <HealthRings rows={[
              { label: 'Active workers', value: `${activeWorkers}/${workerTotal}`, percent: workerTotal ? Math.round(activeWorkers / workerTotal * 100) : 0, color: '#1E3A8A' },
              { label: 'Verified workers', value: String(verifiedWorkers), percent: workerTotal ? Math.round(verifiedWorkers / workerTotal * 100) : 0, color: '#14843C' },
              { label: 'Records needing attention', value: String(attentionReports), percent: employer.complianceReports.length ? Math.round(attentionReports / employer.complianceReports.length * 100) : 0, color: '#E45D24' },
            ]} />
          </div>
          <div className="px-5 py-3 border-t border-[#DBE3EF] bg-[#F2F6FC]/60 text-[11px] text-bss-text-muted flex items-center justify-between">
            <span>Overall compliance rate</span>
            <strong className="text-[#14843C] text-sm font-extrabold">{workerTotal ? Math.round(employer.workers.filter(w => w.compliance === 'Compliant').length / workerTotal * 100) : 100}%</strong>
          </div>
        </section>

        {/* Recent Activity — timeline */}
        <section className="rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden flex flex-col justify-between h-full hover:shadow-lg transition-shadow">
          <div>
            <PanelHeader icon={Activity} tone="navy" title={t('ui.recentActivity')} right={<span className="text-[10px] font-mono uppercase tracking-wider text-bss-text-muted shrink-0">Audit stream</span>} />
            <div className="px-5 py-4 max-h-60 overflow-y-auto">
              {employer.activities.length === 0 ? (
                <p className="text-xs text-bss-text-muted text-center py-6">No recent activity recorded.</p>
              ) : (
                <ol className="relative border-l-2 border-dashed border-[#DBE3EF] ml-3.5 space-y-4">
                  {employer.activities.slice(0, 4).map(activity => {
                    const tone: Tone = activity.type === 'approval' ? 'orange' : activity.type === 'compliance' ? 'blue' : 'green';
                    return <li key={activity.id} className="relative pl-6">
                      <span className={`absolute -left-[15px] top-0 w-7 h-7 rounded-full grid place-items-center text-white ring-4 ring-white ${TONE_BG[tone]}`}>
                        {activity.type === 'approval' ? <ClipboardCheck size={13}/> : activity.type === 'compliance' ? <FileWarning size={13}/> : <HardHat size={13}/>}
                      </span>
                      <p className="text-xs font-bold text-[#01183A] truncate">{activity.title}</p>
                      <p className="text-[11px] leading-relaxed text-bss-text-muted mt-0.5 line-clamp-2">{activity.description}</p>
                    </li>;
                  })}
                </ol>
              )}
            </div>
          </div>
          <div className="px-5 py-3 border-t border-[#DBE3EF] bg-[#F2F6FC]/60 text-[11px] text-bss-text-muted flex items-center justify-between">
            <span>Audit log integrity</span>
            <span className="inline-flex items-center gap-1 text-[#14843C] font-semibold"><ShieldCheck size={12}/> Logged &amp; Tamper-evident</span>
          </div>
        </section>
      </div>
    </section>

    {/* ── 02 Sites & Workforce ── */}
    <SitesSection sites={employer.sites} workersBySite={workersBySite} />

    {/* ── 03 Contractor oversight ── */}
    <ContractorOversight contractors={employer.contractors} t={t} />

    {/* ── Hand-off to the analytics workspace ── */}
    <button type="button" onClick={() => openView('analytics')} className="group w-full text-left relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white flex flex-wrap items-center justify-between gap-4" style={{ background: 'linear-gradient(120deg, #01183A 0%, #022B5E 70%, #1E3A8A 130%)' }}>
      <span className="flex items-center gap-4 min-w-0">
        <span className="w-12 h-12 rounded-full bg-[#E45D24] grid place-items-center shrink-0"><Activity size={20}/></span>
        <span className="min-w-0">
          <span className="block text-base font-extrabold">Go deeper in Workforce Analytics</span>
          <span className="block text-xs text-white/65 mt-0.5">Live on-site status, attendance trends, workforce explorer, compliance, gate and grievance insights, with Excel and PDF export.</span>
        </span>
      </span>
      <span className="h-10 px-5 rounded-full bg-white text-[#01183A] text-sm font-bold inline-flex items-center gap-2 group-hover:bg-[#E45D24] group-hover:text-white transition-colors">Open analytics <ArrowRight size={15}/></span>
    </button>
    </div>

    {/* ── Workforce Analytics workspace ── */}
    <section hidden={view !== 'analytics'} className="space-y-4" aria-label="Workforce analytics">
      <SectionTitle icon={Activity} title="Workforce Analytics" subtitle="Live workforce, attendance, payroll and compliance insights"
        action={<div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => analyticsRef.current?.exportExcel()} className="h-9 px-4 rounded-full border border-[#DBE3EF] bg-white text-xs font-semibold text-[#01183A] flex items-center gap-1.5 hover:border-[#14843C] hover:text-[#14843C] transition-colors">
            <Download size={14}/> Export Excel
          </button>
          <button type="button" onClick={() => analyticsRef.current?.printPdf()} className="h-9 px-4 rounded-full bg-[#01183A] text-xs font-semibold text-white flex items-center gap-1.5 hover:bg-[#022B5E] transition-colors">
            <Printer size={14}/> Print / PDF
          </button>
        </div>} />
      <EmployerAnalytics ref={analyticsRef} />
    </section>

    {/* ── Worker Database workspace ── */}
    <section id="worker-database" hidden={view !== 'workers'} className="space-y-4 scroll-mt-40" aria-label="Worker database">
      <SectionTitle icon={Database} title="Worker Database" subtitle="Every bound worker with today's live status · search, filter, sort, tap a worker for attendance history"
        action={<span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#14843C] bg-[#EAF5EE] px-3 py-1.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-[#14843C] animate-pulse"/>Live · {live.updatedAt ? `updated ${live.updatedAt}` : 'connecting…'}</span>} />
      {live.error && <p role="alert" className="bss-alert bss-alert-error">{live.error}</p>}
      <div className="rounded-3xl bg-white border border-[#DBE3EF] p-4 sm:p-5">
        {live.data ? <WorkersTable workers={live.data.workers ?? []} onWorker={setDrill} pageSize={15} />
          : <p className="py-10 text-center text-sm text-bss-text-muted">{live.loading ? 'Loading workers…' : 'No worker data.'}</p>}
      </div>
    </section>

    {/* ── Medical workspace ── */}
    <section id="medical" hidden={view !== 'medical'} className="space-y-4 scroll-mt-40" aria-label="Medical">
      {view === 'medical' && <MedicalTab />}
    </section>

    {/* ── Health & Safety Training workspace ── */}
    <section id="health-safety" hidden={view !== 'safety'} className="space-y-4 scroll-mt-40" aria-label="Health & safety training">
      {view === 'safety' && <SafetyTrainingTab />}
    </section>

    {drill && <WorkerDetailDialog row={drill} onClose={() => setDrill(null)} />}
  </div>;
}

function ViewTab({ active, onClick, icon: Icon, title, short, hint, badge, live }: {
  active: boolean; onClick: () => void; icon: typeof Users; title: string; short: string; hint: string; badge?: string; live?: boolean;
}) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick}
    className={`min-w-0 flex items-center justify-center md:justify-start gap-2 md:gap-3 rounded-xl px-2 md:px-4 py-2 md:py-2.5 text-left transition-all touch-manipulation ${active ? 'bg-[#01183A] text-white shadow-md' : 'text-[#01183A] hover:bg-[#F2F6FC]'}`}>
    <span className={`w-7 h-7 md:w-9 md:h-9 rounded-full grid place-items-center shrink-0 ${active ? 'bg-[#E45D24] text-white' : 'bg-[#F2F6FC] text-[#1E3A8A]'}`}><Icon size={15}/></span>
    <span className="min-w-0 md:flex-1">
      <span className="flex items-center gap-2 text-xs md:text-sm font-extrabold">
        <span className="truncate md:hidden">{short}</span><span className="truncate hidden md:inline">{title}</span>
        {live && <span className="relative flex w-2 h-2 shrink-0"><span className="absolute inset-0 rounded-full bg-[#14843C] animate-ping opacity-70"/><span className="relative w-2 h-2 rounded-full bg-[#14843C]"/></span>}
      </span>
      <span className={`hidden lg:block text-[11px] truncate ${active ? 'text-white/60' : 'text-bss-text-muted'}`}>{hint}</span>
    </span>
    {badge && <span className={`hidden xl:inline-flex shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 ${active ? 'bg-white/15 text-white' : 'bg-[#FDF0EA] text-[#E45D24]'}`}>{badge}</span>}
  </button>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '•';
}

function PayrollTile({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return <div className={`relative rounded-2xl border border-[#DBE3EF] p-3.5 overflow-hidden ${TONE_SOFT[tone]}`}>
    <span className={`absolute right-3 top-3 w-2 h-2 rounded-full ${TONE_BG[tone]}`} />
    <dt className="text-bss-text-muted text-[11px] font-medium">{label}</dt>
    <dd className={`font-extrabold mt-1 text-2xl tabular-nums ${tone === 'blue' ? 'text-[#01183A]' : TONE_TEXT[tone]}`}>{value}</dd>
  </div>;
}

function HealthRings({ rows }: { rows: Array<{ label: string; value: string; percent: number; color: string }> }) {
  const size = 132, stroke = 10, gap = 4;
  return <div className="p-5 flex flex-col sm:flex-row items-center gap-5">
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" role="img" aria-label={rows.map(r => `${r.label}: ${r.value}`).join(', ')}>
      {rows.map((r, i) => {
        const radius = size / 2 - stroke / 2 - i * (stroke + gap);
        const c = 2 * Math.PI * radius;
        const pct = Math.min(100, Math.max(0, r.percent));
        return <g key={r.label}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F2F6FC" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={r.color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${c * pct / 100} ${c}`} className="transition-all duration-700" />
        </g>;
      })}
    </svg>
    <ul className="flex-1 w-full space-y-3">
      {rows.map(r => <li key={r.label}>
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="flex items-center gap-2 text-bss-text-secondary"><span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />{r.label}</span>
          <strong className="text-[#01183A] tabular-nums">{r.value}</strong>
        </div>
        <div className="mt-1.5"><InlineBar value={Math.min(100, r.percent)} max={100} color={r.color} /></div>
      </li>)}
    </ul>
  </div>;
}

function siteCompliance(site: EmployerSite, workers: EmployerWorker[]) {
  const compliant = workers.filter(w => w.compliance === 'Compliant').length;
  const total = workers.length || site.workers || 0;
  return total ? Math.round(compliant / total * 100) : (site.compliance ?? 0);
}

type SiteSort = 'name' | 'compliance' | 'workers';
function SitesSection({ sites, workersBySite }: { sites: EmployerSite[]; workersBySite: Map<string, EmployerWorker[]> }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState<SiteSort>('name');
  const statuses = useMemo(() => [...new Set(sites.map(s => s.status))], [sites]);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = sites.filter(s => (status === 'all' || s.status === status)
      && (!needle || `${s.name} ${s.location} ${s.state} ${s.code}`.toLowerCase().includes(needle)));
    const workers = (s: EmployerSite) => (workersBySite.get(s.id) ?? []).length || s.workers || 0;
    return [...list].sort((a, b) => sortBy === 'compliance'
      ? siteCompliance(a, workersBySite.get(a.id) ?? []) - siteCompliance(b, workersBySite.get(b.id) ?? [])
      : sortBy === 'workers' ? workers(b) - workers(a)
      : a.name.localeCompare(b.name));
  }, [sites, workersBySite, q, status, sortBy]);
  const showTools = sites.length > 3;

  return <section className="bss-reveal space-y-4" style={{ ['--bss-delay' as string]: '150ms' }} aria-label="Sites and workforce">
    <SectionTitle index="02" title={<>Sites &amp; Workforce</>} subtitle="Workers on each site, split by compliance status"
      action={<Link href="/employer/sites" className="h-9 px-4 rounded-full border border-[#DBE3EF] bg-white text-xs font-semibold text-[#1E3A8A] hover:border-[#1E3A8A]/40 flex items-center gap-1">All sites <ArrowRight size={14}/></Link>} />
    {showTools && <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white border border-[#DBE3EF] p-2.5">
      <SearchBox value={q} onChange={setQ} placeholder="Search site, city, state or code" className="flex-1 min-w-[200px]" />
      <FilterChips value={status} onChange={setStatus} options={[{ value: 'all', label: 'All', count: sites.length }, ...statuses.map(s => ({ value: s, label: s, count: sites.filter(x => x.status === s).length }))]} />
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-bss-text-muted">Sort
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SiteSort)} className="h-8 rounded-full border border-[#DBE3EF] bg-white px-2.5 text-xs text-[#01183A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15">
          <option value="name">Name A–Z</option>
          <option value="compliance">Lowest compliance first</option>
          <option value="workers">Most workers first</option>
        </select>
      </label>
    </div>}
    {sites.length === 0 ? (
      <p className="rounded-3xl bg-white border border-[#DBE3EF] p-6 text-sm text-bss-text-muted text-center">No active sites mapped yet.</p>
    ) : visible.length === 0 ? (
      <div className="rounded-3xl bg-white border border-[#DBE3EF]"><EmptyFiltered label="No sites match." onReset={() => { setQ(''); setStatus('all'); }} /></div>
    ) : (
      <div className={`grid gap-4 ${visible.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {visible.map(site => (
          <SiteWorkforceCard key={site.id} site={site} workers={workersBySite.get(site.id) ?? []}/>
        ))}
      </div>
    )}
  </section>;
}

type Contractor = ReturnType<typeof useEmployer>['employer']['contractors'][number];
type CKey = 'name' | 'sites' | 'workers' | 'compliance' | 'status';
const C_PAGE = 8;
function ContractorOversight({ contractors, t }: { contractors: Contractor[]; t: ReturnType<typeof useLanguage>['t'] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [band, setBand] = useState<'all' | 'ok' | 'low'>('all');
  const [page, setPage] = useState(1);
  const statuses = useMemo(() => [...new Set(contractors.map(c => c.status))], [contractors]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return contractors.filter(c => (status === 'all' || c.status === status)
      && (band === 'all' || (band === 'ok' ? c.compliance >= 90 : c.compliance < 90))
      && (!needle || `${c.name} ${c.bssId}`.toLowerCase().includes(needle)));
  }, [contractors, q, status, band]);
  const { sorted, sort, toggle, setSort } = useSort<Contractor, CKey>(filtered, {
    name: c => c.name, sites: c => c.siteIds.length, workers: c => c.workers, compliance: c => c.compliance, status: c => c.status,
  });
  const maxWorkers = Math.max(1, ...contractors.map(c => c.workers));
  const pages = Math.max(1, Math.ceil(sorted.length / C_PAGE));
  const cur = Math.min(page, pages);
  const slice = sorted.slice((cur - 1) * C_PAGE, cur * C_PAGE);
  const reset = () => { setQ(''); setStatus('all'); setBand('all'); setPage(1); };

  return <section className="bss-reveal space-y-4" style={{ ['--bss-delay' as string]: '170ms' }} aria-label="Contractor oversight">
    <SectionTitle index="03" title={t('ui.contractorOversight')} subtitle="Live workforce and compliance across connected contractors"
      action={<Link href="/employer/contractors" className="h-9 px-4 rounded-full border border-[#DBE3EF] bg-white text-xs font-semibold text-[#1E3A8A] hover:border-[#1E3A8A]/40 flex items-center gap-1">{t('ui.viewAll')} <ArrowRight size={14}/></Link>} />
    <div className="rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-[#DBE3EF] flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search contractor or BSS ID" className="flex-1 min-w-[200px]" />
        <FilterChips value={status} onChange={v => { setStatus(v); setPage(1); }} options={[{ value: 'all', label: 'All' }, ...statuses.map(s => ({ value: s, label: s, dot: s === 'Active' ? '#14843C' : s === 'Pending' ? '#E45D24' : '#DC2626' }))]} />
        <FilterChips value={band} onChange={v => { setBand(v); setPage(1); }} options={[{ value: 'all', label: 'Any compliance' }, { value: 'ok', label: '≥ 90%', dot: '#14843C' }, { value: 'low', label: '< 90%', dot: '#E45D24' }]} />
      </div>
      {/* Phones: card list with a sort picker */}
      <div className="md:hidden">
        <label className="px-3 pt-3 flex items-center gap-2 text-[11px] font-semibold text-bss-text-muted">Sort
          <select value={sort.key ? `${sort.key}:${sort.dir}` : ''} onChange={e => { const v = e.target.value; if (!v) setSort({ key: null, dir: 'asc' }); else { const [k, d] = v.split(':'); setSort({ key: k as CKey, dir: d as 'asc' | 'desc' }); } }}
            className="h-9 flex-1 rounded-full border border-[#DBE3EF] bg-white px-3 text-xs text-[#01183A]">
            <option value="">Default order</option>
            <option value="name:asc">Name A–Z</option>
            <option value="workers:desc">Most workers</option>
            <option value="compliance:asc">Lowest compliance</option>
            <option value="compliance:desc">Highest compliance</option>
            <option value="sites:desc">Most sites</option>
          </select>
        </label>
        {contractors.length === 0 ? <p className="px-5 py-8 text-center text-xs text-bss-text-muted">No connected contractors found.</p>
          : slice.length === 0 ? <EmptyFiltered onReset={reset} />
          : <ul className="p-3 space-y-2">{slice.map(contractor => <li key={contractor.id} className="rounded-2xl border border-[#DBE3EF] p-3">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[#01183A] text-white grid place-items-center text-[10px] font-bold shrink-0">{initials(contractor.name)}</span>
                <div className="min-w-0 flex-1">
                  <strong className="text-sm text-[#01183A] block font-semibold truncate">{contractor.name}</strong>
                  <p className="font-mono text-[10px] text-bss-text-muted">{contractor.bssId}</p>
                </div>
                <Status value={contractor.status}/>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#F2F6FC] py-2"><div className="text-sm font-extrabold text-[#01183A] tabular-nums">{contractor.siteIds.length}</div><div className="text-[10px] text-bss-text-muted">{t('ui.sites')}</div></div>
                <div className="rounded-xl bg-[#F2F6FC] py-2"><div className="text-sm font-extrabold text-[#01183A] tabular-nums">{contractor.workers}</div><div className="text-[10px] text-bss-text-muted">{t('ui.workers')}</div></div>
                <div className={`rounded-xl py-2 ${contractor.compliance >= 90 ? 'bg-[#EAF5EE]' : 'bg-[#FDF0EA]'}`}><div className={`text-sm font-extrabold tabular-nums ${contractor.compliance >= 90 ? 'text-[#14843C]' : 'text-[#E45D24]'}`}>{contractor.compliance}%</div><div className="text-[10px] text-bss-text-muted">{t('ui.compliance')}</div></div>
              </div>
            </li>)}</ul>}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className={TABLE_HEAD}>
            <tr>
              <SortTh k="name" label={t('ui.contractor')} sort={sort} onSort={toggle} className="pl-5" />
              <SortTh k="sites" label={t('ui.sites')} sort={sort} onSort={toggle} align="center" />
              <SortTh k="workers" label={t('ui.workers')} sort={sort} onSort={toggle} align="center" />
              <SortTh k="compliance" label={t('ui.compliance')} sort={sort} onSort={toggle} align="center" />
              <SortTh k="status" label={t('ui.status')} sort={sort} onSort={toggle} align="right" className="pr-5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DBE3EF]">
            {contractors.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-bss-text-muted">No connected contractors found.</td></tr>
            ) : slice.length === 0 ? (
              <tr><td colSpan={5}><EmptyFiltered onReset={reset} /></td></tr>
            ) : slice.map(contractor => (
              <tr key={contractor.id} className={TABLE_ROW}>
                <td className="pl-5 pr-3 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#01183A] text-white grid place-items-center text-[10px] font-bold shrink-0">{initials(contractor.name)}</span>
                    <div className="min-w-0">
                      <strong className="text-[#01183A] block font-semibold truncate">{contractor.name}</strong>
                      <p className="font-mono text-[10px] text-bss-text-muted mt-0.5">{contractor.bssId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5 text-center text-bss-text-secondary tabular-nums">{contractor.siteIds.length}</td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-2 justify-center">
                    <span className="font-bold text-[#01183A] tabular-nums w-8 text-right">{contractor.workers}</span>
                    <span className="w-20"><InlineBar value={contractor.workers} max={maxWorkers} color="#1E3A8A" /></span>
                  </div>
                </td>
                <td className="px-3 py-3.5 text-center">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${contractor.compliance >= 90 ? 'bg-[#EAF5EE] text-[#14843C]' : 'bg-[#FDF0EA] text-[#E45D24]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${contractor.compliance >= 90 ? 'bg-[#14843C]' : 'bg-[#E45D24]'}`} />{contractor.compliance}%
                  </span>
                </td>
                <td className="pl-3 pr-5 py-3.5 text-right"><Status value={contractor.status}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {contractors.length > 0 && <div className="px-4 py-3 border-t border-[#DBE3EF] bg-[#F2F6FC]/50"><Pager page={cur} pages={pages} total={sorted.length} noun="contractor" onPage={setPage} /></div>}
    </div>
  </section>;
}

function Status({ value }: { value:string }) {
  const tone = value === 'Active' ? 'bg-[#EAF5EE] text-[#14843C]' : value === 'Pending' ? 'bg-[#FDF0EA] text-[#E45D24]' : 'bg-[#FDECEC] text-[#DC2626]';
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${tone}`}>{value}</span>;
}

function SiteWorkforceCard({ site, workers }: { site: EmployerSite; workers: EmployerWorker[] }) {
  const compliant = workers.filter(w => w.compliance === 'Compliant').length;
  const expiring = workers.filter(w => w.compliance === 'Expiring').length;
  const nonCompliant = workers.filter(w => w.compliance === 'Non-compliant').length;
  const active = workers.filter(w => w.status === 'Active').length;
  const total = workers.length || site.workers || 0;
  const pct = siteCompliance(site, workers);
  const ring = pct >= 90 ? '#14843C' : pct >= 70 ? '#E45D24' : '#DC2626';
  const seg = (n: number) => total ? `${(n / total) * 100}%` : '0%';
  const statusTone = site.status === 'Active' ? 'bg-[#EAF5EE] text-[#14843C]' : site.status === 'Planned' ? 'bg-[#EEF2FB] text-[#1E3A8A]' : 'bg-[#F2F6FC] text-bss-text-secondary';
  const r = 26, c = 2 * Math.PI * r;

  return (
    <Link href={`/employer/sites/${site.id}`} className="group relative rounded-3xl bg-white border border-[#DBE3EF] p-5 flex flex-col overflow-hidden hover:border-[#1E3A8A]/40 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: ring }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-extrabold text-[#01183A] truncate group-hover:text-[#1E3A8A] transition-colors">{site.name}</h3>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusTone}`}>{site.status}</span>
          </div>
          <p className="text-[11px] text-bss-text-muted mt-1 flex items-center gap-1 truncate">
            <MapPin size={12} className="shrink-0 text-[#E45D24]"/>{site.location}, {site.state}
          </p>
          <span className="inline-block mt-2 text-[10px] font-mono bg-[#F2F6FC] text-bss-text-secondary rounded-md px-1.5 py-0.5 border border-[#DBE3EF]">{site.code}</span>
        </div>

        <div className="relative shrink-0 w-16 h-16">
          <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90" aria-hidden>
            <circle cx="32" cy="32" r={r} fill="none" stroke="#F2F6FC" strokeWidth="7"/>
            <circle cx="32" cy="32" r={r} fill="none" stroke={ring} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * pct / 100} ${c}`} className="transition-all duration-700"/>
          </svg>
          <span className="absolute inset-0 grid place-items-center text-sm font-extrabold text-[#01183A] tabular-nums">{pct}%</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-[#DBE3EF] rounded-2xl bg-[#F2F6FC]/70 border border-[#DBE3EF] text-center">
        <SiteStat icon={Users} value={total} label="Workers" />
        <SiteStat icon={Building2} value={site.contractorIds.length} label="Contractors" />
        <SiteStat icon={Activity} value={active} label="Active" />
      </div>

      <div className="mt-4">
        <div className="h-2.5 rounded-full bg-[#F2F6FC] overflow-hidden flex gap-px">
          <div className="bg-[#14843C] transition-all duration-500" style={{ width: seg(compliant) }} title={`Compliant: ${compliant}`}/>
          <div className="bg-[#E45D24] transition-all duration-500" style={{ width: seg(expiring) }} title={`Expiring: ${expiring}`}/>
          <div className="bg-[#DC2626] transition-all duration-500" style={{ width: seg(nonCompliant) }} title={`Non-compliant: ${nonCompliant}`}/>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mt-2 text-[10px] text-bss-text-secondary">
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-[#14843C]"/>Compliant: <strong className="text-[#01183A]">{compliant}</strong></span>
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-[#E45D24]"/>Expiring: <strong className="text-[#01183A]">{expiring}</strong></span>
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-[#DC2626]"/>Non-compliant: <strong className="text-[#01183A]">{nonCompliant}</strong></span>
        </div>
      </div>
    </Link>
  );
}

function SiteStat({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return <div className="py-2.5">
    <div className="text-base font-extrabold text-[#01183A] tabular-nums leading-none">{value}</div>
    <div className="text-[10px] text-bss-text-muted mt-1 inline-flex items-center gap-1"><Icon size={10}/>{label}</div>
  </div>;
}
