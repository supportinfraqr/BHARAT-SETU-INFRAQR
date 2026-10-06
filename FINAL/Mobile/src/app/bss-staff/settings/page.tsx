"use client";

import ConsentPanel from '@/components/ConsentPanel';

export default function BssStaffSettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Staff · Settings</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Review the consents you have given for handling worker, contractor and employer records, and revoke any of them.</p>
      </header>
      <ConsentPanel role="staff"/>
    </div>
  );
}
