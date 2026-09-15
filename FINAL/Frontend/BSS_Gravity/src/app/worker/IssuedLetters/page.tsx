"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Eye, FileText, ShieldCheck } from 'lucide-react';
import { useWorker } from '@/contexts/WorkerContext';
import { GatePassViewer } from '@/components/documentEngine/GatePassViewer';
import { buildGatePassHtml } from '@/lib/documentEngine/gatePass';
import type { OwnerScope } from '@/lib/documentEngine/types';
import type { PortalView, WorkerLike } from '@/lib/documentEngine/workerDataService';

export default function IssuedLettersPage() {
  const { worker } = useWorker();
  const gatePasses = worker.gatePasses ?? [];
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

  async function viewPass(pass: { type: string; number: string; validFrom: string; validTo: string; blocked?: boolean }) {
    const html = await buildGatePassHtml(docView.owner, docView.view, docView.workerLike, pass.type === 'Permanent' ? 'permanent-gate-pass' : 'temporary-gate-pass', { validFrom: pass.validFrom, validTo: pass.validTo, number: pass.number });
    setPreview({ html, title: `${docView.workerLike.name} · ${pass.type} Gate Pass` });
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/worker/Profile" className="mt-1 w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-[#073B67] hover:border-[#073B67] transition-all" aria-label="Go back"><ChevronLeft size={18} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-[#062D4F]">My Issued Letters</h1>
          <p className="text-sm text-gray-500 mt-1">Letters and passes issued to you by your principal employer. They are generated automatically and cannot be uploaded or edited.</p>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><ShieldCheck size={16} className="text-[#073B67]"/>Gate Passes</h2>
        {gatePasses.length ? <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {gatePasses.map(pass => (
            <div key={String(pass.id)} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-2"><strong className="text-sm text-gray-900">{pass.type} Gate Pass</strong><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pass.status === 'Blocked' ? 'bg-gray-200 text-gray-700' : pass.status === 'Approved' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>{pass.status}</span></div>
              <p className="text-[11px] font-mono text-[#073B67] mt-1">{pass.number}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{pass.site} · {pass.validFrom || '—'} → {pass.validTo || '—'}</p>
              <button disabled={pass.blocked} onClick={() => { void viewPass(pass); }} className="mt-3 h-8 px-3 rounded-lg bg-[#0F172A] text-white text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"><Eye size={12}/>View pass</button>
            </div>
          ))}
        </div> : <p className="text-sm text-gray-500 mt-3">No gate pass issued yet. Your contractor requests one and the principal employer approves.</p>}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><FileText size={16} className="text-[#073B67]"/>Letters</h2>
        <p className="text-sm text-gray-500 mt-3">Appointment and experience letters issued to you will appear here automatically.</p>
      </section>

      {preview && <GatePassViewer html={preview.html} title={preview.title} onClose={() => setPreview(null)} />}
    </div>
  );
}
