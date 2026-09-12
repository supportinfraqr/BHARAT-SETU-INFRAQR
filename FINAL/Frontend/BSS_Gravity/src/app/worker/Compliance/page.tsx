"use client";

import { ShieldCheck, HardHat, FileCheck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useWorker } from '@/contexts/WorkerContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ComplianceModule() {
  const { t } = useLanguage();
  const { worker } = useWorker();
  const welfare = worker.welfare ?? {};
  const gatePasses = worker.gatePasses ?? [];
  const records = worker.complianceRecords ?? [];
  const ppeIssued = (welfare.typesOfPpeGiven ?? '').split(',').map(s => s.trim()).filter(Boolean);

  const isDone = (value?: string | boolean) => typeof value === 'boolean'
    ? value
    : ['done', 'completed', 'active', 'fit', 'yes', 'issued'].includes((value ?? '').toLowerCase());
  const tone = (ok: boolean) => ok ? 'text-[#2F9E67]' : 'text-[#F47A32]';

  const Stat = ({ label, value, ok, sub }: { label: string; value: string; ok: boolean; sub?: string }) => (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <div className="flex justify-between items-end mt-1">
        <div>
          <p className={`text-sm font-semibold ${tone(ok)}`}>{value || 'Pending'}</p>
          {sub && <p className="text-xs text-gray-500">{sub}</p>}
        </div>
        {ok ? <CheckCircle2 size={16} className="text-[#2F9E67]"/> : <AlertCircle size={16} className="text-[#F47A32]"/>}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#062D4F]">{t('nav.compliance')}</h1>
        <p className="text-sm text-gray-500 mt-1">Safety, health and security records managed by your contractor and principal employer.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Health & Safety */}
        <div className="bg-white rounded-[12px] p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-[#2F9E67]"><HardHat size={20}/></div>
            <h2 className="text-base font-bold text-gray-900">Health &amp; Safety</h2>
          </div>
          <div className="space-y-4">
            <Stat label="Site Induction" value={welfare.siteInductionStatus || ''} ok={isDone(welfare.siteInductionStatus)}/>
            <Stat label="Safety Training" value={welfare.safetyTrainingCompleted ? 'Completed' : 'Pending'} ok={isDone(welfare.safetyTrainingCompleted)} sub={welfare.trainerName ? `Trainer: ${welfare.trainerName}` : undefined}/>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PPE Required</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">{welfare.ppeRequired ? 'Yes — PPE mandatory for your trade' : 'Not marked'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PPE Issued</p>
              {ppeIssued.length
                ? <div className="flex flex-wrap gap-1.5 mt-1.5">{ppeIssued.map((item, i) => <span key={i} className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded">{item}</span>)}</div>
                : <p className="text-sm text-gray-500 mt-1">No PPE recorded yet.</p>}
            </div>
          </div>
        </div>

        {/* Medical & Welfare */}
        <div id="medical-fitness" className="bg-white rounded-[12px] p-5 shadow-sm border border-gray-200 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#073B67]"><ShieldCheck size={20}/></div>
            <h2 className="text-base font-bold text-gray-900">Medical &amp; Welfare</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tests performed</p>
              <div className="flex flex-wrap gap-1.5">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${isDone(welfare.medicalExaminationStatus) ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}><CheckCircle2 size={11}/>Medical Examination · {welfare.medicalExaminationStatus || 'Pending'}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${isDone(welfare.insuranceStatus) ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}><CheckCircle2 size={11}/>Insurance · {welfare.insuranceStatus || 'Not recorded'}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${isDone(welfare.accommodationProvided) ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}><CheckCircle2 size={11}/>Accommodation · {welfare.accommodationProvided || 'Not recorded'}</span>
              </div>
            </div>
            <Stat label="Medical Examination" value={welfare.medicalExaminationStatus || ''} ok={isDone(welfare.medicalExaminationStatus)} sub={welfare.lastMedicalExamination ? `Last: ${welfare.lastMedicalExamination}${welfare.medicalFitnessStatus ? ` · ${welfare.medicalFitnessStatus}` : ''}` : undefined}/>
            <div className="bg-orange-50/50 p-3 rounded-lg border border-orange-100">
              <p className="text-[10px] font-bold text-[#F47A32] uppercase tracking-wider flex items-center gap-1"><Clock size={10}/> Next Medical Due</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{welfare.nextMedicalDue || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Insurance Cover</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">{welfare.insuranceStatus || 'Not recorded'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Accommodation</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">{welfare.accommodationProvided || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Access & Security */}
        <div id="gate-pass" className="bg-white rounded-[12px] p-5 shadow-sm border border-gray-200 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-[#F47A32]"><FileCheck size={20}/></div>
            <h2 className="text-base font-bold text-gray-900">Access &amp; Security</h2>
          </div>
          <div className="space-y-4">
            <Stat label="Police Verification" value={welfare.policeVerification || ''} ok={isDone(welfare.policeVerification)}/>
            <div className="pt-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Gate Passes (System Generated)</p>
              {gatePasses.length ? <div className="space-y-2">
                {gatePasses.map(pass => (
                  <div key={pass.id} className={`p-3 rounded-lg border ${pass.status === 'Active' ? 'bg-green-50/30 border-green-200' : pass.status === 'Pending' ? 'bg-orange-50/40 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-900">{pass.type} Gate Pass</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${pass.status === 'Active' ? 'bg-[#2F9E67] text-white' : pass.status === 'Pending' ? 'bg-[#F47A32] text-white' : 'bg-gray-200 text-gray-600'}`}>{pass.status}</span>
                    </div>
                    <p className="text-xs font-mono font-semibold text-[#073B67]">{pass.number}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{pass.validFrom ? `Valid: ${pass.validFrom} – ${pass.validTo || '—'}` : `Requested ${pass.requestedAt?.slice(0, 10) || ''}`}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{pass.requestedBy ? `Requested by ${pass.requestedBy}` : ''}{pass.approvedBy ? ` · Approved by ${pass.approvedBy}` : pass.status === 'Pending' ? ' · Awaiting employer approval' : ''}</p>
                  </div>
                ))}
              </div> : <p className="text-sm text-gray-500">No gate passes issued yet. Your contractor requests them and the principal employer approves.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Historical records */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">Historical records</h2><p className="text-xs text-gray-400 mt-0.5">Past examinations, trainings, passes and renewals on your record</p></div>
        {records.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[720px]"><thead className="bg-gray-50 border-b text-[11px] text-gray-500 uppercase tracking-wider"><tr><th className="px-5 py-3 font-bold">Date</th><th className="px-5 py-3 font-bold">Record</th><th className="px-5 py-3 font-bold">Detail</th><th className="px-5 py-3 font-bold">Authority / Reference</th><th className="px-5 py-3 font-bold">Result</th></tr></thead><tbody className="divide-y divide-gray-100">
          {records.map((h, i) => <tr key={i} className="hover:bg-gray-50"><td className="px-5 py-3 whitespace-nowrap">{h.date}</td><td className="px-5 py-3 font-semibold text-gray-800">{h.record}</td><td className="px-5 py-3 text-gray-500">{h.detail}</td><td className="px-5 py-3 font-mono text-[11px] text-[#073B67]">{h.ref || '—'}</td><td className="px-5 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${['fit', 'completed', 'active'].includes((h.result || '').toLowerCase()) ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'}`}>{h.result}</span></td></tr>)}
        </tbody></table></div> : <p className="p-8 text-center text-sm text-gray-500">No compliance history recorded yet.</p>}
      </section>
    </div>
  );
}
