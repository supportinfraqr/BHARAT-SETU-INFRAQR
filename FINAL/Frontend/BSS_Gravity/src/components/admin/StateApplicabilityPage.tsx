"use client";

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';

type ApplicabilityRow = { state:string; purpose:string; form:string; strengthRcPe:string; strengthLicence:string; lwf:string; hra:string; nhFh:string; ptFrequency:string };
type StateCodeRow = { state:string; code:string; isUnionTerritory:boolean; lwf:string; nhFh:string };
type FeeRow = { state:string; securityFee:string; govtFees:string };

export default function StateApplicabilityPage() {
  const [rows, setRows] = useState<ApplicabilityRow[]>([]);
  const [codes, setCodes] = useState<StateCodeRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [state, setState] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/state-applicability${state !== 'all' ? `?state=${encodeURIComponent(state)}` : ''}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { rows?:ApplicabilityRow[]; codes?:StateCodeRow[]; fees?:FeeRow[]; states?:string[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'The applicability matrix could not be loaded.');
      setRows(body.rows ?? []); setCodes(body.codes ?? []); setFees(body.fees ?? []);
      if (body.states) setStates(body.states);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The applicability matrix could not be loaded.'); }
    finally { setLoading(false); }
  }, [state]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- filter reload
  useEffect(() => { void load(); }, [load]);

  const filtered = query.trim()
    ? rows.filter(r => `${r.state} ${r.purpose} ${r.form}`.toLowerCase().includes(query.trim().toLowerCase()))
    : rows;

  const columns: DataColumn<ApplicabilityRow>[] = [
    { id:'state', header:'State / Region', value:r => r.state },
    { id:'purpose', header:'Purpose', value:r => r.purpose },
    { id:'form', header:'Applicable form', value:r => r.form, render:r => <span className={r.form.startsWith('FORM') ? 'font-mono text-xs font-semibold text-[#073B67]' : 'text-xs text-gray-400'}>{r.form || '—'}</span> },
    { id:'strength', header:'RC/PE · Licence', value:r => `${r.strengthRcPe} · ${r.strengthLicence}` },
    { id:'pt', header:'PT frequency', value:r => r.ptFrequency || '—' },
  ];

  return <div className="space-y-6 pb-10">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin · Masters</p>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">State Applicability</h1>
      <p className="text-sm text-gray-500 mt-1">The PAN-India CLRA matrix — which form applies for each purpose in each state, with the worker-strength thresholds that trigger registration / licensing.</p>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <div className="flex flex-wrap items-center gap-3">
      <label className="text-xs font-semibold text-gray-600">State
        <select value={state} onChange={e => setState(e.target.value)} className="ml-2 h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white"><option value="all">All states / regions</option>{states.map(s => <option key={s} value={s}>{s}</option>)}</select>
      </label>
      <label className="relative"><Search size={14} className="absolute left-3 top-2.5 text-gray-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search purpose or form…" className="h-9 rounded-lg border border-gray-200 pl-9 pr-3 text-xs w-64"/></label>
      <span className="text-xs text-gray-400">{filtered.length} row{filtered.length === 1 ? '' : 's'}</span>
    </div>

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading matrix…</p>
      : <EnterpriseDataTable title="CLRA applicability matrix" rows={filtered} columns={columns} rowKey={r => `${r.state}-${r.purpose}`} filename="clra-applicability"/>}

    <div className="grid lg:grid-cols-2 gap-5">
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">State &amp; UT codes</h2><p className="text-xs text-gray-400 mt-0.5">2-letter code + LWF / NH-FH applicability.</p></header>
        <div className="overflow-x-auto max-h-80"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-gray-500 uppercase tracking-wider"><tr><th className="px-5 py-2.5">State</th><th className="px-5 py-2.5">Code</th><th className="px-5 py-2.5">LWF</th><th className="px-5 py-2.5">NH/FH</th></tr></thead><tbody className="divide-y divide-gray-100">{codes.map(c => <tr key={c.state}><td className="px-5 py-2">{c.state}{c.isUnionTerritory && <span className="ml-2 text-[10px] text-gray-400">UT</span>}</td><td className="px-5 py-2 font-mono font-semibold text-[#073B67]">{c.code}</td><td className="px-5 py-2 text-gray-500">{c.lwf || '—'}</td><td className="px-5 py-2 text-gray-500">{c.nhFh || '—'}</td></tr>)}</tbody></table></div>
      </section>
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Security &amp; government fees</h2><p className="text-xs text-gray-400 mt-0.5">Per-state CLRA security fee per employee and government fees.</p></header>
        {fees.length
          ? <div className="overflow-x-auto max-h-80"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-gray-500 uppercase tracking-wider"><tr><th className="px-5 py-2.5">State</th><th className="px-5 py-2.5">Security fee / employee</th><th className="px-5 py-2.5">Govt fees</th></tr></thead><tbody className="divide-y divide-gray-100">{fees.map(f => <tr key={f.state}><td className="px-5 py-2">{f.state}</td><td className="px-5 py-2 text-gray-600">{f.securityFee || '—'}</td><td className="px-5 py-2 text-gray-600">{f.govtFees || '—'}</td></tr>)}</tbody></table></div>
          : <p className="p-5 text-xs text-gray-400">No fee data in the source matrix.</p>}
      </section>
    </div>
  </div>;
}
