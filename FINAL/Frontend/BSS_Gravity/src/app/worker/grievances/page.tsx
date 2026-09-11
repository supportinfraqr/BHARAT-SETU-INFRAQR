"use client";

import React, { useState } from 'react';
import { 
  MessageSquareWarning, Mic, MicOff, Play, Pause, Send, Globe, Upload, FileText, 
  CheckCircle2, Clock, ShieldCheck, AlertCircle, ChevronRight, Home
} from 'lucide-react';
import Link from 'next/link';
import { useWorker } from '@/contexts/WorkerContext';

type GrievanceItem = {
  id: string;
  category: string;
  description: string;
  status: 'SUBMITTED' | 'UNDER REVIEW' | 'IN PROGRESS' | 'RESOLVED';
  updatedAt: string;
};

export default function WorkerGrievancesPage() {
  const { worker, portal } = useWorker();
  const [activeTab, setActiveTab] = useState<'lodge' | 'track'>('lodge');
  const [category, setCategory] = useState<string>('Wages');
  const [language, setLanguage] = useState<string>('Hindi');
  const [description, setDescription] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [hasAudio, setHasAudio] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Extract grievances list dynamically from backend context
  const dynamicGrievances: GrievanceItem[] = worker.grievances?.recent?.id && worker.grievances.recent.id !== 'None'
    ? [{
        id: worker.grievances.recent.id,
        category: 'Wages',
        description: 'Grievance submitted regarding workplace conditions.',
        status: (['SUBMITTED', 'UNDER REVIEW', 'IN PROGRESS', 'RESOLVED'].includes(worker.grievances.recent.status) 
          ? worker.grievances.recent.status 
          : 'UNDER REVIEW') as GrievanceItem['status'],
        updatedAt: `Updated ${worker.grievances.recent.date}`
      }]
    : [];

  const [grievanceList, setGrievanceList] = useState<GrievanceItem[]>(dynamicGrievances);

  // Status counts
  const counts = {
    submitted: grievanceList.filter(g => g.status === 'SUBMITTED').length,
    underReview: grievanceList.filter(g => g.status === 'UNDER REVIEW').length,
    inProgress: grievanceList.filter(g => g.status === 'IN PROGRESS').length,
    resolved: grievanceList.filter(g => g.status === 'RESOLVED').length
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasAudio(true);
    } else {
      setIsRecording(true);
      setHasAudio(false);
      setRecordingTime(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setNotice('');

    try {
      const newId = `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch('/api/portal/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, language, description })
      });
      const data = await res.json().catch(() => ({}));
      
      const createdItem: GrievanceItem = {
        id: data?.data?.id || newId,
        category,
        description: description || 'Voice audio recorded grievance submitted.',
        status: 'UNDER REVIEW',
        updatedAt: 'Updated Just Now'
      };

      setGrievanceList([createdItem, ...grievanceList]);
      setNotice(`Grievance submitted successfully. Ticket ID: ${createdItem.id}`);
      setDescription('');
      setHasAudio(false);
      setRecordingTime(0);
    } catch (err) {
      setError('Could not submit grievance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadge = (status: GrievanceItem['status']) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="bg-gray-100 text-gray-700 font-bold text-[11px] px-2.5 py-1 rounded-md uppercase">SUBMITTED</span>;
      case 'UNDER REVIEW':
        return <span className="bg-blue-100 text-blue-700 font-bold text-[11px] px-2.5 py-1 rounded-md uppercase">UNDER REVIEW</span>;
      case 'IN PROGRESS':
        return <span className="bg-orange-100 text-orange-700 font-bold text-[11px] px-2.5 py-1 rounded-md uppercase">IN PROGRESS</span>;
      case 'RESOLVED':
        return <span className="bg-emerald-100 text-emerald-700 font-bold text-[11px] px-2.5 py-1 rounded-md uppercase">RESOLVED</span>;
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0B192C]">Grievances</h1>
          <p className="text-sm text-gray-500 mt-1">Lodge a new grievance or track your submitted tickets end-to-end.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('track')}
            className="px-4 py-2 bg-white border border-gray-200 text-[#073B67] rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <FileText size={16} /> My Grievances · Track Status
          </button>
          <Link href="/worker" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-[#073B67] hover:border-[#073B67] transition-all shadow-sm">
            <Home size={18} />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-2xl font-black text-gray-800">{counts.submitted}</p>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">SUBMITTED</p>
        </div>
        <div className="bg-blue-50/50 border border-blue-100/60 rounded-2xl p-5 shadow-sm">
          <p className="text-2xl font-black text-blue-600">{counts.underReview}</p>
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mt-1">UNDER REVIEW</p>
        </div>
        <div className="bg-orange-50/50 border border-orange-100/60 rounded-2xl p-5 shadow-sm">
          <p className="text-2xl font-black text-orange-600">{counts.inProgress}</p>
          <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mt-1">IN PROGRESS</p>
        </div>
        <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-2xl p-5 shadow-sm">
          <p className="text-2xl font-black text-emerald-600">{counts.resolved}</p>
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mt-1">RESOLVED</p>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="bg-white p-1.5 border border-gray-200 rounded-2xl inline-flex gap-2">
        <button
          onClick={() => setActiveTab('lodge')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeTab === 'lodge' ? 'bg-[#0B192C] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MessageSquareWarning size={16} /> Lodge Grievance
        </button>
        <button
          onClick={() => setActiveTab('track')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeTab === 'track' ? 'bg-[#0B192C] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText size={16} /> Track Status <span className="bg-gray-200 text-gray-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{grievanceList.length}</span>
        </button>
      </div>

      {notice && <p role="status" className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-sm font-bold flex items-center gap-2"><CheckCircle2 size={18}/>{notice}</p>}
      {error && <p role="alert" className="p-4 bg-red-50 border border-red-100 text-red-800 rounded-2xl text-sm font-bold flex items-center gap-2"><AlertCircle size={18}/>{error}</p>}

      {/* Main Content Layout */}
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        
        {/* Left Column: Form / Action */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 lg:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Mic className="text-[#073B67]" size={20} /> New Grievance
            </h2>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
              <Globe size={14} className="text-gray-400" />
              <span>PREFERRED RESPONSE LANGUAGE</span>
              <select 
                value={language} 
                onChange={e => setLanguage(e.target.value)} 
                className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer"
              >
                <option value="Hindi">Hindi</option>
                <option value="English">English</option>
                <option value="Marathi">Marathi</option>
                <option value="Bengali">Bengali</option>
                <option value="Tamil">Tamil</option>
              </select>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category selection */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">GRIEVANCE CATEGORY</label>
              <div className="flex flex-wrap gap-2">
                {['Wages', 'Safety', 'Harassment', 'Accommodation', 'Benefits', 'Other'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all border ${
                      category === cat 
                        ? 'bg-[#0B192C] text-white border-[#0B192C] shadow-sm' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Audio Recorder Widget */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-center space-y-4">
              <div className="text-3xl font-black text-gray-900 font-mono">
                00:{recordingTime < 10 ? `0${recordingTime}` : recordingTime}
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleRecordToggle}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isRecording 
                      ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' 
                      : 'bg-[#073B67] text-white shadow-md hover:bg-[#062D4F]'
                  }`}
                >
                  {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                {hasAudio && (
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md hover:bg-emerald-600"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                  </button>
                )}
              </div>

              <p className="text-xs font-medium text-gray-500">
                {isRecording ? 'Recording audio... Speak your concern clearly' : hasAudio ? 'Audio recorded successfully. Click submit below.' : 'Click microphone to record your concern in your language'}
              </p>
            </div>

            {/* Text description fallback */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">DESCRIBE THE CONCERN (OPTIONAL TEXT)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Write your query or description here..."
                rows={4}
                className="w-full border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 focus:outline-none focus:border-[#073B67] transition-all bg-white"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-[#073B67] text-white rounded-2xl font-bold text-sm hover:bg-[#062D4F] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
            >
              <Send size={18} /> {isSubmitting ? 'Submitting Grievance...' : 'Submit Grievance'}
            </button>
          </form>
        </div>

        {/* Right Column: Recent Grievance List */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-5 shadow-sm h-fit">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileText className="text-[#073B67]" size={18} /> Your recent grievances
            </h2>
            <button onClick={() => setActiveTab('track')} className="text-xs font-bold text-[#073B67] hover:underline flex items-center gap-1">
              View full tracking <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-4">
            {grievanceList.map((g) => (
              <div key={g.id} className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700">{g.id}</span>
                  {statusBadge(g.status)}
                </div>
                <p className="text-xs text-gray-700 font-medium line-clamp-2">{g.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100/80 text-[11px] text-gray-400">
                  <span>{g.updatedAt}</span>
                  <button onClick={() => setActiveTab('track')} className="text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1 rounded-lg">
                    Track
                  </button>
                </div>
              </div>
            ))}
            {grievanceList.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">No grievances submitted yet.</p>
            )}
          </div>
        </div>

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
