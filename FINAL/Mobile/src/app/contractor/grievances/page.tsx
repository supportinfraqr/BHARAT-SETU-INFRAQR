"use client";

import { useRef, useState } from 'react';
import { CheckCircle2, FileText, Headphones, MessageSquareText, Paperclip, Play, RotateCcw, Send, UserRound, Volume2, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';
import { maskFoulLanguage } from '@/lib/profanity';
import { downloadGrievanceFile, grievanceFileBlobUrl, openGrievanceFileInNewTab } from '@/lib/grievanceFiles';
import type { ContractorGrievance } from '@/types/portal';

const statusTone: Record<ContractorGrievance['status'], string> = {
  Submitted:'bg-bss-bg text-bss-text-secondary', Open:'bg-bss-blue-tint text-bss-interactive-blue', 'In Progress':'bg-bss-soft-orange text-bss-orange', Resolved:'bg-bss-soft-green text-bss-green', Reopened:'bg-bss-soft-orange text-bss-error', Closed:'bg-bss-soft-green text-bss-green',
};

export default function ContractorGrievancesPage() {
  const { contractor, replaceContractor, refresh, employerScope, scoped } = useContractor();
  const [selectedId, setSelectedId] = useState('');
  const [reply, setReply] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [playUrl, setPlayUrl] = useState('');
  const replyFileRef = useRef<HTMLInputElement>(null);

  const grievances = scoped(contractor.grievances, g => g.employer);
  const selected = selectedId ? grievances.find(g => g.id === selectedId) : null;

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
      void refresh();
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
    if (!selected) return;
    const updated = await applyAction('resolve');
    if (updated) setNotice(`${selected.ref} marked resolved — awaiting the worker's confirmation.`);
  }

  async function reopenGrievance() {
    if (!selected) return;
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
    { id:'ref', header:'Reference', value:g => g.ref, render:g => <button onClick={() => setSelectedId(g.id)} className="font-mono text-bss-interactive-blue hover:underline text-left">{g.ref}</button> },
    { id:'worker', header:'Worker', value:g => g.worker, render:g => <div><strong className="text-bss-text-primary">{g.worker}</strong><p className="font-mono text-[10px] text-bss-text-muted">{g.workerId}</p></div> },
    { id:'category', header:'Category', value:g => g.category },
    { id:'site', header:'Site', value:g => g.site },
    { id:'status', header:'Status', value:g => g.status, render:g => <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusTone[g.status]}`}>{g.status}</span> },
    { id:'raised', header:'Raised', value:g => g.raisedAt.slice(0, 10) },
    { id:'actions', header:'Details', filterable:false, value:g => g.ref, render:g => <button onClick={() => setSelectedId(g.id)} className="px-2.5 py-1 rounded-lg bg-bss-blue-tint text-bss-interactive-blue hover:bg-bss-blue-tint font-semibold text-xs border border-bss-border">View details</button> },
  ];

  return <div className="space-y-6 pb-12">
    <header>
      <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Workforce operations</p>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-bss-text-primary mt-1">Grievances</h1>
      <p className="text-sm text-bss-text-muted mt-1">Worker grievances raised by workers bound to your organisation — review, reply, resolve and track the full lifecycle with your principal employer.</p>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-5 gap-3">
      <Kpi label="Total grievances" value={counts.total} tone="text-bss-text-primary"/>
      <Kpi label="Open" value={counts.open} tone="text-bss-interactive-blue"/>
      <Kpi label="In progress" value={counts.progress} tone="text-bss-orange"/>
      <Kpi label="Resolved" value={counts.resolved} tone="text-bss-green"/>
      <Kpi label="Closed" value={counts.closed} tone="text-bss-green"/>
    </section>

    <div className="bg-bss-blue-tint border border-bss-border text-bss-text-primary rounded-xl px-4 py-3 text-xs">You see grievances from <strong>{employerScope === 'all' ? 'all bound principal employers' : employerScope}</strong>. Worker visibility is limited to workers bound to your contractor profile. Contractor and principal employer share the same grievance conversation; replies are visible to the worker and both parties.</div>

    <EnterpriseDataTable title="Worker grievance register" rows={grievances} columns={columns} rowKey={g => g.id} filename="contractor-grievances"/>

    {/* Detail + conversation */}
    {selected && <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-bss-border flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-bss-blue-tint text-bss-interactive-blue grid place-items-center"><MessageSquareText size={18}/></span>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-bss-text-primary">{selected.ref}</h2><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusTone[selected.status]}`}>{selected.status}</span></div>
            <p className="text-xs text-bss-text-muted mt-0.5">{selected.category} · Raised {new Date(selected.raisedAt).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!['Resolved', 'Closed'].includes(selected.status) && <button disabled={busy} onClick={resolveGrievance} className="h-9 px-3 rounded-lg bg-bss-green text-white text-xs font-bold flex items-center gap-1.5 hover:brightness-95 disabled:opacity-50"><CheckCircle2 size={14}/>Mark resolved</button>}
          {['Resolved', 'Closed'].includes(selected.status) && <button disabled={busy} onClick={reopenGrievance} className="h-9 px-3 rounded-lg border border-bss-border text-bss-error text-xs font-bold flex items-center gap-1.5 hover:bg-bss-soft-orange disabled:opacity-50"><RotateCcw size={14}/>Reopen</button>}
          {selected.resolutionConfirmed && <span className="h-9 px-3 rounded-lg bg-bss-soft-green border border-bss-border text-bss-green text-xs font-bold inline-flex items-center gap-1.5"><CheckCircle2 size={14}/>Worker confirmed</span>}
        </div>
      </header>

      <div className="p-5 grid lg:grid-cols-[1fr_260px] gap-6">
        <div className="space-y-5">
          {/* Description + evidence */}
          <div className="rounded-xl border border-bss-border p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Grievance description</p>
            <p className="text-sm text-bss-text-primary leading-6">{maskFoulLanguage(selected.description)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {maskFoulLanguage(selected.description) !== selected.description && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-bss-text-muted bg-bss-bg border border-bss-border rounded-full px-2.5 py-1">Offensive words masked in this case</span>}
              {selected.audioAvailable && <button onClick={() => void playAudio()} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-bss-interactive-blue bg-bss-blue-tint border border-bss-border rounded-full px-2.5 py-1 hover:bg-bss-blue-tint"><Volume2 size={12}/>Play audio grievance <Play size={11}/></button>}
              {selected.attachmentName && <button onClick={() => void openGrievanceFileInNewTab(selected.id, 'attachment')} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-bss-text-primary bg-bss-bg border border-bss-border rounded-full px-2.5 py-1 hover:bg-bss-bg"><FileText size={12}/>{selected.attachmentName}</button>}
            </div>
            {playUrl && <audio controls autoPlay src={playUrl} className="mt-3 w-full" />}
          </div>

          {/* Conversation */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-3">Conversation · Contractor & Employer reply history</p>
            <div className="space-y-3">
              {selected.replyHistory.length === 0 && <p className="text-xs text-bss-text-muted rounded-xl border border-dashed border-bss-border p-4 text-center">No replies yet. Respond to the worker to begin the review → reply → resolve cycle.</p>}
              {selected.replyHistory.map(entry => (
                <div key={entry.id} className={`max-w-[85%] rounded-xl border p-3 text-xs ${entry.by === 'Worker' ? 'bg-bss-bg border-bss-border ml-auto' : entry.by === 'Employer' ? 'bg-bss-blue-tint border-bss-border' : 'bg-bss-blue-tint border-bss-border'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-1">{entry.by} · {new Date(entry.at).toLocaleString('en-IN')}</p>
                  {entry.text && <p className="text-bss-text-primary leading-5 whitespace-pre-line">{entry.by === 'Worker' ? maskFoulLanguage(entry.text) : entry.text}</p>}
                  {entry.attachment && <button onClick={() => void openGrievanceFileInNewTab(selected.id, 'attachment', entry.id)} className="mt-1 text-[11px] font-bold text-[#01183A] hover:underline flex items-center gap-1"><Paperclip size={11}/>{entry.attachmentName || 'Attachment'}</button>}
                </div>
              ))}
            </div>
            {selected.status !== 'Closed' && (
              <div className="mt-4 space-y-2">
                <div className="flex gap-2">
                  <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void sendReply(); }} placeholder="Reply to the worker…" className="flex-1 h-11 rounded-lg border border-bss-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20"/>
                  <button onClick={sendReply} disabled={busy || (!reply.trim() && !replyFile)} className="h-11 px-4 rounded-lg bg-[#01183A] text-white text-sm font-bold flex items-center gap-2 hover:bg-[#022B5E] disabled:opacity-50"><Send size={15}/>Reply</button>
                </div>
                <div className="flex items-center gap-2">
                  <input ref={replyFileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setReplyFile(f); }}/>
                  <button onClick={() => replyFileRef.current?.click()} className="text-[11px] font-bold text-bss-text-secondary border border-bss-border rounded-lg px-2.5 py-1.5 hover:bg-bss-bg flex items-center gap-1"><Paperclip size={12}/>{replyFile ? replyFile.name : 'Attach a file'}</button>
                  {replyFile && <button onClick={() => setReplyFile(null)} aria-label="Remove attachment" className="text-bss-text-muted hover:text-bss-error"><X size={13}/></button>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Worker context */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-bss-border p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-3">Worker details</p>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-bss-blue-tint text-bss-interactive-blue grid place-items-center font-bold"><UserRound size={18}/></span>
              <div><p className="text-sm font-semibold text-bss-text-primary">{selected.worker}</p><p className="font-mono text-[11px] text-bss-text-muted">{selected.workerId}</p></div>
            </div>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between"><dt className="text-bss-text-muted">Site</dt><dd className="font-semibold text-bss-text-primary">{selected.site}</dd></div>
              <div className="flex justify-between"><dt className="text-bss-text-muted">Employer</dt><dd className="font-semibold text-bss-text-primary">{selected.employer}</dd></div>
              <div className="flex justify-between"><dt className="text-bss-text-muted">Category</dt><dd className="font-semibold text-bss-text-primary">{selected.category}</dd></div>
              <div className="flex justify-between"><dt className="text-bss-text-muted">Last update</dt><dd className="font-semibold text-bss-text-primary">{new Date(selected.updatedAt).toLocaleDateString('en-IN')}</dd></div>
            </dl>
          </div>
          <div className="rounded-xl bg-bss-blue-tint border border-bss-border p-4 text-xs text-bss-text-primary leading-5 flex gap-2"><Headphones size={15} className="flex-shrink-0 mt-0.5"/>Shared visibility: the principal employer can also view and reply on this grievance. Once resolved, the worker confirms — if they reopen it, the cycle restarts for both parties.</div>
          {selected.status === 'Resolved' && !selected.resolutionConfirmed && <div className="rounded-xl bg-bss-soft-orange border border-bss-border p-4 text-xs text-bss-orange">Marked resolved — waiting for the worker&apos;s final confirmation, or either party can reopen.</div>}
        </aside>
      </div>
    </section>}
  </div>;
}

function Kpi({ label, value, tone }: { label:string; value:number; tone:string }) {
  return <article className="bss-kpi-card bss-hover-lift"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-muted">{label}</span></div><strong className={tone}>{value}</strong></article>;
}
