import type { WorkerRecord } from '@/types/portal';

export type CompletionSection = 'contact' | 'personal' | 'identity' | 'social' | 'banking' | 'skills' | 'family' | 'documents';

export type CompletionItem = { key: string; label: string; section: CompletionSection; done: boolean };

export type ProfileTab = 'personal' | 'attendance' | 'contact' | 'family' | 'social' | 'banking' | 'classification' | 'employment' | 'skills' | 'welfare' | 'other' | 'integrations';

/** Which Profile page tab fixes each completion section. */
const SECTION_TAB: Partial<Record<CompletionSection, ProfileTab>> = {
  contact: 'contact', personal: 'personal', identity: 'personal',
  social: 'social', banking: 'banking', skills: 'skills', family: 'family',
};

export function completionTab(section: CompletionSection): ProfileTab {
  return SECTION_TAB[section] ?? 'personal';
}

/**
 * Single source of truth for the worker "Profile Completion" percentage.
 *
 * Earlier the dashboard used only 6 (mostly system/API-verified) fields while the
 * header used a different 3-item formula, so the two disagreed (e.g. dashboard
 * 17% vs header 70%). This counts the profile fields the worker actually owns
 * across every section, and both surfaces now read from it.
 */
export function workerCompletion(worker: WorkerRecord): { percent: number; items: CompletionItem[]; missing: CompletionItem[] } {
  const required = worker.documents?.required ?? 0;
  const uploaded = worker.documents?.uploaded ?? 0;
  const items: CompletionItem[] = [
    { key: 'mobile', label: 'Mobile number', section: 'contact', done: !!worker.contact?.mobile },
    { key: 'alternateMobile', label: 'Alternate contact number', section: 'contact', done: !!worker.contact?.alternateMobile },
    { key: 'email', label: 'Email ID', section: 'contact', done: !!worker.contact?.email },
    { key: 'address', label: 'Current / permanent address', section: 'contact', done: !!(worker.address?.current || worker.address?.permanent) },
    { key: 'personal', label: 'Personal details (father name, blood group…)', section: 'personal', done: !!(worker.personal?.fatherName || worker.personal?.bloodGroup || worker.personal?.maritalStatus) },
    { key: 'aadhaar', label: 'Aadhaar verified', section: 'identity', done: !!worker.identity?.aadhaarVerified },
    { key: 'pan', label: 'PAN added / verified', section: 'identity', done: !!(worker.identity?.panVerified || worker.identity?.pan) },
    { key: 'eshram', label: 'e-Shram linked', section: 'social', done: !!(worker.socialSecurity?.eShramLinked || worker.socialSecurity?.eShramNo) },
    { key: 'bank', label: 'Bank account added / verified', section: 'banking', done: worker.banking?.verificationStatus === 'Verified' || !!worker.banking?.accountNumber },
    { key: 'skills', label: 'Skills / trade added', section: 'skills', done: !!(worker.skills?.primary?.name || (worker.skills?.items?.length ?? 0) > 0) },
    { key: 'nominee', label: 'Nominee / family added', section: 'family', done: (worker.family?.nominees?.length ?? 0) > 0 },
    { key: 'documents', label: 'Mandatory documents uploaded', section: 'documents', done: required > 0 && uploaded >= required },
  ];
  const done = items.filter(item => item.done).length;
  return { percent: Math.round((done / items.length) * 100), items, missing: items.filter(item => !item.done) };
}

export function completionHref(section: CompletionSection): string {
  if (section === 'documents') return '/worker/Documents';
  return `/worker/Profile?tab=${completionTab(section)}&highlight=missing`;
}
