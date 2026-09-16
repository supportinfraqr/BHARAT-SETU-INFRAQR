"use client";

import { useContractor } from '@/contexts/ContractorContext';
import PortalSettingsPanel from '@/components/settings/PortalSettings';

export default function ContractorSettingsPage() {
  const { contractor, mutate } = useContractor();

  return (
    <div className="space-y-6 pb-12">
      <header>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Account settings</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Language, alerts, privacy, accessibility and account security · {contractor.identity.company}</p>
      </header>

      <PortalSettingsPanel
        role="contractor"
        settings={contractor.settings ?? {}}
        identity={{ bssId: contractor.identity.bssId, company: contractor.identity.company }}
        onChange={patch => void mutate('settings', 'PATCH', patch)}
        data={contractor}
      />
    </div>
  );
}
