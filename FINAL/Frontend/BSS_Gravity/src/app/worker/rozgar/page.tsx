"use client";

import React, { useState } from 'react';
import { 
  Briefcase, Building2, MapPin, CheckCircle2, Home, Search, Link2, Eye, ShieldCheck, Mic
} from 'lucide-react';
import Link from 'next/link';
import { useWorker } from '@/contexts/WorkerContext';
import type { WorkerAvailableJob } from '@/types/portal';

export default function WorkerRozgarSetuPage() {
  const { worker, portal } = useWorker();
  const [availableForWork, setAvailableForWork] = useState<boolean>(portal?.availability ?? true);
  const [busy, setBusy] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');
  const [error, setError] = useState<string>('');

  const jobs: WorkerAvailableJob[] = portal?.availableJobs ?? [];
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  // A worker can only be bound to one contractor at a time; while bound, job
  // applications / binding requests are disabled until they unbind.
  const activeBinding = portal.bindings.find(b => b.status === 'Accepted');

  const handleApply = async (job: WorkerAvailableJob) => {
    setError('');
    try {
      const response = await fetch('/api/portal/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.jobId })
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Application could not be sent.');
      setAppliedJobs(current => current.includes(job.id) ? current : [...current, job.id]);
      setNotice(`Application and binding request submitted for ${job.title} at ${job.employer}.`);
      setTimeout(() => setNotice(''), 5000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit the application.');
    }
  };

  const handleAvailabilityToggle = async (value: boolean) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/portal/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: value })
      });
      if (!response.ok) throw new Error('Availability could not be updated.');
      setAvailableForWork(value);
      setNotice(value ? 'Availability set to ON — employers can discover your profile.' : 'Availability set to OFF.');
      setTimeout(() => setNotice(''), 4000);
    } catch {
      setError('Could not update availability.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0B192C]">Rozgar Setu</h1>
          <p className="text-sm text-gray-500 mt-1">Tell employers you are available for work, and explore available job opportunities.</p>
        </div>
        <Link href="/worker" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-[#073B67] hover:border-[#073B67] transition-all shadow-sm">
          <Home size={18} />
        </Link>
      </div>

      {notice && <p role="status" className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-sm font-bold flex items-center gap-2"><CheckCircle2 size={16}/>{notice}</p>}
      {error && <p role="alert" className="p-3.5 bg-red-50 border border-red-100 text-red-800 rounded-2xl text-sm font-bold flex items-center gap-2">{error}</p>}

      {/* Looking for Work Toggle Banner */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/30 border border-blue-100 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">LOOKING FOR WORK</span>
          <h2 className="text-base font-bold text-gray-900">Let relevant employers know you are available</h2>
          <p className="text-xs text-gray-500 max-w-2xl">
            Your existing skills, location and binding rules continue to determine job relevance. When ON, your dashboard shows this to you and employers can reach you for work.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3.5 flex items-center gap-4 shadow-sm shrink-0">
          <span className="text-xs font-bold text-gray-800">Available for work</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleAvailabilityToggle(!availableForWork)}
            className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${
              availableForWork ? 'bg-[#073B67] justify-end' : 'bg-gray-300 justify-start'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-md block" />
          </button>
        </div>
      </div>

      {activeBinding && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p><strong>You are already bound to {activeBinding.contractor}</strong>{activeBinding.site ? ` at ${activeBinding.site}` : ''}. A worker can be bound to only one contractor at a time — unbind first to apply to another contractor.</p>
          <Link href="/worker/binding" className="h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold flex items-center justify-center shrink-0 hover:bg-[#062D4F]">Manage binding</Link>
        </div>
      )}

      {/* Available Jobs Header */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-base font-bold text-gray-900">Available Jobs</h2>
        <span className="text-xs font-bold text-blue-700">{jobs.filter(j => j.matchBadge).length} best matches</span>
      </div>

      {/* Job Card Listings */}
      <div className="space-y-4">
        {jobs.map(job => (
          <div key={job.id} className="bg-white border border-gray-200 rounded-3xl p-6 lg:p-7 space-y-5 shadow-sm hover:shadow-md transition-all">
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#073B67] flex items-center justify-center shrink-0 border border-blue-100">
                  <Briefcase size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">{job.title} — {job.subTitle}</h3>
                    {job.matchBadge && (
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                        MATCH
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{job.employer} · {job.postedDate}</p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-base font-black text-emerald-600 block">{job.wage}</span>
                <span className="font-mono text-[11px] text-gray-400">{job.id}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-600 font-normal leading-relaxed">
              {job.description}
            </p>

            {/* Meta Table */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/70 border border-slate-100 rounded-2xl p-4 text-xs">
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">STATE</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">{job.state}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">CITY</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">{job.city}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">DESIGNATION</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">{job.designation}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">EXPERIENCE</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">{job.experience}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!!activeBinding || appliedJobs.includes(job.id)}
                onClick={() => handleApply(job)}
                title={activeBinding ? 'Unbind from your current contractor first' : undefined}
                className="h-11 px-5 rounded-xl bg-[#0B192C] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#062D4F] shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Link2 size={16} /> {activeBinding ? 'Already bound — unbind to apply' : appliedJobs.includes(job.id) ? 'Application sent' : 'Apply & send binding request'}
              </button>
              <Link 
                href="/worker/binding" 
                className="h-11 px-5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold flex items-center gap-2 hover:bg-gray-50 transition-all"
              >
                <Eye size={16} className="text-gray-400" /> View my binding requests
              </Link>
            </div>
          </div>
        ))}
        {jobs.length === 0 && (
          <p className="p-6 bg-white border border-gray-200 rounded-3xl text-sm text-gray-500 text-center">
            No job postings are available right now. Please check back later.
          </p>
        )}
      </div>

      {/* Floating Voice Guide */}
      <div className="fixed bottom-6 right-6 z-40">
        <button className="bg-[#0B192C] text-white px-5 py-3 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl hover:scale-105 transition-transform">
          <Mic size={16} className="text-blue-400" />
          <span>सुनकर सीखें / Listen & Learn</span>
        </button>
      </div>
    </div>
  );
}
