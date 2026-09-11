"use client";

import React, { useState } from 'react';
import { 
  Briefcase, Building2, MapPin, CheckCircle2, Home, Search, Link2, Eye, ShieldCheck, Mic
} from 'lucide-react';
import Link from 'next/link';
import { useWorker } from '@/contexts/WorkerContext';

type JobListing = {
  id: string;
  title: string;
  subTitle: string;
  employer: string;
  postedDate: string;
  description: string;
  wage: string;
  state: string;
  city: string;
  designation: string;
  experience: string;
  dobLimit: string;
  matchBadge: boolean;
};

export default function WorkerRozgarSetuPage() {
  const { worker, portal } = useWorker();
  const [availableForWork, setAvailableForWork] = useState<boolean>(portal?.availability ?? true);
  const [busy, setBusy] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');
  const [error, setError] = useState<string>('');

  const jobs: JobListing[] = [
    {
      id: 'JOB-11824',
      title: 'Electrician',
      subTitle: 'High-Rise Electrification',
      employer: 'Tata Projects Ltd.',
      postedDate: 'Posted 26 Aug 2026',
      description: 'Site electrification, wiring and panel installation for a residential high-rise. PPE and site induction provided. Weekly wage settlement.',
      wage: '₹26,000 / month',
      state: 'Maharashtra',
      city: 'Pune',
      designation: 'Electrician',
      experience: '3–6 years',
      dobLimit: 'On or after 01 Jan 1980',
      matchBadge: true,
    },
    {
      id: 'JOB-11819',
      title: 'Bar Bender',
      subTitle: 'Metro Depot Works',
      employer: 'Larsen & Toubro Construction',
      postedDate: 'Posted 24 Aug 2026',
      description: 'Rebar cutting, bending, cage fabrication for metro depot beam & column structures. Safety gear & site accommodation provided.',
      wage: '₹25,500 / month',
      state: 'Maharashtra',
      city: 'Mumbai',
      designation: 'Bar Bender',
      experience: '2–5 years',
      dobLimit: 'On or after 01 Jan 1982',
      matchBadge: true,
    },
    {
      id: 'JOB-11790',
      title: 'Scaffolder / Rigger',
      subTitle: 'Industrial Plant Maintenance',
      employer: 'Shapoorji Pallonji',
      postedDate: 'Posted 18 Aug 2026',
      description: 'Heavy scaffolding erection and dismantling for refinery shutdown maintenance. Mandatory safety kit & daily attendance log.',
      wage: '₹27,000 / month',
      state: 'Gujarat',
      city: 'Surat',
      designation: 'Scaffolder',
      experience: '4+ years',
      dobLimit: 'On or after 01 Jan 1978',
      matchBadge: false,
    }
  ];

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
    } catch (err) {
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
                onClick={() => {
                  setNotice(`Application and binding request submitted for ${job.title} at ${job.employer}.`);
                  setTimeout(() => setNotice(''), 5000);
                }}
                className="h-11 px-5 rounded-xl bg-[#0B192C] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#062D4F] shadow-sm transition-all"
              >
                <Link2 size={16} /> Apply & send binding request
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
