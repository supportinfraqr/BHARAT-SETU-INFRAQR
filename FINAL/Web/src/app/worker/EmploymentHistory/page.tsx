"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, FileText, History } from 'lucide-react';
import { useWorker } from '@/contexts/WorkerContext';
import WorkerEmploymentCard from '@/components/idcard/WorkerEmploymentCard';

export default function EmploymentHistoryPage() {
  const { worker } = useWorker();
  const history = worker.employment.history ?? [];
  const [cardFor, setCardFor] = useState<(typeof history)[number] | null>(null);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/worker" className="mt-1 w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-[#073B67] hover:border-[#073B67] transition-all" aria-label="Go back"><ArrowLeft size={18} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-[#062D4F] flex items-center gap-2"><History size={22} />Employment History</h1>
          <p className="text-sm text-gray-500 mt-1">Your completed engagements — appointment and experience letters and the employment card from when that employment was active. Requests declined by either party are not shown.</p>
        </div>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">No employment history yet.</p>
      ) : (
        <div className="space-y-4">
          {history.map(h => (
            <div key={h.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-[14px] font-bold text-[#1D1D1F]">{h.contractor}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.current ? 'bg-green-50 text-green-700' : h.status === 'Site Changed' ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-600'}`}>{h.status}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{h.employer}{h.site ? ` · ${h.site}` : ''} · {h.ref}</p>
                </div>
                <p className="text-[11px] text-gray-500">{h.startDate || '—'} → {h.endDate || 'Present'}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-[12px]">
                <div><p className="text-gray-400">Contractor BSS ID</p><p className="font-mono font-semibold text-gray-800">{h.contractorCode || '—'}</p></div>
                <div><p className="text-gray-400">Employer BSS ID</p><p className="font-mono font-semibold text-gray-800">{h.employerCode || '—'}</p></div>
                <div><p className="text-gray-400">Site ID</p><p className="font-mono font-semibold text-gray-800">{h.siteId || '—'}</p></div>
                <div><p className="text-gray-400">Designation</p><p className="font-semibold text-gray-800">{h.designation || '—'}</p></div>
                <div><p className="text-gray-400">Department</p><p className="font-semibold text-gray-800">{h.department || '—'}</p></div>
                <div><p className="text-gray-400">Shift</p><p className="font-semibold text-gray-800">{h.shift || '—'}</p></div>
                <div><p className="text-gray-400">Wage</p><p className="font-semibold text-gray-800">{h.wage ? `₹${h.wage.toLocaleString('en-IN')}` : '—'}</p></div>
                <div><p className="text-gray-400">Joined</p><p className="font-semibold text-gray-800">{h.startDate || '—'}</p></div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                {h.appointmentLetter?.downloadUrl && <a href={h.appointmentLetter.downloadUrl} target="_blank" rel="noopener noreferrer" className="h-8 px-3 rounded-lg border border-[#073B67]/20 text-[#073B67] text-[11px] font-bold inline-flex items-center gap-1.5"><FileText size={12} />Appointment letter</a>}
                {h.experienceLetter?.downloadUrl && <a href={h.experienceLetter.downloadUrl} target="_blank" rel="noopener noreferrer" className="h-8 px-3 rounded-lg border border-[#073B67]/20 text-[#073B67] text-[11px] font-bold inline-flex items-center gap-1.5"><FileText size={12} />Experience letter</a>}
                <button type="button" onClick={() => setCardFor(h)} className="h-8 px-3 rounded-lg bg-[#073B67] text-white text-[11px] font-bold inline-flex items-center gap-1.5"><BadgeCheck size={12} />Employment card{h.current ? '' : ' (expired)'}</button>
              </div>
            </div>
          ))}
        </div>
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
          siteId={cardFor.siteId}
          siteCode={cardFor.siteId}
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
