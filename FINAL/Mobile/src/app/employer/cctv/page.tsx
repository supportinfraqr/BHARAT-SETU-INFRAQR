"use client";

import { Camera } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import VideoAttendancePanel from '@/components/attendance/VideoAttendancePanel';

export default function EmployerCctvControlPage() {
  const { employer } = useEmployer();
  const sites = employer.sites.map(site => ({ id: String(site.id), name: site.name, code: site.code }));

  return <div className="space-y-6 pb-12">
    <header>
      <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Principal employer · Operations</p>
      <h1 className="text-2xl font-bold mt-1 flex items-center gap-2"><Camera size={22} /> CCTV Control</h1>
      <p className="text-sm text-bss-text-muted mt-1">
        Start or stop site CCTV attendance and monitor live recognition events. Configure the site&apos;s cameras on the CCTV Setup page.
      </p>
    </header>

    <VideoAttendancePanel sites={sites} />
  </div>;
}
