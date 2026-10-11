"use client";
import { useState } from 'react';
import { formatDate } from '@/lib/date';
import { CheckCircle2, HandCoins, XCircle } from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorAdvance } from '@/types/portal';

export default function ContractorAdvancesPage() {
  const { contractor, replaceContractor, mutate } = useContractor();
  const rows = contractor.advances ?? [];
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [disburse, setDisburse] = useState<ContractorAdvance | null>(null);
  const [mode, setMode] = useState('ONLINE');
  const [reference, setReference] = useState('');

  function money(v: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v); }

  async function act(row: ContractorAdvance, action: string, extra: Record<string, unknown> = {}) {
    setBusy(row.id); setError(''); setNotice('');
    try {
      const result = await mutate<{ data: ContractorAdvance }>('advances', 'PATCH', { id: row.advanceId, action, ...extra });
      replaceContractor({ ...contractor, advances: rows.map(r => r.id === row.id ? result.data : r) });
      setNotice(`Advance ${row.id} for ${row.worker} — ${result.data.status}.`);
      setTimeout(() => setNotice(''), 4000);
      setDisburse(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Action failed.'); }
    finally { setBusy(''); }
  }

  const chip = (status: string) => status === 'Adjusted' ? 'bg-bss-soft-green text-bss-green' : status === 'Rejected' ? 'bg-bss-soft-orange text-bss-error' : status === 'Requested' ? 'bg-bss-soft-orange text-bss-orange' : 'bg-bss-blue-tint text-bss-interactive-blue';

  return (
    <div className="relative p-4 lg:p-6">
      <div aria-hidden className="pointer-events-none select-none absolute inset-0 z-[60] overflow-hidden">
        <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-x-20 gap-y-28 -rotate-[24deg] scale-[1.6]">
          {Array.from({ length: 14 }).map((_, i) => <span key={i} className="text-2xl sm:text-3xl font-black uppercase tracking-[0.28em] text-black/5 whitespace-nowrap">Under Development</span>)}
        </div>
      </div>
      <div className="relative z-10 space-y-5">
      <div className="inline-flex items-center gap-2 rounded-full border border-bss-border bg-bss-soft-orange text-bss-orange px-3 py-1.5 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-bss-orange" />
        Under Development
      </div>
      <header>
        <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Payroll</p>
        <h1 className="text-2xl font-bold mt-1 text-bss-navy">Salary Advances</h1>
        <p className="text-sm text-bss-text-secondary mt-1">Approve, disburse (Cash/Online) and adjust salary advances requested by your workers.</p>
      </header>

      {notice && <p className="p-3 bg-bss-soft-green border border-bss-border text-bss-green rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>{notice}</p>}
      {error && <p className="p-3 bg-bss-soft-orange border border-bss-border text-bss-error rounded-xl text-sm font-semibold">{error}</p>}

      <section className="bss-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-xs">
          <thead className="bg-bss-bg border-b border-bss-border text-[11px] uppercase tracking-wider text-bss-text-secondary"><tr><th className="px-4 py-3 font-semibold">Worker</th><th className="px-4 py-3 font-semibold">Amount</th><th className="px-4 py-3 font-semibold">Reason</th><th className="px-4 py-3 font-semibold">Requested</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Action</th></tr></thead>
          <tbody className="divide-y divide-bss-border">
            {rows.map(row => <tr key={row.id} className="hover:bg-bss-bg/60">
              <td className="px-4 py-3"><strong className="text-bss-text-primary">{row.worker}</strong><p className="font-mono text-[10px] text-bss-text-muted mt-0.5">{row.id} · {row.workerId}</p></td>
              <td className="px-4 py-3 font-semibold text-bss-text-primary">{money(row.amount)}</td>
              <td className="px-4 py-3 text-bss-text-secondary">{row.reason || '—'}</td>
              <td className="px-4 py-3 text-bss-text-muted">{formatDate(row.requestedOn)}</td>
              <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${chip(row.status)}`}>{row.status}</span></td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {row.status === 'Requested' && <><button disabled={busy === row.id} onClick={() => act(row, 'approve')} className="text-bss-green font-semibold hover:underline disabled:opacity-50">Approve</button><button disabled={busy === row.id} onClick={() => act(row, 'reject')} className="text-bss-error font-semibold hover:underline disabled:opacity-50">Reject</button></>}
                  {row.status === 'Approved' && <button disabled={busy === row.id} onClick={() => { setDisburse(row); setMode('ONLINE'); setReference(''); }} className="inline-flex items-center gap-1 text-bss-interactive-blue font-semibold hover:underline disabled:opacity-50"><HandCoins size={13}/>Disburse</button>}
                  {row.status === 'Accepted' && <button disabled={busy === row.id} onClick={() => act(row, 'adjust', { payrollPeriod: new Date().toISOString().slice(0, 7) })} className="text-bss-green font-semibold hover:underline disabled:opacity-50">Mark adjusted in payroll</button>}
                  {(row.status === 'Adjusted' || row.status === 'Rejected') && <span className="text-bss-text-muted">—</span>}
                </div>
              </td>
            </tr>)}
            {!rows.length && <tr><td colSpan={6} className="py-12 text-center text-bss-text-muted">No advance requests yet.</td></tr>}
          </tbody>
        </table></div>
      </section>

      {disburse && <div className="fixed inset-0 z-50 bg-bss-navy/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDisburse(null)}><div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-bss-border"><div><p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Disburse advance</p><h2 className="text-sm font-semibold text-bss-text-primary mt-0.5">{disburse.worker} · {money(disburse.amount)}</h2></div><button onClick={() => setDisburse(null)} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-bss-bg text-bss-text-secondary"><XCircle size={18}/></button></div>
        <div className="p-5 space-y-3">
          <label className="block"><span className="text-[11px] font-semibold text-bss-text-secondary">Mode</span><select value={mode} onChange={e => setMode(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm bg-white text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue"><option value="ONLINE">Online</option><option value="CASH">Cash</option></select></label>
          <label className="block"><span className="text-[11px] font-semibold text-bss-text-secondary">Reference / UTR (optional)</span><input value={reference} onChange={e => setReference(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm bg-white text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue"/></label>
        </div>
        <div className="px-5 py-4 border-t border-bss-border flex justify-end gap-2"><button onClick={() => setDisburse(null)} className="h-10 px-4 rounded-lg border border-bss-border text-xs font-semibold text-bss-text-primary hover:bg-bss-bg">Cancel</button><button disabled={busy === disburse.id} onClick={() => act(disburse, 'disburse', { mode, reference })} className="h-10 px-4 rounded-lg bg-bss-interactive-blue text-white text-xs font-semibold hover:bg-bss-deep-navy disabled:opacity-60 shadow-sm">Mark disbursed</button></div>
      </div></div>}
      </div>
    </div>
  );
}
