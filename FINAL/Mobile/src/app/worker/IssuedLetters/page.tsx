"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, Download, Eye, FileText, MapPin, ShieldCheck } from 'lucide-react';
import { useWorker } from '@/contexts/WorkerContext';
import PageHero from '@/components/portal/PageHero';
import { GatePassViewer } from '@/components/documentEngine/GatePassViewer';
import { buildGatePassHtml } from '@/lib/documentEngine/gatePass';
import type { OwnerScope } from '@/lib/documentEngine/types';
import type { PortalView, WorkerLike } from '@/lib/documentEngine/workerDataService';

export default function IssuedLettersPage() {
  const { worker, portal } = useWorker();
  const gatePasses = worker.gatePasses ?? [];
  const legacyLetters = (portal.documents ?? []).filter(doc => /letter/i.test(doc.name) && (doc.downloadUrl || doc.status === 'ISSUED'))
    .map(doc => ({ id: 0, name: doc.name, letterType: /appointment/i.test(doc.name) ? 'appointment' as const : 'experience' as const, code: '', date: doc.date, fileName: '', downloadUrl: doc.downloadUrl ?? '', bindingId: null, current: true }));
  const all = (portal.issuedLetters?.length ? portal.issuedLetters : legacyLetters);
  // Show only the letters tied to the CURRENT engagement — older letters live
  // in the worker's Employment History (Profile → Employment).
  const currentLetters = all.filter(l => l.current);
  const [preview, setPreview] = useState<{ html: string; title: string } | null>(null);

  const docView = useMemo(() => {
    const employment = worker.employment;
    const owner: OwnerScope = { ownerType: 'employer', ownerId: employment.employerDetails?.code ?? '', ownerName: employment.employer, bssId: employment.employerDetails?.code ?? '' };
    const workerLike: WorkerLike = { name: worker.identity.name, bssId: worker.identity.bssId, site: employment.site, designation: employment.designation, employer: employment.employer, contractor: employment.contractor, doj: employment.doj, gender: worker.identity.gender, photoUrl: worker.identity.photoUrl, status: employment.status };
    const view: PortalView = {
      owner,
      workers: [workerLike],
      sites: [{ name: employment.site, bssId: employment.siteDetails?.bssId, address: employment.siteDetails?.location }],
      contractors: [{ name: employment.contractor, bssId: employment.contractorDetails?.code ?? '', address: employment.contractorDetails?.address }],
      employers: [{ name: employment.employer, bssId: employment.employerDetails?.code ?? '', address: employment.employerDetails?.address }],
    };
    return { owner, view, workerLike };
  }, [worker]);

  async function viewPass(pass: { type: string; number: string; validFrom: string; validTo: string; blocked?: boolean; branding?: { companyName?: string; logoUrl?: string; header?: string } }) {
    const html = await buildGatePassHtml(docView.owner, docView.view, docView.workerLike, pass.type === 'Permanent' ? 'permanent-gate-pass' : 'temporary-gate-pass', { validFrom: pass.validFrom, validTo: pass.validTo, number: pass.number, branding: pass.branding });
    setPreview({ html, title: `${docView.workerLike.name} · ${pass.type} Gate Pass` });
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <PageHero
        eyebrow="Documents"
        title="My Issued Letters"
        subtitle="Letters and passes issued to you by your principal employer. They are generated automatically and cannot be uploaded or edited."
        actions={<Link href="/worker/Profile" className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors" aria-label="Go back"><ChevronLeft size={18} /></Link>}
      />

      <section className="bss-card bss-scroll-rise rounded-2xl p-5">
        <header className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-bss-blue-tint text-bss-interactive-blue grid place-items-center"><ShieldCheck size={17} /></span>
          <div><h2 className="text-sm font-semibold text-bss-text-primary">Gate Passes</h2><p className="text-xs text-bss-text-muted mt-0.5">Site access permits issued for your current engagement.</p></div>
        </header>
        {gatePasses.length ? <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {gatePasses.map(pass => {
            const tone = pass.status === 'Blocked' ? 'bg-bss-bg text-bss-text-secondary' : pass.status === 'Approved' ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-soft-orange text-bss-orange';
            return (
              <article key={String(pass.id)} className="rounded-2xl border border-bss-border bg-white p-4 flex flex-col hover:border-bss-interactive-blue/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <span className="w-10 h-10 rounded-xl bg-bss-blue-tint text-bss-interactive-blue grid place-items-center"><ShieldCheck size={18} /></span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tone}`}>{pass.status}</span>
                </div>
                <strong className="text-sm font-semibold text-bss-text-primary mt-3">{pass.type} Gate Pass</strong>
                <code className="text-[11px] font-mono text-bss-interactive-blue mt-0.5">{pass.number}</code>
                <p className="text-[11px] text-bss-text-muted mt-2 flex items-center gap-1.5"><MapPin size={12} className="shrink-0" />{pass.site || '—'}</p>
                <p className="text-[11px] text-bss-text-muted mt-0.5 flex items-center gap-1.5"><CalendarDays size={12} className="shrink-0" />{pass.validFrom || '—'} → {pass.validTo || '—'}</p>
                <button disabled={pass.blocked} onClick={() => { void viewPass(pass); }} className="mt-4 h-9 w-full rounded-lg bg-bss-navy text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-bss-deep-navy transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Eye size={13} />View pass</button>
              </article>
            );
          })}
        </div> : <EmptyState icon={ShieldCheck} text="No gate pass issued yet. Your contractor requests one and the principal employer approves." />}
      </section>

      <section className="bss-card bss-scroll-rise rounded-2xl p-5">
        <header className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-bss-soft-green text-bss-green grid place-items-center"><FileText size={17} /></span>
          <div><h2 className="text-sm font-semibold text-bss-text-primary">Current Letters</h2><p className="text-xs text-bss-text-muted mt-0.5">Letters from your current engagement — fixed PDF copies that later site changes never alter.</p></div>
        </header>
        {currentLetters.length ? <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {currentLetters.map((letter, index) => (
            <article key={`cur-${letter.id}-${letter.date ?? index}`} className="rounded-2xl border border-bss-border bg-white p-4 flex flex-col hover:border-bss-interactive-blue/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <span className="w-10 h-10 rounded-xl bg-bss-soft-green text-bss-green grid place-items-center"><FileText size={18} /></span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bss-soft-green text-bss-green">Issued</span>
              </div>
              <strong className="text-sm font-semibold text-bss-text-primary mt-3">{letter.name}</strong>
              <p className="text-[11px] text-bss-text-muted mt-1 flex items-center gap-1.5"><CalendarDays size={12} className="shrink-0" />Issued {letter.date ? new Date(letter.date).toLocaleDateString('en-IN') : '—'}</p>
              {letter.downloadUrl
                ? <a href={letter.downloadUrl} target="_blank" rel="noopener noreferrer" className="mt-4 h-9 rounded-lg bg-bss-navy text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-bss-deep-navy transition-colors"><Download size={13} />View letter</a>
                : <span className="mt-4 h-9 rounded-lg bg-bss-bg text-bss-text-muted text-xs font-semibold inline-flex items-center justify-center gap-1.5">Not available</span>}
            </article>
          ))}
        </div> : <EmptyState icon={FileText} text="Appointment and releasing letters for your current engagement appear here automatically." />}
      </section>

      {preview && <GatePassViewer html={preview.html} title={preview.title} onClose={() => setPreview(null)} />}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof FileText; text: string }) {
  return <div className="mt-4 rounded-2xl border border-dashed border-bss-border bg-bss-bg/50 py-10 px-6 text-center">
    <span className="mx-auto w-12 h-12 rounded-2xl bg-bss-bg border border-bss-border grid place-items-center text-bss-text-muted"><Icon size={22} /></span>
    <p className="text-sm text-bss-text-muted mt-3 max-w-md mx-auto">{text}</p>
  </div>;
}
