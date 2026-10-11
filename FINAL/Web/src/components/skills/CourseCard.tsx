"use client";

import Link from 'next/link';
import { useState } from 'react';
import { BookOpenCheck, CheckCircle2, ChevronRight, Clock3, Play, Star } from 'lucide-react';
import type { LearningCourse } from '@/types/portal';

export default function CourseCard({ course }: { course: LearningCourse }) {
  const [imgOk, setImgOk] = useState(Boolean(course.image));
  const statusTone = course.status === 'Completed' ? 'bg-bss-soft-green text-bss-green'
    : course.status === 'In progress' ? 'bg-bss-blue-tint text-bss-interactive-blue'
    : 'bg-white/90 text-bss-text-secondary border border-bss-border';
  return <Link href={`/worker/Skills/${course.id}`} className="group bss-card bss-hover-lift rounded-2xl overflow-hidden flex flex-col sm:flex-row border border-bss-border bg-white">
    <div className="relative w-full sm:w-40 h-36 sm:h-auto flex-shrink-0 overflow-hidden">
      {imgOk && course.image
        ? <img src={course.image} alt="" onError={() => setImgOk(false)} className="w-full h-full object-cover" />
        : <div className="w-full h-full min-h-[144px] grid place-items-center bg-gradient-to-br from-bss-navy via-bss-deep-navy to-bss-interactive-blue text-white">
            <div className="text-center px-3"><BookOpenCheck size={26} className="mx-auto opacity-90" /><span className="mt-1.5 block text-[10px] font-bold uppercase tracking-wider opacity-90">{course.category || 'Course'}</span></div>
          </div>}
      <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusTone}`}>{course.status}</span>
    </div>
    <div className="p-4 flex-1 min-w-0 flex flex-col">
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-bss-interactive-blue">{course.category}</span>
          <h3 className="text-sm font-semibold text-bss-text-primary mt-1 truncate">{course.title}</h3>
          <p className="text-xs text-bss-text-muted mt-0.5 truncate">{course.provider}</p>
        </div>
        <ChevronRight size={16} className="text-bss-text-muted shrink-0 group-hover:text-bss-interactive-blue transition-colors" />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-bss-text-muted mt-3">
        <span className="inline-flex items-center gap-1"><Clock3 size={12} />{course.duration}</span>
        <span className="inline-flex items-center gap-1"><Star size={12} className="text-bss-orange" />{course.rating}</span>
        {course.progress === 100 && <span className="inline-flex items-center gap-1 text-bss-green"><CheckCircle2 size={12} />Certified</span>}
      </div>
      {course.progress > 0 && <div className="mt-3">
        <div className="flex justify-between text-[10px] text-bss-text-muted mb-1"><span>{course.progress === 100 ? 'Completed' : 'Progress'}</span><span>{course.progress}%</span></div>
        <div className="h-1.5 bg-bss-bg rounded-full overflow-hidden"><div className={`h-full rounded-full ${course.progress === 100 ? 'bg-bss-green' : 'bg-bss-interactive-blue'}`} style={{ width: `${course.progress}%` }} /></div>
      </div>}
      <div className="mt-auto pt-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-bss-navy group-hover:text-bss-interactive-blue transition-colors">{course.progress > 0 ? <Play size={12} /> : <BookOpenCheck size={12} />}{course.progress === 100 ? 'View certificate' : course.progress > 0 ? 'Resume' : 'Start course'}</span>
      </div>
    </div>
  </Link>;
}
