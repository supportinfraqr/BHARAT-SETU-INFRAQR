"use client";

import { useMemo, useRef, useState } from 'react';
import { FileText, IndianRupee, Plus, Trash2, Upload, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import AdvanceRequests from '@/components/contractor/AdvanceRequests';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorSalaryRecord } from '@/types/portal';

type RowDraft = { workerId:string; worker:string; period:string; gross:string; deductions:string; paidOn:string };

export default function ContractorSalariesPage() {
  const { contractor, replaceContractor, mutate, scoped } = useContractor();
  const [modal, setModal] = useState<'single' | 'bulk' | null>(null);
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const records = scoped(contractor.salaries, r => r.employer);
  const columns: DataColumn<ContractorSalaryRecord>[] = useMemo(() => [
    { id:'worker', header:'Worker', value:row => row.worker, render:row => <div><strong className="text-gray-900">{row.worker}</strong><p className="font-mono text-[10px] text-gray-400">{row.workerId}</p></div> },
    { id:'employer', header:'Employer', value:row => row.employer },
    { id:'site', header:'Site', value:row => row.site },
    { id:'period', header:'Period', value:row => row.period },
    { id:'gross', header:'Gross', value:row => row.gross, render:row => money(row.gross) },
    { id:'deductions', header:'Deductions', value:row => row.deductions, render:row => `− ${money(row.deductions)}` },
    { id:'net', header:'Net', value:row => row.net, render:row => <strong className="text-gray-900">{money(row.net)}</strong> },
    { id:'paid', header:'Paid on', value:row => row.paidOn },
    { id:'file', header:'Proof', value:row => row.fileName ?? '—', filterable:false, render:row => row.fileName ? <span className="text-blue-700 font-semibold inline-flex items-center gap-1"><FileText size={12}/>View</span> : <span className="text-gray-400">—</span> },
    { id:'status', header:'Status', value:row => row.status, render:row => <span className={row.status === 'Verified' ? 'text-green-700' : row.status === 'Pending verification' ? 'text-orange-700' : 'text-red-700'}>{row.status}</span> },
  ], []);

  const totals = useMemo(() => ({
    total: records.length,
    net: records.reduce((s, r) => s + r.net, 0),
    gross: records.reduce((s, r) => s + r.gross, 0),
  }), [records]);

  function addRow() { setRows(current => [...current, { workerId:'', worker:'', period:'', gross:'', deductions:'', paidOn:'' }]); }
  function updateRow(index:number, key:keyof RowDraft, value:string) { setRows(current => current.map((row, i) => i === index ? { ...row, [key]:value } : row)); }
  function removeRow(index:number) { setRows(current => current.filter((_, i) => i !== index)); }
  function netOf(row: RowDraft) { const g = Number(row.gross) || 0; const d = Number(row.deductions) || 0; return Math.max(0, g - d); }

  async function uploadFile(workerId:string, site:string, period:string): Promise<string> {
    const input = fileInput.current;
    if (!input?.files?.[0]) return '';
    const form = new FormData();
    form.append('type', 'Salary / Wage');
    form.append('site', site);
    form.append('period', period);
    form.append('file', input.files[0]);
    const response = await fetch('/api/portal/uploads', { method:'POST', body:form });
    const result = await response.json() as { data?: { fileName?: string }; error?: string };
    if (!response.ok || !result.data) throw new Error(result.error ?? 'Proof could not be uploaded.');
    void workerId;
    return result.data.fileName ?? 'wage-slip.pdf';
  }

  async function submitSingle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const worker = contractor.workers.find(item => item.bssId === form.workerId);
    if (!worker) { setError('Select a worker bound to this contractor.'); setBusy(false); return; }
    try {
      let fileName: string | undefined;
      if (fileInput.current?.files?.[0]) fileName = await uploadFile(form.workerId, worker.site, form.period);
      const payload: Partial<ContractorSalaryRecord> = {
        worker: worker.name, workerId: worker.bssId, employer: worker.employer, site: worker.site,
        period: form.period, gross: Number(form.gross), deductions: Number(form.deductions), net: Number(form.gross) - Number(form.deductions),
        paidOn: form.paidOn, fileName, source: 'contractor',
      };
      const result = await mutate<{ data: ContractorSalaryRecord[] }>('salaries', 'POST', payload);
      replaceContractor({ ...contractor, salaries: [result.data[0], ...contractor.salaries] });
      setNotice(`Added salary for ${worker.name}.`); setModal(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Salary could not be saved.'); }
    finally { setBusy(false); }
  }

  async function submitBulk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    const valid = rows.filter(row => row.workerId && row.gross);
    if (!valid.length) { setError('Add at least one complete row.'); setBusy(false); return; }
    try {
      const payload = valid.map(row => {
        const worker = contractor.workers.find(item => item.bssId === row.workerId);
        return { worker: worker?.name ?? row.worker, workerId: row.workerId, employer: worker?.employer ?? '', site: worker?.site ?? '', period: row.period, gross: Number(row.gross), deductions: Number(row.deductions), net: netOf(row), paidOn: row.paidOn, source: 'contractor' };
      });
      const result = await mutate<{ data: ContractorSalaryRecord[] }>('salaries', 'POST', { bulk: payload });
      replaceContractor({ ...contractor, salaries: [...result.data, ...contractor.salaries] });
      setNotice(`Uploaded ${result.data.length} salary records.`); setRows([]); setModal(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Bulk upload could not be completed.'); }
    finally { setBusy(false); }
  }

  function importCsv(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const lines = text.split(/\r?\n/).filter(line => line.trim()).slice(0, 500);
      const parsed = lines.map(line => { const [workerId, period, gross, deductions, paidOn] = parseCsvLine(line); return { workerId: workerId?.trim() ?? '', worker: '', period: period?.trim() ?? '', gross: gross?.trim() ?? '', deductions: deductions?.trim() ?? '', paidOn: paidOn?.trim() ?? '' }; }).filter(row => row.workerId);
      setRows(current => [...current, ...parsed]); setError('');
      if (!parsed.length) setError('No valid rows found. Expected: Worker BSS ID, Period, Gross, Deductions, Paid On.');
    };
    reader.readAsText(file);
  }

  return <div className="relative space-y-6">
    <div aria-hidden className="pointer-events-none select-none absolute inset-0 z-20 overflow-hidden">
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-x-20 gap-y-28 -rotate-[24deg] scale-[1.6]">
        {Array.from({ length: 14 }).map((_, i) => <span key={i} className="text-2xl sm:text-3xl font-black uppercase tracking-[0.28em] text-black/5 whitespace-nowrap">Under Development</span>)}
      </div>
    </div>

    <header className="flex flex-col sm:flex-row justify-between gap-4"><div><h1 className="text-2xl font-bold">Salary & Wages</h1><p className="text-sm text-gray-500 mt-1">Record and submit employer-wise wage details for bound workers.</p></div></header>
    <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-3 text-xs">Salary details are filled and submitted by the contractor for each bound worker and employer.</div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Records" value={totals.total} icon={FileText} tone="bg-blue-50 text-blue-700"/><Metric label="Gross recorded" value={money(totals.gross)} icon={IndianRupee} tone="bg-emerald-50 text-emerald-700"/><Metric label="Net paid" value={money(totals.net)} icon={IndianRupee} tone="bg-green-50 text-green-700"/><Metric label="Net of all entries" value={money(totals.net)} icon={IndianRupee} tone="bg-orange-50 text-orange-700"/></div>

    {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}
    {error && !modal && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}

    <AdvanceRequests />

    <div className="flex flex-wrap gap-2">
      <button onClick={() => { setModal('single'); setError(''); }} className="h-10 px-4 bg-gray-950 text-white rounded-lg text-sm font-semibold flex gap-2 items-center"><Plus size={16}/>Add salary record</button>
      <button onClick={() => { setModal('bulk'); setRows([{ workerId:'', worker:'', period:'', gross:'', deductions:'', paidOn:'' }]); setError(''); }} className="h-10 px-4 border border-gray-200 rounded-lg text-sm font-semibold flex gap-2 items-center"><Upload size={16}/>Bulk upload</button>
    </div>

    <EnterpriseDataTable title="Salary register" rows={records} columns={columns} rowKey={row => row.id} filename="contractor-salaries"/>

    {modal && <div className="fixed inset-0 z-[80] bg-black/50 p-4 grid place-items-center"><section role="dialog" aria-modal="true" className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden">
      <header className="p-5 border-b border-gray-100 flex justify-between items-center"><div><h2 className="font-semibold text-sm">{modal === 'single' ? 'Add salary record' : 'Bulk upload salary records'}</h2><p className="text-xs text-gray-500 mt-1">{modal === 'single' ? 'Fill wage details for one worker.' : 'Add rows or import a CSV. Net is computed as Gross − Deductions.'}</p></div><button onClick={() => setModal(null)} aria-label="Close"><X/></button></header>
      <div className="p-5 overflow-x-auto">
        {modal === 'single'
          ? <form onSubmit={submitSingle} className="grid sm:grid-cols-2 gap-4">
              <label className="text-xs font-semibold">Worker<select required name="workerId" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm"><option value="">Select worker</option>{contractor.workers.map(w => <option key={w.id} value={w.bssId}>{w.name} · {w.bssId}</option>)}</select></label>
              <label className="text-xs font-semibold">Period<select required name="period" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm"><option value="">Select period</option>{['August 2026','July 2026','June 2026','May 2026'].map(p => <option key={p}>{p}</option>)}</select></label>
              <label className="text-xs font-semibold">Gross wage (₹)<input required name="gross" type="number" min="0" step="1" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>
              <label className="text-xs font-semibold">Deductions (₹)<input required name="deductions" type="number" min="0" step="1" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>
              <label className="text-xs font-semibold">Paid on<input required name="paidOn" type="date" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>
              <label className="text-xs font-semibold">Wage slip (optional)<input ref={fileInput} name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" className="mt-1 w-full text-sm"/></label>
              {error && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{error}</p>}
              <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">{busy ? 'Saving…' : 'Save record'}</button></div>
            </form>
          : <div className="space-y-4">
              <div className="flex flex-wrap gap-2"><label className="text-xs font-semibold text-gray-600 flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 cursor-pointer">Import CSV <input type="file" accept=".csv" className="hidden" onChange={e => importCsv(e.target.files?.[0])}/></label><button type="button" onClick={addRow} className="h-9 px-3 border border-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1"><Plus size={14}/>Add row</button></div>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <form onSubmit={submitBulk} className="space-y-3">
                <div className="min-w-[720px]"><div className="grid grid-cols-[minmax(170px,1.3fr)_150px_120px_120px_150px_30px] gap-2 text-[11px] uppercase text-gray-500 font-bold px-1">Worker·Period·Gross·Deductions·Paid on·</div>
                  {rows.map((row, index) => <div key={index} className="grid grid-cols-[minmax(170px,1.3fr)_150px_120px_120px_150px_30px] gap-2 items-center mt-2">
                    <select value={row.workerId} onChange={e => { updateRow(index, 'workerId', e.target.value); const w = contractor.workers.find(item => item.bssId === e.target.value); updateRow(index, 'worker', w?.name ?? ''); }} className="h-9 border border-gray-200 rounded-lg px-2 text-xs bg-white"><option value="">Worker</option>{contractor.workers.map(w => <option key={w.id} value={w.bssId}>{w.name}</option>)}</select>
                    <input value={row.period} onChange={e => updateRow(index, 'period', e.target.value)} placeholder="Period" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                    <input value={row.gross} onChange={e => updateRow(index, 'gross', e.target.value)} type="number" min="0" placeholder="Gross" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                    <input value={row.deductions} onChange={e => updateRow(index, 'deductions', e.target.value)} type="number" min="0" placeholder="Deduct" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                    <input value={row.paidOn} onChange={e => updateRow(index, 'paidOn', e.target.value)} type="date" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                    <button type="button" onClick={() => removeRow(index)} className="w-8 h-9 grid place-items-center text-gray-400 hover:text-red-600" aria-label="Remove row"><Trash2 size={15}/></button>
                  </div>)}
                </div>
                <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">{busy ? 'Uploading…' : `Upload ${rows.length} record${rows.length === 1 ? '' : 's'}`}</button></div>
              </form>
            </div>}
      </div>
    </section></div>}
  </div>;
}

function parseCsvLine(line:string): string[] {
  const out: string[] = []; let cur = '', inQuotes = false;
  for (const char of line) { if (char === '"') { inQuotes = !inQuotes; continue; } if (char === ',' && !inQuotes) { out.push(cur); cur = ''; continue; } cur += char; }
  out.push(cur); return out;
}
function money(value:number){ return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value); }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number | string; icon:typeof FileText; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
