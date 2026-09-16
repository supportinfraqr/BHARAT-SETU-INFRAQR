"use client";
import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Eye, Search, ShieldCheck, X, XCircle } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';
import { useContractorDocView } from '@/components/documentEngine/portalAdapters';
import { buildGatePassHtml } from '@/lib/documentEngine/gatePass';
import { GatePassViewer } from '@/components/documentEngine/GatePassViewer';
import type { ContractorPortalData, GatePassEligibility } from '@/types/portal';
type Pass = ContractorPortalData['gatePasses'][number];

const tempAllowed = (e?: GatePassEligibility) => !!e && e.medical === 'Done' && e.healthSafety === 'Done';
const permAllowed = (e?: GatePassEligibility) => !!e && e.medical === 'Done' && e.healthSafety === 'Done' && e.compliance === 'Done';

export default function ContractorGatePassPage() {
  const { contractor, scoped } = useContractor();
  const docCtx = useContractorDocView();
  const [siteFilter, setSiteFilter] = useState('all');
  const [passPreview, setPassPreview] = useState<{ html: string; title: string } | null>(null);
  const [eligibilityView, setEligibilityView] = useState<{ bssId: string; name: string; eligibility?: GatePassEligibility } | null>(null);

  async function viewPass(row: Pass) {
    const worker = docCtx.workers.find(item => item.bssId === row.workerId || item.name === row.workerName);
    if (!worker) return;
    const html = await buildGatePassHtml(docCtx.owner, docCtx.view, worker, row.type === 'Permanent' ? 'permanent-gate-pass' : 'temporary-gate-pass', { validFrom: row.validFrom, validTo: row.validTo, number: row.number });
    setPassPreview({ html, title: `${row.workerName} · ${row.type} Gate Pass` });
  }

  const gatePasses = useMemo(() => {
    const scopedRows = scoped(contractor.gatePasses, p => p.employer);
    return siteFilter === 'all' ? scopedRows : scopedRows.filter(p => p.site === siteFilter);
  }, [contractor.gatePasses, scoped, siteFilter]);

  const columns: DataColumn<Pass>[] = [
    { id:'worker', header:'Worker', value:r => r.workerName, render:r => <div><strong>{r.workerName}</strong><p className="font-mono text-[11px] text-gray-500">{r.workerId}</p>{(r.skill||r.contact)&&<p className="text-[10px] text-gray-400">{[r.skill,r.contact].filter(Boolean).join(' · ')}</p>}</div> },
    { id:'type', header:'Type', value:r => r.type },
    { id:'site', header:'Site', value:r => r.site },
    { id:'from', header:'Valid from', value:r => r.validFrom || '—' },
    { id:'to', header:'Valid to', value:r => r.validTo || '—' },
    { id:'ownership', header:'Requested / Approved', filterable:false, value:r => `${r.requestedBy || ''} ${r.approvedBy || ''}`, render:r => <div><p className="text-[11px] text-gray-600">Req: {r.requestedBy || '—'}</p><p className="text-[11px] text-gray-500">Appr: {r.approvedBy || 'Principal Employer'}</p></div> },
    { id:'eligibility', header:'Eligibility', filterable:false, value:r => r.workerId, render:r => { const e = r.eligibility; return <div className="flex gap-1"><Dot label="5" ok={(e?.documentCount ?? 0) >= 5} title={`${e?.documentCount ?? 0}/5 documents (Aadhaar, PAN, Bank, UAN, ESIC) → Temporary`}/><Dot label="8" ok={(e?.checkCount ?? 0) >= 8} title={`${e?.checkCount ?? 0}/8 checks (+ Medical, PPE, Welfare & Safety) → Permanent`}/></div>; } },
    { id:'status', header:'Status', value:r => r.status },
    { id:'actions', header:'Actions', filterable:false, value:r => r.status, render:r => (
      <div className="flex items-center gap-2">
        <button onClick={() => { void viewPass(r); }} disabled={r.blocked} className="h-8 px-2.5 rounded-lg border border-gray-200 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><Eye size={13}/>View pass</button>
        <button onClick={() => setEligibilityView({ bssId: r.workerId, name: r.workerName, eligibility: r.eligibility })} className="text-gray-400 hover:text-blue-700" aria-label="View eligibility"><ShieldCheck size={15}/></button>
      </div>
    ) },
  ];

  const count = (value: Pass['status']) => gatePasses.filter(item => item.status === value).length;

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Master data</p><h1 className="text-2xl font-bold mt-1">Worker Gate Passes</h1><p className="text-sm text-gray-500 mt-1">View site access gate passes issued by the Principal Employer for bound workers. Eligibility criteria (Medical, Health &amp; Safety, and Compliance) are verified before issuance.</p></div>
    </header>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Metric label="Pending · Temporary" value={gatePasses.filter(p => p.status === 'Pending' && p.type === 'Temporary').length} icon={Clock} tone="text-orange-700"/>
      <Metric label="Pending · Permanent" value={gatePasses.filter(p => p.status === 'Pending' && p.type === 'Permanent').length} icon={Clock} tone="text-amber-700"/>
      <Metric label="Approved" value={count('Approved')} icon={CheckCircle2} tone="text-green-700"/>
      <Metric label="Rejected" value={count('Rejected')} icon={XCircle} tone="text-red-700"/>
    </div>



    <div className="flex flex-wrap items-center gap-3">
      <label className="relative"><Search size={14} className="absolute left-3 top-2.5 text-gray-400"/><select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="h-9 rounded-lg border border-gray-200 pl-9 pr-3 text-xs bg-white"><option value="all">All Sites</option>{contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></label>
    </div>

    <EnterpriseDataTable title="Gate pass register" rows={gatePasses} columns={columns} rowKey={r => r.id} filename="gate-passes"/>

    <details className="bg-white border border-gray-200 rounded-2xl p-4">
      <summary className="list-none flex items-center justify-between cursor-pointer text-xs font-semibold text-blue-700 select-none"><span className="flex items-center gap-2"><ShieldCheck size={15}/>Eligibility criteria — request pre-validation (Medical · Health &amp; Safety · Compliance)</span><span className="text-gray-400">▾</span></summary>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-xs text-left"><thead className="text-gray-500 text-[10px] uppercase tracking-wider"><tr><th className="py-2 pr-4">Medical</th><th className="py-2 pr-4">Health &amp; Safety</th><th className="py-2 pr-4">Compliance</th><th className="py-2 pr-4">Temporary Gate</th><th className="py-2">Permanent Gate</th></tr></thead><tbody className="divide-y divide-gray-100">
        {[
          ['Pending','Pending','Pending','No','No'],['Pending','Pending','Done','No','No'],['Pending','Done','Pending','No','No'],['Pending','Done','Done','No','No'],
          ['Done','Pending','Pending','No','No'],['Done','Pending','Done','No','No'],['Done','Done','Pending','Yes','No'],['Done','Done','Done','Yes','Yes'],
        ].map((row, i) => <tr key={i} className="text-gray-700"><td className="py-2 pr-4">{row[0]}</td><td className="py-2 pr-4">{row[1]}</td><td className="py-2 pr-4">{row[2]}</td><td className="py-2 pr-4"><Permit value={row[3]}/></td><td className="py-2"><Permit value={row[4]}/></td></tr>)}
      </tbody></table></div>
    </details>

    {eligibilityView && <EligibilityDrawer name={eligibilityView.name} bssId={eligibilityView.bssId} eligibility={eligibilityView.eligibility} onClose={() => setEligibilityView(null)}/>}
    {passPreview && <GatePassViewer html={passPreview.html} title={passPreview.title} onClose={() => setPassPreview(null)} />}
  </div>;
}

function EligibilityDrawer({ bssId, name, eligibility, onClose }: { bssId:string; name:string; eligibility?:GatePassEligibility; onClose:() => void }) {
  const e = eligibility;
  const rows: Array<[string, string]> = e ? [
    ['Medical Examination', e.medical], ['Health & Safety', e.healthSafety], ['Compliance', e.compliance],
    ['Safety Kit', e.safetyKit], ['Safety Training', e.safetyTraining], ['Site Induction', e.siteInduction],
    ['Aadhaar Verification', e.aadhaar], ['Bank Account Verification', e.bank], ['UAN Verification', e.uan], ['ESI Verification', e.esi],
  ] : [];
  return <div className="fixed inset-0 z-[90] bg-black/50 flex justify-end" role="presentation">
    <section role="dialog" aria-modal="true" aria-label="Worker eligibility" className="bg-white w-full max-w-md h-full overflow-y-auto animate-in slide-in-from-right-4 duration-200">
      <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Eligibility / verification details</p><h2 className="font-semibold text-gray-950 mt-0.5">{name}</h2><p className="text-xs text-gray-500 font-mono mt-0.5">{bssId}</p></div>
        <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
      </header>
      <div className="p-5 space-y-3">
        <ul className="space-y-2">{rows.map(([label, value]) => <li key={label} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 text-xs"><span className="text-gray-600">{label}</span><span className={`font-bold flex items-center gap-1.5 ${value === 'Done' ? 'text-green-700' : value === 'Expired' ? 'text-red-600' : 'text-orange-600'}`}>{value === 'Done' ? <CheckCircle2 size={13}/> : value === 'Expired' ? <XCircle size={13}/> : <Clock size={13}/>}{value}</span></li>)}</ul>
        {!e && <p className="text-xs text-gray-400">No eligibility data recorded for this worker yet.</p>}
        <div className={`rounded-xl p-3 text-xs flex gap-2 ${tempAllowed(e) ? 'bg-blue-50 border border-blue-100 text-blue-900' : 'bg-orange-50 border border-orange-100 text-orange-800'}`}><ShieldCheck size={15} className="flex-shrink-0 mt-0.5"/><div><p className="font-bold">{tempAllowed(e) ? 'Temporary Gate Pass — eligible' : 'Temporary Gate Pass — not eligible'}</p><p className="mt-0.5">Requires Medical = Done and Health &amp; Safety = Done.</p></div></div>
        <div className={`rounded-xl p-3 text-xs flex gap-2 ${permAllowed(e) ? 'bg-green-50 border border-green-100 text-green-800' : 'bg-gray-50 border border-gray-100 text-gray-600'}`}><ShieldCheck size={15} className="flex-shrink-0 mt-0.5"/><div><p className="font-bold">{permAllowed(e) ? 'Permanent Gate Pass — eligible' : 'Permanent Gate Pass — not eligible'}</p><p className="mt-0.5">Requires Medical = Done, Health &amp; Safety = Done and Compliance = Done.</p></div></div>
      </div>
    </section>
  </div>;
}

function Dot({ label, ok, title }: { label:string; ok:boolean; title:string }) { return <span title={title} className={`inline-flex items-center justify-center min-w-6 h-5 px-1 rounded text-[9px] font-bold ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{label}{ok ? '✓' : '✗'}</span>; }
function Permit({ value }: { value: string }) { return <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${value === 'Yes' ? 'text-green-700' : 'text-gray-400'}`}>{value === 'Yes' ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}{value}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Clock; tone:string }) { return <div className="bg-white border rounded-xl p-4"><Icon size={18} className={tone}/><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
