"use client";

import { useCallback, useEffect, useState } from 'react';
import { Building2, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

type RegisterForm = {
  id: number; formCode: string; title: string;
  criticality?: string; templateType?: string;
  columns: string[]; adopted: boolean;
};
type StateBoard = {
  state: string; siteCount: number; adoptedCount: number;
  total: number; gated: boolean; forms: RegisterForm[];
};

function selectionFrom(boards: StateBoard[]): Record<string, number[]> {
  const map: Record<string, number[]> = {};
  for (const board of boards) map[board.state] = board.forms.filter(f => f.adopted).map(f => f.id);
  return map;
}

export default function ClraRegistersPage() {
  const [boards, setBoards] = useState<StateBoard[]>([]);
  const [active, setActive] = useState('');
  const [selection, setSelection] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/employer/register-templates', { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { states?:StateBoard[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'CLRA registers could not be loaded.');
      const next = body.states ?? [];
      setBoards(next);
      setSelection(selectionFrom(next));
      setActive(current => (current && next.some(board => board.state === current)) ? current : (next[0]?.state ?? ''));
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'CLRA registers could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial adoption board load
  useEffect(() => { void load(); }, [load]);

  const board = boards.find(item => item.state === active) ?? null;
  const selected = new Set(selection[active] ?? []);

  function toggle(formId: number) {
    if (!board) return;
    setSelection(current => {
      const ids = new Set(current[board.state] ?? []);
      if (ids.has(formId)) ids.delete(formId); else ids.add(formId);
      return { ...current, [board.state]: [...ids] };
    });
    setNotice('');
  }

  function selectAll(forms: RegisterForm[]) {
    if (!board) return;
    setSelection(current => ({ ...current, [board.state]: forms.map(form => form.id) }));
    setNotice('');
  }

  async function save() {
    if (!board) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/register-templates', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ state: board.state, templateIds: selection[board.state] ?? [] }),
      });
      const body = await response.json().catch(() => ({})) as { states?:StateBoard[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'The CLRA register adoption could not be saved.');
      const next = body.states ?? boards;
      setBoards(next);
      setSelection(selectionFrom(next));
      setNotice(`Saved — ${board.state} contractors now see these registers site-wise.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The CLRA register adoption could not be saved.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6 pb-12">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Governance controls</p>
      <h1 className="text-2xl font-bold mt-1">CLRA Registers</h1>
      <p className="text-sm text-gray-500 mt-1">Adopt the statutory CLRA registers per state. Once adopted, only those forms are made available to your contractors, site-wise.</p>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading CLRA registers…</p>
      : !boards.length ? <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <Building2 size={28} className="mx-auto text-gray-300"/>
          <p className="text-sm font-semibold text-gray-700 mt-3">No states available yet</p>
          <p className="text-xs text-gray-500 mt-1">States appear here once you have a registered site in that state. Add a site with its state to adopt CLRA registers.</p>
        </div>
      : <div className="grid lg:grid-cols-[320px_1fr] gap-5">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden h-fit">
          <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">States with your sites</h2><p className="text-xs text-gray-400 mt-0.5">Only states where you have a registered site.</p></header>
          <div className="divide-y divide-gray-100">{boards.map(item => <button key={item.state} type="button" onClick={() => setActive(item.state)} className={`w-full text-left px-5 py-3 flex items-center justify-between gap-3 ${item.state === active ? 'bg-[#073B67]/5' : 'hover:bg-gray-50'}`}>
            <div><p className={`text-sm font-semibold ${item.state === active ? 'text-[#073B67]' : 'text-gray-800'}`}>{item.state}</p><p className="text-[11px] text-gray-400">{item.siteCount} site{item.siteCount === 1 ? '' : 's'} · {item.adoptedCount} of {item.total} adopted</p></div>
            {item.gated ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Gated</span> : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Open</span>}
          </button>)}</div>
        </section>

        {board && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><ShieldCheck size={16} className="text-[#073B67]"/>{board.state} · applicable registers</h2><p className="text-xs text-gray-400 mt-0.5">Tick the forms to adopt. Contractors with a site in {board.state} will see only the ticked forms.</p></div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => selectAll(board.forms)} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600">Select all</button>
              <button type="button" onClick={() => selectAll([])} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600">Clear</button>
            </div>
          </header>
          {board.forms.length
            ? <div className="overflow-x-auto"><table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100"><tr><th className="px-5 py-3 w-14">Adopt</th><th className="px-5 py-3">Form</th><th className="px-5 py-3">Title</th><th className="px-5 py-3">Criticality</th><th className="px-5 py-3">Columns</th></tr></thead>
                <tbody className="divide-y divide-gray-100">{board.forms.map(form => <tr key={form.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3"><input type="checkbox" checked={selected.has(form.id)} onChange={() => toggle(form.id)} className="accent-[#073B67] w-4 h-4"/></td>
                  <td className="px-5 py-3 font-mono font-semibold text-[#073B67]">{form.formCode}</td>
                  <td className="px-5 py-3 text-gray-700">{form.title || '—'}</td>
                  <td className="px-5 py-3">{form.criticality ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${form.criticality === 'High' ? 'bg-red-50 text-red-700' : form.criticality === 'Medium' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{form.criticality}</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3 text-gray-500">{form.columns.length}</td>
                </tr>)}</tbody>
              </table></div>
            : <p className="p-5 text-xs text-gray-400">No CLRA register templates are configured for {board.state} yet.</p>}
          <footer className="px-5 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-gray-400">{selected.size} of {board.total} form{board.total === 1 ? '' : 's'} adopted{board.adoptedCount === 0 && selected.size === 0 ? ' — contracts see the full library until you adopt at least one' : ''}.</p>
            <button type="button" onClick={() => void save()} disabled={busy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><CheckCircle2 size={14}/>{busy ? 'Saving…' : 'Save adoption'}</button>
          </footer>
        </section>}
      </div>}
  </div>;
}
