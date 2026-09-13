"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BssTaxonomies } from '@/data/taxonomies';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorker } from '@/contexts/WorkerContext';
import type { WorkerRecord } from '@/types/portal';
import { MobilitySection, type MobilitySectionHandle } from '@/components/worker/MobilitySection';
import { 
  UserCircle, Save, CheckCircle2, ShieldCheck, 
  MapPin, FileText, Users,
  Building2, CreditCard, Briefcase, Award, BadgeCheck,
  Clock,
  Database, Fingerprint, RefreshCw, CheckCircle, HardHat,
  Plus, Trash2, Percent, Upload, X, Eye
} from 'lucide-react';

export default function WorkerProfilePage() {
  const { t } = useLanguage();
  const { worker, portal, updateWorker, saveWorker } = useWorker();
  const mobilityRef = useRef<MobilitySectionHandle>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'family' | 'social' | 'banking' | 'classification' | 'employment' | 'skills' | 'welfare' | 'other' | 'integrations'>('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  // Save Persona stays disabled until the user actually changes something.
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setDirty(false); }, [activeTab]);

  // ── Multiple nominees (dynamic rows) with individual share % ─────────────
  type NomineeDoc = { type: string; name: string; fileName?: string; url?: string };
  type Nominee = { id: number; name: string; dependant: string; nomineeType: string; relationship: string; dob: string; contact: string; address: string; documents: NomineeDoc[]; percent: number };
  // Split 100% across the nominees as evenly as possible (remainder on the last).
  const balanceNominees = (list: Nominee[]): Nominee[] => {
    if (list.length === 0) return list;
    const base = Math.floor(100 / list.length);
    const remainder = 100 - base * list.length;
    return list.map((n, i) => ({ ...n, percent: base + (i === list.length - 1 ? remainder : 0) }));
  };
  const [nominees, setNominees] = useState<Nominee[]>(() => {
    const list = (worker.family?.nominees ?? []).map(n => ({
      id: n.id, name: n.name, dependant: n.dependant, nomineeType: n.nomineeType,
      relationship: n.relation, dob: n.dob, contact: n.contact, address: n.address,
      documents: (n.documents ?? []).map(d => typeof d === 'string' ? { type: d, name: d } : d), percent: n.percent ?? 100,
    }));
    const total = list.reduce((sum, n) => sum + (Number.isFinite(n.percent) ? n.percent : 0), 0);
    // Repair a previously-saved total that isn't 100 so the section opens balanced.
    return list.length > 0 && total !== 100 ? balanceNominees(list) : list;
  });
  const [nextNomineeId, setNextNomineeId] = useState(() => Math.max(0, ...(worker.family?.nominees ?? []).map(n => n.id)) + 1);
  const [docTargetId, setDocTargetId] = useState<number | null>(null);
  // Disability: Status drives whether Type / % is applicable.
  const [disabilityStatus, setDisabilityStatus] = useState(() => worker.personal.disabilityStatus || 'No');
  const [disabilityTypePct, setDisabilityTypePct] = useState(() => worker.identity.disabilityTypePct || '');
  const nomineeFileRef = useRef<HTMLInputElement>(null);
  const totalPercent = nominees.reduce((sum, n) => sum + (Number.isFinite(n.percent) ? n.percent : 0), 0);
  const percentBalanced = nominees.length > 0 && totalPercent === 100;
  const nomineeAge = (dob: string) => {
    if (!dob) return '';
    const born = new Date(dob + 'T00:00:00'); if (Number.isNaN(born.getTime())) return '';
    const ref = new Date('2026-09-05T00:00:00');
    let age = ref.getFullYear() - born.getFullYear();
    const m = ref.getMonth() - born.getMonth(); if (m < 0 || (m === 0 && ref.getDate() < born.getDate())) age -= 1;
    return String(Math.max(0, age));
  };
  const ageFromDoB = (dob: string) => {
    if (!dob) return '';
    const born = new Date(dob + 'T00:00:00'); if (Number.isNaN(born.getTime())) return '';
    const now = new Date();
    let age = now.getFullYear() - born.getFullYear();
    const m = now.getMonth() - born.getMonth(); if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
    return String(Math.max(0, age));
  };
  const updateNominee = (id: number, patch: Partial<Nominee>) => setNominees(current => current.map(n => n.id === id ? { ...n, ...patch } : n));
  const addNominee = () => { setDirty(true); setNominees(current => balanceNominees([...current, { id: nextNomineeId, name: '', dependant: '', nomineeType: 'Nominee', relationship: BssTaxonomies.NomineeRelationship[0], dob: '', contact: '', address: '', documents: [], percent: 0 }])); setNextNomineeId(id => id + 1); };
  const removeNominee = (id: number) => { setDirty(true); setNominees(current => balanceNominees(current.filter(n => n.id !== id))); };
  const pickNomineeDoc = (id: number) => { setDocTargetId(id); window.setTimeout(() => nomineeFileRef.current?.click(), 0); };
  const addNomineeDoc = async (file?: File) => {
    if (!file || docTargetId === null) return;
    const targetId = docTargetId;
    setDocTargetId(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await fetch('/api/worker/nominee-document', { method: 'POST', body: form });
      const result = await response.json().catch(() => ({})) as { data?: NomineeDoc; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || 'The document could not be uploaded.');
      const doc = result.data;
      setNominees(current => current.map(n => n.id === targetId ? { ...n, documents: [...n.documents, doc] } : n));
      setDirty(true);
    } catch (reason) {
      setProfileError(reason instanceof Error ? reason.message : 'The document could not be uploaded.');
    }
  };
  const splitEqually = () => { setDirty(true); setNominees(current => balanceNominees(current)); };
  const segColors = ['bg-[#073B67]', 'bg-[#F47A32]', 'bg-[#2F9E67]', 'bg-[#7A5AF8]', 'bg-[#0EA5E9]', 'bg-[#E11D48]'];
  // Red border for a required field that was left empty on a failed save.
  const clsErr = (name: string) => invalidFields.includes(name) ? 'border-red-400' : 'border-black/10';
  
  // ── Government ID integrations (sourced from the worker profile) ────────
  const maskId = (value: string, keep = 4) => {
    const clean = (value || '').replace(/\s+/g, '');
    return clean ? '•'.repeat(Math.max(0, clean.length - keep)) + clean.slice(-keep) : '';
  };
  const aadhaarDisplay = maskId(worker.identity.aadhaar, 4);
  const panDisplay = worker.identity.pan || '';
  const uanDisplay = worker.socialSecurity.epfoUan || '';
  const bankVerified = worker.banking.verificationStatus === 'Verified';

  // ── Aadhaar oKYC linking (for workers whose Aadhaar isn't linked yet) ────
  const [aadhaarLink, setAadhaarLink] = useState({ aadhaar: '', referenceId: '', otp: '', sent: false, busy: false, error: '', notice: '' });

  const sendAadhaarOtp = async () => {
    const aadhaar = aadhaarLink.aadhaar.replace(/\D/g, '');
    if (!/^\d{12}$/.test(aadhaar)) { setAadhaarLink(s => ({ ...s, error: 'Enter a valid 12-digit Aadhaar number.' })); return; }
    setAadhaarLink(s => ({ ...s, busy: true, error: '', notice: '' }));
    try {
      const response = await fetch('/api/auth/aadhaar/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aadhaar }) });
      const json = await response.json() as { referenceId?: string; error?: string };
      if (!response.ok || !json.referenceId) throw new Error(json.error || 'OTP could not be sent.');
      setAadhaarLink(s => ({ ...s, referenceId: json.referenceId as string, sent: true, busy: false, notice: 'OTP sent to the mobile linked with your Aadhaar.' }));
    } catch (error) {
      setAadhaarLink(s => ({ ...s, busy: false, error: error instanceof Error ? error.message : 'OTP could not be sent.' }));
    }
  };

  const verifyAadhaarOtp = async () => {
    const aadhaar = aadhaarLink.aadhaar.replace(/\D/g, '');
    if (!/^\d{6}$/.test(aadhaarLink.otp)) { setAadhaarLink(s => ({ ...s, error: 'Enter the 6-digit OTP.' })); return; }
    setAadhaarLink(s => ({ ...s, busy: true, error: '', notice: '' }));
    try {
      const response = await fetch('/api/worker/link-aadhaar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aadhaar, referenceId: aadhaarLink.referenceId, otp: aadhaarLink.otp }) });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error || 'Aadhaar verification failed.');
      const profileResponse = await fetch('/api/worker/profile', { cache: 'no-store' });
      const profileJson = await profileResponse.json() as { data?: typeof worker };
      if (profileJson.data) updateWorker(profileJson.data);
      setAadhaarLink({ aadhaar: '', referenceId: '', otp: '', sent: false, busy: false, error: '', notice: '' });
    } catch (error) {
      setAadhaarLink(s => ({ ...s, busy: false, error: error instanceof Error ? error.message : 'Aadhaar verification failed.' }));
    }
  };

  // ── NPCI Penny Drop bank verification (Sandbox.co.in) ───────────────────
  const [bankVerify, setBankVerify] = useState<{ busy: boolean; message: string; error: string }>({ busy: false, message: '', error: '' });
  const verifyBank = async () => {
    setBankVerify({ busy: true, message: '', error: '' });
    try {
      const response = await fetch('/api/portal/bank-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const result = await response.json() as { data?: { verified?: boolean; nameAtBank?: string; utr?: string; message?: string }; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || 'Verification failed.');
      if (result.data.verified) {
        updateWorker({ banking: { ...worker.banking, verificationStatus: 'Verified', holderName: result.data.nameAtBank || worker.banking.holderName } });
        setBankVerify({ busy: false, message: `Verified — account holder ${result.data.nameAtBank || worker.banking.holderName}${result.data.utr ? ` · UTR ${result.data.utr}` : ''}.`, error: '' });
      } else {
        setBankVerify({ busy: false, message: '', error: result.data.message || 'Account could not be verified.' });
      }
    } catch (error) {
      setBankVerify({ busy: false, message: '', error: error instanceof Error ? error.message : 'Verification failed.' });
    }
  };

  // Deep-link support: /worker/Profile?tab=integrations
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    const allowed = ['personal', 'contact', 'family', 'social', 'banking', 'classification', 'employment', 'skills', 'welfare', 'other', 'integrations'] as const;
    if (tab && (allowed as readonly string[]).includes(tab)) setActiveTab(tab as typeof allowed[number]);
  }, []);

  // Keep the active section in the URL so a refresh lands back on the same tab
  // instead of resetting to "Worker Identity".
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') !== activeTab) {
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [activeTab]);

  // ── DigiLocker document wallet ──────────────────────────────────────────
  type DigiLockerDoc = { id: number; doctype?: string; issuer?: string; doc_date?: string; file_name?: string; file_url?: string; status?: string };
  const [digilockerDocs, setDigilockerDocs] = useState<DigiLockerDoc[]>([]);
  const [digilockerStatus, setDigilockerStatus] = useState<'idle' | 'linking' | 'linked' | 'error'>('idle');
  const [digilockerMessage, setDigilockerMessage] = useState('');
  const digilockerBlob = digilockerDocs.map(d => `${d.doctype ?? ''} ${d.file_name ?? ''}`).join(' ').toUpperCase();
  const digilockerKinds = {
    aadhaar: digilockerBlob.includes('AADHAAR') || digilockerBlob.includes('ADHAR'),
    pan: digilockerBlob.includes('PAN'),
    epfo: /EPFO|UAN|PRFND|PASSBOOK|PROVIDENT/.test(digilockerBlob),
  };

  const loadDigilockerDocs = useCallback(async () => {
    try {
      const response = await fetch('/api/digilocker/documents', { cache: 'no-store' });
      if (!response.ok) return;
      const json = await response.json() as DigiLockerDoc[] | { data?: DigiLockerDoc[] };
      const list = Array.isArray(json) ? json : json.data;
      if (Array.isArray(list)) setDigilockerDocs(list);
    } catch { /* non-fatal */ }
  }, []);

  const linkDigiLocker = async () => {
    setDigilockerStatus('linking');
    setDigilockerMessage('');
    try {
      const response = await fetch('/api/digilocker/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const json = await response.json() as { authorize_url?: string; error?: string };
      if (!response.ok || !json.authorize_url) throw new Error(json.error || 'Could not start DigiLocker linking.');
      window.location.href = json.authorize_url;
    } catch (error) {
      setDigilockerStatus('error');
      setDigilockerMessage(error instanceof Error ? error.message : 'DigiLocker linking failed.');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('digilocker');
    if (outcome === 'linked') {
      setDigilockerStatus('linked');
      loadDigilockerDocs();
      let tries = 0;
      const timer = setInterval(() => { tries += 1; loadDigilockerDocs(); if (tries >= 5) clearInterval(timer); }, 3000);
      return () => clearInterval(timer);
    }
    if (outcome === 'error') {
      setDigilockerStatus('error');
      setDigilockerMessage(params.get('message') || 'DigiLocker linking failed.');
    }
    loadDigilockerDocs();
  }, [loadDigilockerDocs]);
  
  // Conditional UI State
  // EmploymentStatus values must match BssTaxonomies.EmploymentStatus exactly
  // ("Gig active", "Self-employed", "Seasonal", …) so the conditional
  // sub-forms below render when the matching option is selected.
  const [employmentStatus, setEmploymentStatus] = useState(worker.classification?.currentEmploymentStatus || BssTaxonomies.EmploymentStatus[0]);
  const [workerCategory, setWorkerCategory] = useState(worker.classification?.workerCategory || worker.identity.category || BssTaxonomies.WorkerCategory[0]);

  // Welfare & Safety — Medical examination values come from the Worker record.
  const medicalExaminationStatus = worker.welfare?.medicalExaminationStatus?.trim() || '';
  const medicalFitnessStatus = worker.welfare?.medicalFitnessStatus?.trim() || '';
  const medicalStatusTone = medicalExaminationStatus === 'Completed' ? 'text-[#2F9E67]' : medicalExaminationStatus === 'Pending' ? 'text-[#F47A32]' : medicalExaminationStatus === 'Expired' ? 'text-[#FF3B30]' : 'text-gray-900';

  // Skills & Education — self-declared manual-entry fields (editable).
  // System-verified certifications are read-only (issued via course completion).
  const [activeCert, setActiveCert] = useState<{ name: string; authority: string; number: string; expiry: string } | null>(null);
  const [skillsForm, setSkillsForm] = useState({
    educations: (worker.skills?.educations?.length
      ? worker.skills.educations.map(e => ({ qualificationCourse: e.qualificationCourse ?? '', boardUniversity: e.boardUniversity ?? '', passingYear: e.passingYear ?? '' }))
      : [{ qualificationCourse: '', boardUniversity: '', passingYear: '' }]),
    languages: (worker.skills?.languages ?? []).join(', '),
    items: (worker.skills?.items ?? [])
      .filter(s => !s.verified)
      .map(s => ({ name: s.name ?? '', experienceYears: s.experienceYears ?? '' })),
  });
  const setSkill = (key: 'languages', value: string) => setSkillsForm(current => ({ ...current, [key]: value }));
  const addEducation = () => { setDirty(true); setSkillsForm(current => ({ ...current, educations: [...current.educations, { qualificationCourse: '', boardUniversity: '', passingYear: '' }] })); };
  const updateEducation = (index: number, key: 'qualificationCourse' | 'boardUniversity' | 'passingYear', value: string) => setSkillsForm(current => ({ ...current, educations: current.educations.map((e, i) => i === index ? { ...e, [key]: value } : e) }));
  const removeEducation = (index: number) => { setDirty(true); setSkillsForm(current => ({ ...current, educations: current.educations.filter((_, i) => i !== index) })); };
  const addSkill = () => { setDirty(true); setSkillsForm(current => ({ ...current, items: [...current.items, { name: '', experienceYears: '' }] })); };
  const updateSkill = (index: number, key: 'name' | 'experienceYears', value: string) => setSkillsForm(current => ({ ...current, items: current.items.map((s, i) => i === index ? { ...s, [key]: value } : s) }));
  const removeSkill = (index: number) => { setDirty(true); setSkillsForm(current => ({ ...current, items: current.items.filter((_, i) => i !== index) })); };

  // On a successful save: show the success toast, jump to the top, then hard
  // reload the whole portal so every screen reflects the freshly saved data.
  const finishSave = useCallback(() => {
    setShowSuccess(true);
    setProfileError('');
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => window.location.reload(), 1200);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);

    // Block saving until the required fields on the active tab are complete.
    const requiredErrors: { message: string; selector: string; field?: string }[] = [];
    if (activeTab === 'personal') {
      if (!String(fd.get('identity.placeOfBirth') ?? '').trim()) requiredErrors.push({ message: 'Place of Birth is required.', selector: '[name="identity.placeOfBirth"]', field: 'identity.placeOfBirth' });
    }
    if (activeTab === 'classification') {
      const val = (name: string) => String(fd.get(name) ?? '').trim();
      const req: [string, string][] = [
        ['classification.sector', 'Sector'],
        ['classification.industry', 'Industry'],
        ['classification.occupation', 'Occupation'],
        ['classification.totalWorkerExperience', 'Total Worker Experience'],
        ['classification.paymentFrequency', 'Payment Frequency'],
        ['classification.paymentMode', 'Payment Mode'],
      ];
      if (employmentStatus === 'Gig active') req.push(
        ['classification.gigPlatformName', 'Platform / Aggregator Name'],
        ['classification.gigPlatformWorkerId', 'Platform Worker ID'],
        ['classification.gigDateJoined', 'Date Joined Platform'],
        ['classification.gigPlatformType', 'Platform Type'],
        ['classification.gigServiceArea', 'Service Area'],
        ['classification.gigAvgHoursPerDay', 'Average Hours per Day'],
        ['classification.gigAvgDaysPerWeek', 'Average Days per Week'],
      );
      if (employmentStatus === 'Self-employed') req.push(
        ['classification.seBusinessName', 'Business / Enterprise Name'],
        ['classification.seEmployerName', 'Employer / Business Name'],
        ['classification.seBusinessType', 'Business Type'],
        ['classification.seRegistrationStatus', 'Business Registration Status'],
        ['classification.seStartDate', 'Business Start Date'],
        ['classification.seEmployeesCount', 'Number of Employees'],
        ['classification.seAvgHoursPerDay', 'Average Hours/Day'],
        ['classification.seAvgDaysPerWeek', 'Average Days/Week'],
        ['classification.seLocation', 'Location'],
      );
      if (employmentStatus === 'Seasonal') req.push(
        ['classification.seasonalJobType', 'Job / Work Type'],
        ['classification.seasonalStartDate', 'Season Start'],
        ['classification.seasonalEndDate', 'Season End'],
        ['classification.seasonalAvgHoursPerDay', 'Average Hours/Day'],
        ['classification.seasonalAvgDaysPerWeek', 'Average Days/Week'],
        ['classification.seasonalLocation', 'Work Location / Service Area'],
        ['classification.seasonalExpectedIncome', 'Expected Seasonal Income'],
      );
      for (const [name, label] of req) {
        if (!val(name)) requiredErrors.push({ message: `${label} is required.`, selector: `[name="${name}"]`, field: name });
      }
    }
    if (activeTab === 'family') {
      nominees.forEach((n, i) => {
        const row = `Nominee ${i + 1}`;
        if (!n.name.trim()) requiredErrors.push({ message: `${row} — name is required.`, selector: `[data-nominee-name="${n.id}"]` });
        if (!n.relationship.trim()) requiredErrors.push({ message: `${row} — relationship is required.`, selector: `[data-nominee-relationship="${n.id}"]` });
        if (!n.nomineeType.trim()) requiredErrors.push({ message: `${row} — nominee type is required.`, selector: `[data-nominee-type="${n.id}"]` });
        if (!n.dob) requiredErrors.push({ message: `${row} — date of birth is required.`, selector: `[data-nominee-dob="${n.id}"]` });
        if (!n.contact.trim()) requiredErrors.push({ message: `${row} — contact is required.`, selector: `[data-nominee-contact="${n.id}"]` });
        if (!(n.nomineeType === 'Dependant' ? n.name : n.dependant).trim()) requiredErrors.push({ message: `${row} — dependant is required.`, selector: `[data-nominee-dependant="${n.id}"]` });
        if (!n.address.trim()) requiredErrors.push({ message: `${row} — address is required.`, selector: `[data-nominee-address="${n.id}"]` });
        if (n.documents.length === 0) requiredErrors.push({ message: `${row} — at least one identity document is required.`, selector: `[data-nominee-documents="${n.id}"]` });
      });
    }
    if (requiredErrors.length) {
      setShowSuccess(false);
      setSaveAttempted(true);
      setInvalidFields(requiredErrors.map(e => e.field).filter((f): f is string => Boolean(f)));
      setProfileError(`Please complete the required fields before saving — ${requiredErrors.map(e => e.message).join(' ')}`);
      const target = requiredErrors.map(e => form.querySelector(e.selector)).find(Boolean) as HTMLElement | undefined;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => target.focus?.(), 300);
      }
      return;
    }

    if (activeTab === 'contact') {
      await mobilityRef.current?.save();
      finishSave();
      return;
    }
    if (activeTab === 'skills') {
      setIsSaving(true);
      try {
        await saveWorker({
          skills: {
            educations: skillsForm.educations
              .filter(e => e.qualificationCourse.trim() || e.boardUniversity.trim() || e.passingYear.trim())
              .map(e => ({ qualificationCourse: e.qualificationCourse, boardUniversity: e.boardUniversity, passingYear: e.passingYear })),
            languages: skillsForm.languages.split(',').map(s => s.trim()).filter(Boolean),
            items: skillsForm.items
              .filter(s => s.name.trim() || s.experienceYears.trim())
              .map(s => ({ name: s.name, experienceYears: s.experienceYears })),
          },
        });
        finishSave();
      } catch {
        setShowSuccess(false);
      } finally {
        setIsSaving(false);
      }
      return;
    }
    setIsSaving(true);
    setProfileError('');
    try {
      const patch: Record<string, Record<string, unknown>> = {};
      for (const [key, value] of fd.entries()) {
        const idx = key.indexOf('.');
        if (idx <= 0 || idx === key.length - 1) continue;
        const section = key.slice(0, idx);
        const field = key.slice(idx + 1);
        (patch[section] ??= {})[field] = typeof value === 'string' ? value : value.name;
      }
      // Classification selects are controlled state, not native form fields.
      if (activeTab === 'classification') {
        patch.classification = { ...(patch.classification ?? {}), currentEmploymentStatus: employmentStatus, workerCategory };
      }
      // Disability Type / % is a controlled, conditionally-disabled field.
      if (activeTab === 'personal') {
        patch.identity = { ...(patch.identity ?? {}), disabilityTypePct: disabilityStatus === 'Yes' ? disabilityTypePct.trim() : '' };
      }
      // Family nominees live in component state.
      if (activeTab === 'family') {
        patch.family = {
          ...(patch.family ?? {}),
          nominees: (() => {
            const named = nominees.filter(n => n.name.trim());
            const namedTotal = named.reduce((s, n) => s + (Number.isFinite(n.percent) ? n.percent : 0), 0);
            // Never save an unbalanced distribution — auto-normalise to 100%.
            const toSave = named.length > 0 && namedTotal !== 100 ? balanceNominees(named) : named;
            return toSave.map(n => ({
              name: n.name.trim(),
              dependant: n.nomineeType === 'Dependant' ? n.name.trim() : n.dependant,
              relation: n.relationship, nomineeType: n.nomineeType,
              dob: n.dob, age: nomineeAge(n.dob), contact: n.contact, address: n.address, documents: n.documents,
              percent: n.percent,
            }));
          })(),
        };
      }
      await saveWorker(patch as Partial<WorkerRecord>);
      finishSave();
    } catch (err) {
      setShowSuccess(false);
      setProfileError(err instanceof Error ? err.message : 'Profile could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mt-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">{t('nav.identity')}</h1>
          <p className="text-[15px] text-[#86868B] mt-1">Manage your identity, demographics, and security credentials.</p>
        </div>
        
        {showSuccess && (
          <div className="bg-[#E8F5E9] text-[#2F9E67] px-4 py-2.5 rounded-full border border-[#2F9E67]/20 flex items-center gap-2 text-[13px] font-semibold animate-in slide-in-from-top-2">
            <CheckCircle2 size={16} /> Persona Updated
          </div>
        )}
        {profileError && (
          <div role="alert" className="bg-red-50 text-red-700 px-4 py-2.5 rounded-full border border-red-200 flex items-center gap-2 text-[13px] font-semibold">
            {profileError}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        
                {/* SIDEBAR NAVIGATION */}
        <div className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1 hide-scrollbar p-1">
          <button 
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'personal' ? 'bg-[#0F172A] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <UserCircle size={18}/> Worker Identity
          </button>
          <button 
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'contact' ? 'bg-[#0F172A] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <MapPin size={18}/> Address & Mobility
          </button>
          <button 
            onClick={() => setActiveTab('employment')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'employment' ? 'bg-[#0F172A] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Briefcase size={18}/> Employment & Work
          </button>
          <button 
            onClick={() => setActiveTab('family')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'family' ? 'bg-[#0F172A] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Users size={18}/> Family & Dependants
          </button>
          <button 
            onClick={() => setActiveTab('social')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'social' ? 'bg-[#0F172A] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <ShieldCheck size={18}/> Social Security
          </button>
          <button 
            onClick={() => setActiveTab('banking')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'banking' ? 'bg-[#0F172A] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <CreditCard size={18}/> Banking
          </button>
          <button 
            onClick={() => setActiveTab('classification')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'classification' ? 'bg-[#0F172A] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Building2 size={18}/> Worker Classification
          </button>
          <button 
            onClick={() => setActiveTab('welfare')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'welfare' ? 'bg-[#0F172A] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <HardHat size={18}/> Welfare & Safety
          </button>
          <button 
            onClick={() => setActiveTab('skills')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'skills' ? 'bg-[#0F172A] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Award size={18}/> Skills & Employability
          </button>
          <button 
            onClick={() => setActiveTab('other')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'other' ? 'bg-[#0F172A] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Database size={18}/> Other
          </button>
          <a href="/worker/Documents" className="flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            <FileText size={18}/> Documents
          </a>
          <button 
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-3 px-4 py-3 font-semibold text-[14px] rounded-xl whitespace-nowrap transition-colors focus:outline-none ${activeTab === 'integrations' ? 'bg-[#0F172A] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Fingerprint size={18}/> Govt. Integrations
          </button>
        </div>

        
        {/* CONTENT AREA */}
        <div className="flex-1 w-full bg-white rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
          <form onSubmit={handleSave} onChange={() => { setDirty(true); setInvalidFields([]); }} onInput={() => { setDirty(true); setInvalidFields([]); }} className="p-6 md:p-8">
          
          {/* TAB: PERSONAL */}
          {activeTab === 'personal' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                 <div className="w-28 h-28 rounded-full border border-black/10 overflow-hidden flex-shrink-0 relative group">
                    {worker.identity.photoUrl ? <img src={worker.identity.photoUrl} alt="Worker" className="w-full h-full object-cover" /> : <span className="w-full h-full grid place-items-center text-gray-300"><UserCircle size={44}/></span>}
                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer backdrop-blur-sm transition-all">
                      <span className="text-white text-[11px] font-semibold uppercase tracking-wider">Change Photo</span>
                    </div>
                    <p className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">Worker Photo</p>
                 </div>
                 <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 w-full">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">BSS Worker ID</label>
                      <input name="identity.bssId" type="text" defaultValue={worker.identity.bssId} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none" readOnly />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Name as per Aadhaar <span className="text-[#FF3B30]">*</span></label>
                      <input name="identity.name" type="text" defaultValue={worker.identity.name} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none" readOnly />
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 pt-6 border-t border-black/5">
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Date of Birth</label>
                    <input name="identity.dob" type="date" defaultValue={worker.identity.dob} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none" readOnly />
                 </div>
                 <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Age</label>
                   <input type="number" defaultValue={ageFromDoB(worker.identity.dob)} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none" readOnly />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Gender</label>
                    <input name="identity.gender" type="text" defaultValue={worker.identity.gender} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none" readOnly />
                 </div>
                 <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Place of Birth <span className="text-[#FF3B30]">*</span></label>
                   <input name="identity.placeOfBirth" type="text" defaultValue={worker.identity.placeOfBirth || worker.address.permanentState || ''} placeholder="Native village/town, tehsil and district" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                   <p className="text-[10px] text-[#86868B] mt-1">Used with your Aadhaar-verified work address to map migrant flows for state policy.</p>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Marital Status</label>
                    <select name="personal.maritalStatus" defaultValue={worker.personal.maritalStatus} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]">
                      {BssTaxonomies.MaritalStatus.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Blood Group</label>
                    <select name="personal.bloodGroup" defaultValue={worker.personal.bloodGroup} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]">
                      {BssTaxonomies.BloodGroup.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Religion</label>
                    <select name="personal.religion" defaultValue={worker.personal.religion} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]">
                      {BssTaxonomies.Religion.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Caste</label>
                    <select name="personal.caste" defaultValue={worker.personal.caste} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]">
                      {BssTaxonomies.SocialCategory.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Disability Status</label>
                    <select name="personal.disabilityStatus" value={disabilityStatus} onChange={e => { const v = e.target.value; setDisabilityStatus(v); if (v !== 'Yes') setDisabilityTypePct(''); }} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]">
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Disability Type / %</label>
                    <input name="identity.disabilityTypePct" type="text" value={disabilityTypePct} onChange={e => setDisabilityTypePct(e.target.value)} disabled={disabilityStatus !== 'Yes'} placeholder={disabilityStatus === 'Yes' ? 'e.g. Locomotor 40%' : 'Not applicable'} className="bss-cursor-blocked w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] disabled:bg-[#F5F5F7] disabled:text-gray-400" />
                    {disabilityStatus === 'Yes' && !disabilityTypePct.trim() && <p className="text-[11px] text-[#F47A32] mt-1">Please specify the disability type / percentage.</p>}
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 pt-6 border-t border-black/5">
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Father Name</label>
                    <input name="personal.fatherName" type="text" defaultValue={worker.personal.fatherName} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none" readOnly />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Mother Name</label>
                    <input name="personal.motherName" type="text" defaultValue={worker.personal.motherName} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]" />
                 </div>
               </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-1">Emergency Contact</h3>
                <p className="text-[13px] text-[#86868B] mb-4">Used by the site medical officer and safety team in case of an emergency.</p>
                <div className="bg-[#F5F5F7] rounded-[16px] p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Emergency Contact Name</p>
                     <input name="identity.emergencyContactName" type="text" defaultValue={worker.identity.emergencyContactName} placeholder="Not provided" className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Emergency Contact Number</p>
                     <input name="identity.emergencyContactNumber" type="tel" maxLength={10} defaultValue={worker.identity.emergencyContactNumber} placeholder="Not provided" className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Emergency Contact Relationship</p>
                     <select name="identity.emergencyContactRelation" defaultValue={worker.identity.emergencyContactRelation} className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#0066CC]">
                       {BssTaxonomies.NomineeRelationship.map(r => <option key={r} value={r}>{r}</option>)}
                     </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Contact Details</h3>
                <div className="bg-[#F5F5F7] rounded-[16px] p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mobile Number</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">+91 {worker.contact.mobile}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alternate Mobile Number</p>
                    <input name="identity.alternateMobile" type="tel" defaultValue={worker.contact.alternateMobile} placeholder="Not provided" className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email ID</p>
                    <input name="identity.email" type="email" defaultValue={worker.contact.email} placeholder="Not provided" className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#0066CC]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONTACT */}
          {activeTab === 'contact' && <MobilitySection ref={mobilityRef} worker={worker} updateWorker={updateWorker} onSavingChange={setIsSaving} onSaved={() => { setShowSuccess(true); setTimeout(() => setShowSuccess(false), 3000); }}/>} 

          {/* TAB: FAMILY & NOMINEE */}
          {activeTab === 'family' && (
            <div className="space-y-8 animate-in fade-in">
              {/* Household size — describes your family, separate from the legal nominees below */}
              <div className="rounded-[16px] border border-black/10 bg-gray-50/40 p-5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F]">Household</h3>
                <p className="text-[13px] text-[#86868B] mt-1 mb-4">How many people are in your family and how many depend on you. These are household counts — separate from the legal nominees below.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                   <div>
                     <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Family Members Count</label>
                     <input name="family.familyMembersCount" type="number" min={0} defaultValue={worker.family?.familyMembersCount ?? 0} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                   </div>
                   <div>
                     <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Dependants Count</label>
                     <input name="family.dependantsCount" type="number" min={0} defaultValue={worker.family?.dependantsCount ?? 0} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                   </div>
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F]">Official Nominee Details</h3>
                  <button type="button" onClick={addNominee} className="inline-flex items-center gap-1.5 text-[#0066CC] text-[13px] font-semibold hover:underline"><Plus size={15}/> Add Nominee</button>
                </div>
                <p className="text-[13px] text-[#86868B] mb-4">Add multiple nominees — each nominee gets one row with their own relationship, identity documents and share (%). Total share must equal 100%.</p>

                {/* Hidden input shared by every nominee row's document upload */}
                <input ref={nomineeFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { void addNomineeDoc(e.target.files?.[0]); e.target.value = ''; }}/>

                <div className="space-y-4">
                  {nominees.map((n, rowIndex) => (
                    <div key={n.id} className="rounded-[16px] border border-black/10 bg-gray-50/40 p-5 space-y-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Nominee {rowIndex + 1} {n.name && <span className="normal-case text-gray-600">— {n.name}</span>}</p>
                        <button type="button" onClick={() => removeNominee(n.id)} aria-label="Remove nominee" className="w-7 h-7 grid place-items-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-5">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Name <span className="text-[#FF3B30]">*</span></label>
                          <input type="text" data-nominee-name={n.id} value={n.name} onChange={e => updateNominee(n.id, n.nomineeType === 'Dependant' ? { name: e.target.value, dependant: e.target.value } : { name: e.target.value })} placeholder="Nominee full name" className={`w-full bg-white border rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] ${saveAttempted && !n.name.trim() ? 'border-red-400' : 'border-black/10'}`}/>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Relationship <span className="text-[#FF3B30]">*</span></label>
                          <select data-nominee-relationship={n.id} value={n.relationship} onChange={e => updateNominee(n.id, { relationship: e.target.value })} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
                            {BssTaxonomies.NomineeRelationship.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Nominee Type <span className="text-[#FF3B30]">*</span></label>
                          <select data-nominee-type={n.id} value={n.nomineeType} onChange={e => { const t = e.target.value; updateNominee(n.id, t === 'Dependant' ? { nomineeType: t, dependant: n.name } : { nomineeType: t }); }} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
                            <option>Nominee</option>
                            <option>Family Member</option>
                            <option>Dependant</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Date of Birth <span className="text-[#FF3B30]">*</span></label>
                          <input type="date" data-nominee-dob={n.id} value={n.dob} onChange={e => updateNominee(n.id, { dob: e.target.value })} className={`w-full bg-white border rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] ${saveAttempted && !n.dob ? 'border-red-400' : 'border-black/10'}`}/>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Age</label>
                          <input type="text" value={nomineeAge(n.dob)} readOnly className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F]"/>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Contact <span className="text-[#FF3B30]">*</span></label>
                          <input type="tel" maxLength={10} data-nominee-contact={n.id} value={n.contact} onChange={e => updateNominee(n.id, { contact: e.target.value })} className={`w-full bg-white border rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] ${saveAttempted && !n.contact.trim() ? 'border-red-400' : 'border-black/10'}`}/>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Dependant <span className="text-[#FF3B30]">*</span></label>
                          <input type="text" data-nominee-dependant={n.id} value={n.nomineeType === 'Dependant' ? n.name : n.dependant} readOnly={n.nomineeType === 'Dependant'} onChange={e => updateNominee(n.id, { dependant: e.target.value })} placeholder={n.nomineeType === 'Dependant' ? 'Auto-filled from nominee name' : 'Name of dependant'} className={`w-full border rounded-xl px-3 py-2.5 text-[13px] font-medium focus:outline-none focus:border-[#0066CC] ${n.nomineeType === 'Dependant' ? 'bg-[#F5F5F7] text-gray-500 border-transparent' : `bg-white text-[#1D1D1F] ${saveAttempted && !n.dependant.trim() ? 'border-red-400' : 'border-black/10'}`}`}/>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Nominee / Family Address <span className="text-[#FF3B30]">*</span></label>
                          <textarea rows={2} data-nominee-address={n.id} value={n.address} onChange={e => updateNominee(n.id, { address: e.target.value })} className={`w-full bg-white border rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] resize-none ${saveAttempted && !n.address.trim() ? 'border-red-400' : 'border-black/10'}`}/>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Identity Documents <span className="text-[#FF3B30]">*</span></label>
                          <div data-nominee-documents={n.id} className={`flex flex-wrap items-center gap-2 rounded-xl min-h-[42px] ${saveAttempted && n.documents.length === 0 ? 'ring-1 ring-red-400 p-1' : ''}`}>
                            <button type="button" onClick={() => pickNomineeDoc(n.id)} className="inline-flex items-center gap-1.5 bg-white border border-black/10 px-3 py-2 rounded-lg text-[12px] font-medium hover:bg-gray-50"><Upload size={14}/> Upload PAN / Aadhaar Copy</button>
                            {n.documents.map((doc, docIndex) => (
                              <span key={`${doc.fileName ?? doc.name}-${docIndex}`} className="inline-flex items-center gap-2 bg-[#E8F5E9]/70 border border-[#2F9E67]/20 text-[#2F9E67] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold">
                                <FileText size={12}/>
                                <span className="max-w-[180px] truncate" title={doc.name}>{doc.name}</span>
                                {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[#073B67] hover:underline" title="View document"><Eye size={12}/>View</a>}
                                <button type="button" onClick={() => updateNominee(n.id, { documents: n.documents.filter((_, i) => i !== docIndex) })} aria-label={`Remove ${doc.name}`} className="text-gray-400 hover:text-red-600"><Trash2 size={11}/></button>
                              </span>
                            ))}
                            {!n.documents.length && <span className="text-[11px] text-gray-400">No document uploaded</span>}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Share %</label>
                          <div className="relative">
                            <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <input type="text" inputMode="numeric" pattern="[0-9]*" value={nominees.length === 1 ? '100' : (n.percent ? String(n.percent) : '')} placeholder="0" onChange={e => { const digits = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''); const others = totalPercent - (Number.isFinite(n.percent) ? n.percent : 0); const max = Math.max(0, 100 - others); const num = digits === '' ? 0 : Math.min(max, parseInt(digits, 10)); updateNominee(n.id, { percent: num }); }} disabled={nominees.length === 1} className="w-full bg-white border border-black/10 rounded-xl pl-8 pr-2 py-2.5 text-[13px] font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] disabled:bg-[#F5F5F7] disabled:text-gray-500"/>
                          </div>
                          {nominees.length === 1 && <p className="text-[10px] text-gray-400 mt-1">A single nominee receives 100%.</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Distribution summary — only meaningful once a nominee exists */}
                {nominees.length > 0 && (
                  <div className="mt-5 rounded-[16px] border border-black/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-[#1D1D1F]">Nominee share distribution</p>
                      <span className={`text-[12px] font-bold ${percentBalanced ? 'text-[#2F9E67]' : 'text-[#F47A32]'}`}>{percentBalanced ? '100% · balanced' : `${totalPercent}% of 100%`}</span>
                    </div>
                    {nominees.length > 1 && (
                      <div className="mt-3 flex h-2.5 rounded-full overflow-hidden bg-gray-100">
                        {nominees.map((n, index) => <span key={n.id} className={`h-full ${segColors[index % segColors.length]}`} style={{ width: `${n.percent}%` }} title={`${n.name || 'Nominee ' + (index + 1)} · ${n.percent}%`}/>)}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      {nominees.map((n, index) => (
                        <span key={n.id} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600"><span className={`w-2.5 h-2.5 rounded-full ${segColors[index % segColors.length]}`}/>{n.name || ('Nominee ' + (index + 1))} — {n.percent}%</span>
                      ))}
                    </div>
                    {!percentBalanced && <p className="mt-3 text-[12px] text-[#F47A32] font-semibold flex items-center gap-1.5">Shares add up to {totalPercent}% — {Math.max(0, 100 - totalPercent)}% still to allocate. The total must be exactly 100%.</p>}
                    {nominees.length > 1 && <button type="button" onClick={splitEqually} className="mt-3 inline-flex items-center gap-1.5 text-[#0066CC] text-[12px] font-semibold hover:underline"><RefreshCw size={13}/> Split equally</button>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: SOCIAL SECURITY */}
          {activeTab === 'social' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-[#FFF8F0] p-5 rounded-2xl border border-[#F47A32]/20 mb-6">
                <p className="text-[13px] text-[#F47A32] font-medium">These identifiers are primarily updated by your employer or government APIs. You can declare existing numbers here to assist matching.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                 <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">EPFO UAN</label>
                   <input name="socialSecurity.epfoUan" type="text" defaultValue={worker.socialSecurity.epfoUan} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                 </div>
                 <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">ESIC IP Number</label>
                   <input name="socialSecurity.esicIp" type="text" defaultValue={worker.socialSecurity.esicIp} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">LWF Number (Labour Welfare Fund)</label>
                    <input name="socialSecurity.lwfNo" type="text" defaultValue={worker.socialSecurity.lwfNo} placeholder="Enter if available" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">e-Shram Number <span className="ml-1 inline-flex items-center text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase">{worker.socialSecurity.eShramNo ? 'Linked' : 'Not Linked'}</span></label>
                    <input name="socialSecurity.eShramNo" type="text" defaultValue={worker.socialSecurity.eShramNo} placeholder="Enter 12 digit UAN" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">BOCW Registration Number <span className="ml-1 inline-flex items-center text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase">{worker.socialSecurity.bocwRegNumber ? 'Registered' : 'Not Registered'}</span></label>
                    <input name="socialSecurity.bocwRegNumber" type="text" defaultValue={worker.socialSecurity.bocwRegNumber} placeholder="State BOCW ID" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">WC Policy No. (Workmen Compensation)</label>
                    <input name="socialSecurity.wcPolicyNo" type="text" defaultValue={worker.socialSecurity.wcPolicyNo} placeholder="Insurance Policy No." className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">State Worker ID</label>
                    <input name="socialSecurity.stateWorkerId" type="text" defaultValue={worker.socialSecurity.stateWorkerId} placeholder="State labour department worker ID" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                 </div>
              </div>
            </div>
          )}

          {/* TAB: BANKING & VERIFICATION */}
          {activeTab === 'banking' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Aadhaar No.</label>
                    <div className="flex items-center gap-3">
                      <input name="identity.aadhaar" type="password" defaultValue={worker.identity.aadhaar} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F]" readOnly />
                      <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex-shrink-0 ${worker.identity.aadhaarVerified ? 'bg-[#E8F5E9] text-[#2F9E67]' : 'bg-gray-100 text-[#86868B]'}`}>{worker.identity.aadhaarVerified ? 'Verified' : 'Pending'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">PAN No.</label>
                    <div className="flex items-center gap-3">
                      <input name="identity.pan" type="text" defaultValue={worker.identity.pan} placeholder="Enter PAN" readOnly={worker.identity.panVerified} className={`w-full border rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] uppercase focus:outline-none ${worker.identity.panVerified ? 'bg-[#F5F5F7] border-transparent' : 'bg-white border-black/10 focus:border-[#0066CC]'}`} />
                      <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex-shrink-0 ${worker.identity.panVerified ? 'bg-[#E8F5E9] text-[#2F9E67]' : 'bg-gray-100 text-[#86868B]'}`}>{worker.identity.panVerified ? 'Verified' : 'Pending'}</span>
                    </div>
                  </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F]">Bank Accounts (Wage Transfer)</h3>
                  {bankVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2F9E67] bg-[#E8F5E9] px-2.5 py-1 rounded-full"><CheckCircle2 size={13}/> KYC Verified (Penny Drop)</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#F47A32] bg-[#FFF8F0] px-2.5 py-1 rounded-full"><ShieldCheck size={13}/> KYC pending</span>
                  )}
                </div>
                <div className="rounded-[14px] bg-[#EAF3FF] border border-[#0066CC]/15 px-4 py-3 mb-5 text-[13px] text-[#073B67] font-medium">
                  <strong>Note:</strong> Your <strong>primary account receives your salary</strong>. Keep the primary account active; the secondary account is used only when you choose it (e.g., saving/loan account). Both accounts are registered in <em>Govt. Integrations</em> and must pass KYC through the bank verification API.
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Primary account */}
                  <div className="rounded-[16px] border border-[#2F9E67]/30 bg-white overflow-hidden">
                    <div className="px-4 py-3 bg-[#E8F5E9]/60 border-b border-[#2F9E67]/20 flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#1D1D1F]"><CheckCircle2 size={14} className="text-[#2F9E67]"/> Primary Account</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#2F9E67] px-2 py-0.5 rounded-full">Receives Salary</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Bank Name</label>
                        <input name="banking.bankName" type="text" defaultValue={worker.banking.bankName} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]"/>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Bank Account Holder Name</label>
                        <input name="banking.holderName" type="text" defaultValue={worker.banking.holderName} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]"/>
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Bank Account Number</label>
                        <input name="banking.accountNumber" type="password" defaultValue={worker.banking.accountNumber} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]"/>
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">IFSC Code</label>
                        <input name="banking.ifsc" type="text" defaultValue={worker.banking.ifsc} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-mono font-medium text-[#1D1D1F] uppercase focus:outline-none focus:border-[#0066CC]"/>
                      </div>
                      <div className="sm:col-span-2">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${worker.banking.verificationStatus === 'Verified' ? 'text-[#2F9E67] bg-[#E8F5E9]' : 'text-[#F47A32] bg-[#FFF8F0]'}`}><ShieldCheck size={12}/> {worker.banking.verificationStatus === 'Verified' ? 'KYC Verified (NPCI Penny Drop)' : 'KYC pending — verify in Govt. Integrations'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: CLASSIFICATION & WORK */}
          {activeTab === 'classification' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Current Employment Status</label>
                   <select 
                     value={employmentStatus}
                     onChange={(e) => setEmploymentStatus(e.target.value)}
                     className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]"
                   >
                     {BssTaxonomies.EmploymentStatus.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Worker Category</label>
                   <select 
                     value={workerCategory}
                     onChange={(e) => setWorkerCategory(e.target.value)}
                     className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]"
                   >
                     {BssTaxonomies.WorkerCategory.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
                <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Sector <span className="text-[#FF3B30]">*</span></label>
                    <select name="classification.sector" defaultValue={worker.classification?.sector} className={`w-full bg-white border ${clsErr('classification.sector')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`}>
                      {BssTaxonomies.Sector.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Industry <span className="text-[#FF3B30]">*</span></label>
                    <input name="classification.industry" type="text" defaultValue={worker.classification?.industry} className={`w-full bg-white border ${clsErr('classification.industry')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Occupation <span className="text-[#FF3B30]">*</span></label>
                    <select name="classification.occupation" defaultValue={worker.classification?.occupation} className={`w-full bg-white border ${clsErr('classification.occupation')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`}>
                      <option>Bar Bender (Rebar)</option>
                      <option>Mason</option>
                      <option>Carpenter</option>
                      <option>Electrician</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Total Worker Experience (Years) <span className="text-[#FF3B30]">*</span></label>
                    <input name="classification.totalWorkerExperience" type="number" min={0} defaultValue={worker.classification?.totalWorkerExperience} className={`w-full bg-white border ${clsErr('classification.totalWorkerExperience')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                 </div>
              </div>

              {/* Conditional Block: GIG ACTIVE (taxonomy value "Gig active") */}
              {employmentStatus === 'Gig active' && (
                <div className="pt-6 border-t border-black/5 animate-in slide-in-from-top-2">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Gig Platform Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Platform / Aggregator Name <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.gigPlatformName" type="text" defaultValue={worker.classification?.gigPlatformName} className={`w-full bg-white border ${clsErr('classification.gigPlatformName')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Platform Worker ID <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.gigPlatformWorkerId" type="text" defaultValue={worker.classification?.gigPlatformWorkerId} className={`w-full bg-white border ${clsErr('classification.gigPlatformWorkerId')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Date Joined Platform <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.gigDateJoined" type="date" defaultValue={worker.classification?.gigDateJoined} className={`w-full bg-white border ${clsErr('classification.gigDateJoined')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Platform Type <span className="text-[#FF3B30]">*</span></label>
                      <select name="classification.gigPlatformType" defaultValue={worker.classification?.gigPlatformType} className={`w-full bg-white border ${clsErr('classification.gigPlatformType')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`}>
                        {BssTaxonomies.PlatformType.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Service Area <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.gigServiceArea" type="text" defaultValue={worker.classification?.gigServiceArea} className={`w-full bg-white border ${clsErr('classification.gigServiceArea')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Vehicle Type</label>
                      <select name="classification.gigVehicleType" defaultValue={worker.classification?.gigVehicleType} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
                        {BssTaxonomies.VehicleType.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Vehicle Ownership</label>
                      <select name="classification.gigVehicleOwnership" defaultValue={worker.classification?.gigVehicleOwnership} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
                        <option>Owned</option>
                        <option>Leased / Rented</option>
                        <option>Platform Provided</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Average Hours per Day <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.gigAvgHoursPerDay" type="number" placeholder="Hours" defaultValue={worker.classification?.gigAvgHoursPerDay} className={`w-full bg-white border ${clsErr('classification.gigAvgHoursPerDay')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Average Days per Week <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.gigAvgDaysPerWeek" type="number" placeholder="Days" defaultValue={worker.classification?.gigAvgDaysPerWeek} className={`w-full bg-white border ${clsErr('classification.gigAvgDaysPerWeek')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Driving Licence Number</label>
                      <input name="classification.gigDlNumber" type="text" defaultValue={worker.classification?.gigDlNumber} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Driving Licence Expiry</label>
                      <input name="classification.gigDlExpiry" type="date" defaultValue={worker.classification?.gigDlExpiry} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Block: SELF-EMPLOYED (taxonomy value "Self-employed") */}
              {employmentStatus === 'Self-employed' && (
                <div className="pt-6 border-t border-black/5 animate-in slide-in-from-top-2">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Self Employment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Business / Enterprise Name <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seBusinessName" type="text" defaultValue={worker.classification?.seBusinessName} className={`w-full bg-white border ${clsErr('classification.seBusinessName')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employer / Business Name <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seEmployerName" type="text" defaultValue={worker.classification?.seEmployerName} className={`w-full bg-white border ${clsErr('classification.seEmployerName')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Business Type <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seBusinessType" type="text" defaultValue={worker.classification?.seBusinessType} className={`w-full bg-white border ${clsErr('classification.seBusinessType')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Business Registration Status <span className="text-[#FF3B30]">*</span></label>
                      <select name="classification.seRegistrationStatus" defaultValue={worker.classification?.seRegistrationStatus} className={`w-full bg-white border ${clsErr('classification.seRegistrationStatus')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`}>
                        <option>Registered</option>
                        <option>Unregistered</option>
                        <option>Registration Pending</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Business Start Date <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seStartDate" type="date" defaultValue={worker.classification?.seStartDate} className={`w-full bg-white border ${clsErr('classification.seStartDate')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Number of Employees <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seEmployeesCount" type="number" min={0} defaultValue={worker.classification?.seEmployeesCount} className={`w-full bg-white border ${clsErr('classification.seEmployeesCount')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Average Hours/Day <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seAvgHoursPerDay" type="number" placeholder="Hours" defaultValue={worker.classification?.seAvgHoursPerDay} className={`w-full bg-white border ${clsErr('classification.seAvgHoursPerDay')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Average Days/Week <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seAvgDaysPerWeek" type="number" placeholder="Days" defaultValue={worker.classification?.seAvgDaysPerWeek} className={`w-full bg-white border ${clsErr('classification.seAvgDaysPerWeek')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Location <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seLocation" type="text" defaultValue={worker.classification?.seLocation} className={`w-full bg-white border ${clsErr('classification.seLocation')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Block: SEASONAL */}
              {employmentStatus === 'Seasonal' && (
                <div className="pt-6 border-t border-black/5 animate-in slide-in-from-top-2">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Seasonal Work Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Job / Work Type <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seasonalJobType" type="text" defaultValue={worker.classification?.seasonalJobType} className={`w-full bg-white border ${clsErr('classification.seasonalJobType')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Season Start <span className="text-[#FF3B30]">*</span></label>
                        <input name="classification.seasonalStartDate" type="date" defaultValue={worker.classification?.seasonalStartDate} className={`w-full bg-white border ${clsErr('classification.seasonalStartDate')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Season End <span className="text-[#FF3B30]">*</span></label>
                        <input name="classification.seasonalEndDate" type="date" defaultValue={worker.classification?.seasonalEndDate} className={`w-full bg-white border ${clsErr('classification.seasonalEndDate')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Average Hours/Day <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seasonalAvgHoursPerDay" type="number" defaultValue={worker.classification?.seasonalAvgHoursPerDay} placeholder="Hours" className={`w-full bg-white border ${clsErr('classification.seasonalAvgHoursPerDay')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Average Days/Week <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seasonalAvgDaysPerWeek" type="number" defaultValue={worker.classification?.seasonalAvgDaysPerWeek} placeholder="Days" className={`w-full bg-white border ${clsErr('classification.seasonalAvgDaysPerWeek')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Work Location / Service Area <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seasonalLocation" type="text" defaultValue={worker.classification?.seasonalLocation} className={`w-full bg-white border ${clsErr('classification.seasonalLocation')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Expected Seasonal Income <span className="text-[#FF3B30]">*</span></label>
                      <input name="classification.seasonalExpectedIncome" type="text" defaultValue={worker.classification?.seasonalExpectedIncome} placeholder="₹" className={`w-full bg-white border ${clsErr('classification.seasonalExpectedIncome')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`} />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Payment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Payment Frequency <span className="text-[#FF3B30]">*</span></label>
                    <select name="classification.paymentFrequency" defaultValue={worker.classification?.paymentFrequency} className={`w-full bg-white border ${clsErr('classification.paymentFrequency')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`}>
                      <option>Weekly</option>
                      <option>Fortnightly</option>
                      <option>Monthly</option>
                      <option>Per Task / Piece Rate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Payment Mode <span className="text-[#FF3B30]">*</span></label>
                    <select name="classification.paymentMode" defaultValue={worker.classification?.paymentMode} className={`w-full bg-white border ${clsErr('classification.paymentMode')} rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]`}>
                      <option>Bank Transfer</option>
                      <option>Cheque</option>
                      <option>Cash</option>
                      <option>UPI</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Consents & Registration (Read Only)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Registration Source</label>
                    <input name="other.registrationSource" type="text" defaultValue={worker.other?.registrationSource} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Consent for Data Sharing</label>
                    <div className="flex items-center gap-2 w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3">
                      <CheckCircle2 size={18} className="text-[#2F9E67]"/>
                      <span className="text-[14px] font-medium text-[#1D1D1F]">{worker.other?.consentDate ? `Granted on ${worker.other.consentDate}` : 'Not granted'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EMPLOYMENT BINDING (READ ONLY) */}
          {activeTab === 'employment' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-[#E8F5E9] p-5 rounded-2xl border border-[#2F9E67]/20 mb-6">
                <p className="text-[13px] text-[#2F9E67] font-medium">These employment and binding details are generated automatically by the system upon your successful binding with a contractor.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employer Name</label>
                   <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.name ?? worker.employment.employer} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employer Code</label>
                   <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.code} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employer Email ID</label>
                   <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.email} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employer State</label>
                  <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.state} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employer Address</label>
                   <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.address} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employer Industry</label>
                   <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.industry} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Principal Employer LIN No.</label>
                   <input name="employment.employerDetails" type="text" defaultValue={worker.employment.employerDetails?.lin} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Contractor Name</label>
                   <input name="employment.contractorDetails" type="text" defaultValue={worker.employment.contractorDetails?.name ?? worker.employment.contractor} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Contractor Code</label>
                   <input name="employment.contractorDetails" type="text" defaultValue={worker.employment.contractorDetails?.code} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Contractor Email</label>
                   <input name="employment.contractorDetails" type="text" defaultValue={worker.employment.contractorDetails?.email} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Contractor State</label>
                  <input name="employment.contractorDetails" type="text" defaultValue={worker.employment.contractorDetails?.state} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Contractor Address</label>
                   <input name="employment.contractorDetails" type="text" defaultValue={worker.employment.contractorDetails?.address} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Contractor LIN</label>
                   <input name="employment.contractorDetails" type="text" defaultValue={worker.employment.contractorDetails?.lin} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Site & Role Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Site Name</label>
                    <input name="employment.siteDetails" type="text" defaultValue={worker.employment.siteDetails?.name ?? worker.employment.site} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Site Code</label>
                    <input name="employment.siteDetails" type="text" defaultValue={worker.employment.siteDetails?.code} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Site Location</label>
                    <input name="employment.siteDetails" type="text" defaultValue={worker.employment.siteDetails?.location} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">State</label>
                    <input name="employment.siteDetails" type="text" defaultValue={worker.employment.siteDetails?.state} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Designation & Department</label>
                    <input type="text" defaultValue={[worker.employment.designation, worker.employment.department].filter(Boolean).join(" - ")} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Nature of Job</label>
                    <input name="employment.natureOfJob" type="text" defaultValue={worker.employment.natureOfJob} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Type of Work</label>
                    <input name="employment.typeOfWork" type="text" defaultValue={worker.employment.typeOfWork} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Date of Joining</label>
                    <input name="employment.doj" type="text" defaultValue={worker.employment.doj} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employment Status</label>
                    <input name="employment.status" type="text" defaultValue={worker.employment.status} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#2F9E67]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Reference Worker ID</label>
                    <input name="employment.refWorkerId" type="text" defaultValue={worker.employment.refWorkerId} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">PF Account</label>
                    <input name="employment.pfAccount" type="text" defaultValue={worker.employment.pfAccount} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Logistics & Additional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Shift</label>
                    <input name="employment.shift" type="text" defaultValue={worker.employment.shift} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Camp No.</label>
                    <input name="employment.campNo" type="text" defaultValue={worker.employment.campNo} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Transport Facility</label>
                    <input name="employment.transportFacility" type="text" defaultValue={worker.employment.transportFacility} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#2F9E67]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Route</label>
                    <input name="employment.route" type="text" defaultValue={worker.employment.route} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Bus No.</label>
                    <input name="employment.busNo" type="text" defaultValue={worker.employment.busNo} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">ID Card Issue Date</label>
                    <input name="employment.idCardIssueDate" type="text" defaultValue={worker.employment.idCardIssueDate} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">ID Card Validity Till</label>
                    <input name="employment.idCardValidityTill" type="text" defaultValue={worker.employment.idCardValidityTill} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                </div>
              </div>
              

            </div>
          )}

          {/* TAB: SKILLS & EMPLOYABILITY */}
          {activeTab === 'skills' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-[#F5F5F7] rounded-[16px] p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F]">Education & Languages</h3>
                  <button type="button" onClick={addEducation} className="text-[#0066CC] text-[13px] font-semibold hover:underline">+ Add Education</button>
                </div>
                {skillsForm.educations.map((edu, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white rounded-[12px] p-4 border border-gray-200">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Qualification / Course</p>
                      <input type="text" value={edu.qualificationCourse} onChange={e => updateEducation(index, 'qualificationCourse', e.target.value)} placeholder="e.g. 12th Standard (HSC)" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Board / University</p>
                      <input type="text" value={edu.boardUniversity} onChange={e => updateEducation(index, 'boardUniversity', e.target.value)} placeholder="e.g. CBSE" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Passing Year</p>
                      <input type="text" inputMode="numeric" value={edu.passingYear} onChange={e => updateEducation(index, 'passingYear', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="e.g. 2014" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div className="flex md:justify-end">
                      {skillsForm.educations.length > 1 && (
                        <button type="button" onClick={() => removeEducation(index)} className="text-[#FF3B30] hover:bg-red-50 rounded-lg p-2" aria-label="Remove education"><Trash2 size={16}/></button>
                      )}
                    </div>
                  </div>
                ))}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Languages Known</p>
                  <input type="text" value={skillsForm.languages} onChange={e => setSkill('languages', e.target.value)} placeholder="Comma separated, e.g. Hindi, English" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F]">Trades & Skills</h3>
                  <button type="button" onClick={addSkill} className="text-[#0066CC] text-[13px] font-semibold hover:underline">
                    + Add Skill
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {/* Verified certifications — issued via the BSS course system (read-only) */}
                  {(worker.skills?.items ?? []).filter(s => s.verified).map((s, i) => (
                    <div key={s.id ?? `v-${i}`} className="bg-white rounded-[12px] shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b flex justify-between items-center bg-[#073B67] text-white">
                        <div className="flex items-center gap-2">
                          <Award size={18} className="text-[#F47A32]" />
                          <h3 className="font-bold text-white">{s.name || 'Certified Skill'}</h3>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-[#2F9E67] text-white">Verified</span>
                      </div>
                      <div className="p-5 space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sector</p>
                            <p className="text-sm font-semibold text-gray-800 mt-1">{worker.classification?.sector || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Experience</p>
                            <p className="text-sm font-semibold text-gray-800 mt-1">{s.experienceYears || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assessment Source</p>
                            <p className="text-sm font-semibold text-gray-800 mt-1">Third-Party Assessed</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 mb-3">
                            <BadgeCheck size={16} className="text-[#2F9E67]" />
                            <h4 className="text-sm font-bold text-gray-900">Certification Details</h4>
                          </div>
                          <div className="bg-[#E8F5E9]/50 p-4 rounded-lg border border-[#2F9E67]/20 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Certificate Name</p>
                              <p className="text-sm font-bold text-gray-800">{s.certification?.name || '—'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Issuing Authority</p>
                              <p className="text-sm font-semibold text-gray-800">{s.certification?.authority || '—'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cert. Number</p>
                              <p className="text-xs font-mono font-semibold text-[#073B67]">{s.certification?.number || '—'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Validity</p>
                              <p className="text-xs font-semibold text-gray-800">{s.certification?.expiry || '—'}</p>
                            </div>
                            <div className="col-span-4 pt-2 border-t border-[#2F9E67]/20 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setActiveCert({
                                  name: s.certification?.name || s.name || 'Verified Skill',
                                  authority: s.certification?.authority || 'Bharat Shram Setu',
                                  number: s.certification?.number || 'BSS-CERT-VERIFIED',
                                  expiry: s.certification?.expiry || 'Lifetime Verified'
                                })}
                                className="px-3 py-1.5 rounded-lg bg-[#073B67] hover:bg-[#062D4F] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                              >
                                <Upload size={13} className="rotate-180" /> View & Print Certificate
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Self-declared skills (editable) */}
                  {skillsForm.items.map((s, index) => (
                    <div key={`s-${index}`} className="bg-white rounded-[12px] shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-2">
                          <Award size={18} className="text-gray-500" />
                          <h3 className="font-bold text-gray-900">Self-Declared Skill</h3>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-yellow-100 text-yellow-800">Self-Declared</span>
                      </div>
                      <div className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                          <div className="md:col-span-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Skill / Trade</p>
                            <input type="text" value={s.name} onChange={e => updateSkill(index, 'name', e.target.value)} placeholder="e.g. Bar Bender (Rebar)" className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Experience</p>
                            <input type="text" value={s.experienceYears} onChange={e => updateSkill(index, 'experienceYears', e.target.value)} placeholder="e.g. 3 Years" className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                          </div>
                          <div className="flex md:justify-end">
                            <button type="button" onClick={() => removeSkill(index)} className="text-[#FF3B30] hover:bg-red-50 rounded-lg p-2" aria-label="Remove skill"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {skillsForm.items.length === 0 && (worker.skills?.items ?? []).filter(s => s.verified).length === 0 && (
                    <p className="text-sm text-gray-400">No skills added yet. Use “+ Add Skill” to add a self-declared skill.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: WELFARE & SAFETY */}
          {activeTab === 'welfare' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-[#FFF8F0] p-5 rounded-2xl border border-[#F47A32]/20 mb-6">
                <p className="text-[13px] text-[#F47A32] font-medium">Welfare and safety records are maintained by your employer and site safety team. For detailed records and actions, visit the <a href="/worker/Compliance" className="underline font-semibold">Compliance module</a>.</p>
              </div>

              <div className="bg-[#F5F5F7] rounded-[16px] p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PPE Required</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{worker.welfare?.ppeRequired ? 'Yes — per site safety policy' : 'No'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Types of PPE Given</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(worker.welfare?.typesOfPpeGiven ? worker.welfare.typesOfPpeGiven.split(',').map(s => s.trim()).filter(Boolean) : []).map(item => <span key={item} className="text-[10px] font-semibold bg-white border border-gray-200 text-[#073B67] px-2 py-0.5 rounded">{item}</span>)}
                    {(!worker.welfare?.typesOfPpeGiven?.trim()) && <span className="text-xs text-gray-400">Not recorded</span>}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Safety Training Completed</p>
                  <p className={`text-sm font-semibold mt-1 ${worker.welfare?.safetyTrainingCompleted ? 'text-[#2F9E67]' : 'text-gray-400'}`}>{worker.welfare?.safetyTrainingCompleted ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Training Date</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{worker.welfare?.trainingDate || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trainer Name</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{worker.welfare?.trainerName || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Site Induction Status</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{worker.welfare?.siteInductionStatus || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Insurance Status</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{worker.welfare?.insuranceStatus || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Accommodation Provided</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{worker.welfare?.accommodationProvided || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Police Verification</p>
                  <p className="text-sm font-semibold text-[#F47A32] mt-1">{worker.welfare?.policeVerification || 'Not recorded'}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Gate Passes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center"><span className="text-sm font-bold text-gray-900">Temporary Gate Pass Status</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${(worker.welfare?.tempGatePassStatus || '').toLowerCase() === 'active' ? 'bg-green-100 text-[#2F9E67]' : 'bg-orange-100 text-[#F47A32]'}`}>{worker.welfare?.tempGatePassStatus || '—'}</span></div>
                    <div className="p-4 space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-gray-400">TGP No.</span><span className="font-mono font-semibold text-[#073B67]">{worker.welfare?.tgpNo || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Temporary Gate Pass Start Date</span><span className="font-semibold text-gray-800">{worker.welfare?.tempGatePassStart || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Temporary Gate Pass End Date</span><span className="font-semibold text-gray-800">{worker.welfare?.tempGatePassEnd || '—'}</span></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center"><span className="text-sm font-bold text-gray-900">Permanent Gate Pass Status</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${(worker.welfare?.permanentGatePassStatus || '').toLowerCase() === 'active' ? 'bg-green-100 text-[#2F9E67]' : 'bg-orange-100 text-[#F47A32]'}`}>{worker.welfare?.permanentGatePassStatus || '—'}</span></div>
                    <div className="p-4 space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-gray-400">PGP No.</span><span className="font-mono font-semibold text-[#073B67]">{worker.welfare?.pgpNo || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Permanent Gate Pass Start Date</span><span className="font-semibold text-gray-800">{worker.welfare?.permanentGatePassStart || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Permanent Gate Pass End Date</span><span className="font-semibold text-gray-800">{worker.welfare?.permanentGatePassEnd || '—'}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Medical Fitness Status</h3>
                <div className="bg-[#F5F5F7] rounded-[16px] p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Medical Examination Status</p>
                    {medicalExaminationStatus ? (
                      <p className={`text-sm font-semibold mt-1 ${medicalStatusTone}`}>{medicalExaminationStatus}</p>
                    ) : (
                      <p className="text-sm font-medium text-gray-400 mt-1">Not recorded</p>
                    )}
                    {medicalFitnessStatus && (
                      <p className="text-[11px] text-gray-500 mt-0.5">Fitness verdict: {medicalFitnessStatus}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Medical Examination</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{worker.welfare?.lastMedicalExamination || 'Not recorded'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Next Medical Due</p>
                    <p className="text-sm font-semibold text-[#F47A32] mt-1">{worker.welfare?.nextMedicalDue || 'Not recorded'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: OTHER */}
          {activeTab === 'other' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-[#E8F5E9] p-5 rounded-2xl border border-[#2F9E67]/20 mb-6">
                <p className="text-[13px] text-[#2F9E67] font-medium">Registration and consent records are captured when your BSS profile is created and cannot be edited here.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Consent for Registration</label>
                  <div className="flex items-center gap-2 w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3">
                    <CheckCircle2 size={18} className="text-[#2F9E67]"/>
                    <span className="text-[14px] font-medium text-[#1D1D1F]">{worker.other?.consentRegistration ? 'Granted' : 'Not granted'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Consent for Verification / Data Sharing</label>
                  <div className="flex items-center gap-2 w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3">
                    <CheckCircle2 size={18} className="text-[#2F9E67]"/>
                    <span className="text-[14px] font-medium text-[#1D1D1F]">{worker.other?.consentVerification ? 'Granted' : 'Not granted'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Consent Date</label>
                  <input name="other.consentDate" type="text" defaultValue={worker.other?.consentDate} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Registration Source</label>
                  <input name="other.registrationSource" type="text" defaultValue={worker.other?.registrationSource} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Registered By</label>
                  <input name="other.registeredBy" type="text" defaultValue={worker.other?.registeredBy} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Registration Date</label>
                  <input name="other.registrationDate" type="text" defaultValue={worker.other?.registrationDate} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
              </div>
            </div>
          )}

          {/* TAB: GOVT INTEGRATIONS */}
          {activeTab === 'integrations' && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-1">Government ID Integrations</h3>
                <p className="text-[14px] text-[#86868B] mb-6">Connect and verify your government-issued IDs via direct API fetch. Verified IDs automatically fill out your BSS profile.</p>
                
                <div className="space-y-4">
                  {/* Aadhaar */}
                  <div className="flex flex-col md:flex-row gap-4 p-5 rounded-[16px] border border-gray-200 bg-gray-50/50">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                      <Fingerprint size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[15px] font-bold text-gray-900">Aadhaar Verification</h4>
                      <p className="text-[13px] text-gray-500 mb-3">Fetched from UIDAI via Aadhaar oKYC.</p>
                      {worker.identity.aadhaarVerified ? (
                        <p className="font-mono text-[15px] font-semibold text-gray-800">{aadhaarDisplay || 'Not linked'}</p>
                      ) : (
                        <div className="space-y-2 max-w-sm">
                          <input type="text" inputMode="numeric" value={aadhaarLink.aadhaar} onChange={e => setAadhaarLink(s => ({ ...s, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12), error: '' }))} disabled={aadhaarLink.sent} placeholder="12-digit Aadhaar number" className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2 text-[14px] font-medium tracking-wider focus:outline-none disabled:bg-gray-100" />
                          {aadhaarLink.sent && <input type="text" inputMode="numeric" value={aadhaarLink.otp} onChange={e => setAadhaarLink(s => ({ ...s, otp: e.target.value.replace(/\D/g, '').slice(0, 6), error: '' }))} placeholder="6-digit OTP" className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2 text-[14px] font-medium tracking-[0.3em] focus:outline-none" />}
                          {aadhaarLink.error && <p className="text-[12px] text-red-600">{aadhaarLink.error}</p>}
                          {aadhaarLink.notice && <p className="text-[12px] text-green-700">{aadhaarLink.notice}</p>}
                          <div className="flex gap-2">
                            {!aadhaarLink.sent ? (
                              <button type="button" onClick={sendAadhaarOtp} disabled={aadhaarLink.busy} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-blue-700 disabled:opacity-60">{aadhaarLink.busy ? 'Sending…' : 'Send OTP'}</button>
                            ) : (
                              <>
                                <button type="button" onClick={verifyAadhaarOtp} disabled={aadhaarLink.busy} className="bg-[#0F172A] text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-black disabled:opacity-60">{aadhaarLink.busy ? 'Verifying…' : 'Verify & Link'}</button>
                                <button type="button" onClick={() => setAadhaarLink(s => ({ ...s, sent: false, otp: '', notice: '', error: '' }))} className="px-3 py-2 rounded-xl text-[13px] font-semibold text-gray-500 hover:text-gray-700">Change number</button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-start md:justify-end min-w-[140px]">
                      {worker.identity.aadhaarVerified ? (
                        <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg text-[13px] font-bold border border-green-100"><CheckCircle size={16}/> Verified</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg text-[13px] font-bold border border-orange-100"><Clock size={16}/> Pending</span>
                      )}
                    </div>
                  </div>

                  {/* PAN */}
                  <div className="flex flex-col md:flex-row gap-4 p-5 rounded-[16px] border border-gray-200 bg-gray-50/50">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                      <FileText size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[15px] font-bold text-gray-900">PAN Card Verification</h4>
                      <p className="text-[13px] text-gray-500 mb-3">Financial KYC details (NSDL).</p>
                      <p className="font-mono text-[15px] font-semibold uppercase text-gray-800">{panDisplay || 'Not linked'}</p>
                    </div>
                    <div className="flex items-center justify-start md:justify-end min-w-[140px]">
                      {worker.identity.panVerified ? (
                        <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg text-[13px] font-bold border border-green-100"><CheckCircle size={16}/> Verified</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg text-[13px] font-bold border border-orange-100"><Clock size={16}/> Pending</span>
                      )}
                    </div>
                  </div>

                  {/* UAN */}
                  <div className="flex flex-col md:flex-row gap-4 p-5 rounded-[16px] border border-gray-200 bg-gray-50/50">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                      <Database size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[15px] font-bold text-gray-900">UAN Verification</h4>
                      <p className="text-[13px] text-gray-500 mb-3">EPFO Universal Account Number.</p>
                      <p className="font-mono text-[15px] font-semibold text-gray-800">{uanDisplay || 'Not linked'}</p>
                    </div>
                    <div className="flex items-center justify-start md:justify-end min-w-[140px]">
                      {uanDisplay ? (
                        <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg text-[13px] font-bold border border-green-100"><CheckCircle size={16}/> On record</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg text-[13px] font-bold border border-orange-100"><Clock size={16}/> Pending</span>
                      )}
                    </div>
                  </div>

                  {/* Bank Account — from the verified banking record */}
                  <div className="flex flex-col md:flex-row gap-4 p-5 rounded-[16px] border border-gray-200 bg-gray-50/50">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                      <Building2 size={24} />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h4 className="text-[15px] font-bold text-gray-900">Bank Account (NPCI Penny Drop KYC)</h4>
                        <p className="text-[13px] text-gray-500 mt-0.5">Your salary account, verified via the NPCI bank verification API. Update details in the Banking tab.</p>
                      </div>
                      <div className="rounded-[14px] border border-gray-200 bg-white p-4">
                        <p className="flex items-center justify-between gap-2 text-[13px] font-bold text-gray-800 mb-3"><span className="inline-flex items-center gap-1.5"><CheckCircle size={14} className="text-[#2F9E67]"/> {worker.banking.bankName || 'Bank account'}</span>{bankVerified ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-lg px-2 py-1"><CheckCircle size={13}/> KYC Verified</span> : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-2 py-1"><Clock size={13}/> Pending</span>}</p>
                        <div className="grid grid-cols-2 gap-3 text-[13px]">
                          <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Holder</p><p className="font-semibold text-gray-800 mt-0.5">{worker.banking.holderName || '—'}</p></div>
                          <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Number</p><p className="font-mono font-semibold text-gray-800 mt-0.5">{maskId(worker.banking.accountNumber, 4) || '—'}</p></div>
                          <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">IFSC</p><p className="font-mono font-semibold uppercase text-gray-800 mt-0.5">{worker.banking.ifsc || '—'}</p></div>
                          <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">UPI</p><p className="font-semibold text-gray-800 mt-0.5">{worker.banking.upiEnabled ? 'Enabled' : 'Not enabled'}</p></div>
                        </div>
                      </div>
                      {!bankVerified && (
                        <div className="space-y-2">
                          <button type="button" onClick={verifyBank} disabled={bankVerify.busy || !worker.banking.accountNumber || !worker.banking.ifsc} className="h-10 px-4 rounded-xl bg-[#073B67] text-white text-[13px] font-bold inline-flex items-center gap-2 hover:bg-[#062D4F] disabled:opacity-50">{bankVerify.busy ? 'Verifying…' : 'Verify via Penny Drop (₹1)'}</button>
                          <p className="text-[11px] text-gray-400">A ₹1 test credit is sent to your account to confirm the account number and holder name (NPCI, via Sandbox.co.in).</p>
                        </div>
                      )}
                      {bankVerify.message && <p role="status" className="text-[12px] text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{bankVerify.message}</p>}
                      {bankVerify.error && <p role="alert" className="text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{bankVerify.error}</p>}
                    </div>
                  </div>

                  {/* DigiLocker — fetch issued documents */}
                  <div className="flex flex-col md:flex-row gap-4 p-5 rounded-[16px] border border-gray-200 bg-gray-50/50">
                    <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center shrink-0">
                      <FileText size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[15px] font-bold text-gray-900">DigiLocker — Fetch Issued Documents</h4>
                      <p className="text-[13px] text-gray-500 mb-3">Link your DigiLocker account to pull your government-issued documents (Aadhaar, PAN, certificates) into BSS.</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {([['Aadhaar', digilockerKinds.aadhaar], ['PAN', digilockerKinds.pan], ['EPFO / UAN', digilockerKinds.epfo]] as const).map(([label, ok]) => (
                          <span key={label} className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border ${ok ? 'text-green-700 bg-green-50 border-green-100' : 'text-gray-500 bg-white border-gray-200'}`}>
                            {ok ? <CheckCircle size={12}/> : <Clock size={12}/>} {label}
                          </span>
                        ))}
                      </div>
                      {digilockerStatus === 'linked' && (
                        <p className="text-[12px] text-[#2F9E67] font-semibold mb-2">DigiLocker linked — fetching documents…</p>
                      )}
                      {digilockerStatus === 'error' && digilockerMessage && (
                        <p className="text-[12px] text-[#FF3B30] font-semibold mb-2">{digilockerMessage}</p>
                      )}
                      {digilockerDocs.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {digilockerDocs.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-gray-800 truncate">{doc.doctype || 'Document'}</p>
                                <p className="text-[11px] text-gray-500 truncate">{[doc.issuer, doc.doc_date].filter(Boolean).join(' · ')}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-sky-700 hover:underline">View</a>}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${doc.status === 'DOWNLOADED' ? 'bg-green-100 text-[#2F9E67]' : 'bg-orange-100 text-[#F47A32]'}`}>{doc.status || '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] text-gray-400">No DigiLocker documents fetched yet.</p>
                      )}
                    </div>
                    <div className="flex items-center justify-start md:justify-end min-w-[140px]">
                      <button type="button" onClick={linkDigiLocker} disabled={digilockerStatus === 'linking'} className="bg-sky-600 text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-sky-700 flex items-center gap-2 disabled:opacity-60">
                        {digilockerStatus === 'linking' ? <RefreshCw size={16} className="animate-spin" /> : 'Link DigiLocker'}
                      </button>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
          )}

          {/* ACTION FOOTER */}
          <div className="mt-10 flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving || !dirty}
              title={!dirty ? 'Make a change to enable saving' : undefined}
              className="bg-[#0F172A] hover:bg-black text-white px-8 py-3 rounded-full font-bold text-[14px] shadow-sm transition-all flex justify-center items-center gap-2 min-w-[160px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>Updating Persona...</>
              ) : (
                <><Save size={18} /> Save Persona</>
              )}
            </button>
          </div>

        </form>
        </div>
      </div>

      {/* Certificate modal */}
      {activeCert && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setActiveCert(null)}>
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-gray-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 no-print">
              <h2 className="text-sm font-bold text-gray-900">Official BSS Skill Certificate</h2>
              <button onClick={() => setActiveCert(null)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-gray-200"><X size={16}/></button>
            </div>
            <div className="p-8 text-center bg-gradient-to-b from-white to-blue-50/30 border-b border-gray-100" id="bss-certificate-print-area">
              <div className="w-20 h-20 rounded-2xl bg-[#073B67] text-white flex items-center justify-center mx-auto shadow-md"><Award size={40}/></div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#073B67] mt-5">Bharat Shram Setu National Skill Registry</p>
              <h3 className="text-2xl font-extrabold text-gray-950 mt-2">{activeCert.name}</h3>
              <p className="text-xs text-gray-600 mt-3">This official certificate is proudly awarded to</p>
              <p className="text-xl font-extrabold text-[#073B67] mt-1">{worker.identity.name}</p>
              <p className="text-xs text-gray-500 mt-1">BSS ID: <span className="font-mono font-semibold">{worker.identity.bssId}</span></p>
              <div className="my-6 pt-5 border-t border-gray-200/80 max-w-md mx-auto grid grid-cols-2 gap-4 text-left bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Issued By</p><p className="text-xs font-semibold text-gray-800 mt-0.5">{activeCert.authority}</p></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Validity</p><p className="text-xs font-semibold text-gray-800 mt-0.5">{activeCert.expiry}</p></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Certificate No.</p><p className="text-xs font-mono font-semibold text-[#073B67] mt-0.5">{activeCert.number}</p></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Verified Skill</p><p className="text-xs font-semibold text-green-700 mt-0.5">{activeCert.name}</p></div>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-green-800 bg-green-100/80 border border-green-200 px-4 py-1.5 rounded-full"><CheckCircle size={14}/>Cryptographically Verified on BSS Trust Registry</div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 bg-gray-50 no-print">
              <button onClick={() => window.print()} className="flex-1 h-10 rounded-xl bg-[#073B67] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#062D4F] transition-colors"><Upload size={15} className="rotate-180"/>Print / Save PDF Certificate</button>
              <button onClick={() => setActiveCert(null)} className="h-10 px-5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
