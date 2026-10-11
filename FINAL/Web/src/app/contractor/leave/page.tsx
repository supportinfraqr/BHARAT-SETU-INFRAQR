"use client";
import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';

type Row = { id:string; kind:'leave'|'rh'; worker:string; bssId:string; type:string; from:string; to:string; days:number; reason:string; status:'Pending'|'Approved'|'Rejected'|'Cancelled' };

export default function ContractorLeavePage() {
  const { contractor, replaceContractor, mutate } = useContractor();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const leaveRows = contractor.leaveApprovals ?? [];
  const rhRows = contractor.restrictedHolidayRequests ?? [];

  // One unified request list: normal leave + Restricted Holiday requests. RH is a
  // leave the worker takes, so it belongs here — not in a separate section.
  const rows: Row[] = [
    ...leaveRows.map(r => ({ id:r.id, kind:'leave' as const, worker:r.worker, bssId:r.bssId, type:r.type, from:r.from, to:r.to, days:r.days, reason:r.reason, status:r.status })),
    ...rhRows.map(r => ({ id:r.id, kind:'rh' as const, worker:r.worker, bssId:r.workerId, type:'Restricted Holiday', from:r.holidayDate, to:r.holidayDate, days:1, reason:r.reason || r.holidayName, status:r.status })),
  ].sort((a, b) => (b.from || '').localeCompare(a.from || ''));

  async function decide(row: Row, status: 'Approved' | 'Rejected') {
    setBusy(`${row.kind}-${row.id}`); setError(''); setNotice('');
    try {
      if (row.kind === 'rh') {
        await mutate('restricted-holiday', 'PATCH', { id: row.id, status });
        replaceContractor({ ...contractor, restrictedHolidayRequests: rhRows.map(r => r.id === row.id ? { ...r, status } : r) });
      } else {
        await mutate('leave', 'PATCH', { id: row.id, status });
        replaceContractor({ ...contractor, leaveApprovals: leaveRows.map(r => r.id === row.id ? { ...r, status } : r) });
      }
      setNotice(`${row.kind === 'rh' ? 'Restricted holiday' : 'Leave'} request ${status.toLowerCase()}.`);
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
        <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Master data</p>
        <h1 className="text-2xl font-bold mt-1 text-bss-navy">Leave Approvals</h1>
        <p className="text-sm text-bss-text-secondary mt-1">Approve or reject leave requests (including Restricted Holidays) from workers bound to you.</p>
      </header>

      {notice && <p className="p-3 bg-bss-soft-green border border-bss-border text-bss-green rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>{notice}</p>}
      {error && <p className="p-3 bg-bss-soft-orange border border-bss-border text-bss-error rounded-xl text-sm font-semibold">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        {([['Pending', 'text-bss-orange'], ['Approved', 'text-bss-green'], ['Rejected', 'text-bss-error']] as const).map(([label, tone]) => (
          <div key={label} className="bg-white border border-bss-border rounded-xl p-4 shadow-sm">
            <strong className={`text-xl font-bold text-bss-text-primary`}>{rows.filter(r => r.status === label).length}</strong>
            <p className="text-[11px] text-bss-text-secondary mt-1">{label}</p>
          </div>
        ))}
      </div>

      <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
        <h2 className="p-4 border-b border-bss-border font-semibold text-sm text-bss-text-primary">Requests</h2>
        {rows.length ? rows.map(r => (
          <article key={`${r.kind}-${r.id}`} className="p-4 border-b border-bss-border flex flex-wrap justify-between gap-3 hover:bg-bss-bg/60">
            <div>
              <strong className="text-sm text-bss-text-primary">{r.worker}</strong> <span className="text-xs text-bss-text-muted font-mono">{r.bssId}</span>
              <p className="text-xs text-bss-text-secondary mt-1">
                {r.kind === 'rh' && <span className="text-[10px] font-semibold text-bss-orange bg-bss-soft-orange px-1.5 py-0.5 rounded mr-1.5 uppercase">RH</span>}
                {r.type} · {r.from} – {r.to} · {r.days} day{r.days > 1 ? 's' : ''}
              </p>
              {r.reason && <p className="text-xs text-bss-text-secondary mt-1">{r.reason}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-fit text-[10px] font-semibold px-2 py-1 rounded-full ${r.status === 'Approved' ? 'bg-bss-soft-green text-bss-green' : r.status === 'Rejected' ? 'bg-bss-soft-orange text-bss-error' : 'bg-bss-soft-orange text-bss-orange'}`}>{r.status}</span>
              {r.status === 'Pending' && <>
                <button type="button" disabled={busy === `${r.kind}-${r.id}`} onClick={() => decide(r, 'Approved')} className="h-9 px-3 rounded-lg bg-bss-green text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#0f6b30] disabled:opacity-60"><CheckCircle2 size={14}/>Approve</button>
                <button type="button" disabled={busy === `${r.kind}-${r.id}`} onClick={() => decide(r, 'Rejected')} className="h-9 px-3 rounded-lg border border-bss-border text-bss-error text-xs font-semibold flex items-center gap-1.5 hover:bg-bss-soft-orange disabled:opacity-60"><XCircle size={14}/>Reject</button>
              </>}
            </div>
          </article>
        )) : <p className="p-8 text-center text-sm text-bss-text-muted">No leave requests.</p>}
      </section>
    </div>
  );
}
