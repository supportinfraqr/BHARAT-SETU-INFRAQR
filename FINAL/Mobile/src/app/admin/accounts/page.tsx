"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Lock, LockOpen, Search, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react';
import AdminPageHero from '@/components/admin/AdminPageHero';

type Account = {
  userId: number; username: string; role: string; name: string;
  bssId: string; mobile?: string; email?: string; gstin: string; approval: string;
  aadhaarVerified?: boolean; gstVerified?: boolean; accountActive: boolean; loginActive: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  worker: 'Worker', contractor: 'Contractor', employer: 'Employer',
  bss_admin: 'BSS Admin', bss_staff: 'BSS Staff', government: 'Government',
};

function VerifiedBadge({ ok, onLabel = 'Verified', offLabel = 'Not verified' }: { ok: boolean; onLabel?: string; offLabel?: string }) {
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{ok ? onLabel : offLabel}</span>;
}

export default function AdminAccountsPage() {
  const [rows, setRows] = useState<Account[]>([]);
  const [role, setRole] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Login switch is password-gated.
  const [auth, setAuth] = useState<{ row: Account; next: boolean } | null>(null);
  const [password, setPassword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/accounts${role ? `?role=${encodeURIComponent(role)}` : ''}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: Account[]; error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not load accounts.');
      setRows(body.data ?? []);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load accounts.');
    } finally { setLoading(false); }
  }, [role]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.name, r.username, r.bssId, r.gstin, r.mobile, r.email, ROLE_LABEL[r.role] ?? r.role]
        .some(v => (v || '').toLowerCase().includes(q)));
  }, [rows, query]);

  async function setAccountActive(row: Account, value: boolean) {
    setBusy(row.userId); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/accounts/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: row.userId, field: 'account', value }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not change Admin Approval.');
      setNotice(`${row.name} — Admin Approval is now ${value ? 'on' : 'off'}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not change Admin Approval.');
    } finally { setBusy(null); }
  }

  async function setLoginActive(row: Account, value: boolean, pwd: string) {
    setBusy(row.userId); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/accounts/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: row.userId, field: 'login', value, password: pwd }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not change is_Active.');
      setNotice(`${row.name} — is_Active is now ${value ? 'on' : 'off'}.`);
      setAuth(null); setPassword('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not change is_Active.');
    } finally { setBusy(null); }
  }

  return <div className="space-y-6 pb-12">
    <AdminPageHero
      eyebrow="Users & Access"
      title="Users & Accounts"
      description="Every user account with its verification state (Aadhaar / GST) and two switches — Admin Approval (workers approved by default) and is_Active (password-protected sign-in)."
      icon={<Users size={14}/>}
    />

    <section className="bss-card rounded-2xl p-3 flex flex-wrap items-end gap-3">
      <label className="text-xs font-semibold text-bss-text-secondary">
        Search
        <span className="relative mt-1 block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bss-text-muted"/>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, BSS ID, GSTIN, username, mobile…" className="w-full sm:w-72 h-9 border border-bss-border rounded-lg pl-9 pr-3 text-sm bg-white text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30"/>
        </span>
      </label>
      <label className="text-xs font-semibold text-bss-text-secondary">
        Role
        <select value={role} onChange={e => setRole(e.target.value)} className="mt-1 h-9 border border-bss-border rounded-lg px-2 text-sm bg-white text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30">
          <option value="">All</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
    </section>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-8"><Loader2 size={15} className="animate-spin"/>Loading accounts…</p>
      : !filtered.length ? <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center"><ShieldCheck size={26} className="mx-auto text-gray-300"/><p className="text-sm text-gray-500 mt-3">{rows.length ? 'No accounts match your search.' : 'No accounts.'}</p></div>
      : <div className="bss-card rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bss-bg text-[11px] uppercase tracking-wider text-bss-text-muted">
            <tr>
              <th className="text-left px-4 py-2.5">Account</th>
              <th className="text-left px-4 py-2.5">BSS ID</th>
              <th className="text-left px-4 py-2.5">Role</th>
              <th className="text-left px-4 py-2.5">Contact</th>
              <th className="text-left px-4 py-2.5">GSTIN</th>
              <th className="text-center px-4 py-2.5">Aadhaar</th>
              <th className="text-center px-4 py-2.5">GST</th>
              <th className="text-center px-4 py-2.5">Admin Approval</th>
              <th className="text-center px-4 py-2.5">is_Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(row => <tr key={row.userId}>
              <td className="px-4 py-2.5"><p className="font-semibold text-gray-900">{row.name}</p><p className="text-[11px] text-gray-400">{row.username}</p></td>
              <td className="px-4 py-2.5 font-mono text-[11px] text-gray-600">{row.bssId || '—'}</td>
              <td className="px-4 py-2.5 text-gray-600">{ROLE_LABEL[row.role] ?? row.role}</td>
              <td className="px-4 py-2.5 text-[11px] text-gray-500">{row.mobile || '—'}{row.email ? <p className="text-gray-400">{row.email}</p> : null}</td>
              <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{row.gstin || '—'}</td>
              <td className="px-4 py-2.5 text-center">{row.role === 'worker' ? <VerifiedBadge ok={!!row.aadhaarVerified} onLabel="Verified" offLabel="Pending"/> : <span className="text-gray-300">—</span>}</td>
              <td className="px-4 py-2.5 text-center">{(row.role === 'employer' || row.role === 'contractor') ? <VerifiedBadge ok={!!row.gstin} onLabel="Provided" offLabel="Not provided"/> : <span className="text-gray-300">—</span>}</td>
              <td className="px-4 py-2.5 text-center">
                <button type="button" disabled={busy === row.userId} onClick={() => void setAccountActive(row, !row.accountActive)} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-50 ${row.accountActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>{row.accountActive ? <UserCheck size={13}/> : <UserX size={13}/>}{row.accountActive ? 'Approved' : 'Not approved'}</button>
              </td>
              <td className="px-4 py-2.5 text-center">
                <button type="button" disabled={busy === row.userId} onClick={() => { setAuth({ row, next: !row.loginActive }); setPassword(''); setError(''); }} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-50 ${row.loginActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}`}>{row.loginActive ? <LockOpen size={13}/> : <Lock size={13}/>}{row.loginActive ? 'On' : 'Off'}</button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>}

    {auth && <div className="fixed inset-0 z-[120] grid place-items-center bg-black/50 p-4" role="presentation" onClick={() => setAuth(null)}>
      <section role="dialog" aria-modal="true" className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-gray-900 flex items-center gap-2"><Lock size={16}/>{auth.next ? 'Turn on' : 'Turn off'} is_Active — {auth.row.name}</h2>
        <p className="text-xs text-gray-500">Enter the admin password to change is_Active.</p>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Admin password" autoFocus className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/>
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setAuth(null)} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold">Cancel</button>
          <button type="button" disabled={busy === auth.row.userId} onClick={() => void setLoginActive(auth.row, auth.next, password)} className="h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-50">{busy === auth.row.userId ? 'Saving…' : 'Confirm'}</button>
        </div>
      </section>
    </div>}
  </div>;
}
