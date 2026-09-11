"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  BookOpen, Award, Clock, ChevronRight, Play, Sparkles, Home, Mic 
} from 'lucide-react';
import { useWorker } from '@/contexts/WorkerContext';

export default function WorkerSkillsPage() {
  const { portal } = useWorker();

  const defaultCourse = {
    id: 'scaffolding-adv',
    title: 'Advanced Scaffolding Safety',
    description: 'Learn the latest safety protocols for high rise scaffolding operations. This mandatory course ensures you comply with national safety standards and reduces on-site accident risks.',
    provider: 'NSDC - Skill India',
    progress: 60,
    image: '/images/scaffolding_course.jpg'
  };

  const rawCourses = portal?.courses && portal.courses.length > 0 ? portal.courses : [defaultCourse];
  const activeCourse = rawCourses[0] ? { ...defaultCourse, ...rawCourses[0] } : defaultCourse;

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">LEARNING</span>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0B192C]">Upskill</h1>
          <p className="text-sm text-gray-500 mt-1">Build verified skills and carry credentials across jobs.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/worker/Skills/catalog" 
            className="px-4 py-2 bg-white border border-gray-200 text-[#073B67] rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2"
          >
            Browse catalog <ChevronRight size={16} />
          </Link>
          <Link href="/worker" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-[#073B67] hover:border-[#073B67] transition-all shadow-sm">
            <Home size={18} />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-1">
          <BookOpen className="text-gray-400" size={20} />
          <p className="text-2xl font-black text-gray-900 pt-1">4</p>
          <p className="text-xs font-semibold text-gray-400">Completed</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-1">
          <Award className="text-gray-400" size={20} />
          <p className="text-2xl font-black text-gray-900 pt-1">2</p>
          <p className="text-xs font-semibold text-gray-400">Certificates</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-1">
          <Clock className="text-gray-400" size={20} />
          <p className="text-2xl font-black text-gray-900 pt-1">18h</p>
          <p className="text-xs font-semibold text-gray-400">Learning time</p>
        </div>
      </div>

      {/* Featured Banner (Continue Learning) */}
      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm grid md:grid-cols-[1.3fr_0.7fr] gap-6">
        <div className="p-6 lg:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} /> CONTINUE LEARNING
            </span>
            <h2 className="text-xl lg:text-2xl font-extrabold text-gray-900">{activeCourse.title}</h2>
            <p className="text-xs lg:text-sm text-gray-600 leading-relaxed font-normal">
              {activeCourse.description}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>{activeCourse.provider || 'NSDC - Skill India'}</span>
              <span>{activeCourse.progress || 60}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#073B67] rounded-full transition-all duration-500" 
                style={{ width: `${activeCourse.progress || 60}%` }}
              />
            </div>

            <div className="pt-2">
              <Link 
                href={`/worker/Skills/${activeCourse.id}`} 
                className="h-11 px-6 rounded-xl bg-[#0B192C] text-white text-xs font-bold inline-flex items-center gap-2 hover:bg-[#062D4F] shadow-sm transition-all"
              >
                <Play size={16} fill="white" /> Resume course
              </Link>
            </div>
          </div>
        </div>

        <div className="relative min-h-[220px] md:min-h-full bg-slate-100">
          <Image 
            src={activeCourse.image || '/images/scaffolding_course.jpg'} 
            alt={activeCourse.title}
            fill
            className="object-cover"
          />
        </div>
      </div>

      {/* Recommended Section */}
      <div className="pt-4 space-y-3">
        <h2 className="text-base font-bold text-gray-900">Your learning</h2>
        <p className="text-xs text-gray-500">Recommended from your occupation and site requirements</p>
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