'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, IndianRupee, Landmark, Send, CheckCircle2, Clock3, Wallet, HandCoins, FileCheck2, XCircle } from 'lucide-react';
import { fieldClass, ModuleShell } from '@/components/worker/ModuleShell';
import PageHero from '@/components/portal/PageHero';
import UnderDevelopmentBanner from '@/components/worker/UnderDevelopmentBanner';
import type { WageRecord, WorkerAdvance, AdvanceStatus } from '@/types/portal';
import { useWorker } from '@/contexts/WorkerContext';
import { useNotifications } from '@/contexts/NotificationContext';
import EnterpriseDataTable, { DataColumn } from '@/components/worker/EnterpriseDataTable';
import { formatDate } from '@/lib/date';

// Salary advance lifecycle (worker → contractor → payroll)
// Requested → Approved → Disbursed (Cash/Online) → Accepted → Adjusted in Payroll
const STATUS_STEPS: AdvanceStatus[] = ['Requested', 'Approved', 'Disbursed', 'Accepted', 'Adjusted'];
const STATUS_META: Record<AdvanceStatus, { label: string; tone: string; hint: string }> = {
  Requested: { label: 'Awaiting contractor approval', tone: 'bg-bss-soft-orange text-bss-orange', hint: 'Your request has been sent to the contractor.' },
  Approved: { label: 'Approved by contractor', tone: 'bg-bss-blue-tint text-bss-interactive-blue', hint: 'Contractor approved the advance — disbursement pending.' },
  Disbursed: { label: 'Disbursed — awaiting your acceptance', tone: 'bg-bss-blue-tint text-bss-interactive-blue', hint: 'Contractor has disbursed the amount. Please confirm receipt.' },
  Accepted: { label: 'Accepted by you', tone: 'bg-bss-soft-green text-bss-green', hint: 'Receipt accepted — recovery will be adjusted in your payroll.' },
  Adjusted: { label: 'Adjusted in Payroll', tone: 'bg-bss-soft-green text-bss-green', hint: 'Recovered through payroll deduction as agreed.' },
  Rejected: { label: 'Rejected by contractor', tone: 'bg-bss-soft-orange text-bss-error', hint: 'The contractor did not approve this advance.' },
};

export default function EarningsPage() {
  const { portal, refresh } = useWorker();
  const { addNotification } = useNotifications();
  const wageData = portal.wages;
  const selected = wageData.records.reduce((sum, r) => sum + r.net, 0);
  const last = wageData.records[0];

  const [advances, setAdvances] = useState<WorkerAdvance[]>(portal.advances ?? []);
  const [applyOpen, setApplyOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const current = advances.find(a => !['Adjusted', 'Rejected'].includes(a.status));
  const pendingCount = advances.filter(a => ['Requested', 'Approved', 'Disbursed'].includes(a.status)).length;
  const adjustedTotal = advances.filter(a => a.status === 'Adjusted').reduce((sum, a) => sum + a.amount, 0);

  const submitRequest = async () => {
    const value = Number(amount);
    if (!value || value <= 0) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/portal/advances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request', amount: value, reason: reason.trim() || 'Salary advance' }) });
      const result = await response.json() as { data?: WorkerAdvance; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || 'Advance could not be requested.');
      setAdvances(cur => [result.data!, ...cur]);
      setApplyOpen(false); setAmount(''); setReason('');
      setNotice(`Advance request ${result.data.id} for ${money(value)} sent to ${portal.worker.employment.contractor || 'your contractor'} — approval and disbursement happen on their side.`);
      void refresh();
      window.setTimeout(() => setNotice(''), 8000);
      addNotification({ id: `adv-${result.data.id}`, entityId: result.data.id, category: 'Payments', title: 'Advance payment requested', message: `Salary advance of ${money(value)} requested — awaiting contractor approval and disbursement (Cash/Online).`, createdAt: new Date().toISOString(), href: '/worker/Earnings', actionLabel: 'Track advance', priority: 'high', requiresAction: false, read: false, resolved: false });
    } catch (reason_) { setError(reason_ instanceof Error ? reason_.message : 'Advance could not be requested.'); }
    finally { setBusy(false); }
  };

  const acceptDisbursement = async (advance: WorkerAdvance) => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/portal/advances', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept', id: advance.advanceId }) });
      const result = await response.json() as { data?: WorkerAdvance; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || 'Receipt could not be confirmed.');
      setAdvances(cur => cur.map(a => a.id === advance.id ? result.data! : a));
      setNotice(`Disbursement accepted — ${money(advance.amount)} will be adjusted in your next payroll as an advance recovery.`);
      void refresh();
      window.setTimeout(() => setNotice(''), 8000);
    } catch (reason_) { setError(reason_ instanceof Error ? reason_.message : 'Receipt could not be confirmed.'); }
    finally { setBusy(false); }
  };

  return <ModuleShell title="Wage History & Earnings" description="Payment records reported by your employer or contractor." icon={IndianRupee} watermark="Under Development" hero={<PageHero title="Wage History & Earnings" subtitle="Payment records reported by your employer or contractor." actions={<Link href="/worker" aria-label="Back to dashboard" className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"><ArrowLeft size={18}/></Link>} />}>
    <UnderDevelopmentBanner note="Wage history and salary advances are being finalised. The figures shown here are provisional." />
    <DataBadge demo={portal.dataMode === 'demo'} source={wageData.source} syncedAt={wageData.syncedAt} />
    {notice && <p role="status" className="p-3 bg-bss-soft-green border border-bss-border text-bss-green rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16} />{notice}</p>}
    {error && <p role="alert" className="p-3 bg-bss-soft-orange border border-bss-border text-bss-error rounded-xl text-sm font-semibold">{error}</p>}
    <div className="grid sm:grid-cols-3 gap-3"><Summary label="Selected records" value={money(selected)} /><Summary label="Year-to-date" value={money(selected)} /><Summary label="Last payment" value={last ? `${money(last.net)} · ${last.paidOn}` : 'No payroll record'} /></div>

    {/* ── Salary Advance — apply, track, accept, payroll adjustment ── */}
    <section id="advance" className="bss-3d bss-scroll-rise bss-card rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-bss-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-bss-soft-orange text-bss-orange grid place-items-center"><Wallet size={17} /></span>
          <div>
            <h2 className="font-semibold text-bss-text-primary">Advance Payment</h2>
            <p className="text-xs text-bss-text-muted mt-0.5">Request a salary advance — contractor approves and disburses (Cash/Online), you accept, and it is adjusted in Payroll.</p>
          </div>
        </div>
        <button onClick={() => { setApplyOpen(true); setError(''); }} className="h-9 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#022B5E]"><Send size={14} />Apply for advance</button>
      </header>

      <div className="p-5 grid md:grid-cols-4 gap-3 text-xs">
        <Summary label="Pending advances" value={String(pendingCount)} />
        <Summary label="Current approved / disbursed" value={current ? money(current.amount) : 'None'} />
        <Summary label="Adjusted in Payroll" value={money(adjustedTotal)} />
        <div className="rounded-xl bg-bss-blue-tint border border-bss-border p-3 text-[11px] text-bss-text-primary leading-5"><strong>How it works</strong><p className="mt-1">Request → contractor approval → disbursement by contractor (Cash or Online) → your acceptance → recovery adjusted in your Payroll as per repayment terms.</p></div>
      </div>

      {advances.length > 0 ? (
        <div className="border-t border-bss-border divide-y divide-bss-border">
          {advances.map(a => {
            const stepIndex = STATUS_STEPS.indexOf(a.status);
            const meta = STATUS_META[a.status];
            return (
              <div key={a.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-[#01183A]">{a.id}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.tone}`}>{a.status === 'Rejected' && <XCircle size={11} />}{meta.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-bss-text-primary mt-1">{money(a.amount)} · {a.reason}</p>
                  <p className="text-[11px] text-bss-text-muted mt-0.5">
                    Requested {formatDate(a.requestedOn)}
                    {a.approvedOn && ` · Approved ${formatDate(a.approvedOn)}`}
                    {a.disbursedOn && ` · Disbursed ${formatDate(a.disbursedOn)}${a.mode ? ` (${a.mode}${a.reference ? ` · ${a.reference}` : ''})` : ''}`}
                    {a.payrollPeriod && ` · Adjusted in ${a.payrollPeriod} payroll`}
                  </p>
                  {a.status !== 'Rejected' && <div className="mt-2 flex items-center gap-1">
                    {STATUS_STEPS.map((step, index) => (
                      <span key={step} title={STATUS_META[step].hint} className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? 'bg-[#01183A]' : 'bg-bss-bg'}`} />
                    ))}
                  </div>}
                </div>
                {a.status === 'Disbursed' && (
                  <button disabled={busy} onClick={() => acceptDisbursement(a)} className="h-9 px-4 rounded-lg bg-[#14843C] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:brightness-95 flex-shrink-0 disabled:opacity-60"><CheckCircle2 size={14} />Accept & confirm receipt</button>
                )}
                {a.status === 'Accepted' && <span className="text-[11px] font-semibold text-bss-text-muted flex items-center gap-1.5 flex-shrink-0"><Clock3 size={13}/>Will be adjusted in your next payroll</span>}
                {a.status === 'Adjusted' && <span className="text-[11px] font-semibold text-bss-green flex items-center gap-1.5 flex-shrink-0"><FileCheck2 size={13}/>Adjusted in Payroll</span>}
              </div>
            );
          })}
        </div>
      ) : <p className="p-6 text-center text-xs text-bss-text-muted border-t border-bss-border">No advance requests yet.</p>}
    </section>

    <div className="bss-3d bss-scroll-rise bss-card rounded-2xl p-4 flex flex-wrap gap-3"><select aria-label="Year" className={fieldClass}><option>2026</option></select><select aria-label="Month" className={fieldClass}><option>All months</option></select><select aria-label="Employer or site" className={fieldClass}><option>All employers and sites</option></select></div>
    <EnterpriseDataTable title="Payment records" rows={wageData.records} columns={wageColumns} rowKey={r => r.id} filename="bss-wage-history" showDownload={false} />
    {portal.dataMode === 'demo' && <p className="text-xs text-bss-text-muted bg-bss-soft-orange border border-bss-border rounded-xl p-3">Illustrative database records only. Production values come from the connected payroll source.</p>}

    {/* Apply modal */}
    {applyOpen && (
      <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Apply for advance payment">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
          <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-bss-soft-orange text-bss-orange grid place-items-center"><HandCoins size={17} /></span>
              <div><h2 className="font-semibold text-bss-text-primary">Apply for Advance Payment</h2><p className="text-xs text-bss-text-muted mt-0.5">Sent to {portal.worker.employment.contractor || 'your contractor'} for approval</p></div>
            </div>
            <button onClick={() => setApplyOpen(false)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full text-bss-text-muted hover:bg-bss-bg">✕</button>
          </header>
          <div className="p-5 space-y-4">
            <label className="block text-xs font-semibold text-bss-text-secondary">Amount requested (₹)<input type="number" min={500} max={20000} step={500} value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" className="mt-1.5 w-full rounded-xl border border-bss-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></label>
            <label className="block text-xs font-semibold text-bss-text-secondary">Reason<textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Why do you need the advance?" className="mt-1.5 w-full rounded-xl border border-bss-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></label>
            <p className="text-[11px] text-bss-text-muted leading-5"><Landmark size={12} className="inline mr-1" />The advance is <strong>subject to contractor approval</strong>. Once approved it is disbursed by the contractor (Cash or Online), accepted by you, and finally adjusted in your Payroll.</p>
            {error && <p role="alert" className="text-xs text-bss-error">{error}</p>}
            <div className="flex gap-2">
              <button onClick={submitRequest} disabled={busy || !Number(amount) || Number(amount) <= 0} className="flex-1 h-11 rounded-xl bg-[#01183A] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#022B5E] disabled:opacity-50"><Send size={15} />{busy ? 'Submitting…' : 'Submit advance request'}</button>
              <button onClick={() => setApplyOpen(false)} disabled={busy} className="h-11 px-4 rounded-xl border border-bss-border text-bss-text-secondary text-sm font-bold hover:bg-bss-bg disabled:opacity-60">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
  </ModuleShell>;
}
function Summary({ label, value }: { label: string; value: string }) { return <div className="bss-3d bss-scroll-rise rounded-2xl bg-white border border-bss-border p-4"><p className="text-xs text-bss-text-muted">{label}</p><strong className="block mt-2 text-xl text-bss-text-primary">{value}</strong></div> }
function money(value: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value) }
function DataBadge({ demo, source, syncedAt }: { demo: boolean; source: string; syncedAt: string | null }) { return <div className="flex flex-wrap justify-between gap-2 text-xs bg-bss-blue-tint border border-bss-border text-bss-text-primary rounded-xl px-4 py-3"><strong>{demo ? 'Demo database records' : 'Connected payroll records'}</strong><span>{source} · Synced {syncedAt ? new Date(syncedAt).toLocaleString('en-IN') : '—'}</span></div> }
type WageRow = WageRecord;
const wageColumns: DataColumn<WageRow>[] = [
 { id: 'period', header: 'Period / paid', value: r => `${r.period} ${r.paidOn}`, render: r => <><strong>{r.period}</strong><p className="text-bss-text-muted mt-1">{r.paidOn}</p></> },
 { id: 'employer', header: 'Employer / contractor', value: r => `${r.employer} ${r.contractor}`, render: r => <>{r.employer}<p className="text-bss-text-muted mt-1">{r.contractor}</p></> },
 { id: 'site', header: 'Site / basis', value: r => `${r.site} ${r.basis}`, render: r => <>{r.site}<p className="text-bss-text-muted mt-1">{r.basis}</p></> },
 { id: 'gross', header: 'Gross', value: r => r.gross, render: r => money(r.gross) }, { id: 'deductions', header: 'Deductions', value: r => r.deductions, render: r => `− ${money(r.deductions)}` }, { id: 'net', header: 'Net', value: r => r.net, render: r => <strong>{money(r.net)}</strong> },
 { id: 'status', header: 'Status', value: r => r.status, render: r => <span className="bg-bss-soft-green text-bss-green rounded-full px-2 py-1 font-bold">{r.status}</span> },
 { id: 'reference', header: 'Reference / receipt', value: r => `${r.reference ?? ''} ${r.receiptUrl ?? ''}`, render: r => <span className="font-mono">{r.reference ?? '—'}{r.receiptUrl && !r.receiptUrl.startsWith('#') && <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" className="block font-sans text-bss-interactive-blue mt-1">View receipt</a>}</span> },
];
