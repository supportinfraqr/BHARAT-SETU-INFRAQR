"use client";

import { useRef, useState } from 'react';
import { CheckCircle2, FileText, Headphones, MessageSquareText, Paperclip, Play, RotateCcw, Send, UserRound, Volume2, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';
import { maskFoulLanguage } from '@/lib/profanity';
import { downloadGrievanceFile, grievanceFileBlobUrl } from '@/lib/grievanceFiles';
import type { ContractorGrievance } from '@/types/portal';

const statusTone: Record<ContractorGrievance['status'], string> = {
  Submitted:'bg-slate-50 text-slate-600', Open:'bg-blue-50 text-blue-700', 'In Progress':'bg-orange-50 text-orange-700', Resolved:'bg-green-50 text-green-700', Reopened:'bg-red-50 text-red-700', Closed:'bg-emerald-50 text-emerald-700',
};

export default function ContractorGrievancesPage() {
  const { contractor, replaceContractor, employerScope, scoped } = useContractor();
  const [selectedId, setSelectedId] = useState(contractor.grievances[0]?.id ?? '');
  const [reply, setReply] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [playUrl, setPlayUrl] = useState('');
  const replyFileRef = useRef<HTMLInputElement>(null);

  const grievances = scoped(contractor.grievances, g => g.employer);
  const selected = grievances.find(g => g.id === selectedId) ?? grievances[0];

  const counts = {
    total: grievances.length,
    open: grievances.filter(g => g.status === 'Open' || g.status === 'Submitted').length,
    progress: grievances.filter(g => g.status === 'In Progress' || g.status === 'Reopened').length,
    resolved: grievances.filter(g => g.status === 'Resolved').length,
    closed: grievances.filter(g => g.status === 'Closed').length,
  };

  async function applyAction(action: 'reply' | 'resolve' | 'reopen', body?: string, file?: File | null) {
    if (!selected) return null;
    setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.append('action', action);
      if (body) form.append('body', body);
      if (file) form.append('attachment', file, file.name);
      const response = await fetch(`/api/grievances/${selected.id}/action`, { method: 'POST', body: form });
      const result = await response.json() as { data?: ContractorGrievance; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || 'Grievance could not be updated.');
      replaceContractor({ ...contractor, grievances: contractor.grievances.map(g => g.id === selected.id ? result.data! : g) });
      return result.data;
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Grievance could not be updated.'); return null; }
    finally { setBusy(false); }
  }

  async function sendReply() {
    if (!selected || (!reply.trim() && !replyFile)) return;
    const updated = await applyAction('reply', reply.trim(), replyFile);
    if (updated) {
      setReply(''); setReplyFile(null);
      setNotice(`Reply recorded on ${selected.ref}. The worker and principal employer can see the conversation.`);
    }
  }

  async function resolveGrievance() {
    const updated = await applyAction('resolve');
    if (updated) setNotice(`${selected.ref} marked resolved — awaiting the worker's confirmation.`);
  }

  async function reopenGrievance() {
    const updated = await applyAction('reopen');
    if (updated) setNotice(`${selected.ref} reopened — the review → reply → resolve cycle restarts.`);
  }

  async function playAudio() {
    if (!selected) return;
    setError('');
    try {
      if (playUrl) { URL.revokeObjectURL(playUrl); setPlayUrl(''); }
      const { url } = await grievanceFileBlobUrl(selected.id, 'audio');
      setPlayUrl(url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The recording could not be opened.'); }
  }

  const columns: DataColumn<ContractorGrievance>[] = [
    { id:'ref', header:'Reference', value:g => g.ref, render:g => <span className="font-mono text-blue-700">{g.ref}</span> },
    { id:'worker', header:'Worker', value:g => g.worker, render:g => <div><strong className="text-gray-900">{g.worker}</strong><p className="font-mono text-[10px] text-gray-400">{g.workerId}</p></div> },
    { id:'category', header:'Category', value:g => g.category },
    { id:'site', header:'Site', value:g => g.site },
    { id:'status', header:'Status', value:g => g.status, render:g => <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusTone[g.status]}`}>{g.status}</span> },
    { id:'raised', header:'Raised', value:g => g.raisedAt.slice(0, 10) },
    { id:'actions', header:'Action', filterable:false, value:g => g.ref, render:g => <button onClick={() => setSelectedId(g.id)} className="text-blue-700 font-semibold text-xs">Open</button> },
  ];

  return <div className="space-y-6 pb-12">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Workforce operations</p>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Grievances</h1>
      <p className="text-sm text-gray-500 mt-1">Worker grievances raised by workers bound to your organisation — review, reply, resolve and track the full lifecycle with your principal employer.</p>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-5 gap-3">
      <Kpi label="Total grievances" value={counts.total} tone="text-gray-800"/>
      <Kpi label="Open" value={counts.open} tone="text-blue-700"/>
      <Kpi label="In progress" value={counts.progress} tone="text-orange-700"/>
      <Kpi label="Resolved" value={counts.resolved} tone="text-bss-green"/>
      <Kpi label="Closed" value={counts.closed} tone="text-emerald-700"/>
    </section>

    <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-3 text-xs">You see grievances from <strong>{employerScope === 'all' ? 'all bound principal employers' : employerScope}</strong>. Worker visibility is limited to workers bound to your contractor profile. Contractor and principal employer share the same grievance conversation; replies are visible to the worker and both parties.</div>

    <EnterpriseDataTable title="Worker grievance register" rows={grievances} columns={columns} rowKey={g => g.id} filename="contractor-grievances"/>

    {/* Detail + conversation */}
    {selected && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><MessageSquareText size={18}/></span>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-gray-950">{selected.ref}</h2><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusTone[selected.status]}`}>{selected.status}</span></div>
            <p className="text-xs text-gray-500 mt-0.5">{selected.category} · Raised {new Date(selected.raisedAt).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!['Resolved', 'Closed'].includes(selected.status) && <button disabled={busy} onClick={resolveGrievance} className="h-9 px-3 rounded-lg bg-bss-green text-white text-xs font-bold flex items-center gap-1.5 hover:brightness-95 disabled:opacity-50"><CheckCircle2 size={14}/>Mark resolved</button>}
          {['Resolved', 'Closed'].includes(selected.status) && <button disabled={busy} onClick={reopenGrievance} className="h-9 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-bold flex items-center gap-1.5 hover:bg-red-50 disabled:opacity-50"><RotateCcw size={14}/>Reopen</button>}
          {selected.resolutionConfirmed && <span className="h-9 px-3 rounded-lg bg-green-50 border border-green-100 text-green-700 text-xs font-bold inline-flex items-center gap-1.5"><CheckCircle2 size={14}/>Worker confirmed</span>}
        </div>
      </header>

      <div className="p-5 grid lg:grid-cols-[1fr_260px] gap-6">
        <div className="space-y-5">
          {/* Description + evidence */}
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Grievance description</p>
            <p className="text-sm text-gray-800 leading-6">{maskFoulLanguage(selected.description)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {maskFoulLanguage(selected.description) !== selected.description && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">Offensive words masked in this case</span>}
              {selected.audioAvailable && <button onClick={() => void playAudio()} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1 hover:bg-blue-100"><Volume2 size={12}/>Play audio grievance <Play size={11}/></button>}
              {selected.attachmentName && <button onClick={() => void downloadGrievanceFile(selected.id, 'attachment')} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 hover:bg-gray-100"><FileText size={12}/>{selected.attachmentName}</button>}
            </div>
            {playUrl && <audio controls autoPlay src={playUrl} className="mt-3 w-full" />}
          </div>

          {/* Conversation */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Conversation · Contractor & Employer reply history</p>
            <div className="space-y-3">
              {selected.replyHistory.length === 0 && <p className="text-xs text-gray-400 rounded-xl border border-dashed border-gray-200 p-4 text-center">No replies yet. Respond to the worker to begin the review → reply → resolve cycle.</p>}
              {selected.replyHistory.map(entry => (
                <div key={entry.id} className={`max-w-[85%] rounded-xl border p-3 text-xs ${entry.by === 'Worker' ? 'bg-gray-50 border-gray-100 ml-auto' : entry.by === 'Employer' ? 'bg-indigo-50 border-indigo-100' : 'bg-blue-50 border-blue-100'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{entry.by} · {new Date(entry.at).toLocaleString('en-IN')}</p>
                  {entry.text && <p className="text-gray-800 leading-5 whitespace-pre-line">{entry.by === 'Worker' ? maskFoulLanguage(entry.text) : entry.text}</p>}
                  {entry.attachment && <button onClick={() => void downloadGrievanceFile(selected.id, 'attachment', entry.id)} className="mt-1 text-[11px] font-bold text-[#073B67] hover:underline flex items-center gap-1"><Paperclip size={11}/>{entry.attachmentName || 'Attachment'}</button>}
                </div>
              ))}
            </div>
            {selected.status !== 'Closed' && (
              <div className="mt-4 space-y-2">
                <div className="flex gap-2">
                  <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void sendReply(); }} placeholder="Reply to the worker…" className="flex-1 h-11 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20"/>
                  <button onClick={sendReply} disabled={busy || (!reply.trim() && !replyFile)} className="h-11 px-4 rounded-lg bg-[#073B67] text-white text-sm font-bold flex items-center gap-2 hover:bg-[#062D4F] disabled:opacity-50"><Send size={15}/>Reply</button>
                </div>
                <div className="flex items-center gap-2">
                  <input ref={replyFileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setReplyFile(f); }}/>
                  <button onClick={() => replyFileRef.current?.click()} className="text-[11px] font-bold text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 flex items-center gap-1"><Paperclip size={12}/>{replyFile ? replyFile.name : 'Attach a file'}</button>
                  {replyFile && <button onClick={() => setReplyFile(null)} aria-label="Remove attachment" className="text-gray-400 hover:text-red-500"><X size={13}/></button>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Worker context */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Worker details</p>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 grid place-items-center font-bold"><UserRound size={18}/></span>
              <div><p className="text-sm font-semibold text-gray-900">{selected.worker}</p><p className="font-mono text-[11px] text-gray-500">{selected.workerId}</p></div>
            </div>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between"><dt className="text-gray-400">Site</dt><dd className="font-semibold text-gray-800">{selected.site}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Employer</dt><dd className="font-semibold text-gray-800">{selected.employer}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Category</dt><dd className="font-semibold text-gray-800">{selected.category}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Last update</dt><dd className="font-semibold text-gray-800">{new Date(selected.updatedAt).toLocaleDateString('en-IN')}</dd></div>
            </dl>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-900 leading-5 flex gap-2"><Headphones size={15} className="flex-shrink-0 mt-0.5"/>Shared visibility: the principal employer can also view and reply on this grievance. Once resolved, the worker confirms — if they reopen it, the cycle restarts for both parties.</div>
          {selected.status === 'Resolved' && !selected.resolutionConfirmed && <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 text-xs text-orange-800">Marked resolved — waiting for the worker&apos;s final confirmation, or either party can reopen.</div>}
        </aside>
      </div>
    </section>}
  </div>;
}

function Kpi({ label, value, tone }: { label:string; value:number; tone:string }) {
  return <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{label}</span></div><strong className={tone}>{value}</strong></article>;
}
