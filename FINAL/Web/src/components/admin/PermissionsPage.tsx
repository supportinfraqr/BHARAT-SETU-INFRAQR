"use client";

import { useCallback, useEffect, useState } from 'react';
import { Check, CheckCircle2, ChevronDown, ChevronRight, Loader2, ShieldCheck, X } from 'lucide-react';
import { PERMISSION_ACTIONS, PERMISSION_MODULES, StatusBadge } from '@/data/adminMasters';

type PermissionUser = {
  id: number;
  username: string;
  name: string;
  partyType: string;
  partyName: string;
  status: string;
  permissions: Record<string, string[]>;
};

export default function PermissionsPage() {
  const [users, setUsers] = useState<PermissionUser[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [openModule, setOpenModule] = useState<string | null>('Workers');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/permissions', { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { users?:PermissionUser[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'Permissions could not be loaded.');
      setUsers(body.users ?? []);
      setSelectedId(current => current ?? body.users?.[0]?.id ?? null);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Permissions could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  const user = users.find(u => u.id === selectedId) ?? users[0];

  function toggle(userId: number, module: string, action: string) {
    setDirty(true);
    setUsers(current => current.map(u => {
      if (u.id !== userId) return u;
      const currentPerms = u.permissions[module] ?? [];
      const nextPerms = currentPerms.includes(action) ? currentPerms.filter(a => a !== action) : [...currentPerms, action];
      return { ...u, permissions: { ...u.permissions, [module]: nextPerms } };
    }));
  }

  function toggleModule(userId: number, module: string, enable: boolean) {
    setDirty(true);
    setUsers(current => current.map(u => u.id === userId ? { ...u, permissions: { ...u.permissions, [module]: enable ? [...PERMISSION_ACTIONS] : [] } } : u));
  }

  async function save() {
    if (!user) return;
    try {
      const response = await fetch('/api/admin/permissions', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ userId: user.id, permissions: user.permissions }),
      });
      const body = await response.json().catch(() => ({})) as { error?:string };
      if (!response.ok) throw new Error(body.error ?? 'Permissions could not be saved.');
      setDirty(false); setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Permissions could not be saved.'); }
  }

  function reset() { setDirty(false); void load(); }

  if (loading && !user) return <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading users…</p>;

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin · Access</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Permission Page</h1><p className="text-sm text-gray-500 mt-1">User-wise menu permission management — select a user, grant module permissions and save. Grants are persisted server-side and recorded in the audit trail.</p></div>
      <div className="flex gap-2">
        <button onClick={reset} disabled={!dirty} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><X size={15}/>Reset / Cancel</button>
        <button onClick={() => void save()} disabled={!dirty} className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black disabled:opacity-50"><Check size={15}/>Save Changes</button>
      </div>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {saved && user && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>Permissions saved for {user.username} — changes recorded in the audit trail.</p>}

    {user && <div className="grid lg:grid-cols-[280px_1fr] gap-5 items-start">
      {/* User selection */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="px-4 py-3 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">User Selection</h2><p className="text-[11px] text-gray-400 mt-0.5">Choose the user to configure</p></header>
        <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">{users.map(u => (
          <button key={u.id} onClick={() => setSelectedId(u.id)} className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${selectedId === u.id ? 'bg-blue-50/60' : ''}`}>
            <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-blue-700">{u.username}</span><StatusBadge value={u.status}/></div>
            <p className="text-sm font-semibold text-gray-900 mt-1">{u.name}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{u.partyType} · {u.partyName}</p>
          </button>
        ))}</div>
      </section>

      {/* Module permission matrix */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap justify-between gap-3 items-center">
          <div><h2 className="text-sm font-semibold text-gray-950">Module Selection · {user.name}</h2><p className="text-[11px] text-gray-400 mt-0.5">Role → Module → Permissions. Select-all is available per module.</p></div>
          <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">{Object.values(user.permissions).flat().length} grants</span>
        </header>
        <div className="divide-y divide-gray-100">
          {PERMISSION_MODULES.map(module => {
            const perms = user.permissions[module] ?? [];
            const open = openModule === module;
            return <div key={module}>
              <div className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50">
                <button onClick={() => setOpenModule(open ? null : module)} className="flex items-center gap-2 text-sm font-semibold text-gray-800">{open ? <ChevronDown size={15} className="text-gray-400"/> : <ChevronRight size={15} className="text-gray-400"/>}{module}<span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">{perms.length}/{PERMISSION_ACTIONS.length}</span></button>
                <div className="flex gap-1.5">{perms.length === PERMISSION_ACTIONS.length ? <button onClick={() => toggleModule(user.id, module, false)} className="text-[10px] font-bold text-gray-500 border border-gray-200 rounded-full px-2 py-1 hover:bg-gray-50">Select none</button> : <button onClick={() => toggleModule(user.id, module, true)} className="text-[10px] font-bold text-blue-700 border border-blue-100 rounded-full px-2 py-1 hover:bg-blue-50">Select all</button>}</div>
              </div>
              {open && <div className="px-5 pb-4 flex flex-wrap gap-2">{PERMISSION_ACTIONS.map(action => {
                const enabled = perms.includes(action);
                return <button key={action} onClick={() => toggle(user.id, module, action)} className={`h-8 px-3 rounded-full text-xs font-semibold border ${enabled ? 'bg-[#073B67] text-white border-[#073B67]' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>{enabled ? <Check size={12} className="inline mr-1"/> : null}{action}</button>;
              })}</div>}
            </div>;
          })}
        </div>
        <footer className="px-5 py-3 border-t border-gray-100 text-[11px] text-gray-400 flex items-center gap-1.5"><ShieldCheck size={13}/>Menu-level access is also governed by the role menu map — modules not in the user&apos;s role menu remain hidden regardless of permission state.</footer>
      </section>
    </div>}

    {!user && !loading && <p className="text-sm text-gray-400 py-8">No users found.</p>}
  </div>;
}
