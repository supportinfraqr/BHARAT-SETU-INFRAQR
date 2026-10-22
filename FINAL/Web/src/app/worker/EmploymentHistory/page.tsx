"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, FileText, Clock, History } from 'lucide-react';
import { useWorker } from '@/contexts/WorkerContext';
import WorkerEmploymentCard from '@/components/idcard/WorkerEmploymentCard';
import PageHero from '@/components/portal/PageHero';
import { formatApprovalDate } from '@/lib/workerDocumentWorkflow';

function fmt(value?: string) { return value ? (formatApprovalDate(value) || value) : ''; }

export default function EmploymentHistoryPage() {
  const { worker } = useWorker();
  const history = worker.employment.history ?? [];
  type Hist = (typeof history)[number];
  const [cardFor, setCardFor] = useState<Hist | null>(null);
  const [fContractor, setFContractor] = useState('');
  const [fSite, setFSite] = useState('');
  const [fStatus, setFStatus] = useState('');

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [history]);

  const contractors = useMemo(() => Array.from(new Set(sortedHistory.map(h => h.contractor).filter(Boolean))), [sortedHistory]);
  const sites = useMemo(() => Array.from(new Set(sortedHistory.map(h => h.site).filter(Boolean))), [sortedHistory]);

  const rows = useMemo(() => sortedHistory.filter(h =>
    (!fContractor || h.contractor === fContractor) &&
    (!fSite || h.site === fSite) &&
    (!fStatus || h.status === fStatus)
  ), [sortedHistory, fContractor, fSite, fStatus]);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <PageHero
        title={<span className="inline-flex items-center gap-2"><History size={22} />Employment History</span>}
        subtitle="A chronological timeline of your engagements (Active/latest at top, older at bottom) with duration, contractor, site, appointment/experience letters, and employment cards. Requests declined by either party are not shown."
        actions={<Link href="/worker" className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors" aria-label="Go back"><ArrowLeft size={18} /></Link>}
      />

      {history.length === 0 ? (
        <p className="text-sm text-bss-text-muted text-center py-10">No employment history yet.</p>
      ) : (
        <>
          {/* Filters */}
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-xs font-semibold text-bss-text-secondary">Contractor
              <select value={fContractor} onChange={e => setFContractor(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-2 text-sm bg-white">
                <option value="">All contractors</option>
                {contractors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-bss-text-secondary">Site
              <select value={fSite} onChange={e => setFSite(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-2 text-sm bg-white">
                <option value="">All sites</option>
                {sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-bss-text-secondary">Status
              <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-2 text-sm bg-white">
                <option value="">All statuses</option>
                <option value="Active">Active</option>
                <option value="Ended">Ended</option>
                <option value="Site Changed">Site Changed</option>
              </select>
            </label>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-bss-text-muted text-center py-8">No engagements match these filters.</p>
          ) : (
            <ol className="relative border-s border-bss-border ms-3 space-y-5">
              {rows.map(h => (
                <li key={h.id} className="ms-6">
                  <span className="absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#01183A] text-white text-[10px] font-bold ring-4 ring-white">{h.sequence ?? (rows.indexOf(h) + 1)}</span>
                  <div className="bss-3d bss-scroll-rise rounded-2xl border border-bss-border bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[14px] font-bold text-[#01183A]">{h.contractor}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.current ? 'bg-bss-soft-green text-bss-green' : h.status === 'Site Changed' ? 'bg-sky-50 text-sky-700' : 'bg-bss-bg text-bss-text-secondary'}`}>{h.status}</span>
                          {h.durationLabel && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bss-blue-tint text-bss-interactive-blue inline-flex items-center gap-1"><Clock size={10} />{h.durationLabel}</span>}
                        </div>
                        <p className="text-[11px] text-bss-text-muted mt-0.5">{h.employer}{h.site ? ` · ${h.site}` : ''} · {h.ref}</p>
                      </div>
                      <p className="text-[11px] text-bss-text-muted">{fmt(h.startDate) || '—'} → {h.endDate ? fmt(h.endDate) : 'Present'}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-[12px]">
                      <div><p className="text-bss-text-muted">Contractor BSS ID</p><p className="font-mono font-semibold text-bss-text-primary">{h.contractorCode || '—'}</p></div>
                      <div><p className="text-bss-text-muted">Employer BSS ID</p><p className="font-mono font-semibold text-bss-text-primary">{h.employerCode || '—'}</p></div>
                      <div><p className="text-bss-text-muted">BSS Site ID</p><p className="font-mono font-semibold text-bss-text-primary">{h.siteBssId || '—'}</p></div>
                      <div><p className="text-bss-text-muted">Duration</p><p className="font-semibold text-bss-text-primary">{h.durationLabel || '—'}</p></div>
                      <div><p className="text-bss-text-muted">Designation</p><p className="font-semibold text-bss-text-primary">{h.designation || '—'}</p></div>
                      <div><p className="text-bss-text-muted">Department</p><p className="font-semibold text-bss-text-primary">{h.department || '—'}</p></div>
                      <div><p className="text-bss-text-muted">Shift</p><p className="font-semibold text-bss-text-primary">{h.shift || '—'}</p></div>
                      <div><p className="text-bss-text-muted">Wage</p><p className="font-semibold text-bss-text-primary">{h.wage ? `₹${h.wage.toLocaleString('en-IN')}` : '—'}</p></div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-bss-border flex flex-wrap gap-2">
                      {h.appointmentLetter?.downloadUrl && <a href={h.appointmentLetter.downloadUrl} target="_blank" rel="noopener noreferrer" className="h-8 px-3 rounded-lg border border-[#01183A]/20 text-[#01183A] text-[11px] font-bold inline-flex items-center gap-1.5"><FileText size={12} />Appointment letter</a>}
                      {h.experienceLetter?.downloadUrl && <a href={h.experienceLetter.downloadUrl} target="_blank" rel="noopener noreferrer" className="h-8 px-3 rounded-lg border border-[#01183A]/20 text-[#01183A] text-[11px] font-bold inline-flex items-center gap-1.5"><FileText size={12} />Experience letter</a>}
                      <button type="button" onClick={() => setCardFor(h)} className="h-8 px-3 rounded-lg bg-[#01183A] text-white text-[11px] font-bold inline-flex items-center gap-1.5"><BadgeCheck size={12} />Employment card{h.current ? '' : ' (expired)'}</button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {cardFor && (
        <WorkerEmploymentCard
          companyName={cardFor.employer || cardFor.contractor}
          companySub={cardFor.employerCode}
          workerName={worker.identity.name}
          designation={cardFor.designation}
          bssId={worker.identity.bssId}
          mobile={worker.contact?.mobile}
          uan={worker.socialSecurity?.epfoUan}
          esic={worker.socialSecurity?.esicIp}
          department={cardFor.department}
          photoUrl={worker.identity.photoUrl}
          contractorName={cardFor.contractor}
          contractorId={cardFor.contractorCode}
          siteName={cardFor.site}
          siteId={cardFor.siteBssId}
          siteBssId={cardFor.siteBssId}
          emergencyName={worker.identity.emergencyContactName}
          emergencyNumber={worker.identity.emergencyContactNumber}
          emergencyRelation={worker.identity.emergencyContactRelation}
          bloodGroup={worker.personal?.bloodGroup}
          issueDate={cardFor.startDate}
          validTill={cardFor.endDate || cardFor.startDate}
          siteColour={worker.employment.siteDetails?.colour}
          watermark={cardFor.current ? undefined : 'EXPIRED'}
          onClose={() => setCardFor(null)}
        />
      )}
    </div>
  );
}
