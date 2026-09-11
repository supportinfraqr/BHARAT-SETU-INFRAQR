"use client";

import React from 'react';
import { ShieldCheck, HardHat, FileCheck, CheckCircle2, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ComplianceModule() {
  const { t } = useLanguage();
  const complianceData = {
    siteInduction: { status: "Completed", date: "15 Aug 2024", trainer: "Manoj Desai" },
    safetyTraining: { status: "Completed", date: "16 Aug 2024", trainer: "Rajesh Kumar (Safety Officer)" },
    ppe: { status: "Issued", items: ["Safety Helmet", "Reflective Jacket", "Safety Boots", "Gloves"] },
    insurance: { status: "Active", provider: "New India Assurance", policyNo: "POL-9923841", expiry: "14 Aug 2025" },
    accommodation: { status: "Provided", location: "Labour Camp A, Block 3, Room 42" },
    policeVerification: { status: "Under Process", referenceNo: "PV-2024-88912", appliedDate: "10 Aug 2024" },
    medical: { status: "Fit", date: "12 Aug 2024", doctor: "Dr. Sharma", nextDue: "12 Feb 2025" },
    gatePasses: [
      { type: "Temporary", number: "TGP-8821", issue: "12 Aug 2024", expiry: "26 Aug 2024", status: "Expired" },
      { type: "Permanent", number: "PGP-1092", issue: "27 Aug 2024", expiry: "27 Aug 2025", status: "Active" }
    ]
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#062D4F]">{t('nav.compliance')}</h1>
        <p className="text-sm text-gray-500 mt-1">Safety, health, and security records managed by your employer.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Safety & Induction */}
        <div className="bg-white rounded-[12px] p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-[#2F9E67]">
              <HardHat size={20} />
            </div>
            <h2 className="text-base font-bold text-gray-900">Health & Safety</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Site Induction</p>
              <div className="flex justify-between items-end mt-1">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{complianceData.siteInduction.status}</p>
                  <p className="text-xs text-gray-500">{complianceData.siteInduction.date} • {complianceData.siteInduction.trainer}</p>
                </div>
                <CheckCircle2 size={16} className="text-[#2F9E67]" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Safety Training</p>
              <div className="flex justify-between items-end mt-1">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{complianceData.safetyTraining.status}</p>
                  <p className="text-xs text-gray-500">{complianceData.safetyTraining.date} • {complianceData.safetyTraining.trainer}</p>
                </div>
                <CheckCircle2 size={16} className="text-[#2F9E67]" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PPE Required</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">Safety Helmet, Reflective Jacket, Safety Boots, Gloves</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PPE Issued</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {complianceData.ppe.items.map((item, i) => (
                  <span key={i} className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Medical & Welfare */}
        <div id="medical-fitness" className="bg-white rounded-[12px] p-5 shadow-sm border border-gray-200 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#073B67]">
              <ShieldCheck size={20} />
            </div>
            <h2 className="text-base font-bold text-gray-900">Medical &amp; Welfare</h2>
          </div>
          <div className="space-y-4">
            {/* Tests performed — status tags (mirrors the chips used in Health &amp; Safety) */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tests performed</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100"><CheckCircle2 size={11}/>Medical Examination · {complianceData.medical.status}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100"><CheckCircle2 size={11}/>Insurance Cover · {complianceData.insurance.status}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100"><CheckCircle2 size={11}/>Accommodation · {complianceData.accommodation.status}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Medical Examination</p>
              <div className="flex justify-between items-end mt-1">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{complianceData.medical.status}</p>
                  <p className="text-xs text-gray-500">{complianceData.medical.date} • {complianceData.medical.doctor}</p>
                </div>
                <CheckCircle2 size={16} className="text-[#2F9E67]" />
              </div>
            </div>
            <div className="bg-orange-50/50 p-3 rounded-lg border border-orange-100">
              <p className="text-[10px] font-bold text-[#F47A32] uppercase tracking-wider flex items-center gap-1"><Clock size={10}/> Next Medical Due</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{complianceData.medical.nextDue}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Insurance Cover</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">{complianceData.insurance.provider}</p>
              <p className="text-xs text-gray-500">Policy: {complianceData.insurance.policyNo}</p>
              <p className="text-xs text-gray-500">Valid till: {complianceData.insurance.expiry}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Accommodation</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">{complianceData.accommodation.location}</p>
            </div>
          </div>
        </div>

        {/* Access & Security */}
        <div id="gate-pass" className="bg-white rounded-[12px] p-5 shadow-sm border border-gray-200 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-[#F47A32]">
              <FileCheck size={20} />
            </div>
            <h2 className="text-base font-bold text-gray-900">Access & Security</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Police Verification</p>
              <div className="flex justify-between items-end mt-1">
                <div>
                  <p className="text-sm font-semibold text-[#F47A32]">{complianceData.policeVerification.status}</p>
                  <p className="text-xs text-gray-500">Ref: {complianceData.policeVerification.referenceNo}</p>
                </div>
                <Clock size={16} className="text-[#F47A32]" />
              </div>
            </div>
            
            <div className="pt-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Gate Passes (System Generated)</p>
              <div className="space-y-2">
                {complianceData.gatePasses.map((pass, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${pass.status === 'Active' ? 'bg-green-50/30 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-900">{pass.type} Gate Pass</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${pass.status === 'Active' ? 'bg-[#2F9E67] text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {pass.status}
                      </span>
                    </div>
                    <p className="text-xs font-mono font-semibold text-[#073B67]">{pass.number}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Valid: {pass.issue} - {pass.expiry}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Historical records */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">Historical records</h2><p className="text-xs text-gray-400 mt-0.5">Past examinations, trainings, passes and renewals on your record</p></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[720px]"><thead className="bg-gray-50 border-b text-[11px] text-gray-500 uppercase tracking-wider"><tr><th className="px-5 py-3 font-bold">Date</th><th className="px-5 py-3 font-bold">Record</th><th className="px-5 py-3 font-bold">Detail</th><th className="px-5 py-3 font-bold">Authority / Reference</th><th className="px-5 py-3 font-bold">Result</th></tr></thead><tbody className="divide-y divide-gray-100">
          {[
            {date:'12 Feb 2025',record:'Medical examination',detail:'Fitness check · Dr. Sharma',ref:'MED-2025-0212',result:'Fit'},
            {date:'16 Aug 2024',record:'Safety training',detail:'Site safety induction refresher',ref:'TRN-2024-0816',result:'Completed'},
            {date:'12 Aug 2024',record:'Medical examination',detail:'Pre-joining fitness check · Dr. Sharma',ref:'MED-2024-0812',result:'Fit'},
            {date:'27 Aug 2024',record:'Permanent Gate Pass issued',detail:'PGP-1092 · valid till 27 Aug 2025',ref:'GATE-PGP-1092',result:'Active'},
            {date:'12 Aug 2024',record:'Temporary Gate Pass issued',detail:'TGP-8821 · valid till 26 Aug 2024',ref:'GATE-TGP-8821',result:'Expired'},
            {date:'15 Aug 2024',record:'Site induction',detail:'Induction training · Manoj Desai',ref:'IND-2024-0815',result:'Completed'},
            {date:'14 Aug 2024',record:'Insurance cover started',detail:'New India Assurance · POL-9923841',ref:'POL-9923841',result:'Active'},
            {date:'14 Aug 2023',record:'Medical certificate',detail:'Pre-joining medical certificate',ref:'MED-2023-0814',result:'Expired'},
          ].map((h,i)=><tr key={i} className="hover:bg-gray-50"><td className="px-5 py-3 whitespace-nowrap">{h.date}</td><td className="px-5 py-3 font-semibold text-gray-800">{h.record}</td><td className="px-5 py-3 text-gray-500">{h.detail}</td><td className="px-5 py-3 font-mono text-[11px] text-[#073B67]">{h.ref}</td><td className="px-5 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.result==='Fit'||h.result==='Completed'||h.result==='Active'?'bg-green-50 text-green-700':'bg-orange-50 text-orange-600'}`}>{h.result}</span></td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}
