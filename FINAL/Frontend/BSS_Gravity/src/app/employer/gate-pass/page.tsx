"use client";

import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Clock3, Eye, Pencil, Send, ShieldCheck, X, XCircle } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerGatePass } from '@/types/portal';
import { useEmployerDocView } from '@/components/documentEngine/portalAdapters';
import { templateService } from '@/lib/documentEngine/services';
import { buildGatePassHtml } from '@/lib/documentEngine/gatePass';
import { GatePassViewer } from '@/components/documentEngine/GatePassViewer';

const isEligible = (row: EmployerGatePass) => {
  const e = row.eligibility;
  return !!e && e.medical === 'Done' && e.healthSafety === 'Done' && e.compliance === 'Done';
};
const eligibleSummary = (eligible: number, total: number) => total === 0 ? 'no workers selected' : `${eligible} of ${total} selected workers are fully eligible (Medical · Health & Safety · Compliance)`;

export default function EmployerGatePassPage() {
  const { employer, replaceEmployer, mutate } = useEmployer();
  const docCtx = useEmployerDocView();
  const [site, setSite] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ status: 'Approved' | 'Rejected' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editRow, setEditRow] = useState<EmployerGatePass | null>(null);
  const [editFrom, setEditFrom] = useState('');
  const [editTo, setEditTo] = useState('');
  const [passPreview, setPassPreview] = useState<{ html: string; title: string } | null>(null);

  useEffect(() => { void templateService.hydrate(docCtx.owner); }, [docCtx.owner]);

  const rows = site === 'all' ? employer.gatePasses : employer.gatePasses.filter(item => item.siteId === site);
  const pending = rows.filter(item => item.status === 'Pending');
  const allVisibleSelected = pending.length > 0 && pending.every(item => selected.includes(item.id));

  const counts = useMemo(() => ({
    total: employer.gatePasses.length,
    pending: employer.gatePasses.filter(i => i.status === 'Pending').length,
    approved: employer.gatePasses.filter(i => i.status === 'Approved').length,
    rejected: employer.gatePasses.filter(i => i.status === 'Rejected').length,
  }), [employer.gatePasses]);

  function toggle(id: string) { setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]); }
  function toggleAll() { setSelected(current => allVisibleSelected ? current.filter(id => !pending.some(row => row.id === id)) : Array.from(new Set([...current, ...pending.map(row => row.id)]))); }

  // Render the pass on demand from the active gate-pass template + this worker's current data.
  async function viewPass(row: EmployerGatePass) {
    await templateService.hydrate(docCtx.owner);
    const worker = docCtx.workers.find(item => item.bssId === row.workerId || item.name === row.workerName);
    if (!worker) { setError(`No worker record found for ${row.workerName}.`); return; }
    const type = row.type === 'Permanent' ? 'permanent-gate-pass' : 'temporary-gate-pass';
    const html = await buildGatePassHtml(docCtx.owner, docCtx.view, worker, type, { validFrom: row.validFrom, validTo: row.validTo, number: row.number, status: row.status });
    setPassPreview({ html, title: `${row.workerName} · ${row.type} Gate Pass` });
  }

  // Employer-only: edit the validity window. Defaults to the worker's BSS ID
  // card (Issue Date / Valid Till) when the pass has no dates configured.
  function openEdit(row: EmployerGatePass) {
    setError('');
    setEditRow(row);
    setEditFrom((row.validFrom || '').slice(0, 10));
    setEditTo((row.validTo || '').slice(0, 10));
  }

  async function saveDates() {
    if (!editRow) return;
    setBusy(true);
    setError('');
    try {
      const updated = await mutate<Partial<EmployerGatePass>>('gate-passes', 'PATCH', { id: editRow.id, validFrom: editFrom, validTo: editTo });
      replaceEmployer({ ...employer, gatePasses: employer.gatePasses.map(item => item.id === editRow.id ? { ...item, ...updated } : item) });
      setNotice(`Validity updated for ${editRow.workerName}.`);
      setEditRow(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The dates could not be saved.'); }
    finally { setBusy(false); }
  }

  // Employer-only: dispatch gate passes to workers (single or bulk). Until a
  // pass is dispatched it stays hidden on the worker's side.
  async function dispatch(ids: string[]) {
    if (!ids.length) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await mutate('gate-passes', 'PATCH', { ids, dispatched: true });
      setNotice(`${ids.length} gate pass${ids.length === 1 ? '' : 'es'} dispatched — now visible to the worker${ids.length === 1 ? '' : 's'}.`);
      setSelected([]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The gate passes could not be dispatched.'); }
    finally { setBusy(false); }
  }

  // Revoke an active pass (reason mandatory) — a revoked pass can never be renewed.
  async function revoke(row: EmployerGatePass) {
    const reason = window.prompt(`Reason for revoking ${row.workerName}'s gate pass (required):`);
    if (reason === null) return;
    if (!reason.trim()) { setError('A revocation reason is mandatory.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await mutate('gate-passes', 'PATCH', { id: row.id, action: 'revoke', reason: reason.trim() });
      setNotice(`Gate pass ${row.number} revoked for ${row.workerName}.`);
    } catch (reasonErr) { setError(reasonErr instanceof Error ? reasonErr.message : 'The gate pass could not be revoked.'); }
    finally { setBusy(false); }
  }

  // Renew an expired pass — the system re-checks eligibility and issues a fresh pass.
  async function renew(row: EmployerGatePass) {
    setBusy(true); setError(''); setNotice('');
    try {
      await mutate('gate-passes', 'PATCH', { id: row.id, action: 'renew' });
      setNotice(`Gate pass renewed for ${row.workerName} — a fresh pass was issued.`);
    } catch (reasonErr) { setError(reasonErr instanceof Error ? reasonErr.message : 'The gate pass could not be renewed.'); }
    finally { setBusy(false); }
  }

  async function decide(status: 'Approved' | 'Rejected') {    if (!selected.length) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await mutate('gate-passes', 'PATCH', { ids: selected, status });
      replaceEmployer({ ...employer, gatePasses: employer.gatePasses.map(item => selected.includes(item.id) ? { ...item, status } : item) });
      setNotice(`${selected.length} gate pass request${selected.length === 1 ? '' : 's'} ${status.toLowerCase()}.`);
      setSelected([]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The gate pass selection could not be updated.'); }
    finally { setBusy(false); setConfirm(null); }
  }

  const confirmText = (status: 'Approved' | 'Rejected') => {
    const target = employer.gatePasses.filter(item => selected.includes(item.id));
    if (target.length === 1) return `${status} ${target[0].type} Gate Pass for ${target[0].workerName} at ${target[0].site}?`;
    return `${status} ${target.length} selected gate pass requests?`;
  };

  return <div className="space-y-6 pb-24">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Workforce gate access</p><h1 className="text-2xl font-bold mt-1">Gate Pass Approval</h1><p className="text-sm text-gray-500 mt-1">Review and approve permanent or temporary site access for connected workers.</p></header>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Metric label="Total requests" value={counts.total} icon={ShieldCheck} tone="bg-blue-50 text-blue-700"/>
      <Metric label="Pending" value={counts.pending} icon={Clock3} tone="bg-orange-50 text-orange-700"/>
      <Metric label="Approved" value={counts.approved} icon={CheckCircle2} tone="bg-green-50 text-green-700"/>
      <Metric label="Rejected" value={counts.rejected} icon={XCircle} tone="bg-red-50 text-red-700"/>
    </div>

    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3"><div><h2 className="text-sm font-semibold text-gray-900">Gate pass requests</h2><p className="text-[11px] text-gray-400 mt-0.5">{rows.length} records in this view</p></div><label className="flex items-center gap-2 text-xs font-semibold text-gray-700">Site<select value={site} onChange={e => { setSite(e.target.value); setSelected([]); }} className="h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white"><option value="all">All sites</option>{employer.sites.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></header>
      <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-xs">
        <thead className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3 w-10"><input type="checkbox" aria-label="Select all visible requests" checked={allVisibleSelected} onChange={toggleAll} className="w-4 h-4 rounded border-gray-300"/></th><th className="px-4 py-3">Worker</th><th className="px-4 py-3">Contractor</th><th className="px-4 py-3">Site</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Validity</th><th className="px-4 py-3">Eligibility</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Gate pass</th></tr></thead>
        <tbody className="divide-y divide-gray-100">{rows.map(row => { const elig = row.eligibility; return <tr key={row.id} className={selected.includes(row.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}><td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${row.workerName}`} checked={selected.includes(row.id)} disabled={row.status !== 'Pending'} onChange={() => toggle(row.id)} className="w-4 h-4 rounded border-gray-300 disabled:opacity-30"/></td><td className="px-4 py-3"><div className="flex items-center gap-1.5"><strong className="text-gray-900">{row.workerName}</strong>{row.auto && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700" title="Auto-generated from the worker ID card">AUTO</span>}</div><p className="font-mono text-[10px] text-gray-400 mt-0.5">{row.workerId}</p>{row.contact&&<p className="text-[10px] text-gray-400">{row.contact}</p>}</td><td className="px-4 py-3 text-gray-600">{row.contractor}</td><td className="px-4 py-3 text-gray-600">{row.site}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-semibold ${row.type === 'Permanent' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{row.type}</span></td><td className="px-4 py-3 text-gray-500">{row.requestedAt.slice(0, 10)}</td><td className="px-4 py-3 text-gray-500">{row.validFrom||'—'} → {row.validTo||'—'}</td><td className="px-4 py-3"><div className="flex gap-1 items-center"><Dot label="M" ok={elig?.medical === 'Done'} title="Medical examination"/><Dot label="H&S" ok={elig?.healthSafety === 'Done'} title="Health &amp; Safety (safety kit + safety training + site induction)"/><Dot label="C" ok={elig?.compliance === 'Done'} title="Compliance (Aadhaar + Bank + UAN + ESIC)"/></div></td><td className="px-4 py-3"><Status value={row.status}/></td><td className="px-4 py-3"><div className="flex gap-1.5"><button disabled={row.blocked} onClick={() => { void viewPass(row); }} className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><Eye size={12}/>View pass</button><button disabled={row.blocked} onClick={() => openEdit(row)} className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><Pencil size={12}/>Edit</button><button disabled={busy || row.dispatched} onClick={() => { void dispatch([row.id]); }} className={`h-8 px-3 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50 ${row.dispatched ? 'border-green-200 text-green-700 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}><Send size={12}/>{row.dispatched ? 'Dispatched' : 'Dispatch'}</button>{row.status === 'Expired' && <button disabled={busy} onClick={() => void renew(row)} className="h-8 px-3 rounded-lg border border-blue-200 text-[11px] font-semibold inline-flex items-center gap-1 text-blue-700 hover:bg-blue-50 disabled:opacity-50">Renew</button>}{row.status === 'Approved' && <button disabled={busy} onClick={() => void revoke(row)} className="h-8 px-3 rounded-lg border border-red-200 text-[11px] font-semibold inline-flex items-center gap-1 text-red-600 hover:bg-red-50 disabled:opacity-50">Revoke</button>}</div></td></tr>; })}{!rows.length && <tr><td colSpan={9} className="py-12 text-center text-gray-400">No gate pass requests in this view.</td></tr>}</tbody>
      </table></div>
    </section>

    {selected.length > 0 && <div className="fixed bottom-5 left-4 right-4 z-40"><div className="max-w-[760px] mx-auto bg-white border border-gray-200 shadow-2xl rounded-2xl p-3 pb-safe flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 grid place-items-center font-bold">{selected.length}</span><div><p className="text-sm font-semibold">{selected.length} selected</p><p className="text-[11px] text-gray-500">A confirmation dialog will be shown before updating.</p></div></div><div className="flex gap-2"><button disabled={busy} onClick={() => void dispatch(selected)} className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"><Send size={14}/>Dispatch Selected</button><button disabled={busy} onClick={() => setConfirm({ status:'Rejected' })} className="h-9 px-4 border border-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"><X size={14}/>Reject Selected</button><button disabled={busy} onClick={() => setConfirm({ status:'Approved' })} className="h-9 px-4 bg-[#073B67] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"><Check size={14}/>Approve Selected</button></div></div></div>}

    {confirm && <div className="fixed inset-0 z-[80] bg-black/50 p-4 grid place-items-center"><section role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl overflow-hidden">
      <header className="p-5 border-b border-gray-100 flex justify-between"><h2 className="font-semibold">{confirm.status === 'Approved' ? 'Approve gate pass' : 'Reject gate pass'}</h2><button onClick={() => setConfirm(null)} aria-label="Close"><X/></button></header>
      <div className="p-5"><p className="text-sm text-gray-700">{confirmText(confirm.status)}</p><p className={`text-[11px] mt-2 ${eligibleSummary(employer.gatePasses.filter(item => selected.includes(item.id) && isEligible(item)).length, selected.length).startsWith('0 of') ? 'text-amber-700' : 'text-green-700'}`}><ShieldCheck size={12} className="inline mr-1 -mt-0.5"/>{eligibleSummary(employer.gatePasses.filter(item => selected.includes(item.id) && isEligible(item)).length, selected.length)}.</p><p className="text-[11px] text-gray-400 mt-2">This decision is recorded against each selected request and synchronized through the Employer API.</p>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</div>
      <footer className="p-5 border-t border-gray-100 flex justify-end gap-2"><button type="button" onClick={() => setConfirm(null)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} onClick={() => decide(confirm.status)} className="h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-semibold disabled:opacity-50">{busy ? 'Updating…' : confirm.status === 'Approved' ? 'Approve selected' : 'Reject selected'}</button></footer>
    </section></div>}

    {editRow && <div className="fixed inset-0 z-[80] bg-black/50 p-4 grid place-items-center"><section role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl overflow-hidden">
      <header className="p-5 border-b border-gray-100 flex justify-between"><h2 className="font-semibold">Edit gate pass validity</h2><button onClick={() => setEditRow(null)} aria-label="Close"><X/></button></header>
      <div className="p-5 space-y-4">
        <p className="text-xs text-gray-500">{editRow.workerName} · {editRow.type} pass · {editRow.site}</p>
        <label className="block text-xs font-semibold text-gray-600">Issue / valid from<input type="date" value={editFrom} onChange={e => setEditFrom(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3"/></label>
        <label className="block text-xs font-semibold text-gray-600">Valid up to<input type="date" value={editTo} onChange={e => setEditTo(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3"/></label>
        <p className="text-[11px] text-gray-400">Defaults come from the worker&apos;s BSS ID card (Issue Date / Valid Till). Saved dates apply to the rendered gate pass.</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
      <footer className="p-5 border-t border-gray-100 flex justify-end gap-2"><button type="button" onClick={() => setEditRow(null)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} onClick={() => { void saveDates(); }} className="h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-semibold disabled:opacity-50">{busy ? 'Saving…' : 'Save dates'}</button></footer>
    </section></div>}

    {passPreview && <GatePassViewer html={passPreview.html} title={passPreview.title} onClose={() => setPassPreview(null)} />}
  </div>;
}

function Status({ value }: { value: EmployerGatePass['status'] }) { const tone = value === 'Approved' ? 'bg-green-50 text-green-700' : value === 'Rejected' ? 'bg-red-50 text-red-700' : value === 'Blocked' ? 'bg-gray-200 text-gray-700' : value === 'Expired' ? 'bg-amber-50 text-amber-700' : value === 'Revoked' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'; return <span className={`px-2 py-1 rounded text-[10px] font-semibold ${tone}`}>{value}</span>; }
function Dot({ label, ok, title }: { label:string; ok:boolean; title:string }) { return <span title={title} className={`inline-flex items-center justify-center min-w-6 h-5 px-1 rounded text-[9px] font-bold ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{label}{ok ? '✓' : '✗'}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Clock3; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
