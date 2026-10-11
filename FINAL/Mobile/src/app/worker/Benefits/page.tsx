'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Landmark, ShieldCheck, BadgePercent, CreditCard, Send, X, CheckCircle2, FileText } from 'lucide-react';
import { ModuleShell } from '@/components/worker/ModuleShell';
import PageHero from '@/components/portal/PageHero';
import UnderDevelopmentBanner from '@/components/worker/UnderDevelopmentBanner';
import type { BenefitRecord, BonusRecord, LeaveEncashmentRecord } from '@/types/portal';
import { useWorker } from '@/contexts/WorkerContext';
import { useNotifications } from '@/contexts/NotificationContext';
import EnterpriseDataTable, { DataColumn } from '@/components/worker/EnterpriseDataTable';

export default function BenefitsPage() {
  const { worker, portal, refresh } = useWorker();
  const { addNotification } = useNotifications();
  const pfData = portal.providentFund;
  const bonus = portal.bonus;
  const encashment = portal.leaveEncashment;
  const gratuityDemo = portal.gratuity;
  const employee = pfData.records.reduce((s, r) => s + r.employeeContribution, 0);
  const employer = pfData.records.reduce((s, r) => s + r.employerContribution, 0);
  const last = pfData.records[0];
  const bonusTotal = bonus.records.reduce((s, r) => s + r.amount, 0);
  const encTotal = encashment.records.reduce((s, r) => s + r.amount, 0);

  // Gratuity scheme status + apply flow
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyReason, setApplyReason] = useState('');
  const [applying, setApplying] = useState(false);
  const [application, setApplication] = useState(portal.gratuity.application ?? null);
  const [applyNotice, setApplyNotice] = useState('');
  const schemeEnabled = (portal.gratuity.schemeStatus ?? 'Enabled') === 'Enabled';

  const submitApplication = async () => {
    if (applying) return;
    setApplying(true);
    try {
      const response = await fetch('/api/portal/gratuity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: applyReason.trim() }) });
      const result = await response.json() as { data?: { reference?: string; submittedOn?: string; status?: string }; error?: string };
      if (!response.ok || !result.data?.reference) throw new Error(result.error || 'Application could not be submitted.');
      const reference = result.data.reference;
      const submittedOn = result.data.submittedOn || new Date().toISOString();
      setApplication({ reference, submittedOn, status: (result.data.status || 'Submitted') as 'Submitted' | 'Under examination' | 'Approved' | 'Disbursed' | 'Rejected' });
      setApplying(false); setApplyOpen(false); setApplyReason('');
      setApplyNotice(`Gratuity application ${reference} submitted — your contractor and employer have been notified for processing.`);
      void refresh();
      window.setTimeout(() => setApplyNotice(''), 8000);
      addNotification({ id:`grat-${reference}`, entityId:reference, category:'Benefits', title:'Gratuity application submitted', message:`Your gratuity application ${reference} was forwarded to ${worker.employment.contractor} and ${worker.employment.employer} for verification and processing.`, createdAt:submittedOn, href:'/worker/Benefits', actionLabel:'View application', priority:'high', requiresAction:false, read:false, resolved:false });
    } catch (reason) {
      setApplying(false);
      setApplyNotice(reason instanceof Error ? reason.message : 'Application could not be submitted.');
      window.setTimeout(() => setApplyNotice(''), 8000);
    }
  };

  const applicationStatusTone: Record<string, string> = { Submitted:'bg-orange-50 text-orange-700', 'Under examination':'bg-bss-blue-tint text-bss-interactive-blue', Approved:'bg-green-50 text-green-700', Disbursed:'bg-green-50 text-green-700', Rejected:'bg-red-50 text-red-600' };


  return <ModuleShell title="Retirement Fund & Benefits" description="Recorded long-term benefit information." icon={Landmark} watermark="Under Development" hero={<PageHero title="Retirement Fund & Benefits" subtitle="Recorded long-term benefit information." actions={<Link href="/worker" aria-label="Back to dashboard" className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"><ArrowLeft size={18}/></Link>} />}>
    <UnderDevelopmentBanner note="Retirement fund and benefits are being finalised. The figures shown here are provisional." />
    <div className="text-xs bg-bss-blue-tint border border-bss-border text-bss-text-primary rounded-xl px-4 py-3">
      <strong>How your records are sourced:</strong> Provident Fund (UAN) and Gratuity are <strong>autofetched from government / business sources</strong> ({pfData.source}). Bonus and Leave Encashment are <strong>filled and uploaded by your contractor</strong> ({bonus.source}).
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <section className="bss-3d bss-scroll-rise bg-white border border-bss-border rounded-2xl p-5">
        <div className="flex gap-3"><span className="w-9 h-9 bg-bss-blue-tint text-bss-interactive-blue rounded-lg flex items-center justify-center"><ShieldCheck size={17}/></span><div><h2 className="font-semibold">Provident Fund (PF)</h2><p className="text-xs text-bss-text-muted mt-1">UAN: {worker.socialSecurity.epfoUan} · Autofetched · EPFO</p></div></div>
        <dl className="grid grid-cols-2 gap-3 mt-5 text-xs"><Info label="Employee contribution" value={money(employee)}/><Info label="Employer contribution" value={money(employer)}/><Info label="Recorded cumulative total" value={money(employee + employer)}/><Info label="Last contribution" value={last?.creditedOn ?? 'No contribution record'}/></dl>
      </section>

      <section className="bss-3d bss-scroll-rise bg-white border border-bss-border rounded-2xl p-5">
        <div className="flex gap-3"><span className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center"><CreditCard size={17}/></span><div className="flex-1"><h2 className="font-semibold">Gratuity</h2><p className="text-xs text-bss-text-muted mt-1">Autofetched · Approved gratuity service</p></div>{schemeEnabled ? <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2.5 py-1 h-fit"><CheckCircle2 size={12}/> Status: Enabled</span> : <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-bss-text-muted bg-bss-bg border border-bss-border rounded-full px-2.5 py-1 h-fit">Status: Non-enabled</span>}</div>
        <dl className="grid grid-cols-2 gap-3 mt-5 text-xs"><Info label="Service start" value={gratuityDemo.serviceStart}/><Info label="Completed service" value={gratuityDemo.completedService}/><Info label="Indicative amount" value={money(gratuityDemo.indicativeAmount)}/><Info label="Eligibility" value={gratuityDemo.eligibilityStatus}/><div className="col-span-2"><Info label="Calculation basis" value={gratuityDemo.calculationBasis}/></div><Info label="Last updated" value={gratuityDemo.lastUpdated}/></dl>
        {portal.dataMode === 'demo' && <span className="inline-block mt-4 text-[10px] font-bold bg-orange-50 text-orange-700 px-2 py-1 rounded-full">INDICATIVE DEMO · NOT ENTITLEMENT</span>}

        {application && (
          <div className="mt-4 rounded-xl border border-green-100 bg-green-50/50 p-3 text-xs space-y-1.5">
            <p className="flex items-center justify-between gap-2"><strong className="text-bss-text-primary">Application {application.status}</strong><span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${applicationStatusTone[application.status] ?? 'bg-bss-bg text-bss-text-secondary'}`}>{application.status}</span></p>
            <p className="text-bss-text-muted">Reference <span className="font-mono font-semibold text-[#073B67]">{application.reference}</span> · Submitted {new Date(application.submittedOn).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</p>
            <p className="text-bss-text-muted">Contractor &amp; employer have been notified — status updates appear here and in Notifications.</p>
          </div>
        )}

        {schemeEnabled && (
          <div className="mt-4">
            {applyNotice && <p role="status" className="mb-3 rounded-lg bg-green-50 border border-green-100 text-green-700 px-3 py-2 flex items-center gap-2"><CheckCircle2 size={14}/>{applyNotice}</p>}
            <button onClick={() => setApplyOpen(true)} disabled={!!application} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#073B67] px-4 text-sm font-bold text-white hover:bg-[#062D4F] disabled:opacity-50"><FileText size={15}/>{application ? 'Application submitted' : 'Apply for Gratuity'}</button>
            <p className="text-[11px] text-bss-text-muted mt-2">Applying sends a short application to your contractor and principal employer for verification.</p>
          </div>
        )}
        {!schemeEnabled && <p className="mt-4 text-xs text-bss-text-muted">Gratuity is not enabled for your current employer — you cannot apply through the app yet.</p>}
      </section>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <section className="bss-3d bss-scroll-rise bg-white border border-bss-border rounded-2xl p-5">
        <div className="flex gap-3"><span className="w-9 h-9 bg-orange-50 text-orange-700 rounded-lg flex items-center justify-center"><BadgePercent size={17}/></span><div><h2 className="font-semibold">Bonus</h2><p className="text-xs text-bss-text-muted mt-1">Filled & uploaded by your contractor</p></div></div>
        <dl className="grid grid-cols-2 gap-3 mt-5 text-xs"><Info label="Recorded total" value={money(bonusTotal)}/><Info label="Last bonus" value={bonus.records[0] ? `${money(bonus.records[0].amount)} · ${bonus.records[0].period}` : 'No bonus recorded'}/><Info label="Records" value={String(bonus.records.length)}/><Info label="Synced by contractor" value={formatDate(bonus.syncedAt)}/></dl>
        {bonus.records.length === 0 && <p className="mt-4 text-xs text-bss-text-muted">Your contractor has not uploaded any bonus records yet.</p>}
      </section>

      <section className="bss-3d bss-scroll-rise bg-white border border-bss-border rounded-2xl p-5">
        <div className="flex gap-3"><span className="w-9 h-9 bg-purple-50 text-purple-700 rounded-lg flex items-center justify-center"><Landmark size={17}/></span><div><h2 className="font-semibold">Leave Encashment</h2><p className="text-xs text-bss-text-muted mt-1">Filled & uploaded by your contractor</p></div></div>
        <dl className="grid grid-cols-2 gap-3 mt-5 text-xs"><Info label="Recorded total" value={money(encTotal)}/><Info label="Days encashed" value={String(encashment.records.reduce((s, r) => s + r.days, 0))}/><Info label="Records" value={String(encashment.records.length)}/><Info label="Synced by contractor" value={formatDate(encashment.syncedAt)}/></dl>
        {encashment.records.length === 0 && <p className="mt-4 text-xs text-bss-text-muted">Your contractor has not uploaded any leave encashment records yet.</p>}
      </section>
    </div>

    <EnterpriseDataTable title="PF contribution history" rows={pfData.records} columns={pfColumns} rowKey={r => r.period} filename="bss-pf-contributions" showDownload={false}/>
    <EnterpriseDataTable title="Bonus history" rows={bonus.records} columns={bonusColumns} rowKey={r => r.id} filename="bss-bonus-history" showDownload={false}/>
    <EnterpriseDataTable title="Leave encashment history" rows={encashment.records} columns={encColumns} rowKey={r => r.id} filename="bss-leave-encashment-history" showDownload={false}/>

    {/* Gratuity application short form */}
    {applyOpen && (
      <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Apply for gratuity">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
          <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
            <div><h2 className="font-semibold text-bss-text-primary">Apply for Gratuity</h2><p className="text-xs text-bss-text-muted mt-0.5">Sent to {worker.employment.contractor} &amp; {worker.employment.employer}</p></div>
            <button onClick={() => setApplyOpen(false)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full text-bss-text-muted hover:bg-bss-bg"><X size={16}/></button>
          </header>
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-bss-text-secondary"><strong>Gratuity scheme: Enabled.</strong> Your indicative amount is <strong>{money(gratuityDemo.indicativeAmount)}</strong>. The contractor and employer verify service and issue the amount+date notice or rejection reasons within 15 days.</div>
            <label className="block text-xs font-semibold text-bss-text-secondary">Why are you applying? (optional)<textarea value={applyReason} onChange={e => setApplyReason(e.target.value)} rows={3} placeholder="e.g. Completion of 5 years of continuous service / cessation of employment / other reason" className="mt-1.5 w-full rounded-xl border border-bss-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"/></label>
            <div className="flex gap-2">
              <button onClick={submitApplication} disabled={applying} className="flex-1 h-11 rounded-xl bg-[#073B67] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#062D4F] disabled:opacity-60"><Send size={15}/>{applying ? 'Submitting…' : 'Submit application'}</button>
              <button onClick={() => setApplyOpen(false)} disabled={applying} className="h-11 px-4 rounded-xl border border-bss-border text-bss-text-secondary text-sm font-bold hover:bg-bss-bg disabled:opacity-60">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
  </ModuleShell>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-bss-text-muted">{label}</dt><dd className="font-semibold text-bss-text-primary mt-1">{value}</dd></div>; }
function money(value: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value); }
function formatDate(value: string | null) { return value ? value.slice(0, 10) : 'Not synced'; }
function BenefitStatus({ value }: { value: string }) { const tone = value === 'Credited' ? 'text-green-700' : value === 'Processing' ? 'text-orange-700' : 'text-orange-600'; return <span className={tone}>{value}</span>; }

type PfRow = BenefitRecord;
const pfColumns: DataColumn<PfRow>[] = [
  { id:'period', header:'Contribution period', value:r => r.period }, { id:'employee', header:'Employee contribution', value:r => r.employeeContribution, render:r => money(r.employeeContribution) },
  { id:'employer', header:'Employer contribution', value:r => r.employerContribution, render:r => money(r.employerContribution) }, { id:'total', header:'Recorded total', value:r => r.employeeContribution + r.employerContribution, render:r => money(r.employeeContribution + r.employerContribution) },
  { id:'credited', header:'Credited on', value:r => r.creditedOn },
];

type BonusRow = BonusRecord;
const bonusColumns: DataColumn<BonusRow>[] = [
  { id:'period', header:'Period', value:r => r.period }, { id:'reason', header:'Reason', value:r => r.reason }, { id:'amount', header:'Amount', value:r => r.amount, render:r => money(r.amount) },
  { id:'paid', header:'Paid on', value:r => r.paidOn }, { id:'status', header:'Status', value:r => r.status, render:r => <BenefitStatus value={r.status}/> },
];

type EncRow = LeaveEncashmentRecord;
const encColumns: DataColumn<EncRow>[] = [
  { id:'period', header:'Period', value:r => r.period }, { id:'days', header:'Days encashed', value:r => r.days }, { id:'rate', header:'Rate', value:r => r.rate, render:r => money(r.rate) },
  { id:'amount', header:'Amount', value:r => r.amount, render:r => money(r.amount) }, { id:'paid', header:'Paid on', value:r => r.paidOn }, { id:'status', header:'Status', value:r => r.status, render:r => <BenefitStatus value={r.status}/> },
];
