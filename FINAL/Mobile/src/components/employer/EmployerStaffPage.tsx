"use client";

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, ShieldCheck, UserCog, X } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';

type Permission = 'medical' | 'safety' | 'gate_pass' | 'compliance';
type StaffRow = {
  id: number; userId: number; name: string; phone: string; title: string;
  permissions: Permission[]; active: boolean; createdAt: string;
};

const PERMISSIONS: Array<{ key: Permission; label: string }> = [
  { key: 'medical', label: 'Medical Officer' },
  { key: 'safety', label: 'Health & Safety Officer' },
  { key: 'gate_pass', label: 'Security Officer' },
  { key: 'compliance', label: 'Compliance Officer' },
];
const labelOf = (key: string) => PERMISSIONS.find(p => p.key === key)?.label ?? key;

const input = 'w-full h-10 rounded-xl border border-bss-border bg-white px-3 text-sm text-bss-text-primary focus:outline-none focus:border-[#1E3A8A]';
const btn = 'h-10 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50';

export default function EmployerStaffPage() {
  const { employer } = useEmployer();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', mpin: '', permissions: [] as Permission[] });

  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [editPerms, setEditPerms] = useState<Permission[]>([]);
  const [editTitle, setEditTitle] = useState('');

  const [mpinFor, setMpinFor] = useState<StaffRow | null>(null);
  const [newMpin, setNewMpin] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employer/staff', { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { rows?: StaffRow[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Staff accounts could not be loaded.');
      setRows(body.rows ?? []);
      setError('');
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  function resetCreate() {
    setForm({ name: '', phone: '', mpin: '', permissions: [] });
    setCreating(false);
  }
  async function create() {
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch('/api/employer/staff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'The staff account could not be created.');
      setNotice(`${form.name} added.`);
      resetCreate();
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function update(row: StaffRow, patch: Record<string, unknown>) {
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/employer/staff/${row.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'The staff account could not be updated.');
      setNotice(`${row.name} updated.`);
      setEditing(null);
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function resetMpin() {
    if (!mpinFor) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/employer/staff/${mpinFor.id}/mpin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mpin: newMpin }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'The MPIN could not be set.');
      setNotice(`MPIN updated for ${mpinFor.name}.`);
      setMpinFor(null); setNewMpin('');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function setActive(row: StaffRow, active: boolean) {
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/employer/staff/${row.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `The account could not be ${active ? 'enabled' : 'disabled'}.`);
      setNotice(`${row.name} ${active ? 'enabled' : 'disabled'}.`);
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!employer.canAccessAdmin) {
    return <section className="bss-card rounded-2xl p-10 text-center"><ShieldCheck size={32} className="mx-auto text-bss-text-muted"/><h1 className="mt-4 text-xl font-bold">Admin access required</h1><p className="text-sm text-bss-text-muted mt-2">Only the employer can manage staff accounts.</p></section>;
  }

  return <div className="space-y-5 pb-10">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Employer</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-bss-text-primary mt-1">Staff Accounts</h1>
        <p className="text-sm text-bss-text-muted mt-1">Create Medical, Health &amp; Safety, Security and Compliance officers. They sign in with their phone + MPIN through the Employer portal.</p>
      </div>
      <button type="button" onClick={() => setCreating(true)} className={`${btn} bg-[#01183A] text-white`}><Plus size={14}/> New staff</button>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    <section className="bss-card rounded-2xl overflow-hidden">
      {loading ? <p className="flex items-center gap-2 p-7 text-sm text-bss-text-muted"><Loader2 size={16} className="animate-spin"/>Loading…</p>
        : !rows.length ? <div className="p-8 text-center"><UserCog size={26} className="mx-auto text-bss-text-muted"/><p className="mt-3 text-sm text-bss-text-muted">No staff accounts yet.</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-bss-bg border-b border-bss-border text-[11px] text-bss-text-muted uppercase tracking-wider"><tr>
              <th className="px-5 py-3 font-bold">Staff</th><th className="px-5 py-3 font-bold">Phone</th><th className="px-5 py-3 font-bold">Permissions</th><th className="px-5 py-3 font-bold">Status</th><th className="px-5 py-3 font-bold text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-bss-border">
              {rows.map(row => <tr key={row.id} className="hover:bg-bss-bg">
                <td className="px-5 py-3"><p className="font-semibold text-bss-text-primary">{row.name}</p>{row.title && <p className="text-[10px] text-bss-text-muted">{row.title}</p>}</td>
                <td className="px-5 py-3 font-mono text-[11px] text-bss-text-secondary">{row.phone}</td>
                <td className="px-5 py-3"><div className="flex flex-wrap gap-1">{row.permissions.map(p => <span key={p} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bss-bg text-bss-text-secondary">{labelOf(p)}</span>)}</div></td>
                <td className="px-5 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.active ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-bg text-bss-text-muted'}`}>{row.active ? 'Active' : 'Disabled'}</span></td>
                <td className="px-5 py-3"><div className="flex justify-end gap-1.5">
                  <button type="button" onClick={() => { setEditing(row); setEditPerms(row.permissions); setEditTitle(row.title); }} className={`${btn} border border-bss-border bg-white text-bss-text-primary`}>Edit</button>
                  <button type="button" onClick={() => { setMpinFor(row); setNewMpin(''); }} className={`${btn} border border-bss-border bg-white text-bss-text-primary`}>Set MPIN</button>
                  {row.active
                    ? <button type="button" disabled={busy} onClick={() => void setActive(row, false)} className={`${btn} border border-bss-border bg-white text-[#DC2626]`}>Disable</button>
                    : <button type="button" disabled={busy} onClick={() => void setActive(row, true)} className={`${btn} border border-bss-border bg-white text-[#14843C]`}>Enable</button>}
                </div></td>
              </tr>)}
            </tbody>
          </table></div>}
    </section>

    {creating && <div className="fixed inset-0 z-[90] bg-black/50 p-4 grid place-items-center">
      <div className="w-full max-w-lg bg-white rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between"><h2 className="text-sm font-bold">New staff account</h2><button type="button" onClick={resetCreate} aria-label="Close"><X size={18}/></button></header>
        <div className="p-5 space-y-3">
          <label className="block text-[11px] font-semibold text-bss-text-muted">Name<input className={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dr. R. Sharma" /></label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-[11px] font-semibold text-bss-text-muted">Phone<input className={input} inputMode="numeric" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit mobile" /></label>
            <label className="block text-[11px] font-semibold text-bss-text-muted">MPIN<input className={input} inputMode="numeric" value={form.mpin} onChange={e => setForm({ ...form, mpin: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="4-6 digits" /></label>
          </div>
          <div><p className="text-[11px] font-semibold text-bss-text-muted mb-1.5">Permissions</p><div className="flex flex-wrap gap-2">{PERMISSIONS.map(p => <label key={p.key} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold cursor-pointer ${form.permissions.includes(p.key) ? 'border-[#01183A] bg-[#01183A] text-white' : 'border-bss-border bg-white text-bss-text-secondary'}`}><input type="checkbox" className="hidden" checked={form.permissions.includes(p.key)} onChange={e => setForm({ ...form, permissions: e.target.checked ? [...form.permissions, p.key] : form.permissions.filter(k => k !== p.key) })} />{p.label}</label>)}</div></div>
          <p className="text-[10px] text-bss-text-muted">No OTP is needed. The staff member signs in with this phone + MPIN; only you can change the MPIN.</p>
        </div>
        <footer className="px-5 py-4 border-t border-bss-border flex justify-end gap-2">
          <button type="button" onClick={resetCreate} className={`${btn} border border-bss-border bg-white text-bss-text-primary`}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => void create()} className={`${btn} bg-[#01183A] text-white`}>{busy ? 'Saving…' : 'Create staff'}</button>
        </footer>
      </div>
    </div>}

    {editing && <div className="fixed inset-0 z-[90] bg-black/50 p-4 grid place-items-center">
      <div className="w-full max-w-lg bg-white rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between"><h2 className="text-sm font-bold">Edit {editing.name}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Close"><X size={18}/></button></header>
        <div className="p-5 space-y-3">
          <label className="block text-[11px] font-semibold text-bss-text-muted">Title (optional)<input className={input} value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="e.g. Site Medical Officer" /></label>
          <div><p className="text-[11px] font-semibold text-bss-text-muted mb-1.5">Permissions</p><div className="flex flex-wrap gap-2">{PERMISSIONS.map(p => <label key={p.key} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold cursor-pointer ${editPerms.includes(p.key) ? 'border-[#01183A] bg-[#01183A] text-white' : 'border-bss-border bg-white text-bss-text-secondary'}`}><input type="checkbox" className="hidden" checked={editPerms.includes(p.key)} onChange={e => setEditPerms(e.target.checked ? [...editPerms, p.key] : editPerms.filter(k => k !== p.key))} />{p.label}</label>)}</div></div>
        </div>
        <footer className="px-5 py-4 border-t border-bss-border flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(null)} className={`${btn} border border-bss-border bg-white text-bss-text-primary`}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => void update(editing, { permissions: editPerms, title: editTitle })} className={`${btn} bg-[#01183A] text-white`}>{busy ? 'Saving…' : 'Save changes'}</button>
        </footer>
      </div>
    </div>}

    {mpinFor && <div className="fixed inset-0 z-[90] bg-black/50 p-4 grid place-items-center">
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between"><h2 className="text-sm font-bold">Set MPIN · {mpinFor.name}</h2><button type="button" onClick={() => setMpinFor(null)} aria-label="Close"><X size={18}/></button></header>
        <div className="p-5"><label className="block text-[11px] font-semibold text-bss-text-muted">New MPIN<input className={input} inputMode="numeric" value={newMpin} onChange={e => setNewMpin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="4-6 digits" /></label><p className="mt-2 text-[10px] text-bss-text-muted">The staff member cannot change their own MPIN.</p></div>
        <footer className="px-5 py-4 border-t border-bss-border flex justify-end gap-2">
          <button type="button" onClick={() => setMpinFor(null)} className={`${btn} border border-bss-border bg-white text-bss-text-primary`}>Cancel</button>
          <button type="button" disabled={busy || newMpin.length < 4} onClick={() => void resetMpin()} className={`${btn} bg-[#01183A] text-white`}>{busy ? 'Saving…' : 'Save MPIN'}</button>
        </footer>
      </div>
    </div>}
  </div>;
}
