"use client";

import { useMemo, useState } from 'react';
import { Banknote, CheckCircle2, FileText, Plus, Trash2, Upload, X, XCircle } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorBenefitRecord } from '@/types/portal';

type BenefitType = 'bonus' | 'leaveEncashment';
type RowDraft = { workerId:string; worker:string; period:string; amount:string; days:string; reason:string; paidOn:string };

export default function ContractorBenefitsPage() {
  const { contractor, replaceContractor, mutate, employerScope, scoped } = useContractor();
  const [tab, setTab] = useState<BenefitType>('bonus');
  const [modal, setModal] = useState<BenefitType | null>(null);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const records = scoped(contractor.workerBenefits[tab], r => r.employer);
  const title = tab === 'bonus' ? 'Bonus' : 'Leave Encashment';
  const columns: DataColumn<ContractorBenefitRecord>[] = useMemo(() => [
    { id:'worker', header:'Worker', value:row => row.worker, render:row => <div><strong className="text-gray-900">{row.worker}</strong><p className="font-mono text-[10px] text-gray-400">{row.workerId}</p></div> },
    { id:'period', header:'Period', value:row => row.period },
    ...(tab === 'leaveEncashment' ? [{ id:'days', header:'Days', value:row => row.days ?? '—' } as DataColumn<ContractorBenefitRecord>] : []),
    { id:'reason', header:'Reason', value:row => row.reason ?? '—' },
    { id:'amount', header:'Amount', value:row => row.amount, render:row => <strong className="text-gray-900">{money(row.amount)}</strong> },
    { id:'paid', header:'Paid on', value:row => row.paidOn },
    { id:'file', header:'Evidence', value:row => row.fileName ?? '—', filterable:false, render:row => row.fileName ? <span className="text-blue-700 font-semibold inline-flex items-center gap-1"><FileText size={12}/>View</span> : <span className="text-gray-400">—</span> },
    { id:'status', header:'Status', value:row => row.status, render:row => <span className={row.status === 'Verified' ? 'text-green-700' : row.status === 'Pending verification' ? 'text-orange-700' : 'text-red-700'}>{row.status}</span> },
  ], [tab]);

  const totals = useMemo(() => ({
    total: records.length,
    verified: records.filter(r => r.status === 'Verified').length,
    pending: records.filter(r => r.status === 'Pending verification').length,
    sum: records.reduce((s, r) => s + r.amount, 0),
  }), [records]);

  function addRow() { setRows(current => [...current, { workerId:'', worker:'', period:'', amount:'', days:'', reason:'', paidOn:'' }]); }
  function updateRow(index:number, key:keyof RowDraft, value:string) { setRows(current => current.map((row, i) => i === index ? { ...row, [key]:value } : row)); }
  function removeRow(index:number) { setRows(current => current.filter((_, i) => i !== index)); }

  async function uploadFile(workerId:string, site:string, period:string): Promise<string> {
    // Returns the stored file name from the shared upload service.
    const form = new FormData();
    form.append('type', 'Worker Benefits');
    form.append('site', site);
    form.append('period', period);
    const input = document.getElementById('benefits-file') as HTMLInputElement | null;
    if (!input?.files?.[0]) return '';
    form.append('file', input.files[0]);
    const response = await fetch('/api/portal/uploads', { method:'POST', body:form });
    const result = await response.json() as { data?: { fileName?: string }; error?: string };
    if (!response.ok || !result.data) throw new Error(result.error ?? 'Evidence could not be uploaded.');
    void workerId;
    return result.data.fileName ?? 'evidence.pdf';
  }

  async function submitSingle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const worker = contractor.workers.find(item => item.bssId === form.workerId);
    if (!worker) { setError('Select a worker assigned to this contractor.'); setBusy(false); return; }
    try {
      let fileName: string | undefined;
      if ((event.currentTarget.querySelector('#benefits-file') as HTMLInputElement)?.files?.[0]) fileName = await uploadFile(form.workerId, worker.site, form.period);
      const payload: Partial<ContractorBenefitRecord> = {
        worker: worker.name, workerId: worker.bssId, employer: worker.employer, period: form.period, paidOn: form.paidOn,
        amount: Number(form.amount), reason: form.reason || undefined, fileName, source: 'contractor',
      };
      if (form.days) payload.days = Number(form.days);
      const result = await mutate<{ data: ContractorBenefitRecord[] }>('benefits', 'POST', payload);
      const data = result.data[0];
      replaceContractor({ ...contractor, workerBenefits: { ...contractor.workerBenefits, [tab]: [data, ...contractor.workerBenefits[tab]] } });
      setNotice(`Added ${title} for ${worker.name}.`);
      setModal(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Record could not be saved.'); }
    finally { setBusy(false); }
  }

  async function submitBulk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const valid = rows.filter(row => row.workerId && row.amount);
    if (!valid.length) { setError('Add at least one complete row.'); setBusy(false); return; }
    try {
      const payload = valid.map(row => {
        const worker = contractor.workers.find(item => item.bssId === row.workerId);
        const record: Partial<ContractorBenefitRecord> = { worker: worker?.name ?? row.worker, workerId: row.workerId, employer: worker?.employer ?? '', period: row.period, paidOn: row.paidOn, amount: Number(row.amount), source: 'contractor' };
        if (row.days) record.days = Number(row.days);
        if (row.reason) record.reason = row.reason;
        return record;
      });
      const result = await mutate<{ data: ContractorBenefitRecord[] }>('benefits', 'POST', { bulk: payload });
      replaceContractor({ ...contractor, workerBenefits: { ...contractor.workerBenefits, [tab]: [...result.data, ...contractor.workerBenefits[tab]] } });
      setNotice(`Uploaded ${result.data.length} ${title} records.`);
      setRows([]);
      setModal(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Bulk upload could not be completed.'); }
    finally { setBusy(false); }
  }

  function importCsv(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const lines = text.split(/\r?\n/).filter(line => line.trim()).slice(0, 500);
      const parsed: RowDraft[] = lines.map(line => {
        const [workerId, worker, period, amount, days, reason, paidOn] = parseCsvLine(line);
        return { workerId: workerId?.trim() ?? '', worker: worker?.trim() ?? '', period: period?.trim() ?? '', amount: amount?.trim() ?? '', days: days?.trim() ?? '', reason: reason?.trim() ?? '', paidOn: paidOn?.trim() ?? '' };
      }).filter(row => row.workerId);
      setRows(parsed);
      setError('');
      if (!parsed.length) setError('No valid rows were found in the CSV. Expected: BSS ID, Worker Name, Period, Amount, Days, Reason, Paid On.');
    };
    reader.readAsText(file);
  }

  return <div className="space-y-6">
    <header className="flex flex-col sm:flex-row justify-between gap-4"><div><h1 className="text-xl font-bold">Worker Benefits — Bonus & Leave Encashment</h1><p className="text-sm text-gray-500 mt-1">Fill and upload worker benefit records. Government-verifiable data (EPFO UAN / PF) is autofetched; Bonus and Leave Encashment are supplied here by your organisation.</p></div></header>
    <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-3 text-xs"><strong>Source of record:</strong> Bonus and Leave Encashment are filled and uploaded by the contractor. PF contributions under the worker UAN are autofetched from the EPFO government API when connected. Showing records for <strong>{employerScope === 'all' ? 'All Employers' : employerScope}</strong>.</div>

    <div className="flex border-b">{(['bonus','leaveEncashment'] as const).map(value => <button key={value} onClick={() => { setTab(value); setError(''); setNotice(''); }} className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab === value ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500'}`}>{value === 'bonus' ? 'Bonus' : 'Leave Encashment'}</button>)}</div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Records" value={totals.total} icon={FileText} tone="bg-blue-50 text-blue-700"/><Metric label="Verified" value={totals.verified} icon={CheckCircle2} tone="bg-green-50 text-green-700"/><Metric label="Pending verification" value={totals.pending} icon={XCircle} tone="bg-orange-50 text-orange-700"/><Metric label="Recorded total" value={money(totals.sum)} icon={Banknote} tone="bg-emerald-50 text-emerald-700"/></div>

    {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}
    {error && !modal && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}

    <div className="flex flex-wrap gap-2">
      <button onClick={() => { setModal(tab); setMode('single'); setError(''); }} className="h-10 px-4 bg-gray-950 text-white rounded-lg text-sm font-semibold flex gap-2 items-center"><Plus size={16}/>Add single record</button>
      <button onClick={() => { setModal(tab); setMode('bulk'); setRows([{ workerId:'', worker:'', period:'', amount:'', days:'', reason:'', paidOn:'' }]); setError(''); }} className="h-10 px-4 border border-gray-200 rounded-lg text-sm font-semibold flex gap-2 items-center"><Upload size={16}/>Bulk upload</button>
    </div>

    <EnterpriseDataTable title={`${title} register`} rows={records} columns={columns} rowKey={row => row.id} filename={`contractor-${tab}`}/>

    {modal && <div className="fixed inset-0 z-[80] bg-black/50 p-4 grid place-items-center"><section role="dialog" aria-modal="true" className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden">
      <header className="p-5 border-b border-gray-100 flex justify-between items-center"><div><h2 className="font-semibold text-sm">{mode === 'single' ? `Add ${title} record` : `Bulk upload ${title} records`}</h2><p className="text-xs text-gray-500 mt-1">{mode === 'single' ? 'Fill the worker benefit record below.' : 'Add rows or import a CSV. Errors are rejected before saving.'}</p></div><button onClick={() => setModal(null)} aria-label="Close"><X/></button></header>
      <div className="p-5 overflow-x-auto">{mode === 'single'
        ? <form onSubmit={submitSingle} className="grid sm:grid-cols-2 gap-4">
            <label className="text-xs font-semibold">Worker<select required name="workerId" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm"><option value="">Select worker</option>{contractor.workers.map(w => <option key={w.id} value={w.bssId}>{w.name} · {w.bssId}</option>)}</select></label>
            <label className="text-xs font-semibold">Period<select required name="period" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm"><option value="">Select period</option>{['August 2026','July 2026','June 2026','May 2026'].map(p => <option key={p}>{p}</option>)}</select></label>
            <label className="text-xs font-semibold">Amount (₹)<input required name="amount" type="number" min="0" step="1" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>
            {tab === 'leaveEncashment' && <label className="text-xs font-semibold">Days encashed<input required name="days" type="number" min="0" max="365" step="1" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>}
            <label className="text-xs font-semibold">Reason<input name="reason" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>
            <label className="text-xs font-semibold">Paid on<input required name="paidOn" type="date" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>
            <label className="text-xs font-semibold">Evidence (optional)<input id="benefits-file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" className="mt-1 w-full text-sm"/></label>
            {error && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{error}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">{busy ? 'Saving…' : 'Save record'}</button></div>
          </form>
        : <div className="space-y-4">
            <div className="flex flex-wrap gap-2"><label className="text-xs font-semibold text-gray-600 flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 cursor-pointer">Import CSV <input type="file" accept=".csv" className="hidden" onChange={e => importCsv(e.target.files?.[0])}/></label><button type="button" onClick={addRow} className="h-9 px-3 border border-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1"><Plus size={14}/>Add row</button></div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <form onSubmit={submitBulk} className="space-y-3">
              <div className="min-w-[760px]"><div className="grid grid-cols-[minmax(170px,1.4fr)_160px_110px_90px_150px_150px_36px] gap-2 text-[11px] uppercase text-gray-500 font-bold px-1">Worker·Period·Amount·Days·Reason·Paid on·</div>
                {rows.map((row, index) => <div key={index} className="grid grid-cols-[minmax(170px,1.4fr)_160px_110px_90px_150px_150px_36px] gap-2 items-center mt-2">
                  <select value={row.workerId} onChange={e => { updateRow(index, 'workerId', e.target.value); const w = contractor.workers.find(item => item.bssId === e.target.value); updateRow(index, 'worker', w?.name ?? ''); }} className="h-9 border border-gray-200 rounded-lg px-2 text-xs bg-white"><option value="">Worker</option>{contractor.workers.map(w => <option key={w.id} value={w.bssId}>{w.name}</option>)}</select>
                  <input value={row.period} onChange={e => updateRow(index, 'period', e.target.value)} placeholder="Period" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                  <input value={row.amount} onChange={e => updateRow(index, 'amount', e.target.value)} type="number" min="0" placeholder="₹" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                  <input value={row.days} onChange={e => updateRow(index, 'days', e.target.value)} type="number" min="0" placeholder="Days" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                  <input value={row.reason} onChange={e => updateRow(index, 'reason', e.target.value)} placeholder="Reason" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
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
  const out: string[] = [];
  let cur = '', inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === ',' && !inQuotes) { out.push(cur); cur = ''; continue; }
    cur += char;
  }
  out.push(cur);
  return out;
}
function money(value:number){ return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value); }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number | string; icon:typeof FileText; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
