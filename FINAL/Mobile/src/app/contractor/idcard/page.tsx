"use client";

import { useState, useRef } from 'react';
import { useContractor } from '@/contexts/ContractorContext';
import OrganizationIdentityCard, { entityInitials, formatCardDate, type OrganizationCardContent } from '@/components/idcard/OrganizationIdentityCard';
import CredentialQrPanel from '@/components/idcard/CredentialQrPanel';

export default function ContractorIdentityCardPage() {
  const { contractor: portal } = useContractor();
  const [isFlipped, setIsFlipped] = useState(false);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const entityId = portal.identity.bssId;
  // Registration number (single concise corporate identifier — CIN from profile).
  const registrationValue = portal.profileSections.registration?.find(f => f.label === 'CIN')?.value;
  // Date of incorporation / formation from entity profile.
  const incorpRaw = portal.identity.incorpDate ?? portal.profileSections.identity?.find(f => f.label === 'Date of Incorporation')?.value ?? '';
  const incorpDate = formatCardDate(incorpRaw);

  const content: OrganizationCardContent = {
    role: 'contractor',
    variant: 'standard',
    entityName: portal.identity.company,
    entityType: portal.identity.entity,
    entityIdLabel: 'BSS Contractor ID',
    entityId,
    dateLabel: 'Date of Incorporation',
    dateValue: incorpDate,
    registrationLabel: 'Registration No.',
    registrationValue,
    initials: entityInitials(portal.identity.company),
    issueDate: formatCardDate(portal.identity.cardIssueDate) || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    validTill: formatCardDate(portal.identity.cardValidTill) || '',
    backTagline: 'Your Company. Your Compliance. Your Security.',
    backBadges: [
      { icon: 'shield', title: 'Verified', sub: 'Organization' },
      { icon: 'briefcase', title: 'Registered', sub: 'Entity' },
      { icon: 'check', title: 'Secure', sub: '& Trusted' },
    ],
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#022B5E]">Contractor Identity Card</h1>
          <p className="text-sm text-bss-text-muted mt-1">Your official BSS digital credential as a registered contractor organization.</p>
        </div>
      </header>

      {/* FLIP CONTROLS */}
      <div className="flex justify-center mb-6">
        <div className="bg-bss-bg p-1 rounded-xl flex gap-1 shadow-inner">
          <button onClick={() => setIsFlipped(false)} className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${!isFlipped ? 'bg-white text-[#01183A] shadow-sm' : 'text-bss-text-muted hover:text-bss-text-primary'}`}>Front Side</button>
          <button onClick={() => setIsFlipped(true)} className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${isFlipped ? 'bg-white text-[#01183A] shadow-sm' : 'text-bss-text-muted hover:text-bss-text-primary'}`}>Back Side</button>
        </div>
      </div>

      <OrganizationIdentityCard content={content} frontRef={frontRef} backRef={backRef} isFlipped={isFlipped} onToggleFlip={() => setIsFlipped(v => !v)} />

      <CredentialQrPanel bssId={entityId} name={portal.identity.company} idLabel="contractor" />
    </div>
  );
}
