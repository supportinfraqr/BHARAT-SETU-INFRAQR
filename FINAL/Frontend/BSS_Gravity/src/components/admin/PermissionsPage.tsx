"use client";

import { useState } from 'react';
import { Check, CheckCircle2, ChevronDown, ChevronRight, ShieldCheck, X } from 'lucide-react';
import { MENU_PERMISSIONS, PERMISSION_ACTIONS, PERMISSION_MODULES, StatusBadge } from '@/data/adminMasters';

type PermissionUser = {
  id: number;
  username: string;
  name: string;
  partyType: string;
  partyName: string;
  status: string;
  permissions: Record<string, string[]>;
};

const seedUsers: PermissionUser[] = [
  { id: 1, username: 'ananya.mehta', name: 'Ananya Mehta', partyType: 'Employer', partyName: 'L&T Construction', status: 'Active', permissions: { Workers: ['View', 'Edit'], Contractors: ['View', 'Approve'], Sites: ['View', 'Edit'], Compliance: ['View', 'Approve', 'Export'] } },
  { id: 2, username: 'rajesh.kumar', name: 'Rajesh Kumar', partyType: 'Contractor', partyName: 'RK Buildcon Pvt. Ltd.', status: 'Active', permissions: { Workers: ['View'], 'Gate Pass': ['View', 'Approve'], Compliance: ['View'], Payroll: ['View', 'Edit'] } },
  { id: 3, username: 'ops.staff', name: 'Operations Staff', partyType: 'BSS Staff', partyName: 'Bharat Shram Setu', status: 'Pending', permissions: { Compliance: ['View'], 'QR / Binding': ['View'] } },
];

export default function PermissionsPage() {
  const [users, setUsers] = useState<PermissionUser[]>(seedUsers);
  const [selectedId, setSelectedId] = useState<number>(1);
  const [openModule, setOpenModule] = useState<string | null>('Workers');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

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

  function save() {
    setUsers(current => current.map(u => u.id === user.id ? { ...u, status: 'Active' } : u));
    setDirty(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function reset() { setUsers(seedUsers); setDirty(false); }

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin · Access</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Permission Page</h1><p className="text-sm text-gray-500 mt-1">User-wise menu permission management — select a user, grant module permissions and save. Frontend enforcement is for demo only; real security must be enforced server-side.</p></div>
      <div className="flex gap-2">
        <button onClick={reset} disabled={!dirty} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><X size={15}/>Reset / Cancel</button>
        <button onClick={save} disabled={!dirty} className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black disabled:opacity-50"><Check size={15}/>Save Changes</button>
      </div>
    </header>

    {saved && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>Permissions saved for {user.username} — changes recorded in the audit trail.</p>}

    <div className="grid lg:grid-cols-[280px_1fr] gap-5 items-start">
      {/* User selection */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="px-4 py-3 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">User Selection</h2><p className="text-[11px] text-gray-400 mt-0.5">Choose the user to configure</p></header>
        <div className="divide-y divide-gray-100">{users.map(u => (
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
    </div>
  </div>;
}
