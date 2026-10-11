"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Eye, FileText, ShieldCheck } from 'lucide-react';
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
      sites: [{ name: employment.site, code: employment.siteDetails?.code, address: employment.siteDetails?.location }],
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHero
        title="My Issued Letters"
        subtitle="Letters and passes issued to you by your principal employer. They are generated automatically and cannot be uploaded or edited."
        actions={<Link href="/worker/Profile" className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors" aria-label="Go back"><ChevronLeft size={18} /></Link>}
      />

      <section className="bss-3d bss-scroll-rise rounded-2xl border border-bss-border bg-white p-5">
        <h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2"><ShieldCheck size={16} className="text-[#073B67]"/>Gate Passes</h2>
        {gatePasses.length ? <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {gatePasses.map(pass => (
            <div key={String(pass.id)} className="rounded-xl border border-bss-border p-4">
              <div className="flex items-center justify-between gap-2"><strong className="text-sm text-bss-text-primary">{pass.type} Gate Pass</strong><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pass.status === 'Blocked' ? 'bg-bss-bg text-bss-text-secondary' : pass.status === 'Approved' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>{pass.status}</span></div>
              <p className="text-[11px] font-mono text-[#073B67] mt-1">{pass.number}</p>
              <p className="text-[11px] text-bss-text-muted mt-0.5">{pass.site} · {pass.validFrom || '—'} → {pass.validTo || '—'}</p>
              <button disabled={pass.blocked} onClick={() => { void viewPass(pass); }} className="mt-3 h-8 px-3 rounded-lg bg-[#0F172A] text-white text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"><Eye size={12}/>View pass</button>
            </div>
          ))}
        </div> : <p className="text-sm text-bss-text-muted mt-3">No gate pass issued yet. Your contractor requests one and the principal employer approves.</p>}
      </section>

      <section className="bss-3d bss-scroll-rise rounded-2xl border border-bss-border bg-white p-5">
        <h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2"><FileText size={16} className="text-[#073B67]"/>Current Letters</h2>
        <p className="text-[11px] text-bss-text-muted mt-1">Letters from your current engagement. These are fixed PDF copies — later site changes never alter them.</p>
        {currentLetters.length ? <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {currentLetters.map((letter, index) => (
            <div key={`cur-${letter.id}-${letter.date ?? index}`} className="rounded-xl border border-bss-border p-4">
              <div className="flex items-center justify-between gap-2"><strong className="text-sm text-bss-text-primary">{letter.name}</strong><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Issued</span></div>
              <p className="text-[11px] text-bss-text-muted mt-0.5">Issued {letter.date ? new Date(letter.date).toLocaleDateString('en-IN') : '—'}</p>
              {letter.downloadUrl && <a href={letter.downloadUrl} target="_blank" rel="noopener noreferrer" className="mt-3 h-8 px-3 rounded-lg bg-[#0F172A] text-white text-[11px] font-semibold inline-flex items-center gap-1"><Eye size={12}/>View letter</a>}
            </div>
          ))}
        </div> : <p className="text-sm text-bss-text-muted mt-3">Appointment and releasing letters for your current engagement appear here automatically.</p>}
      </section>

      {preview && <GatePassViewer html={preview.html} title={preview.title} onClose={() => setPreview(null)} />}
    </div>
  );
}
