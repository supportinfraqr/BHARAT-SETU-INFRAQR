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
        Attendance is captured from the CCTV cameras configured for each site (set them up in CCTV Setup). No laptop or
        mobile camera is used. Start the site to let the engine mark recognised workers present automatically.
      </p>
    </header>

    <VideoAttendancePanel sites={sites} />
  </div>;
}
