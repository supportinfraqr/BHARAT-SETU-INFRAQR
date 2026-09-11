"use client";

import { BookOpenCheck } from 'lucide-react';

export default function ContractorSkillsPage() {
  return <div className="space-y-6 pb-12">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Master data</p>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Skills & Courses</h1>
      <p className="text-sm text-gray-500 mt-1">Course catalogue driven by the connected skills service.</p>
    </header>
    <section className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-sm text-gray-500">
      <BookOpenCheck size={28} className="mx-auto text-gray-300 mb-3"/>
      <p>No courses available yet.</p>
    </section>
  </div>;
}