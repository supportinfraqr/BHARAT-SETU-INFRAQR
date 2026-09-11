"use client";

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ContractorCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  return <div className="space-y-5">
    <header className="flex gap-3 items-start">
      <Link href="/contractor/skills" className="w-9 h-9 border rounded-lg grid place-items-center mt-0.5"><ArrowLeft size={16}/></Link>
      <div><p className="text-xs text-blue-700 font-semibold">Skills & Courses</p><h1 className="text-2xl font-bold">Course unavailable</h1></div>
    </header>
    <p className="text-sm text-gray-500">No course data was returned for “{courseId}”.</p>
  </div>;
}