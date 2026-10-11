"use client";

import React, { useState } from 'react';
import { 
  Briefcase, Building2, MapPin, CheckCircle2, Home, Search, Link2, Eye, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { useWorker } from '@/contexts/WorkerContext';
import PageHero from '@/components/portal/PageHero';
import type { WorkerAvailableJob } from '@/types/portal';

export default function WorkerRozgarSetuPage() {
  const { worker, portal, refresh } = useWorker();
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
      void refresh();
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
      void refresh();
      setTimeout(() => setNotice(''), 4000);
    } catch {
      setError('Could not update availability.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 bg-bss-bg/50 min-h-screen">
      {/* Header */}
      <PageHero
        title="Rozgar Setu"
        subtitle="Tell employers you are available for work, and explore available job opportunities."
        actions={<Link href="/worker" className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors" title="Go to Dashboard"><Home size={18}/></Link>}
      />

      {notice && <p role="status" className="p-3.5 bg-bss-soft-green border border-bss-border text-bss-green rounded-2xl text-sm font-bold flex items-center gap-2"><CheckCircle2 size={16}/>{notice}</p>}
      {error && <p role="alert" className="p-3.5 bg-bss-soft-orange border border-bss-border text-bss-error rounded-2xl text-sm font-bold flex items-center gap-2">{error}</p>}

      {/* Looking for Work Toggle Banner */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/30 border border-bss-border rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-bss-interactive-blue uppercase tracking-wider">LOOKING FOR WORK</span>
          <h2 className="text-base font-bold text-bss-text-primary">Let relevant employers know you are available</h2>
          <p className="text-xs text-bss-text-muted max-w-2xl">
            Your existing skills, location and binding rules continue to determine job relevance. When ON, your dashboard shows this to you and employers can reach you for work.
          </p>
        </div>

        <div className="bss-3d bss-scroll-rise bss-card rounded-2xl px-5 py-3.5 flex items-center gap-4 shrink-0">
          <span className="text-xs font-bold text-bss-text-primary">Available for work</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleAvailabilityToggle(!availableForWork)}
            className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${
              availableForWork ? 'bg-[#01183A] justify-end' : 'bg-bss-border justify-start'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-md block" />
          </button>
        </div>
      </div>

      {activeBinding && (
        <div className="bg-bss-soft-orange border border-bss-border text-bss-orange rounded-2xl p-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p><strong>You are already bound to {activeBinding.contractor}</strong>{activeBinding.site ? ` at ${activeBinding.site}` : ''}. A worker can be bound to only one contractor at a time — unbind first to apply to another contractor.</p>
          <Link href="/worker/binding" className="h-9 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold flex items-center justify-center shrink-0 hover:bg-[#022B5E]">Manage binding</Link>
        </div>
      )}

      {/* Available Jobs Header */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-base font-bold text-bss-text-primary">Available Jobs</h2>
        <span className="text-xs font-bold text-bss-interactive-blue">{jobs.filter(j => j.matchBadge).length} best matches</span>
      </div>

      {/* Job Card Listings */}
      <div className="space-y-4">
        {jobs.map(job => (
          <div key={job.id} className="bss-3d bss-scroll-rise bss-card rounded-3xl p-6 lg:p-7 space-y-5 hover:shadow-md transition-all">
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-bss-blue-tint text-[#01183A] flex items-center justify-center shrink-0 border border-bss-border">
                  <Briefcase size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-bss-text-primary">{job.title} — {job.subTitle}</h3>
                    {job.matchBadge && (
                      <span className="bg-bss-blue-tint text-bss-interactive-blue text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                        {job.matchScore}% match
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-bss-text-muted font-medium mt-0.5">{job.employer} · {job.postedDate}</p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-base font-black text-bss-green block">{job.wage}</span>
                <span className="font-mono text-[11px] text-bss-text-muted">{job.id}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-bss-text-secondary font-normal leading-relaxed">
              {job.description}
            </p>

            {/* Meta Table */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-bss-bg/70 border border-bss-border rounded-2xl p-4 text-xs">
              <div>
                <span className="block text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">STATE</span>
                <span className="font-semibold text-bss-text-primary mt-0.5 block">{job.state}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">CITY</span>
                <span className="font-semibold text-bss-text-primary mt-0.5 block">{job.city}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">DESIGNATION</span>
                <span className="font-semibold text-bss-text-primary mt-0.5 block">{job.designation}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-bss-text-muted uppercase tracking-wider">EXPERIENCE</span>
                <span className="font-semibold text-bss-text-primary mt-0.5 block">{job.experience}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!!activeBinding || appliedJobs.includes(job.id)}
                onClick={() => handleApply(job)}
                title={activeBinding ? 'Unbind from your current contractor first' : undefined}
                className="h-11 px-5 rounded-xl bg-[#0B192C] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#022B5E] shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Link2 size={16} /> {activeBinding ? 'Already bound — unbind to apply' : appliedJobs.includes(job.id) ? 'Application sent' : 'Apply & send binding request'}
              </button>
              <Link 
                href="/worker/binding" 
                className="h-11 px-5 rounded-xl border border-bss-border text-bss-text-secondary text-xs font-bold flex items-center gap-2 hover:bg-bss-bg transition-all"
              >
                <Eye size={16} className="text-bss-text-muted" /> View my binding requests
              </Link>
            </div>
          </div>
        ))}
        {jobs.length === 0 && (
          <p className="bss-3d bss-scroll-rise p-6 bss-card rounded-3xl text-sm text-bss-text-muted text-center">
            No job postings are available right now. Please check back later.
          </p>
        )}
      </div>
    </div>
  );
}
