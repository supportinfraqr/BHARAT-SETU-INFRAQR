"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';

type ApplicabilityRow = { state:string; purpose:string; form:string; strengthRcPe:string; strengthLicence:string; lwf:string; hra:string; nhFh:string; ptFrequency:string };
type StateCodeRow = { state:string; code:string; isUnionTerritory:boolean; lwf:string; nhFh:string };
type FeeRow = { state:string; securityFee:string; govtFees:string };

const SPECIAL = /^(N\/?A|N\.?A\.?|OMITTED|NO CHANGE|NEW FORM|NO FORMAT|NOT APPLICABLE)$/i;

function CellBadge({ text }: { text: string }) {
  const value = text.trim();
  const lower = value.toLowerCase();
  let tone = 'bg-gray-100 text-gray-500';
  let label = value;
  if (lower.startsWith('n/a') || lower === 'n.a' || lower === 'na' || lower === 'n') { tone = 'bg-red-50 text-red-600'; label = 'N/A'; }
  else if (lower.includes('omitt')) { tone = 'bg-amber-50 text-amber-700'; label = 'Omitted'; }
  else if (lower.includes('no change')) { tone = 'bg-blue-50 text-blue-700'; label = 'No change'; }
  else if (lower.includes('new form')) { tone = 'bg-violet-50 text-violet-700'; label = value; }
  else if (lower.includes('no format')) { tone = 'bg-amber-50 text-amber-700'; label = 'No official format'; }
  return <span className={`inline-block whitespace-nowrap text-[10px] font-bold px-1.5 py-0.5 rounded ${tone}`}>{label}</span>;
}

function MatrixCell({ value }: { value: string }) {
  const text = (value || '').trim();
  if (!text) return <span className="text-gray-300">—</span>;
  if (SPECIAL.test(text)) return <CellBadge text={text}/>;
  if (/^form\b/i.test(text) || text.toUpperCase().startsWith('FORM')) {
    return <span className="font-mono text-[11px] font-semibold text-[#073B67] whitespace-nowrap">{text}</span>;
  }
  if (text.length > 18) return <CellBadge text={text}/>;
  return <span className="text-sm text-gray-800">{text}</span>;
}

export default function StateApplicabilityPage() {
  const [rows, setRows] = useState<ApplicabilityRow[]>([]);
  const [codes, setCodes] = useState<StateCodeRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [state, setState] = useState('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'matrix' | 'list'>('matrix');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/state-applicability${state !== 'all' ? `?state=${encodeURIComponent(state)}` : ''}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { rows?:ApplicabilityRow[]; codes?:StateCodeRow[]; fees?:FeeRow[]; states?:string[]; purposes?:string[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'The applicability matrix could not be loaded.');
      setRows(body.rows ?? []); setCodes(body.codes ?? []); setFees(body.fees ?? []);
      if (body.states) setStates(body.states);
      if (body.purposes) setPurposes(body.purposes);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The applicability matrix could not be loaded.'); }
    finally { setLoading(false); }
  }, [state]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- filter reload
  useEffect(() => { void load(); }, [load]);

  // Order states like the Excel's first header row: by their 2-letter code,
  // then any matrix-only states (Central / New Forms Central) appended.
  const columns = useMemo(() => {
    const byCode = [...codes].sort((a, b) => a.code.localeCompare(b.code)).map(c => ({ state: c.state, code: c.code }));
    const seen = new Set(byCode.map(s => s.state));
    for (const s of states) if (!seen.has(s)) byCode.push({ state: s, code: s.slice(0, 2).toUpperCase() });
    return byCode;
  }, [codes, states]);

  const purposeList = useMemo(() => {
    let list = purposes;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(p => p.toLowerCase().includes(q));
    return list;
  }, [purposes, query]);

  const cellMap = useMemo(() => {
    const map = new Map<string, ApplicabilityRow>();
    for (const r of rows) map.set(`${r.state}||${r.purpose}`, r);
    return map;
  }, [rows]);

  const strengthMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.strengthRcPe && !map.has(r.state)) map.set(r.state, `${r.strengthRcPe}`);
    }
    return map;
  }, [rows]);

  const filteredList = query.trim()
    ? rows.filter(r => `${r.state} ${r.purpose} ${r.form}`.toLowerCase().includes(query.trim().toLowerCase()))
    : rows;

  const listColumns: DataColumn<ApplicabilityRow>[] = [
    { id:'state', header:'State / Region', value:r => r.state },
    { id:'purpose', header:'Purpose', value:r => r.purpose },
    { id:'form', header:'Applicable form', value:r => r.form, render:r => (r.form ? <MatrixCell value={r.form}/> : <span className="text-gray-300">—</span>) },
    { id:'strength', header:'RC/PE · Licence', value:r => `${r.strengthRcPe} · ${r.strengthLicence}` },
    { id:'pt', header:'PT frequency', value:r => r.ptFrequency || '—' },
  ];

  return <div className="space-y-6 pb-10">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin · CLRA Registers</p>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">State Applicability</h1>
      <p className="text-sm text-gray-500 mt-1">The PAN-India CLRA matrix from the State-wise form workbook — which form applies for each purpose in each state, with the worker-strength thresholds that trigger registration / licensing.</p>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {(['matrix', 'list'] as const).map(v => <button key={v} type="button" onClick={() => setView(v)} className={`px-3 h-9 text-xs font-bold ${view === v ? 'bg-[#073B67] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{v === 'matrix' ? 'Matrix' : 'List'}</button>)}
      </div>
      <label className="text-xs font-semibold text-gray-600">State
        <select value={state} onChange={e => setState(e.target.value)} className="ml-2 h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white"><option value="all">All states / regions</option>{states.map(s => <option key={s} value={s}>{s}</option>)}</select>
      </label>
      <label className="relative"><Search size={14} className="absolute left-3 top-2.5 text-gray-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={view === 'matrix' ? 'Search purpose…' : 'Search purpose or form…'} className="h-9 rounded-lg border border-gray-200 pl-9 pr-3 text-xs w-64"/></label>
      <span className="text-xs text-gray-400">{view === 'matrix' ? `${columns.length} states · ${purposeList.length} purposes` : `${filteredList.length} row${filteredList.length === 1 ? '' : 's'}`}</span>
    </div>

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading matrix…</p>
      : view === 'list'
        ? <EnterpriseDataTable title="CLRA applicability matrix" rows={filteredList} columns={listColumns} rowKey={r => `${r.state}-${r.purpose}`} filename="clra-applicability"/>
        : <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="border-collapse text-left text-[11px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 z-20 bg-gray-50 px-3 py-2.5 font-bold text-gray-600 uppercase tracking-wider min-w-[200px]">Purpose / Form</th>
                  {columns.map(col => <th key={col.state} title={col.state} className="px-2 py-2.5 text-center">
                    <span className="font-mono font-bold text-[#073B67]">{col.code}</span>
                    <span className="block font-medium text-gray-400 normal-case tracking-normal max-w-[7rem] truncate">{col.state}</span>
                  </th>)}
                </tr>
                <tr className="bg-[#F7F9FC] border-b border-gray-200">
                  <th className="sticky left-0 z-20 bg-[#F7F9FC] px-3 py-1.5 text-gray-400 font-semibold">Strength (RC/PE)</th>
                  {columns.map(col => <td key={col.state} className="px-2 py-1.5 text-center text-[10px] text-gray-500">{strengthMap.get(col.state) || '—'}</td>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purposeList.map(purpose => (
                  <tr key={purpose} className="hover:bg-gray-50/60">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 min-w-[200px]">{purpose}</td>
                    {columns.map(col => {
                      const row = cellMap.get(`${col.state}||${purpose}`);
                      return <td key={`${col.state}-${purpose}`} className="px-2 py-1.5 text-center align-middle">{row ? <MatrixCell value={row.form}/> : <span className="text-gray-300">—</span>}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}

    <div className="grid lg:grid-cols-2 gap-5 mt-6">
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