"use client";
import { useState } from 'react';
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

  const chip = (status: string) => status === 'Adjusted' ? 'bg-green-50 text-green-700' : status === 'Rejected' ? 'bg-red-50 text-red-600' : status === 'Requested' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700';

  return (
    <div className="relative p-4 lg:p-6 space-y-5">
      <div aria-hidden className="pointer-events-none select-none absolute inset-0 z-[60] overflow-hidden">
        <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-x-20 gap-y-28 -rotate-[24deg] scale-[1.6]">
          {Array.from({ length: 14 }).map((_, i) => <span key={i} className="text-2xl sm:text-3xl font-black uppercase tracking-[0.28em] text-black/5 whitespace-nowrap">Under Development</span>)}
        </div>
      </div>
      <header>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Payroll</p>
        <h1 className="text-2xl font-bold mt-1">Salary Advances</h1>
        <p className="text-sm text-gray-500 mt-1">Approve, disburse (Cash/Online) and adjust salary advances requested by your workers.</p>
      </header>

      {notice && <p className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>{notice}</p>}
      {error && <p className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">{error}</p>}

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-xs">
          <thead className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3">Worker</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-4 py-3"><strong className="text-gray-900">{row.worker}</strong><p className="font-mono text-[10px] text-gray-400 mt-0.5">{row.id} · {row.workerId}</p></td>
              <td className="px-4 py-3 font-semibold text-gray-800">{money(row.amount)}</td>
              <td className="px-4 py-3 text-gray-600">{row.reason || '—'}</td>
              <td className="px-4 py-3 text-gray-500">{row.requestedOn}</td>
              <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-semibold ${chip(row.status)}`}>{row.status}</span></td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {row.status === 'Requested' && <><button disabled={busy === row.id} onClick={() => act(row, 'approve')} className="text-green-700 font-semibold hover:underline disabled:opacity-50">Approve</button><button disabled={busy === row.id} onClick={() => act(row, 'reject')} className="text-red-700 font-semibold hover:underline disabled:opacity-50">Reject</button></>}
                  {row.status === 'Approved' && <button disabled={busy === row.id} onClick={() => { setDisburse(row); setMode('ONLINE'); setReference(''); }} className="inline-flex items-center gap-1 text-blue-700 font-semibold hover:underline disabled:opacity-50"><HandCoins size={13}/>Disburse</button>}
                  {row.status === 'Accepted' && <button disabled={busy === row.id} onClick={() => act(row, 'adjust', { payrollPeriod: new Date().toISOString().slice(0, 7) })} className="text-green-700 font-semibold hover:underline disabled:opacity-50">Mark adjusted in payroll</button>}
                  {(row.status === 'Adjusted' || row.status === 'Rejected') && <span className="text-gray-400">—</span>}
                </div>
              </td>
            </tr>)}
            {!rows.length && <tr><td colSpan={6} className="py-12 text-center text-gray-400">No advance requests yet.</td></tr>}
          </tbody>
        </table></div>
      </section>

      {disburse && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDisburse(null)}><div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"><div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Disburse advance</p><h2 className="text-sm font-bold text-gray-900 mt-0.5">{disburse.worker} · {money(disburse.amount)}</h2></div><button onClick={() => setDisburse(null)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-gray-100"><XCircle size={16}/></button></div>
        <div className="p-5 space-y-3">
          <label className="block text-xs font-semibold text-gray-600">Mode<select value={mode} onChange={e => setMode(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"><option value="ONLINE">Online</option><option value="CASH">Cash</option></select></label>
          <label className="block text-xs font-semibold text-gray-600">Reference / UTR (optional)<input value={reference} onChange={e => setReference(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2"><button onClick={() => setDisburse(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button><button disabled={busy === disburse.id} onClick={() => act(disburse, 'disburse', { mode, reference })} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60">Mark disbursed</button></div>
      </div></div>}
    </div>
  );
}
