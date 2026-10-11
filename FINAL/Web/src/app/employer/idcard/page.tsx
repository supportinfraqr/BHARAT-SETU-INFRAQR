"use client";

import { useRef, useState } from 'react';
import { useEmployer } from '@/contexts/EmployerContext';
import OrganizationIdentityCard, { entityInitials, formatCardDate, type OrganizationCardContent } from '@/components/idcard/OrganizationIdentityCard';
import CredentialQrPanel from '@/components/idcard/CredentialQrPanel';

export default function EmployerIdentityCardPage() {
  const { employer } = useEmployer();
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const entityId = employer.identity.bssId;
  const findLabel = (section: string | undefined, label: string) => employer.profileSections[section ?? '']?.find(f => f.label === label)?.value;
  const incorpDate = formatCardDate(findLabel('identity', 'Date of Incorporation') ?? findLabel('identity', 'Date of Incorporation / Constitution') ?? findLabel('registration', 'Date of Incorporation'));

  const content: OrganizationCardContent = {
    role: 'employer',
    variant: 'compact',
    entityName: employer.identity.company,
    entityType: employer.identity.entity,
    entityIdLabel: 'BSS Employer ID',
    entityId,
    dateLabel: 'Date of Incorporation',
    dateValue: incorpDate,
    initials: entityInitials(employer.identity.company),
    issueDate: formatCardDate(employer.identity.cardIssueDate) || new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' }),
    validTill: formatCardDate(employer.identity.cardValidTill) || '',
    backTagline: 'Your Workforce. Your Sites. Your Governance.',
    backBadges: [
      { icon: 'shield', title: 'Verified', sub: 'Organization' },
      { icon: 'briefcase', title: 'Site', sub: 'Oversight' },
      { icon: 'check', title: 'Auditable', sub: 'Access' },
    ],
  };

  return <div className="max-w-2xl mx-auto space-y-6">
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h1 className="text-2xl font-bold text-[#022B5E]">Employer Identity Card</h1><p className="text-sm text-bss-text-muted mt-1">Your official BSS digital credential as a registered principal employer organization.</p></div></header>

    <div className="flex justify-center mb-6"><div className="bg-bss-bg p-1 rounded-xl flex gap-1 shadow-inner"><button onClick={() => setIsFlipped(false)} className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${!isFlipped ? 'bg-white text-[#01183A] shadow-sm' : 'text-bss-text-muted hover:text-bss-text-primary'}`}>Front Side</button><button onClick={() => setIsFlipped(true)} className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${isFlipped ? 'bg-white text-[#01183A] shadow-sm' : 'text-bss-text-muted hover:text-bss-text-primary'}`}>Back Side</button></div></div>

    <OrganizationIdentityCard content={content} frontRef={frontRef} backRef={backRef} isFlipped={isFlipped} onToggleFlip={() => setIsFlipped(v => !v)} />

    <CredentialQrPanel bssId={entityId} name={employer.identity.company} idLabel="employer" />
  </div>;
}
