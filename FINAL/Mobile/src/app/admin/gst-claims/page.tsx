"use client";

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';

type Holder = {
  userId: number; role: string; name: string; username: string;
  approval: string; gstStatus: string; isActive: boolean; accountActive: boolean; active: boolean;
};
type Claim = {
  id: number; gstin: string; status: string; role: string; note: string;
  claimant: { userId: number; name: string; username: string; approval: string };
  holders: Holder[];
};

export default function AdminGstClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/gst-claims', { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: Claim[]; error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not load GST claims.');
      setClaims(body.data ?? []);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load GST claims.');
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  async function review(claim: Claim, decision: 'APPROVE' | 'REJECT') {
    setBusy(claim.id); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/gst-claims/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: claim.id, decision, note: notes[claim.id] || '' }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not save the decision.');
      setNotice(decision === 'APPROVE'
        ? `${claim.claimant.name} is now the owner of ${claim.gstin}; other accounts were deactivated.`
        : `Claim on ${claim.gstin} rejected.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the decision.');
    } finally { setBusy(null); }
  }

  return <div className="space-y-6 pb-12">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Users &amp; Access</p>
      <h1 className="text-2xl font-bold mt-1">GST Ownership Claims</h1>
      <p className="text-sm text-gray-500 mt-1">A GSTIN stays on an account until both <strong>Admin Approval</strong> and <strong>is_Active</strong> are off. Pick the rightful owner and the other accounts are deactivated.</p>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-8"><Loader2 size={15} className="animate-spin"/>Loading claims…</p>
      : !claims.length ? <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center"><ShieldCheck size={26} className="mx-auto text-gray-300"/><p className="text-sm font-semibold text-gray-700 mt-3">No pending GST claims</p><p className="text-xs text-gray-500 mt-1">Claims raised by contractors/employers will appear here.</p></div>
      : <div className="space-y-4">{claims.map(claim => <section key={claim.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="p-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><BadgeCheck size={16} className="text-[#073B67]"/>GSTIN {claim.gstin}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Claimed by <strong className="text-gray-800">{claim.claimant.name}</strong> ({claim.claimant.username}) · {claim.role}{claim.note ? ` · “${claim.note}”` : ''}</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500"><tr><th className="text-left px-4 py-2">Account</th><th className="text-left px-4 py-2">Role</th><th className="text-left px-4 py-2">Approval</th><th className="text-left px-4 py-2">GST</th><th className="text-left px-4 py-2">Active</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{claim.holders.map(h => <tr key={`${h.role}-${h.userId}`}>
                <td className="px-4 py-2"><p className="font-semibold text-gray-900">{h.name}</p><p className="text-[11px] text-gray-400">{h.username}</p></td>
                <td className="px-4 py-2 capitalize text-gray-600">{h.role}</td>
                <td className="px-4 py-2 text-gray-600">{h.approval}</td>
                <td className="px-4 py-2 text-gray-600">{h.gstStatus}</td>
                <td className="px-4 py-2">{h.active ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span> : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Inactive</span>}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2 sm:items-center">
            <input value={notes[claim.id] || ''} onChange={e => setNotes(prev => ({ ...prev, [claim.id]: e.target.value }))} placeholder="Decision note (optional)" className="flex-1 h-10 border border-gray-200 rounded-lg px-3 text-sm"/>
            <div className="flex gap-2">
              <button disabled={busy === claim.id} onClick={() => void review(claim, 'APPROVE')} className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50">{busy === claim.id ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>}Make {claim.claimant.name} owner &amp; deactivate others</button>
              <button disabled={busy === claim.id} onClick={() => void review(claim, 'REJECT')} className="h-10 px-4 rounded-lg border border-red-200 text-red-600 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-red-50 disabled:opacity-50"><XCircle size={13}/>Reject</button>
            </div>
          </div>
        </section>)}</div>}
  </div>;
}
