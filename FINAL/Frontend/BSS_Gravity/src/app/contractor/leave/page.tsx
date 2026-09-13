"use client";
import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';

export default function ContractorLeavePage() {
  const { contractor, replaceContractor, mutate } = useContractor();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const rows = contractor.leaveApprovals ?? [];
  const rhRows = contractor.restrictedHolidayRequests ?? [];

  async function decide(id: string, status: 'Approved' | 'Rejected') {
    setBusy(id); setError(''); setNotice('');
    try {
      await mutate('leave', 'PATCH', { id, status });
      replaceContractor({ ...contractor, leaveApprovals: rows.map(r => r.id === id ? { ...r, status } : r) });
      setNotice(`Leave request ${status.toLowerCase()}.`);
      setTimeout(() => setNotice(''), 4000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Decision could not be saved.');
    } finally {
      setBusy('');
    }
  }

  async function decideRh(id: string, status: 'Approved' | 'Rejected') {
    setBusy(`rh-${id}`); setError(''); setNotice('');
    try {
      await mutate('restricted-holiday', 'PATCH', { id, status });
      replaceContractor({ ...contractor, restrictedHolidayRequests: rhRows.map(r => r.id === id ? { ...r, status } : r) });
      setNotice(`Restricted holiday request ${status.toLowerCase()}.`);
      setTimeout(() => setNotice(''), 4000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Decision could not be saved.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <header>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Master data</p>
        <h1 className="text-2xl font-bold mt-1">Leave Approvals</h1>
        <p className="text-sm text-gray-500 mt-1">Approve or reject leave requests from workers bound to you.</p>
      </header>

      {notice && <p className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>{notice}</p>}
      {error && <p className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        {([['Pending', 'text-orange-600'], ['Approved', 'text-green-700'], ['Rejected', 'text-red-600']] as const).map(([label, tone]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-3">
            <strong className={`text-lg ${tone}`}>{rows.filter(r => r.status === label).length}</strong>
            <p className="text-[11px] text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <h2 className="p-4 border-b border-gray-100 font-semibold text-sm">Requests</h2>
        {rows.length ? rows.map(r => (
          <article key={r.id} className="p-4 border-b border-gray-50 flex flex-wrap justify-between gap-3">
            <div>
              <strong className="text-sm">{r.worker}</strong> <span className="text-xs text-gray-400 font-mono">{r.bssId}</span>
              <p className="text-xs text-gray-500 mt-1">{r.type} · {r.from} – {r.to} · {r.days} day{r.days > 1 ? 's' : ''}</p>
              {r.reason && <p className="text-xs text-gray-500 mt-1">{r.reason}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-fit text-[10px] font-bold px-2 py-1 rounded-full ${r.status === 'Approved' ? 'bg-green-50 text-green-700' : r.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>{r.status}</span>
              {r.status === 'Pending' && <>
                <button type="button" disabled={busy === r.id} onClick={() => decide(r.id, 'Approved')} className="h-9 px-3 rounded-lg bg-green-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-green-700 disabled:opacity-60"><CheckCircle2 size={14}/>Approve</button>
                <button type="button" disabled={busy === r.id} onClick={() => decide(r.id, 'Rejected')} className="h-9 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-bold flex items-center gap-1.5 hover:bg-red-50 disabled:opacity-60"><XCircle size={14}/>Reject</button>
              </>}
            </div>
          </article>
        )) : <p className="p-8 text-center text-sm text-gray-500">No leave requests.</p>}
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <h2 className="p-4 border-b border-gray-100 font-semibold text-sm">Restricted Holiday requests</h2>
        {rhRows.length ? rhRows.map(r => (
          <article key={r.id} className="p-4 border-b border-gray-50 flex flex-wrap justify-between gap-3">
            <div>
              <strong className="text-sm">{r.worker}</strong> <span className="text-xs text-gray-400 font-mono">{r.workerId}</span>
              <p className="text-xs text-gray-500 mt-1">Restricted Holiday · {r.holidayName || r.holidayDate} · {r.holidayDate}{r.site ? ` · ${r.site}` : ''}</p>
              {r.reason && <p className="text-xs text-gray-500 mt-1">{r.reason}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-fit text-[10px] font-bold px-2 py-1 rounded-full ${r.status === 'Approved' ? 'bg-green-50 text-green-700' : r.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>{r.status}</span>
              {r.status === 'Pending' && <>
                <button type="button" disabled={busy === `rh-${r.id}`} onClick={() => decideRh(r.id, 'Approved')} className="h-9 px-3 rounded-lg bg-green-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-green-700 disabled:opacity-60"><CheckCircle2 size={14}/>Approve</button>
                <button type="button" disabled={busy === `rh-${r.id}`} onClick={() => decideRh(r.id, 'Rejected')} className="h-9 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-bold flex items-center gap-1.5 hover:bg-red-50 disabled:opacity-60"><XCircle size={14}/>Reject</button>
              </>}
            </div>
          </article>
        )) : <p className="p-8 text-center text-sm text-gray-500">No restricted holiday requests.</p>}
      </section>
    </div>
  );
}
