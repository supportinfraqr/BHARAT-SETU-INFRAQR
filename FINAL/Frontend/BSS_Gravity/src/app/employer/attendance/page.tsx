"use client";

import { Camera } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import VideoAttendancePanel from '@/components/attendance/VideoAttendancePanel';

export default function EmployerAttendancePage() {
  const { employer } = useEmployer();
  const sites = employer.sites.map(site => ({ id: String(site.id), name: site.name, code: site.code }));

  return <div className="space-y-6 pb-12">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Principal employer · Operations</p>
      <h1 className="text-2xl font-bold mt-1 flex items-center gap-2"><Camera size={22} /> Video Attendance</h1>
      <p className="text-sm text-gray-500 mt-1">
        Start the camera attendance system for any of your sites. The camera turns on and recognised workers are
        marked present automatically — the same system your contractors can start for their allotted sites.
      </p>
    </header>

    <VideoAttendancePanel role="employer" sites={sites} />
  </div>;
}
