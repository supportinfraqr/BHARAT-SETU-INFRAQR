"use client";

import Link from 'next/link';
import { useState } from 'react';
import { BookOpenCheck, CheckCircle2, ChevronRight, Clock3, Play, Star } from 'lucide-react';
import type { LearningCourse } from '@/types/portal';

// A branded SVG cover, used whenever a course has no uploaded image — so a real
// thumbnail image always renders (never an empty box).
function coverDataUri(category: string, title: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cat = esc((category || 'COURSE').toUpperCase().slice(0, 16));
  const t = esc((title || '').slice(0, 24));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#01183A"/><stop offset="0.55" stop-color="#022B5E"/><stop offset="1" stop-color="#1E3A8A"/></linearGradient></defs>
<rect width="320" height="240" fill="url(#g)"/>
<circle cx="160" cy="120" r="120" fill="#ffffff" opacity="0.04"/>
<g transform="translate(146,52)" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
<path d="M0 4h18a4 4 0 0 1 4 4v20H4a4 4 0 0 1-4-4z"/><path d="M22 8v20"/>
</g>
<text x="160" y="132" text-anchor="middle" fill="#ffffff" font-family="Inter,Segoe UI,sans-serif" font-size="24" font-weight="800" letter-spacing="0.5">${cat}</text>
<text x="160" y="160" text-anchor="middle" fill="#ffffff" font-family="Inter,Segoe UI,sans-serif" font-size="13" opacity="0.7">${t}</text>
<text x="160" y="206" text-anchor="middle" fill="#ffffff" font-family="Inter,Segoe UI,sans-serif" font-size="10" font-weight="600" letter-spacing="3" opacity="0.55">BHARAT SHRAM SETU</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function CourseCard({ course }: { course: LearningCourse }) {
  const fallback = coverDataUri(course.category, course.title);
  const [src, setSrc] = useState(course.image || fallback);
  const statusTone = course.status === 'Completed' ? 'bg-bss-soft-green text-bss-green'
    : course.status === 'In progress' ? 'bg-bss-blue-tint text-bss-interactive-blue'
    : 'bg-white/90 text-bss-text-secondary border border-bss-border';
  return <Link href={`/worker/Skills/${course.id}`} className="group bss-card bss-hover-lift rounded-2xl overflow-hidden flex flex-col sm:flex-row border border-bss-border bg-white">
    <div className="relative w-full sm:w-40 h-36 sm:h-auto flex-shrink-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" onError={() => setSrc(fallback)} className="w-full h-full min-h-[144px] object-cover" />
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
