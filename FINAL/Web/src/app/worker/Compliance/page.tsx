"use client";

import { ShieldCheck, HardHat, FileCheck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useWorker } from '@/contexts/WorkerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHero from '@/components/portal/PageHero';

const isDone = (value?: string | boolean) => typeof value === 'boolean'
  ? value
  : ['done', 'completed', 'active', 'fit', 'yes', 'issued'].includes((value ?? '').toLowerCase());
const tone = (ok: boolean) => ok ? 'text-[#14843C]' : 'text-[#E45D24]';

function Stat({ label, value, ok, sub }: { label: string; value: string; ok: boolean; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">{label}</p>
      <div className="flex justify-between items-end mt-1">
        <div>
          <p className={`text-sm font-semibold ${tone(ok)}`}>{value || 'Pending'}</p>
          {sub && <p className="text-xs text-bss-text-muted">{sub}</p>}
        </div>
        {ok ? <CheckCircle2 size={16} className="text-[#14843C]"/> : <AlertCircle size={16} className="text-[#E45D24]"/>}
      </div>
    </div>
  );
}

export default function ComplianceModule() {
  const { t } = useLanguage();
  const { worker } = useWorker();
  const welfare = worker.welfare ?? {};
  const gatePasses = worker.gatePasses ?? [];
  const records = worker.complianceRecords ?? [];
  const ppeIssued = (welfare.typesOfPpeGiven ?? '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHero title={t('nav.complianceWelfare')} subtitle="Safety, health and security records managed by your contractor and principal employer." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Health & Safety */}
        <div className="bss-3d bss-scroll-rise bg-white rounded-2xl p-5 shadow-sm border border-bss-border">
          <div className="flex items-center gap-3 mb-4 border-b border-bss-border pb-3">
            <div className="w-10 h-10 rounded-full bg-bss-soft-green flex items-center justify-center text-[#14843C]"><HardHat size={20}/></div>
            <h2 className="text-base font-bold text-bss-text-primary">Health &amp; Safety</h2>
          </div>
          <div className="space-y-4">
            <Stat label="Site Induction" value={welfare.siteInductionStatus || ''} ok={isDone(welfare.siteInductionStatus)}/>
            <Stat label="Safety Training" value={welfare.safetyTrainingCompleted ? 'Completed' : 'Pending'} ok={isDone(welfare.safetyTrainingCompleted)} sub={welfare.trainerName ? `Trainer: ${welfare.trainerName}` : undefined}/>
            <div>
              <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">PPE Required</p>
              <p className="text-sm font-semibold text-bss-text-primary mt-1">{welfare.ppeRequired ? 'Yes — PPE mandatory for your trade' : 'Not marked'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">PPE Issued</p>
              {ppeIssued.length
                ? <div className="flex flex-wrap gap-1.5 mt-1.5">{ppeIssued.map((item, i) => <span key={i} className="text-[10px] font-semibold bg-bss-bg text-bss-text-secondary px-2 py-1 rounded">{item}</span>)}</div>
                : <p className="text-sm text-bss-text-muted mt-1">No PPE recorded yet.</p>}
            </div>
          </div>
        </div>

        {/* Medical & Welfare */}
        <div id="medical-fitness" className="bss-3d bss-scroll-rise bg-white rounded-2xl p-5 shadow-sm border border-bss-border scroll-mt-24">
          <div className="flex items-center gap-3 mb-4 border-b border-bss-border pb-3">
            <div className="w-10 h-10 rounded-full bg-bss-blue-tint flex items-center justify-center text-[#01183A]"><ShieldCheck size={20}/></div>
            <h2 className="text-base font-bold text-bss-text-primary">Medical &amp; Welfare</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider mb-2">Tests performed</p>
              <div className="flex flex-wrap gap-1.5">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${isDone(welfare.medicalExaminationStatus) ? 'bg-bss-soft-green text-bss-green border-bss-border' : 'bg-bss-soft-orange text-bss-orange border-bss-border'}`}><CheckCircle2 size={11}/>Medical Examination · {welfare.medicalExaminationStatus || 'Pending'}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${isDone(welfare.insuranceStatus) ? 'bg-bss-soft-green text-bss-green border-bss-border' : 'bg-bss-bg text-bss-text-muted border-bss-border'}`}><CheckCircle2 size={11}/>Insurance · {welfare.insuranceStatus || 'Not recorded'}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${isDone(welfare.accommodationProvided) ? 'bg-bss-soft-green text-bss-green border-bss-border' : 'bg-bss-bg text-bss-text-muted border-bss-border'}`}><CheckCircle2 size={11}/>Accommodation · {welfare.accommodationProvided || 'Not recorded'}</span>
              </div>
            </div>
            <Stat label="Medical Examination" value={welfare.medicalExaminationStatus || ''} ok={isDone(welfare.medicalExaminationStatus)} sub={welfare.lastMedicalExamination ? `Last: ${welfare.lastMedicalExamination}${welfare.medicalFitnessStatus ? ` · ${welfare.medicalFitnessStatus}` : ''}` : undefined}/>
            <div className="bg-bss-soft-orange/50 p-3 rounded-lg border border-bss-border">
              <p className="text-[10px] font-bold text-[#E45D24] uppercase tracking-wider flex items-center gap-1"><Clock size={10}/> Next Medical Due</p>
              <p className="text-sm font-bold text-bss-text-primary mt-0.5">{welfare.nextMedicalDue || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Insurance Cover</p>
              <p className="text-sm font-semibold text-bss-text-primary mt-1">{welfare.insuranceStatus || 'Not recorded'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">Accommodation</p>
              <p className="text-sm font-semibold text-bss-text-primary mt-1">{welfare.accommodationProvided || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Access & Security */}
        <div id="gate-pass" className="bss-3d bss-scroll-rise bg-white rounded-2xl p-5 shadow-sm border border-bss-border scroll-mt-24">
          <div className="flex items-center gap-3 mb-4 border-b border-bss-border pb-3">
            <div className="w-10 h-10 rounded-full bg-bss-soft-orange flex items-center justify-center text-[#E45D24]"><FileCheck size={20}/></div>
            <h2 className="text-base font-bold text-bss-text-primary">Access &amp; Security</h2>
          </div>
          <div className="space-y-4">
            <Stat label="Police Verification" value={welfare.policeVerification || ''} ok={isDone(welfare.policeVerification)}/>
            <div className="pt-2">
              <p className="text-[10px] font-bold text-bss-text-muted uppercase tracking-wider mb-2">Gate Passes (System Generated)</p>
              {gatePasses.length ? <div className="space-y-2">
                {gatePasses.map(pass => (
                  <div key={pass.id} className={`p-3 rounded-lg border ${pass.status === 'Active' ? 'bg-bss-soft-green/30 border-bss-border' : pass.status === 'Pending' ? 'bg-bss-soft-orange/40 border-bss-border' : 'bg-bss-bg border-bss-border'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-bss-text-primary">{pass.type} Gate Pass</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${pass.status === 'Active' ? 'bg-[#14843C] text-white' : pass.status === 'Pending' ? 'bg-[#E45D24] text-white' : 'bg-bss-bg text-bss-text-secondary'}`}>{pass.status}</span>
                    </div>
                    <p className="text-xs font-mono font-semibold text-[#01183A]">{pass.number}</p>
                    <p className="text-[10px] text-bss-text-muted mt-1">{pass.validFrom ? `Valid: ${pass.validFrom} – ${pass.validTo || '—'}` : `Requested ${pass.requestedAt?.slice(0, 10) || ''}`}</p>
                    <p className="text-[10px] text-bss-text-muted mt-0.5">{pass.requestedBy ? `Requested by ${pass.requestedBy}` : ''}{pass.approvedBy ? ` · Approved by ${pass.approvedBy}` : pass.status === 'Pending' ? ' · Awaiting employer approval' : ''}</p>
                  </div>
                ))}
              </div> : <p className="text-sm text-bss-text-muted">No gate passes issued yet. Your contractor requests them and the principal employer approves.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Historical records */}
      <section className="bss-3d bss-scroll-rise bss-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bss-border"><h2 className="text-sm font-semibold text-bss-text-primary">Historical records</h2><p className="text-xs text-bss-text-muted mt-0.5">Past examinations, trainings, passes and renewals on your record</p></div>
        {records.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[720px]"><thead className="bg-bss-bg border-b text-[11px] text-bss-text-muted uppercase tracking-wider"><tr><th className="px-5 py-3 font-bold">Date</th><th className="px-5 py-3 font-bold">Record</th><th className="px-5 py-3 font-bold">Detail</th><th className="px-5 py-3 font-bold">Authority / Reference</th><th className="px-5 py-3 font-bold">Result</th></tr></thead><tbody className="divide-y divide-bss-border">
          {records.map((h, i) => <tr key={i} className="hover:bg-bss-bg"><td className="px-5 py-3 whitespace-nowrap">{h.date}</td><td className="px-5 py-3 font-semibold text-bss-text-primary">{h.record}</td><td className="px-5 py-3 text-bss-text-muted">{h.detail}</td><td className="px-5 py-3 font-mono text-[11px] text-[#01183A]">{h.ref || '—'}</td><td className="px-5 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${['fit', 'completed', 'active'].includes((h.result || '').toLowerCase()) ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-soft-orange text-bss-orange'}`}>{h.result}</span></td></tr>)}
        </tbody></table></div> : <p className="p-8 text-center text-sm text-bss-text-muted">No compliance history recorded yet.</p>}
      </section>
    </div>
  );
}
