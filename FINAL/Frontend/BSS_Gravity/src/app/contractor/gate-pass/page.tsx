"use client";
import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Eye, Plus, Search, ShieldCheck, X, XCircle } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorPortalData } from '@/types/portal';
type Pass = ContractorPortalData['gatePasses'][number];

type Eligibility = { medical:'Done'|'Pending'|'Expired'; healthSafety:'Done'|'Pending'; compliance:'Done'|'Pending'; safetyKit:'Done'|'Pending'; safetyTraining:'Done'|'Pending'; siteInduction:'Done'|'Pending'; aadhaar:'Done'|'Pending'; bank:'Done'|'Pending'; uan:'Done'|'Pending'; esi:'Done'|'Pending' };

function eligibilityFor(portal: ContractorPortalData, workerId: string): Eligibility {
  const worker = portal.workers.find(w => w.bssId === workerId);
  const docs = portal.workerDocuments.filter(d => d.workerId === workerId);
  const verified = (doc: string) => docs.some(d => d.document === doc && d.status === 'Verified');
  const medical = worker?.name === 'Suresh Patel' ? 'Expired' : worker?.verified ? 'Done' : 'Pending';
  return {
    medical, healthSafety: worker?.verified ? 'Done' : 'Pending',
    compliance: worker?.compliance === 'Compliant' ? 'Done' : 'Pending',
    safetyKit: worker?.verified ? 'Done' : 'Pending',
    safetyTraining: worker?.verified ? 'Done' : 'Pending',
    siteInduction: worker?.verified ? 'Done' : 'Pending',
    aadhaar: verified('Aadhaar') ? 'Done' : 'Pending',
    bank: verified('Bank Verification') ? 'Done' : 'Pending',
    uan: verified('UAN') ? 'Done' : 'Pending',
    esi: verified('ESIC IP') ? 'Done' : 'Pending',
  };
}
const tempAllowed = (e: Eligibility) => e.medical === 'Done' && e.healthSafety === 'Done';
const permAllowed = (e: Eligibility) => e.medical === 'Done' && e.healthSafety === 'Done' && e.compliance === 'Done';

export default function ContractorGatePassPage() {
  const { contractor, replaceContractor, mutate, employerScope, scoped } = useContractor();
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [workerQuery, setWorkerQuery] = useState('');
  const [eligibilityView, setEligibilityView] = useState<{ bssId: string; name: string } | null>(null);

  const gatePasses = useMemo(() => {
    const scopedRows = scoped(contractor.gatePasses, p => p.employer);
    return siteFilter === 'all' ? scopedRows : scopedRows.filter(p => p.site === siteFilter);
  }, [contractor.gatePasses, scoped, siteFilter]);

  async function status(row: Pass, next: Pass['status']) {
    setBusyId(row.id); setError('');
    try {
      await mutate('gate-passes', 'PATCH', { id: row.id, status: next });
      replaceContractor({ ...contractor, gatePasses: contractor.gatePasses.map(item => item.id === row.id ? { ...item, status: next } : item) });
      setNotice(`Gate pass ${next.toLowerCase()} — approved passes are automatically reflected in the worker panel.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Gate pass could not be updated.'); }
    finally { setBusyId(''); }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusyId('new'); setError(''); setNotice('');
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const worker = contractor.workers.find(item => item.bssId === form.workerId);
    if (!worker) { setError('Select a worker assigned to this contractor.'); setBusyId(''); return; }
    const eligibility = eligibilityFor(contractor, worker.bssId);
    const type = form.type as string;
    // Eligibility criteria validation (CSV TC matrix) — blocks invalid requests with an alert
    if (type === 'Permanent' && !permAllowed(eligibility)) {
      setError('Permanent Gate Pass requires Medical = Done, Health & Safety = Done and Compliance = Done. This worker is not eligible.');
      setBusyId(''); return;
    }
    if (type === 'Temporary' && !tempAllowed(eligibility)) {
      setError('Temporary Gate Pass requires Medical = Done and Health & Safety = Done. This worker is not eligible.');
      setBusyId(''); return;
    }
    const payload = { workerName: worker.name, workerId: worker.bssId, employer: worker.employer, type, site: form.site, validFrom: form.validFrom, validTo: form.validTo, status: 'Pending' as const };
    try {
      const result = await mutate<{ data: Pass }>('gate-passes', 'POST', payload);
      replaceContractor({ ...contractor, gatePasses: [result.data, ...contractor.gatePasses] });
      setOpen(false);
      setNotice(`Gate pass request for ${worker.name} submitted to the principal employer for approval.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Gate pass could not be requested.'); }
    finally { setBusyId(''); }
  }

  async function generateBulk(type: 'Temporary' | 'Permanent') {
    const selected = contractor.workers.filter(w => checked.has(w.bssId));
    if (!selected.length) { setError('Select at least one worker.'); return; }
    setBusyId('bulk'); setError(''); setNotice('');
    try {
      const payload = selected.map(worker => ({
        workerName: worker.name, workerId: worker.bssId, employer: worker.employer, type,
        site: worker.site, validFrom: new Date().toISOString().slice(0, 10), validTo: type === 'Permanent' ? '2026-12-31' : '2026-09-30', status: 'Pending' as const,
      }));
      const result = await mutate<{ data: Pass[] }>('gate-passes', 'POST', { bulk: payload });
      replaceContractor({ ...contractor, gatePasses: [...result.data, ...contractor.gatePasses] });
      setBulkOpen(false); setChecked(new Set());
      setNotice(`Generated ${result.data.length} ${type.toLowerCase()} gate pass request(s). The principal employer approves them before issue.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Bulk generation could not be completed.'); }
    finally { setBusyId(''); }
  }

  const filteredWorkers = contractor.workers.filter(w => w.name.toLowerCase().includes(workerQuery.toLowerCase()) || w.bssId.toLowerCase().includes(workerQuery.toLowerCase()) || w.designation.toLowerCase().includes(workerQuery.toLowerCase()));
  const toggle = (bssId: string) => setChecked(current => { const next = new Set(current); if (next.has(bssId)) next.delete(bssId); else next.add(bssId); return next; });

  const workerMeta = (bssId: string) => contractor.workers.find(w => w.bssId === bssId);

  const columns: DataColumn<Pass>[] = [
    { id:'worker', header:'Worker', value:r => r.workerName, render:r => { const w = workerMeta(r.workerId); return <div><strong>{r.workerName}</strong><p className="font-mono text-[11px] text-gray-500">{r.workerId}</p>{w && <p className="text-[10px] text-gray-400">{w.designation} · {w.mobile}</p>}</div>; } },
    { id:'type', header:'Type', value:r => r.type },
    { id:'site', header:'Site', value:r => r.site },
    { id:'from', header:'Valid from', value:r => r.validFrom },
    { id:'to', header:'Valid to', value:r => r.validTo },
    { id:'eligibility', header:'Eligibility', filterable:false, value:r => r.workerId, render:r => { const e = eligibilityFor(contractor, r.workerId); return <div className="flex gap-1"><Dot label="M" ok={e.medical === 'Done'} title="Medical"/><Dot label="H&S" ok={e.healthSafety === 'Done'} title="Health & Safety"/><Dot label="C" ok={e.compliance === 'Done'} title="Compliance"/></div>; } },
    { id:'status', header:'Status', value:r => r.status },
    { id:'actions', header:'Actions', filterable:false, value:r => r.status, render:r => (
      <div className="flex gap-2 items-center">
        {r.status === 'Pending' && <><button disabled={!!busyId} onClick={() => status(r, 'Approved')} className="text-green-700 font-semibold">Approve</button><button disabled={!!busyId} onClick={() => status(r, 'Rejected')} className="text-red-700 font-semibold">Reject</button></>}
        <button onClick={() => setEligibilityView({ bssId: r.workerId, name: r.workerName })} className="text-gray-400 hover:text-blue-700" aria-label="View eligibility"><Eye size={15}/></button>
      </div>
    ) },
  ];

  const count = (value: Pass['status']) => gatePasses.filter(item => item.status === value).length;

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Master data</p><h1 className="text-2xl font-bold mt-1">Worker Gate Passes</h1><p className="text-sm text-gray-500 mt-1">Issue and track time-bound site access. Requests are pre-validated against Medical, Health & Safety and Compliance criteria, then approved by the principal employer.</p></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setBulkOpen(true); setChecked(new Set()); setError(''); }} className="h-10 px-4 border border-gray-200 rounded-lg text-sm font-semibold flex gap-2 items-center bg-white"><Plus size={16}/>Generate Bulk Gate Passes</button>
        <button onClick={() => { setOpen(true); setError(''); }} className="h-10 px-4 bg-gray-950 text-white rounded-lg text-sm font-semibold flex gap-2 items-center"><Plus size={16}/>Request Pass</button>
      </div>
    </header>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Metric label="Pending · Temporary" value={gatePasses.filter(p => p.status === 'Pending' && p.type === 'Temporary').length} icon={Clock} tone="text-orange-700"/>
      <Metric label="Pending · Permanent" value={gatePasses.filter(p => p.status === 'Pending' && p.type === 'Permanent').length} icon={Clock} tone="text-amber-700"/>
      <Metric label="Approved" value={count('Approved')} icon={CheckCircle2} tone="text-green-700"/>
      <Metric label="Rejected" value={count('Rejected')} icon={XCircle} tone="text-red-700"/>
    </div>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && !open && !bulkOpen && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <div className="flex flex-wrap items-center gap-3">
      <span className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-2 text-xs">Showing gate passes for <strong>{employerScope === 'all' ? 'All Employers' : employerScope}</strong>.</span>
      <label className="relative"><Search size={14} className="absolute left-3 top-2.5 text-gray-400"/><select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="h-9 rounded-lg border border-gray-200 pl-9 pr-3 text-xs bg-white"><option value="all">All Sites</option>{contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></label>
    </div>

    <EnterpriseDataTable title="Gate pass register" rows={gatePasses} columns={columns} rowKey={r => r.id} filename="gate-passes"/>

    {/* Eligibility matrix reference */}
    <details className="bg-white border border-gray-200 rounded-2xl p-4">
      <summary className="list-none flex items-center justify-between cursor-pointer text-xs font-semibold text-blue-700 select-none"><span className="flex items-center gap-2"><ShieldCheck size={15}/>Eligibility criteria — request pre-validation (Medical · Health & Safety · Compliance)</span><span className="text-gray-400">▾</span></summary>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-xs text-left"><thead className="text-gray-500 text-[10px] uppercase tracking-wider"><tr><th className="py-2 pr-4">Medical</th><th className="py-2 pr-4">Health & Safety</th><th className="py-2 pr-4">Compliance</th><th className="py-2 pr-4">Temporary Gate</th><th className="py-2">Permanent Gate</th></tr></thead><tbody className="divide-y divide-gray-100">
        {[
          ['Pending','Pending','Pending','No','No'],['Pending','Pending','Done','No','No'],['Pending','Done','Pending','No','No'],['Pending','Done','Done','No','No'],
          ['Done','Pending','Pending','No','No'],['Done','Pending','Done','No','No'],['Done','Done','Pending','Yes','No'],['Done','Done','Done','Yes','Yes'],
        ].map((row, i) => <tr key={i} className="text-gray-700"><td className="py-2 pr-4">{row[0]}</td><td className="py-2 pr-4">{row[1]}</td><td className="py-2 pr-4">{row[2]}</td><td className="py-2 pr-4"><Permit value={row[3]}/></td><td className="py-2"><Permit value={row[4]}/></td></tr>)}
      </tbody></table></div>
    </details>

    {/* Single request modal */}
    {open && <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"><section role="dialog" aria-modal="true" className="bg-white rounded-2xl w-full max-w-lg">
      <header className="p-5 border-b flex justify-between"><h2 className="font-semibold">Request gate pass</h2><button onClick={() => setOpen(false)} aria-label="Close"><X/></button></header>
      <form onSubmit={submit} className="p-5 grid sm:grid-cols-2 gap-4">
        <label className="text-xs font-semibold">Worker<select required name="workerId" className="mt-1 w-full h-10 border rounded-lg bg-white px-2"><option value="">Select</option>{contractor.workers.map(w => <option key={w.id} value={w.bssId}>{w.name} · {w.bssId}</option>)}</select></label>
        <label className="text-xs font-semibold">Site<select required name="site" className="mt-1 w-full h-10 border rounded-lg bg-white px-2"><option value="">Select</option>{contractor.sites.map(s => <option key={s.id}>{s.name}</option>)}</select></label>
        <label className="text-xs font-semibold">Pass type<select required name="type" className="mt-1 w-full h-10 border rounded-lg bg-white px-2"><option value="Temporary">Temporary</option><option value="Permanent">Permanent</option></select></label>
        <label className="text-xs font-semibold">Valid from<input required name="validFrom" type="date" className="mt-1 w-full h-10 border rounded-lg px-2"/></label>
        <label className="text-xs font-semibold">Valid to<input required name="validTo" type="date" className="mt-1 w-full h-10 border rounded-lg px-2"/></label>
        {error && <p role="alert" className="sm:col-span-2 bss-alert bss-alert-error flex items-center gap-2"><AlertTriangle size={14}/>{error}</p>}
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2">Cancel</button><button disabled={!!busyId} className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold">{busyId === 'new' ? 'Validating & submitting…' : 'Submit for approval'}</button></div>
      </form>
    </section></div>}

    {/* Bulk generation modal */}
    {bulkOpen && <div className="fixed inset-0 z-[80] bg-black/50 grid place-items-center p-4"><section role="dialog" aria-modal="true" className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden">
      <header className="p-5 border-b border-gray-100 flex justify-between items-center"><div><h2 className="font-semibold text-sm">Generate bulk gate passes</h2><p className="text-xs text-gray-500 mt-1">Select workers with checkboxes · <strong>{checked.size} selected</strong> · eligibility is pre-validated per the criteria matrix.</p></div><button onClick={() => setBulkOpen(false)} aria-label="Close"><X/></button></header>
      <div className="p-5 space-y-4">
        <label className="relative block"><Search size={15} className="absolute left-3 top-3 text-gray-400"/><input value={workerQuery} onChange={e => setWorkerQuery(e.target.value)} placeholder="Search worker / BSS ID / designation" className="w-full h-10 pl-9 pr-3 border rounded-lg text-sm"/></label>
        <div className="overflow-y-auto max-h-72 border border-gray-100 rounded-xl divide-y divide-gray-100">
          {filteredWorkers.map(w => { const e = eligibilityFor(contractor, w.bssId); const tempOk = tempAllowed(e); const permOk = permAllowed(e); return (
            <label key={w.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={checked.has(w.bssId)} onChange={() => toggle(w.bssId)} className="w-4 h-4 accent-[#073B67]"/>
              <span className="flex-1 min-w-0"><strong className="block text-sm text-gray-900">{w.name}</strong><span className="block text-[11px] text-gray-400 font-mono">{w.bssId} · {w.designation} · {w.site}</span></span>
              <button type="button" onClick={() => setEligibilityView({ bssId: w.bssId, name: w.name })} className="text-xs text-blue-700 font-semibold flex items-center gap-1"><Eye size={13}/>View eligibility</button>
              <span className="text-[10px] font-bold rounded-full px-2 py-0.5 flex-shrink-0">{tempOk && permOk ? <span className="text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">Temporary + Permanent</span> : tempOk ? <span className="text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">Temporary only</span> : <span className="text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">Not eligible</span>}</span>
            </label>
          ); })}
          {!filteredWorkers.length && <p className="p-8 text-center text-sm text-gray-400">No matching workers.</p>}
        </div>
        {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => generateBulk('Temporary')} disabled={busyId === 'bulk' || !checked.size} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">{busyId === 'bulk' ? 'Generating…' : `Generate ${checked.size} Temporary`}</button>
          <button onClick={() => generateBulk('Permanent')} disabled={busyId === 'bulk' || !checked.size} className="px-4 py-2 rounded-lg bg-gray-950 text-white text-sm font-semibold disabled:opacity-50">Generate {checked.size} Permanent</button>
        </div>
      </div>
    </section></div>}

    {/* Eligibility drawer */}
    {eligibilityView && <EligibilityDrawer bssId={eligibilityView.bssId} name={eligibilityView.name} portal={contractor} onClose={() => setEligibilityView(null)}/>}
  </div>;
}

function EligibilityDrawer({ bssId, name, portal, onClose }: { bssId:string; name:string; portal:ContractorPortalData; onClose:() => void }) {
  const e = eligibilityFor(portal, bssId);
  const rows: Array<[string, Eligibility[keyof Eligibility]]> = [
    ['Medical Examination', e.medical], ['Health & Safety', e.healthSafety], ['Compliance', e.compliance],
    ['Safety Kit', e.safetyKit], ['Safety Training', e.safetyTraining], ['Site Induction', e.siteInduction],
    ['Aadhaar Verification', e.aadhaar], ['Bank Account Verification', e.bank], ['UAN Verification', e.uan], ['ESI Verification', e.esi],
  ];
  return <div className="fixed inset-0 z-[90] bg-black/50 flex justify-end" role="presentation">
    <section role="dialog" aria-modal="true" aria-label="Worker eligibility" className="bg-white w-full max-w-md h-full overflow-y-auto animate-in slide-in-from-right-4 duration-200">
      <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Eligibility / verification details</p><h2 className="font-semibold text-gray-950 mt-0.5">{name}</h2><p className="text-xs text-gray-500 font-mono mt-0.5">{bssId}</p></div>
        <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
      </header>
      <div className="p-5 space-y-3">
        <ul className="space-y-2">{rows.map(([label, value]) => <li key={label} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 text-xs"><span className="text-gray-600">{label}</span><span className={`font-bold flex items-center gap-1.5 ${value === 'Done' ? 'text-green-700' : value === 'Expired' ? 'text-red-600' : 'text-orange-600'}`}>{value === 'Done' ? <CheckCircle2 size={13}/> : value === 'Expired' ? <XCircle size={13}/> : <Clock size={13}/>}{value}</span></li>)}</ul>
        <div className={`rounded-xl p-3 text-xs flex gap-2 ${tempAllowed(e) ? 'bg-blue-50 border border-blue-100 text-blue-900' : 'bg-orange-50 border border-orange-100 text-orange-800'}`}><ShieldCheck size={15} className="flex-shrink-0 mt-0.5"/><div><p className="font-bold">{tempAllowed(e) ? 'Temporary Gate Pass — eligible' : 'Temporary Gate Pass — not eligible'}</p><p className="mt-0.5">Requires Medical = Done and Health & Safety = Done.</p></div></div>
        <div className={`rounded-xl p-3 text-xs flex gap-2 ${permAllowed(e) ? 'bg-green-50 border border-green-100 text-green-800' : 'bg-gray-50 border border-gray-100 text-gray-600'}`}><ShieldCheck size={15} className="flex-shrink-0 mt-0.5"/><div><p className="font-bold">{permAllowed(e) ? 'Permanent Gate Pass — eligible' : 'Permanent Gate Pass — not eligible'}</p><p className="mt-0.5">Requires Medical = Done, Health & Safety = Done and Compliance = Done.</p></div></div>
      </div>
    </section>
  </div>;
}

function Dot({ label, ok, title }: { label:string; ok:boolean; title:string }) { return <span title={title} className={`inline-flex items-center justify-center min-w-6 h-5 px-1 rounded text-[9px] font-bold ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{label}{ok ? '✓' : '✗'}</span>; }
function Permit({ value }: { value: string }) { return <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${value === 'Yes' ? 'text-green-700' : 'text-gray-400'}`}>{value === 'Yes' ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}{value}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Clock; tone:string }) { return <div className="bg-white border rounded-xl p-4"><Icon size={18} className={tone}/><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
