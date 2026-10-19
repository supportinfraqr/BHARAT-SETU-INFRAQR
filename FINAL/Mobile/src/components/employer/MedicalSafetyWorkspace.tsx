"use client";

import { useEffect, useMemo, useState } from 'react';
import { HardHat, Stethoscope, ClipboardCheck } from 'lucide-react';
import MedicalTab from '@/components/employer/medical/MedicalTab';
import SafetyTrainingTab from '@/components/employer/medical/SafetyTrainingTab';
import ComplianceChecklistsPage from '@/components/employer/ComplianceChecklistsPage';
import { useEmployer } from '@/contexts/EmployerContext';

type Tab = 'medical' | 'safety' | 'gatepass';

const TABS: Array<{ key: Tab; label: string; icon: typeof Stethoscope }> = [
  { key: 'medical', label: 'Medical', icon: Stethoscope },
  { key: 'safety', label: 'Health & Safety Training', icon: HardHat },
  { key: 'gatepass', label: 'Gate-Pass Checklist', icon: ClipboardCheck },
];

export default function MedicalSafetyWorkspace() {
  const { employer } = useEmployer();
  const isStaff = Boolean(employer.isStaff);
  const allowed = useMemo(() => TABS.filter(({ key }) => {
    if (!isStaff) return true;
    const perms = employer.staffPermissions ?? [];
    return key === 'medical' ? perms.includes('medical') : key === 'safety' ? perms.includes('safety') : perms.includes('gate_pass');
  }), [isStaff, employer.staffPermissions]);
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'medical';
    const q = new URLSearchParams(window.location.search).get('tab');
    const wanted = (q === 'medical' || q === 'safety' || q === 'gatepass') ? q as Tab : 'medical';
    return allowed.some(t => t.key === wanted) ? wanted : (allowed[0]?.key ?? 'medical');
  });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep the tab within the permitted set
    if (allowed.length && !allowed.some(t => t.key === tab)) setTab(allowed[0].key);
  }, [allowed, tab]);
  return (
    <div className="space-y-4 pb-12">
      <header className="bss-reveal">
        <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Welfare &amp; Safety</p>
        <h1 className="text-2xl font-bold mt-1 text-bss-navy">Occupational Health &amp; Safety</h1>
        <p className="text-sm text-bss-text-secondary mt-1">Record medical examinations and PPE/training on the state health form issued by BSS, and track the gate-pass checklist.</p>
      </header>

      <div role="tablist" aria-label="Health & safety workspaces" className="flex flex-wrap gap-2">
        {allowed.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`h-10 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 border ${tab === key ? 'bg-bss-navy text-white border-bss-navy' : 'bg-white text-bss-text-secondary border-bss-border hover:bg-bss-bg'}`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {!allowed.length && <p className="bss-card rounded-2xl p-8 text-center text-sm text-bss-text-muted">Your account does not have access to the medical or health &amp; safety workspace.</p>}
      {tab === 'medical' && allowed.some(t => t.key === 'medical') && <MedicalTab />}
      {tab === 'safety' && allowed.some(t => t.key === 'safety') && <SafetyTrainingTab />}
      {tab === 'gatepass' && allowed.some(t => t.key === 'gatepass') && <ComplianceChecklistsPage />}
    </div>
  );
}
