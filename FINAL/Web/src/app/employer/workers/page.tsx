"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, CheckCircle2, MoreVertical, QrCode, ShieldAlert, UserCheck, UserRound, Users, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import WorkerQr from '@/components/qr/WorkerQr';
import WorkerEmploymentCard from '@/components/idcard/WorkerEmploymentCard';
import ScanIdentityCard, { type ScanVerifyData } from '@/components/scan/ScanIdentityCard';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerWorker, GatePassEligibility } from '@/types/portal';

const fmtCardDate = (v?: string) => { if (!v) return ''; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

const columns: DataColumn<EmployerWorker>[] = [
  { id:'name', header:'Worker', value:row => row.name, render:row => <div><strong className="text-bss-text-primary">{row.name}</strong><p className="font-mono text-[11px] text-bss-text-muted">{row.bssId}</p></div> },
  { id:'contractor', header:'Contractor', value:row => row.contractor, render:row => <div><span className="font-medium text-bss-text-primary">{row.contractor}</span><p className="text-[10px] font-mono text-bss-text-muted">{row.contractorId}</p></div> },
  { id:'site', header:'Site', value:row => row.site, export:{split:','} },
  { id:'designation', header:'Designation', value:row => row.designation },
  { id:'compliance', header:'Compliance', value:row => row.compliance, render:row => <span className={row.compliance === 'Compliant' ? 'text-bss-green' : row.compliance === 'Expiring' ? 'text-bss-orange' : 'text-bss-error'}>{row.compliance}</span> },
  { id:'verified', header:'Verification', value:row => row.verified ? 'Verified' : 'Pending', render:row => <span className={row.verified ? 'text-bss-green' : 'text-bss-orange'}>{row.verified ? 'Verified' : 'Pending'}</span> },
  { id:'status', header:'Status', value:row => row.status },
];

export default function EmployerWorkersPage() {
  const { employer } = useEmployer();
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
    <header><p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Connected workforce</p><h1 className="text-2xl font-bold mt-1">Workers</h1><p className="text-sm text-bss-text-muted mt-1">A consolidated view of workers supplied by connected contractors — with full profile details, identity card, compliance documents, and QR identity.</p></header>
    <div className="grid grid-cols-3 gap-3"><Metric label="Total connected" value={employer.workers.length} icon={Users} tone="bg-bss-blue-tint text-bss-interactive-blue"/><Metric label="Active and verified" value={Math.min(active, verified)} icon={UserCheck} tone="bg-bss-soft-green text-bss-green"/><Metric label="Compliance attention" value={attention} icon={ShieldAlert} tone="bg-bss-soft-orange text-bss-orange"/></div>
    <div className="bg-bss-blue-tint border border-bss-border rounded-xl px-4 py-3 flex gap-3 text-xs text-bss-text-primary"><CheckCircle2 size={16} className="shrink-0 mt-0.5"/><p>Worker records are managed in partnership with contractors. Principal Employers have complete visibility over worker identity credentials, eligibility checks, cost breakdowns, and compliance documents.</p></div>
    <EnterpriseDataTable title="Connected worker directory" rows={employer.workers} columns={[...columns, { id:'actions', header:'Actions', filterable:false, value:row => row.id, render:row => <ActionMenu open={openMenuFor === row.id} onToggle={() => setOpenMenuFor(openMenuFor === row.id ? '' : row.id)} onViewProfile={() => openProfile(row)} onEmploymentCard={() => { setEmpView(row); setOpenMenuFor(''); }} onQr={() => { setQrWorker(row); setOpenMenuFor(''); }} /> }]} rowKey={row => `${row.id}-${row.contractorId}-${row.siteId}`} filename="employer-connected-workers"/>
    
    {/* QR modal */}
    {qrWorker && <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={() => setQrWorker(null)}><section role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-sm text-center relative" onClick={e => e.stopPropagation()}><button onClick={() => setQrWorker(null)} aria-label="Close" className="absolute right-4 top-4"><X/></button><h2 className="font-semibold">{qrWorker.name}</h2><p className="text-xs font-mono text-bss-text-muted">{qrWorker.bssId}</p><div className="relative w-56 h-56 mx-auto mt-5"><WorkerQr bssId={qrWorker.bssId} className="w-full h-full"/><span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[44px] h-[44px] bg-white rounded-[8px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[34px] h-[34px] object-contain"/></span></span></div><p className="text-xs text-bss-text-muted mt-4">Verification still applies server-side disclosure rules.</p></section></div>}
    
    {/* Documents drawer */}

    {/* Worker profile modal */}
    {profileView && <div className="fixed inset-0 z-[90] bg-bss-navy/40 backdrop-blur-sm grid place-items-center p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setProfileView(null); }}><section role="dialog" aria-modal="true" aria-label="Worker profile" className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
      <header className="sticky top-0 bg-white border-b border-bss-border px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {profileView.photoUrl && profileView.photoUrl !== '/worker-profile.png' ? (
            <img src={profileView.photoUrl} alt={profileView.name} className="w-12 h-12 rounded-xl object-cover border border-bss-border" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-bss-bg text-bss-text-muted flex items-center justify-center border border-bss-border">
              <UserRound size={24} />
            </div>
          )}
          <div><h2 className="font-semibold text-bss-text-primary">{profileView.name}</h2><p className="text-xs text-bss-text-muted font-mono mt-0.5">{profileView.bssId}</p></div>
        </div>
        <button onClick={() => setProfileView(null)} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-bss-bg text-bss-text-secondary"><X size={18}/></button>
      </header>
      <div className="p-5 space-y-4 text-xs">
        <div className="flex flex-wrap gap-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${profileView.status === 'Active' ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-soft-orange text-bss-error'}`}>{profileView.status}</span></div>
        {profileDetail
          ? <ScanIdentityCard data={profileDetail} />
          : <p className="text-xs text-bss-text-muted py-6 text-center rounded-xl border border-dashed border-bss-border">Loading full profile…</p>}
        <EligibilityGrid eligibility={profileView.eligibility} />
        <div className="rounded-xl border border-bss-border p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-3">Binding</p>
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
          {profileView.skills && profileView.skills.length > 0 && <div className="mt-3"><p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Skills</p><div className="flex flex-wrap gap-1.5">{profileView.skills.map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-bss-blue-tint text-bss-interactive-blue text-[10px] font-semibold">{s}</span>)}</div></div>}
          {profileView.costBreakdown && ((profileView.costBreakdown.statutory?.length ?? 0) > 0 || (profileView.costBreakdown.custom?.length ?? 0) > 0) && <div className="mt-4 rounded-xl border border-bss-border p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-3">Worker cost · {profileView.costBreakdown.templateCode || 'cost sheet'}</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <span className="text-bss-text-muted">Basic + VDA (wage)</span><span className="font-semibold text-right">₹{(profileView.costBreakdown.minimumWage ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-bss-text-muted">Statutory total</span><span className="font-semibold text-right">₹{(profileView.costBreakdown.statutoryTotal ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-bss-text-muted">Contractor billing</span><span className="font-semibold text-right">₹{(profileView.costBreakdown.contractorTotal ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-bss-text-primary font-bold border-t border-bss-border pt-1.5">Employer cost</span><span className="font-bold text-right border-t border-bss-border pt-1.5">₹{(profileView.costBreakdown.employerCost ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-bss-text-primary font-bold">Final employer CTC</span><span className="font-bold text-right text-[#01183A]">₹{(profileView.costBreakdown.ctc ?? profileView.ctc ?? 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">{(profileView.costBreakdown.statutory ?? []).map(s => <span key={s.component} className="text-[10px] px-2 py-0.5 rounded-full bg-bss-bg border border-bss-border text-bss-text-secondary">{s.component} ₹{s.amount.toLocaleString('en-IN')}</span>)}{(profileView.costBreakdown.custom ?? []).map(c => <span key={c.name} className="text-[10px] px-2 py-0.5 rounded-full bg-bss-blue-tint border border-bss-border text-bss-interactive-blue">{c.name} ₹{c.computed.toLocaleString('en-IN')}</span>)}</div>
          </div>}
        </div>
      </div>
    </section></div>}

    {/* Employment card — worker's site employment ID (issued by the worker's contractor) */}
    {empView && <WorkerEmploymentCard workerName={empView.name} bssId={empView.bssId} designation={empView.designation} mobile={empView.mobile} department={empView.department} uan={empView.uan} esic={empView.esic} campNo={empView.campNo} routeBusNo={empView.routeBusNo} photoUrl={empView.photoUrl} siteName={empView.site} siteId={empView.siteId} siteBssId={empView.siteBssId} siteAddress={empView.siteAddress} supervisorName={empView.supervisorName} supervisorContact={empView.supervisorContact} emergencyName={empView.emergencyName} emergencyNumber={empView.emergencyNumber} emergencyRelation={empView.emergencyRelation} bloodGroup={empView.bloodGroup} companyName={employer.identity.company} contractorName={empView.contractor} contractorId={empView.contractorCode || empView.contractorId} contractorContact={empView.contractorContact} contractorEmail={empView.contractorEmail} siteColour={empView.siteColour || undefined} issueDate={fmtCardDate(empView.idCardIssueDate)} validTill={fmtCardDate(empView.idCardValidityTill)} onClose={() => setEmpView(null)} />}
  </div>;
}

function ActionMenu({ open, onToggle, onViewProfile, onEmploymentCard, onQr }: { open: boolean; onToggle: () => void; onViewProfile: () => void; onEmploymentCard: () => void; onQr: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onToggle(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onToggle]);

  const run = (fn: () => void) => () => { onToggle(); fn(); };

  const action = (icon: ReactNode, title: string, description: string, onClick: () => void) => (
    <button role="menuitem" onClick={run(onClick)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-bss-bg transition-colors">
      <span className="w-10 h-10 rounded-lg bg-bss-bg text-bss-interactive-blue grid place-items-center flex-shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-bss-text-primary">{title}</span>
        <span className="block text-xs text-bss-text-muted mt-0.5">{description}</span>
      </span>
    </button>
  );

  return (
    <>
      <button onClick={onToggle} aria-label="Worker actions" aria-expanded={open} aria-haspopup="dialog" className={`w-8 h-8 grid place-items-center rounded-lg transition-colors ${open ? 'bg-bss-blue-tint text-bss-interactive-blue' : 'text-bss-text-muted hover:bg-bss-bg'}`}><MoreVertical size={16}/></button>
      {open && createPortal(
        <div className="fixed inset-0 z-[120] bg-bss-navy/40 backdrop-blur-sm grid place-items-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) onToggle(); }}>
          <section role="dialog" aria-modal="true" aria-label="Worker actions" className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Worker actions</p>
                <h2 className="text-sm font-semibold text-bss-text-primary mt-0.5">Choose an action</h2>
              </div>
              <button onClick={onToggle} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-bss-bg text-bss-text-secondary"><X size={18}/></button>
            </header>
            <div className="p-2 space-y-1">
              {action(<UserRound size={18}/>, 'View Profile', 'Full identity and binding summary', onViewProfile)}
              {action(<Briefcase size={18}/>, 'Employment Card', 'View / print site employment ID', onEmploymentCard)}
              {action(<QrCode size={18}/>, 'QR Code', 'Scannable worker identity QR', onQr)}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Users; tone:string }) { return <div className="bg-white border border-bss-border rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-bss-text-muted">{label}</p></div>; }
function Info({ label, value }: { label:string; value:string }) { return <div className="rounded-lg border border-bss-border p-2.5"><dt className="text-bss-text-muted text-[10px]">{label}</dt><dd className="font-semibold text-bss-text-primary mt-0.5">{value}</dd></div>; }

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
    <div className="rounded-xl border border-bss-border p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-3">Eligibility — 3 categories</p>
      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.label} className={`rounded-lg border px-2.5 py-2 ${cat.ok ? 'border-bss-border bg-bss-soft-green/50' : 'border-bss-border'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full grid place-items-center text-white text-[9px] flex-shrink-0 ${cat.ok ? 'bg-bss-green' : 'bg-bss-surface'}`}>{cat.ok ? '✓' : '✗'}</span>
              <span className="text-[11px] font-bold text-bss-text-primary">{cat.label}</span>
            </div>
            <div className="mt-1.5 pl-6 flex flex-wrap gap-1.5">
              {cat.items.map(([label, ok]) => <span key={label} className={`text-[10px] px-1.5 py-0.5 rounded ${ok ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-bg text-bss-text-muted'}`}>{label} {ok ? '✓' : '✗'}</span>)}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-bss-text-muted">Temporary: <strong className={tempOk ? 'text-bss-green' : 'text-bss-orange'}>{tempOk ? 'eligible' : 'not eligible'}</strong> · Permanent: <strong className={permOk ? 'text-bss-green' : 'text-bss-orange'}>{permOk ? 'eligible' : 'not eligible'}</strong></p>
    </div>
  );
}

