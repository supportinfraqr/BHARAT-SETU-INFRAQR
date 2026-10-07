"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, CheckCircle2, FileText, MoreVertical, QrCode, ShieldAlert, UserCheck, UserRound, Users, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import WorkerQr from '@/components/qr/WorkerQr';
import WorkerEmploymentCard from '@/components/idcard/WorkerEmploymentCard';
import ScanIdentityCard, { type ScanVerifyData } from '@/components/scan/ScanIdentityCard';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerWorker, GatePassEligibility } from '@/types/portal';
import { useEmployerDocView } from '@/components/documentEngine/portalAdapters';
import { WorkerDocumentsDrawer } from '@/components/documentEngine/DocumentFlow';

const fmtCardDate = (v?: string) => { if (!v) return ''; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

const columns: DataColumn<EmployerWorker>[] = [
  { id:'name', header:'Worker', value:row => row.name, render:row => <div><strong className="text-gray-900">{row.name}</strong><p className="font-mono text-[11px] text-gray-500">{row.bssId}</p></div> },
  { id:'contractor', header:'Contractor', value:row => row.contractor, render:row => <div><span className="font-medium text-gray-800">{row.contractor}</span><p className="text-[10px] font-mono text-gray-400">{row.contractorId}</p></div> },
  { id:'site', header:'Site', value:row => row.site, export:{split:','} },
  { id:'designation', header:'Designation', value:row => row.designation },
  { id:'compliance', header:'Compliance', value:row => row.compliance, render:row => <span className={row.compliance === 'Compliant' ? 'text-green-700' : row.compliance === 'Expiring' ? 'text-orange-700' : 'text-red-700'}>{row.compliance}</span> },
  { id:'verified', header:'Verification', value:row => row.verified ? 'Verified' : 'Pending', render:row => <span className={row.verified ? 'text-green-700' : 'text-orange-700'}>{row.verified ? 'Verified' : 'Pending'}</span> },
  { id:'status', header:'Status', value:row => row.status },
];

export default function EmployerWorkersPage() {
  const { employer } = useEmployer();
  const docCtx = useEmployerDocView();
  const [docsWorker, setDocsWorker] = useState<EmployerWorker | null>(null);
  const [qrWorker, setQrWorker] = useState<EmployerWorker | null>(null);
  const [profileView, setProfileView] = useState<EmployerWorker | null>(null);
  const [profileDetail, setProfileDetail] = useState<ScanVerifyData | null>(null);
  const [empView, setEmpView] = useState<EmployerWorker | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState('');

  const active = employer.workers.filter(worker => worker.status === 'Active').length;
  const verified = employer.workers.filter(worker => worker.verified).length;
  const attention = employer.workers.filter(worker => worker.compliance !== 'Compliant').length;

  function openProfile(row: EmployerWorker) {
    setProfileView(row);
    setProfileDetail(null);
    setOpenMenuFor('');
    void fetch(`/api/identity/verify/${encodeURIComponent(row.bssId)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((j: { data?: ScanVerifyData } | null) => { if (j?.data) setProfileDetail(j.data); })
      .catch(() => {});
  }

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Connected workforce</p><h1 className="text-2xl font-bold mt-1">Workers</h1><p className="text-sm text-gray-500 mt-1">A consolidated view of workers supplied by connected contractors — with full profile details, identity card, compliance documents, and QR identity.</p></header>
    <div className="grid grid-cols-3 gap-3"><Metric label="Total connected" value={employer.workers.length} icon={Users} tone="bg-blue-50 text-blue-700"/><Metric label="Active and verified" value={Math.min(active, verified)} icon={UserCheck} tone="bg-green-50 text-green-700"/><Metric label="Compliance attention" value={attention} icon={ShieldAlert} tone="bg-orange-50 text-orange-700"/></div>
    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex gap-3 text-xs text-blue-900"><CheckCircle2 size={16} className="shrink-0 mt-0.5"/><p>Worker records are managed in partnership with contractors. Principal Employers have complete visibility over worker identity credentials, eligibility checks, cost breakdowns, and compliance documents.</p></div>
    <EnterpriseDataTable title="Connected worker directory" rows={employer.workers} columns={[...columns, { id:'actions', header:'Actions', filterable:false, value:row => row.id, render:row => <ActionMenu open={openMenuFor === row.id} onToggle={() => setOpenMenuFor(openMenuFor === row.id ? '' : row.id)} onViewProfile={() => openProfile(row)} onEmploymentCard={() => { setEmpView(row); setOpenMenuFor(''); }} onQr={() => { setQrWorker(row); setOpenMenuFor(''); }} onDocs={() => { setDocsWorker(row); setOpenMenuFor(''); }} /> }]} rowKey={row => `${row.id}-${row.contractorId}-${row.siteId}`} filename="employer-connected-workers"/>
    
    {/* QR modal */}
    {qrWorker && <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={() => setQrWorker(null)}><section role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-sm text-center relative" onClick={e => e.stopPropagation()}><button onClick={() => setQrWorker(null)} aria-label="Close" className="absolute right-4 top-4"><X/></button><h2 className="font-semibold">{qrWorker.name}</h2><p className="text-xs font-mono text-gray-500">{qrWorker.bssId}</p><div className="relative w-56 h-56 mx-auto mt-5"><WorkerQr bssId={qrWorker.bssId} className="w-full h-full"/><span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[44px] h-[44px] bg-white rounded-[8px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[34px] h-[34px] object-contain"/></span></span></div><p className="text-xs text-gray-500 mt-4">Verification still applies server-side disclosure rules.</p></section></div>}
    
    {/* Documents drawer */}
    {docsWorker && <WorkerDocumentsDrawer owner={docCtx.owner} view={docCtx.view} worker={{ id: docsWorker.id, name: docsWorker.name, bssId: docsWorker.bssId, site: docsWorker.site, siteId: docsWorker.siteId, employer: employer.identity.company, contractor: docsWorker.contractor, contractorId: docsWorker.contractorId, designation: docsWorker.designation, doj: docsWorker.doj, status: docsWorker.status, verified: docsWorker.verified }} onClose={() => setDocsWorker(null)}/>}

    {/* Worker profile drawer */}
    {profileView && <div className="fixed inset-0 z-[90] bg-black/50 flex justify-end" role="presentation"><section role="dialog" aria-modal="true" aria-label="Worker profile" className="bg-white w-full max-w-md h-full overflow-y-auto animate-in slide-in-from-right-4 duration-200">
      <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {profileView.photoUrl && profileView.photoUrl !== '/worker-profile.png' ? (
            <img src={profileView.photoUrl} alt={profileView.name} className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center border border-gray-200">
              <UserRound size={24} />
            </div>
          )}
          <div><h2 className="font-semibold text-gray-950">{profileView.name}</h2><p className="text-xs text-gray-500 font-mono mt-0.5">{profileView.bssId}</p></div>
        </div>
        <button onClick={() => setProfileView(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
      </header>
      <div className="p-5 space-y-4 text-xs">
        <div className="flex flex-wrap gap-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${profileView.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{profileView.status}</span></div>
        {profileDetail
          ? <ScanIdentityCard data={profileDetail} />
          : <p className="text-xs text-gray-400 py-6 text-center rounded-xl border border-dashed border-gray-200">Loading full profile…</p>}
        <EligibilityGrid eligibility={profileView.eligibility} />
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Binding</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Info label="Ref Worker Code" value={profileView.refCode ?? '—'}/>
            <Info label="Designation" value={profileView.designation || '—'}/>
            <Info label="Site" value={profileView.site || '—'}/>
            <Info label="Contractor" value={profileView.contractor || '—'}/>
            <Info label="Date of Joining" value={profileView.doj || '—'}/>
            <Info label="Compliance" value={profileView.compliance}/>
            <Info label="Cost sheet" value={profileView.costSheetName || profileView.costSheet || '—'}/>
            <Info label="CTC (monthly)" value={profileView.ctc ? `₹${profileView.ctc.toLocaleString('en-IN')}` : '—'}/>
          </dl>
          {profileView.skills && profileView.skills.length > 0 && <div className="mt-3"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Skills</p><div className="flex flex-wrap gap-1.5">{profileView.skills.map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">{s}</span>)}</div></div>}
          {profileView.costBreakdown && ((profileView.costBreakdown.statutory?.length ?? 0) > 0 || (profileView.costBreakdown.custom?.length ?? 0) > 0) && <div className="mt-4 rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Worker cost · {profileView.costBreakdown.templateCode || 'cost sheet'}</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <span className="text-gray-500">Basic + VDA (wage)</span><span className="font-semibold text-right">₹{(profileView.costBreakdown.minimumWage ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-gray-500">Statutory total</span><span className="font-semibold text-right">₹{(profileView.costBreakdown.statutoryTotal ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-gray-500">Custom total</span><span className="font-semibold text-right">₹{(profileView.costBreakdown.customTotal ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-gray-700 font-bold border-t border-gray-100 pt-1.5">Employer cost</span><span className="font-bold text-right border-t border-gray-100 pt-1.5">₹{(profileView.costBreakdown.employerCost ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-gray-700 font-bold">CTC (monthly)</span><span className="font-bold text-right text-[#073B67]">₹{(profileView.costBreakdown.ctc ?? profileView.ctc ?? 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">{(profileView.costBreakdown.statutory ?? []).map(s => <span key={s.component} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-gray-600">{s.component} ₹{s.amount.toLocaleString('en-IN')}</span>)}{(profileView.costBreakdown.custom ?? []).map(c => <span key={c.name} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700">{c.name} ₹{c.computed.toLocaleString('en-IN')}</span>)}</div>
          </div>}
        </div>
      </div>
    </section></div>}

    {/* Employment card — worker's site employment ID (issued by the worker's contractor) */}
    {empView && <WorkerEmploymentCard workerName={empView.name} bssId={empView.bssId} designation={empView.designation} mobile={empView.mobile} department={empView.department} uan={empView.uan} esic={empView.esic} campNo={empView.campNo} routeBusNo={empView.routeBusNo} photoUrl={empView.photoUrl} siteName={empView.site} siteId={empView.siteId} siteCode={empView.siteCode} siteAddress={empView.siteAddress} supervisorName={empView.supervisorName} supervisorContact={empView.supervisorContact} emergencyName={empView.emergencyName} emergencyNumber={empView.emergencyNumber} emergencyRelation={empView.emergencyRelation} bloodGroup={empView.bloodGroup} companyName={employer.identity.company} contractorName={empView.contractor} contractorId={empView.contractorCode || empView.contractorId} contractorContact={empView.contractorContact} contractorEmail={empView.contractorEmail} siteColour={empView.siteColour || undefined} issueDate={fmtCardDate(empView.idCardIssueDate)} validTill={fmtCardDate(empView.idCardValidityTill)} onClose={() => setEmpView(null)} />}
  </div>;
}

function ActionMenu({ open, onToggle, onViewProfile, onEmploymentCard, onQr, onDocs }: { open: boolean; onToggle: () => void; onViewProfile: () => void; onEmploymentCard: () => void; onQr: () => void; onDocs: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<{ top?: number; bottom?: number; right: number; maxHeight: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const right = Math.max(8, window.innerWidth - rect.right);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const ESTIMATED = 180;
      if (spaceBelow < ESTIMATED && spaceAbove > spaceBelow) {
        const height = Math.min(ESTIMATED, spaceAbove);
        setAnchor({ top: rect.top - height - 4, right, maxHeight: Math.max(120, spaceAbove) });
      } else {
        setAnchor({ top: rect.bottom + 4, right, maxHeight: Math.max(120, spaceBelow) });
      }
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  return <>
    <button ref={btnRef} onClick={onToggle} aria-label="Worker actions" aria-expanded={open} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-100 text-gray-400"><MoreVertical size={16}/></button>
    {open && anchor && createPortal(<>
      <div className="fixed inset-0 z-[110]" onClick={onToggle} />
      <div role="menu" className="fixed z-[120] w-52 bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-900/5 p-1.5 overflow-y-auto" style={{ top: anchor.top, bottom: anchor.bottom, right: anchor.right, maxHeight: anchor.maxHeight }}>
        <button role="menuitem" onClick={onViewProfile} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg hover:bg-gray-50 text-left"><UserRound size={14} className="text-gray-400"/>View Profile</button>
        <button role="menuitem" onClick={onEmploymentCard} className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left bg-[#073B67]/[0.06] hover:bg-[#073B67]/[0.12] border border-[#073B67]/15">
          <span className="mt-0.5 w-6 h-6 rounded-md bg-[#073B67] text-white grid place-items-center flex-shrink-0"><Briefcase size={13}/></span>
          <span className="min-w-0">
            <span className="block text-xs font-bold text-[#073B67]">Employment Card</span>
            <span className="block text-[10px] text-gray-500 leading-tight">Worker&apos;s site employment ID — view / print</span>
          </span>
        </button>
        <button role="menuitem" onClick={onQr} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg hover:bg-gray-50 text-left"><QrCode size={14} className="text-gray-400"/>QR Code</button>
        <button role="menuitem" onClick={onDocs} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg hover:bg-gray-50 text-left"><FileText size={14} className="text-gray-400"/>Compliance Documents</button>
      </div>
    </>, document.body)}
  </>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Users; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
function Info({ label, value }: { label:string; value:string }) { return <div className="rounded-lg border border-gray-100 p-2.5"><dt className="text-gray-400 text-[10px]">{label}</dt><dd className="font-semibold text-gray-800 mt-0.5">{value}</dd></div>; }

function EligibilityGrid({ eligibility }: { eligibility?: GatePassEligibility }) {
  const done = (v?: string) => v === 'Done';
  const categories: Array<{ label:string; ok:boolean; items:Array<[string, boolean]> }> = [
    { label:'Medical', ok:done(eligibility?.medical), items:[['Medical examination', done(eligibility?.medical)]] },
    { label:'Health & Safety', ok:done(eligibility?.healthSafety), items:[['Safety Kit', done(eligibility?.safetyKit)], ['Safety Training', done(eligibility?.safetyTraining)], ['Site Induction', done(eligibility?.siteInduction)]] },
    { label:'Compliance', ok:done(eligibility?.compliance), items:[['Aadhaar', done(eligibility?.aadhaar)], ['Bank account', done(eligibility?.bank)], ['UAN', done(eligibility?.uan)], ['ESIC', done(eligibility?.esi)]] },
  ];
  const tempOk = eligibility?.temporaryEligible ?? (done(eligibility?.medical) && done(eligibility?.healthSafety));
  const permOk = eligibility?.permanentEligible ?? (tempOk && done(eligibility?.compliance));
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Eligibility — 3 categories</p>
      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.label} className={`rounded-lg border px-2.5 py-2 ${cat.ok ? 'border-green-100 bg-green-50/50' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full grid place-items-center text-white text-[9px] flex-shrink-0 ${cat.ok ? 'bg-green-600' : 'bg-gray-300'}`}>{cat.ok ? '✓' : '✗'}</span>
              <span className="text-[11px] font-bold text-gray-800">{cat.label}</span>
            </div>
            <div className="mt-1.5 pl-6 flex flex-wrap gap-1.5">
              {cat.items.map(([label, ok]) => <span key={label} className={`text-[10px] px-1.5 py-0.5 rounded ${ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{label} {ok ? '✓' : '✗'}</span>)}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-gray-500">Temporary: <strong className={tempOk ? 'text-green-700' : 'text-orange-600'}>{tempOk ? 'eligible' : 'not eligible'}</strong> · Permanent: <strong className={permOk ? 'text-green-700' : 'text-orange-600'}>{permOk ? 'eligible' : 'not eligible'}</strong></p>
    </div>
  );
}

