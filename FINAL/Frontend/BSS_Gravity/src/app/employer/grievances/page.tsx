"use client";

import { useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Headphones, MessageSquareText, Play, RotateCcw, Send, ShieldAlert, UserRound, Volume2 } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';

type Lifecycle = 'Open' | 'In Progress' | 'Resolved' | 'Reopened';

type Grievance = {
  ref: string;
  category: string;
  status: Lifecycle;
  worker: string;
  workerId: string;
  contractor: string;
  site: string;
  raisedAt: string;
  updatedAt: string;
  description: string;
  audioAvailable: boolean;
  attachment: string | null;
  escalated: boolean;
  resolutionConfirmed: boolean;
  replyHistory: Array<{ by: 'Worker' | 'Contractor' | 'Employer'; text: string; at: string }>;
};

const statusTone: Record<Lifecycle, string> = {
  Open: 'bg-blue-50 text-blue-700',
  'In Progress': 'bg-orange-50 text-orange-700',
  Resolved: 'bg-green-50 text-green-700',
  Reopened: 'bg-red-50 text-red-700',
};

const fmt = (value: string) => new Date(value).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

function seedGrievances(workers: Array<{ name:string; bssId:string; contractor:string; site:string }>): Grievance[] {
  const take = (index: number) => workers[index % Math.max(1, workers.length)] ?? { name:'Worker', bssId:'BSS000000000000', contractor:'—', site:'—' };
  const w1 = take(0);
  const w2 = take(1);
  const w3 = take(2);
  const w4 = take(3);
  return [
    {
      ref:'GRV-EMP-2026-1041', category:'Accommodation', status:'Open', worker:w1.name, workerId:w1.bssId, contractor:w1.contractor, site:w1.site,
      raisedAt:'2026-08-29T08:40:00+05:30', updatedAt:'2026-08-29T08:40:00+05:30',
      description:'Water supply in Block 3 labour camp is irregular since last week and affects about 40 workers in my camp block.',
      audioAvailable:true, attachment:'camp-water-complaint.jpg', escalated:false, resolutionConfirmed:false,
      replyHistory:[],
    },
    {
      ref:'GRV-EMP-2026-1037', category:'Safety', status:'In Progress', worker:w2.name, workerId:w2.bssId, contractor:w2.contractor, site:w2.site,
      raisedAt:'2026-08-27T17:05:00+05:30', updatedAt:'2026-08-28T11:30:00+05:30',
      description:'Scaffolding near Gate 2 has loose planks that need replacement before the next shift.',
      audioAvailable:false, attachment:'scaffolding-gate2.jpg', escalated:false, resolutionConfirmed:false,
      replyHistory:[
        { by:'Contractor', text:'Acknowledged — our safety supervisor inspected Gate 2 scaffolding and replacements are scheduled for tomorrow morning.', at:'2026-08-28T09:15:00+05:30' },
        { by:'Worker', text:'Thank you. Please confirm when the replacement is done so we can resume work safely.', at:'2026-08-28T11:05:00+05:30' },
      ],
    },
    {
      ref:'GRV-EMP-2026-1028', category:'Wages', status:'Resolved', worker:w3.name, workerId:w3.bssId, contractor:w3.contractor, site:w3.site,
      raisedAt:'2026-08-12T09:20:00+05:30', updatedAt:'2026-08-20T14:10:00+05:30',
      description:'July wage slip shows a deduction I do not recognise; attendance records show full presence for the month.',
      audioAvailable:false, attachment:null, escalated:false, resolutionConfirmed:false,
      replyHistory:[
        { by:'Contractor', text:'Deduction verified against the attendance register — it was applied in error and refunded in the August payout.', at:'2026-08-15T10:40:00+05:30' },
        { by:'Employer', text:'Confirmed against the payroll ledger — the refund has been released. Please confirm closure from your side.', at:'2026-08-18T12:00:00+05:30' },
      ],
    },
    {
      ref:'GRV-EMP-2026-1015', category:'Safety', status:'Reopened', worker:w4.name, workerId:w4.bssId, contractor:w4.contractor, site:w4.site,
      raisedAt:'2026-08-05T16:45:00+05:30', updatedAt:'2026-08-25T09:00:00+05:30',
      description:'Portable electrical cables at the fabrication yard run across a wet walkway without protection.',
      audioAvailable:true, attachment:null, escalated:true, resolutionConfirmed:false,
      replyHistory:[
        { by:'Contractor', text:'Cable ramps installed and the walkway is being re-routed away from the wet area.', at:'2026-08-19T15:20:00+05:30' },
        { by:'Employer', text:'Site safety team inspected the area and confirmed cable ramps are in place.', at:'2026-08-21T10:00:00+05:30' },
        { by:'Worker', text:'The ramps were removed again for the weekly water wash of the yard. The issue is back.', at:'2026-08-25T09:00:00+05:30' },
      ],
    },
  ];
}

export default function EmployerGrievancesPage() {
  const { employer } = useEmployer();
  const workers = employer.workers.map(w => ({ name:w.name, bssId:w.bssId, contractor:w.contractor, site:w.site }));
  const [grievances, setGrievances] = useState<Grievance[]>(() => seedGrievances(workers));
  const [selectedId, setSelectedId] = useState(grievances[0]?.ref ?? '');
  const [reply, setReply] = useState('');
  const [notice, setNotice] = useState('');
  const selected = grievances.find(item => item.ref === selectedId) ?? grievances[0];

  const counts = {
    total: grievances.length,
    open: grievances.filter(item => item.status === 'Open').length,
    progress: grievances.filter(item => item.status === 'In Progress').length,
    resolved: grievances.filter(item => item.status === 'Resolved').length,
    reopened: grievances.filter(item => item.status === 'Reopened').length,
  };

  function apply(ref: string, updates: Partial<Grievance>) {
    setGrievances(current => current.map(item => item.ref === ref ? { ...item, ...updates, updatedAt:new Date().toISOString() } : item));
  }

  function sendReply() {
    if (!selected || !reply.trim()) return;
    const text = reply.trim();
    apply(selected.ref, {
      replyHistory: [...selected.replyHistory, { by:'Employer', text, at:new Date().toISOString() }],
      status: selected.status === 'Resolved' ? selected.status : selected.status === 'Reopened' ? 'In Progress' : selected.status === 'Open' ? 'In Progress' : selected.status,
      escalated: false,
    });
    setReply('');
    setNotice(`Reply recorded on ${selected.ref}. The worker and the connected contractor can see the conversation in their portals.`);
  }

  function resolveGrievance() {
    if (!selected) return;
    apply(selected.ref, { status:'Resolved', resolutionConfirmed:false, escalated:false });
    setNotice(`${selected.ref} marked resolved by the employer — awaiting the worker's final resolution confirmation.`);
  }

  function escalateGrievance() {
    if (!selected) return;
    apply(selected.ref, { escalated:true });
    setNotice(`${selected.ref} escalated to the employer's governance desk for follow-up.`);
  }

  function simulateWorkerDecision(action: 'confirmed' | 'reopened') {
    if (!selected) return;
    if (action === 'confirmed') {
      apply(selected.ref, { status:'Resolved', resolutionConfirmed:true });
      setNotice(`${selected.worker} confirmed the resolution of ${selected.ref}. The grievance is closed.`);
    } else {
      apply(selected.ref, { status:'Reopened', resolutionConfirmed:false });
      setNotice(`${selected.worker} reopened ${selected.ref} — the review → reply → resolve cycle restarts for the contractor and employer.`);
    }
  }

  const columns: DataColumn<Grievance>[] = [
    { id:'ref', header:'Reference', value:item => item.ref, render:item => <span className="font-mono text-blue-700">{item.ref}</span> },
    { id:'worker', header:'Worker', value:item => item.worker, render:item => <div><strong className="text-gray-900">{item.worker}</strong><p className="font-mono text-[10px] text-gray-400">{item.workerId}</p></div> },
    { id:'contractor', header:'Contractor', value:item => item.contractor },
    { id:'site', header:'Site', value:item => item.site },
    { id:'category', header:'Category', value:item => item.category },
    { id:'status', header:'Status', value:item => item.status, render:item => <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusTone[item.status]}`}>{item.status}{item.escalated ? ' · Escalated' : ''}</span> },
    { id:'raised', header:'Raised', value:item => item.raisedAt.slice(0, 10) },
    { id:'actions', header:'Action', filterable:false, value:item => item.ref, render:item => <button onClick={() => setSelectedId(item.ref)} className="text-blue-700 font-semibold text-xs">Open</button> },
  ];

  return <div className="space-y-6 pb-12">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Workforce governance</p>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Grievances</h1>
      <p className="text-sm text-gray-500 mt-1">Worker grievances raised against your connected contractors — review, reply, resolve and track the complete lifecycle with shared Employer &amp; Contractor visibility.</p>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-5 gap-3">
      <Kpi label="Total grievances" value={counts.total} tone="text-gray-800"/>
      <Kpi label="Open" value={counts.open} tone="text-blue-700"/>
      <Kpi label="In progress" value={counts.progress} tone="text-orange-700"/>
      <Kpi label="Resolved" value={counts.resolved} tone="text-bss-green"/>
      <Kpi label="Reopened" value={counts.reopened} tone="text-red-600"/>
    </section>

    <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-3 text-xs leading-5">You see grievances raised by workers bound to your <strong>{employer.contractors.length} connected contractor(s)</strong>. Employer and contractor share the same grievance conversation — replies are visible to the worker and to both parties, and reopens restart the resolution cycle.</div>

    <EnterpriseDataTable title="Worker grievance register" rows={grievances} columns={columns} rowKey={item => item.ref} filename="employer-grievances"/>

    {selected && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><MessageSquareText size={18}/></span>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-gray-950">{selected.ref}</h2><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusTone[selected.status]}`}>{selected.status}</span>{selected.escalated && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 inline-flex items-center gap-1"><ShieldAlert size={11}/>Escalated</span>}</div>
            <p className="text-xs text-gray-500 mt-0.5">{selected.category} · Raised {fmt(selected.raisedAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {selected.status !== 'Resolved' && <button onClick={resolveGrievance} className="h-9 px-3 rounded-lg bg-bss-green text-white text-xs font-bold flex items-center gap-1.5 hover:brightness-95"><CheckCircle2 size={14}/>Mark resolved</button>}
          {selected.status !== 'Resolved' && !selected.escalated && <button onClick={escalateGrievance} className="h-9 px-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100"><ShieldAlert size={14}/>Escalate</button>}
          {selected.status === 'Resolved' && !selected.resolutionConfirmed && <button onClick={() => simulateWorkerDecision('confirmed')} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-50" title="Demo control — simulates the worker confirming in their portal"><CheckCircle2 size={14} className="text-green-600"/>Worker confirmed (demo)</button>}
          {selected.resolutionConfirmed && <span className="h-9 px-3 rounded-lg bg-green-50 border border-green-100 text-green-700 text-xs font-bold inline-flex items-center gap-1.5"><CheckCircle2 size={14}/>Worker confirmed resolution</span>}
          {(selected.status === 'Resolved' || selected.status === 'Reopened') && !selected.resolutionConfirmed && <button onClick={() => simulateWorkerDecision('reopened')} className="h-9 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-semibold flex items-center gap-1.5 hover:bg-red-50" title="Demo control — simulates the worker reopening in their portal"><RotateCcw size={14}/>Worker reopened (demo)</button>}
          {selected.status === 'Reopened' && <span className="h-9 px-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs font-bold inline-flex items-center gap-1.5"><RotateCcw size={14}/>Reopened by worker — re-review required</span>}
        </div>
      </header>

      <div className="p-5 grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Grievance description</p>
            <p className="text-sm text-gray-800 leading-6">{selected.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.audioAvailable && <button onClick={() => setNotice(`Audio grievance for ${selected.ref} — ${selected.audioAvailable ? 'recording playback available to the worker, contractor and employer.' : ''}`)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1"><Volume2 size={12}/>Audio grievance recorded <Play size={11}/></button>}
              {selected.attachment && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1"><FileText size={12}/>{selected.attachment}</span>}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Conversation · Contractor &amp; Employer reply history</p>
            <div className="space-y-3">
              {selected.replyHistory.length === 0 && <p className="text-xs text-gray-400 rounded-xl border border-dashed border-gray-200 p-4 text-center">No replies yet. Respond to the worker to begin the review → reply → resolve cycle.</p>}
              {selected.replyHistory.map((entry, index) => (
                <div key={index} className={`max-w-[85%] rounded-xl border p-3 text-xs ${entry.by === 'Worker' ? 'bg-gray-50 border-gray-100 ml-auto' : entry.by === 'Employer' ? 'bg-indigo-50 border-indigo-100' : 'bg-blue-50 border-blue-100'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{entry.by} · {fmt(entry.at)}</p>
                  <p className="text-gray-800 leading-5">{entry.text}</p>
                </div>
              ))}
            </div>
            {selected.status !== 'Resolved' && (
              <div className="mt-4 flex gap-2">
                <input value={reply} onChange={event => setReply(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') sendReply(); }} placeholder="Reply to the worker as the principal employer…" className="flex-1 h-11 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20"/>
                <button onClick={sendReply} disabled={!reply.trim()} className="h-11 px-4 rounded-lg bg-[#073B67] text-white text-sm font-bold flex items-center gap-2 hover:bg-[#062D4F] disabled:opacity-50"><Send size={15}/>Reply</button>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Worker details</p>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 grid place-items-center font-bold"><UserRound size={18}/></span>
              <div><p className="text-sm font-semibold text-gray-900">{selected.worker}</p><p className="font-mono text-[11px] text-gray-500">{selected.workerId}</p></div>
            </div>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-gray-400">Contractor</dt><dd className="font-semibold text-gray-800 text-right">{selected.contractor}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-400">Site</dt><dd className="font-semibold text-gray-800 text-right">{selected.site}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-400">Category</dt><dd className="font-semibold text-gray-800 text-right">{selected.category}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-400">Last update</dt><dd className="font-semibold text-gray-800 text-right">{fmt(selected.updatedAt)}</dd></div>
            </dl>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-900 leading-5 flex gap-2"><Headphones size={15} className="flex-shrink-0 mt-0.5"/>Shared visibility: the connected contractor also sees this grievance and can reply. Once resolved, the worker confirms — if they reopen it, the cycle restarts for both parties.</div>
          {selected.status === 'Resolved' && !selected.resolutionConfirmed && <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 text-xs text-orange-800 flex gap-2"><AlertCircle size={15} className="flex-shrink-0 mt-0.5"/>Marked resolved — waiting for the worker&apos;s final resolution confirmation in their portal. Use the demo control above to simulate the worker decision.</div>}
          {selected.escalated && <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-xs text-amber-800 flex gap-2"><ShieldAlert size={15} className="flex-shrink-0 mt-0.5"/>Escalated to the governance desk — an employer representative is accountable for the next resolution action.</div>}
        </aside>
      </div>
    </section>}
  </div>;
}

function Kpi({ label, value, tone }: { label:string; value:number; tone:string }) {
  return <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{label}</span></div><strong className={tone}>{value}</strong></article>;
}
