"use client";

import React, { useRef, useState } from 'react';
import { BssTaxonomies } from '@/data/taxonomies';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorker } from '@/contexts/WorkerContext';
import { MobilitySection, type MobilitySectionHandle } from '@/components/worker/MobilitySection';
import { 
  UserCircle, Save, CheckCircle2, ShieldCheck, 
  MapPin, FileText, Users,
  Building2, CreditCard, Briefcase, Award, BadgeCheck,
  CalendarDays, ChevronDown, ChevronUp, Clock,
  Database, Fingerprint, RefreshCw, CheckCircle, HardHat,
  Plus, Trash2, Percent, Upload
} from 'lucide-react';

export default function WorkerProfilePage() {
  const { t } = useLanguage();
  const { worker, portal, updateWorker, saveWorker } = useWorker();
  const mobilityRef = useRef<MobilitySectionHandle>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'family' | 'social' | 'banking' | 'classification' | 'employment' | 'skills' | 'welfare' | 'other' | 'integrations'>('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAttendanceCalendar, setShowAttendanceCalendar] = useState(false);

  // ── Multiple nominees (dynamic rows) with individual share % ─────────────
  type Nominee = { id: number; name: string; dependant: string; nomineeType: string; relationship: string; dob: string; contact: string; address: string; documents: string[]; percent: number };
  const [nominees, setNominees] = useState<Nominee[]>(() =>
    (worker.family?.nominees ?? []).map(n => ({
      id: n.id, name: n.name, dependant: n.dependant, nomineeType: n.nomineeType,
      relationship: n.relation, dob: n.dob, contact: n.contact, address: n.address,
      documents: n.documents ?? [], percent: n.percent ?? 100,
    })),
  );
  const [nextNomineeId, setNextNomineeId] = useState(() => Math.max(0, ...(worker.family?.nominees ?? []).map(n => n.id)) + 1);
  const [docTargetId, setDocTargetId] = useState<number | null>(null);
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
  const addNominee = () => { setNominees(current => [...current, { id: nextNomineeId, name: '', dependant: '', nomineeType: 'Nominee', relationship: BssTaxonomies.NomineeRelationship[0], dob: '', contact: '', address: '', documents: [], percent: 0 }]); setNextNomineeId(id => id + 1); };
  const removeNominee = (id: number) => setNominees(current => current.filter(n => n.id !== id));
  const pickNomineeDoc = (id: number) => { setDocTargetId(id); window.setTimeout(() => nomineeFileRef.current?.click(), 0); };
  const addNomineeDoc = (file?: File) => {
    if (!file || docTargetId === null) return;
    updateNominee(docTargetId, { documents: [...(nominees.find(n => n.id === docTargetId)?.documents ?? []), file.name] });
    setDocTargetId(null);
  };
  const splitEqually = () => {
    if (!nominees.length) return;
    const base = Math.floor(100 / nominees.length);
    let remainder = 100 - base * nominees.length;
    setNominees(current => current.map((n, index) => ({ ...n, percent: base + (index === current.length - 1 ? remainder : 0) })));
    void remainder;
  };
  const segColors = ['bg-[#073B67]', 'bg-[#F47A32]', 'bg-[#2F9E67]', 'bg-[#7A5AF8]', 'bg-[#0EA5E9]', 'bg-[#E11D48]'];
  
  // API Mock State for Gov Integrations
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifiedGovIds, setVerifiedGovIds] = useState<Record<string, boolean>>({ aadhaar: true }); // Mock aadhaar as verified initially

  const handleVerify = (idType: string) => {
    setVerifyingId(idType);
    setTimeout(() => {
      setVerifiedGovIds(prev => ({ ...prev, [idType]: true }));
      setVerifyingId(null);
    }, 2000); // 2 second mock delay
  };
  
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
  // Certification is verified via course completion and is NOT editable here.
  const [skillsForm, setSkillsForm] = useState({
    qualificationCourse: worker.skills?.qualificationCourse ?? '',
    boardUniversity: worker.skills?.boardUniversity ?? '',
    passingYear: worker.skills?.passingYear ?? '',
    languages: (worker.skills?.languages ?? []).join(', '),
    primaryName: worker.skills?.primary?.name ?? '',
    primaryExperience: worker.skills?.primary?.experienceYears ?? '',
    secondary: (worker.skills?.secondary ?? []).join(', '),
  });
  const setSkill = (key: keyof typeof skillsForm, value: string) => setSkillsForm(current => ({ ...current, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'contact') {
      await mobilityRef.current?.save();
      return;
    }
    if (activeTab === 'skills') {
      setIsSaving(true);
      try {
        await saveWorker({
          skills: {
            qualificationCourse: skillsForm.qualificationCourse,
            boardUniversity: skillsForm.boardUniversity,
            passingYear: skillsForm.passingYear,
            languages: skillsForm.languages.split(',').map(s => s.trim()).filter(Boolean),
            primary: { name: skillsForm.primaryName, experienceYears: skillsForm.primaryExperience },
            secondary: skillsForm.secondary.split(',').map(s => s.trim()).filter(Boolean),
          },
        });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } catch {
        setShowSuccess(false);
      } finally {
        setIsSaving(false);
      }
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1500);
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
          <form onSubmit={handleSave} className="p-6 md:p-8">
          
          {/* TAB: PERSONAL */}
          {activeTab === 'personal' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                 <div className="w-28 h-28 rounded-full border border-black/10 overflow-hidden flex-shrink-0 relative group">
                    <img src={worker.identity.photoUrl} alt="Worker" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer backdrop-blur-sm transition-all">
                      <span className="text-white text-[11px] font-semibold uppercase tracking-wider">Change Photo</span>
                    </div>
                    <p className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">Worker Photo</p>
                 </div>
                 <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 w-full">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">BSS Worker ID</label>
                      <input type="text" defaultValue={worker.identity.bssId} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none" readOnly />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Name as per Aadhaar <span className="text-[#FF3B30]">*</span></label>
                      <input type="text" defaultValue={worker.identity.name} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none" readOnly />
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 pt-6 border-t border-black/5">
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Date of Birth</label>
                    <input type="date" defaultValue={worker.identity.dob} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none" readOnly />
                 </div>
                 <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Age</label>
                   <input type="number" defaultValue={ageFromDoB(worker.identity.dob)} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none" readOnly />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Gender</label>
                    <select defaultValue={worker.identity.gender} disabled className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none">
                      {BssTaxonomies.Gender.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                 </div>
                 <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Place of Birth <span className="text-[#FF3B30]">*</span></label>
                   <input type="text" defaultValue={worker.identity.placeOfBirth || ''} placeholder="Native village/town, tehsil and district" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                   <p className="text-[10px] text-[#86868B] mt-1">Used with your Aadhaar-verified work address to map migrant flows for state policy.</p>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Marital Status</label>
                    <select defaultValue={worker.personal.maritalStatus} disabled className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none">
                      {BssTaxonomies.MaritalStatus.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Blood Group</label>
                    <select defaultValue={worker.personal.bloodGroup} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]">
                      {BssTaxonomies.BloodGroup.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Religion</label>
                    <select defaultValue={worker.personal.religion} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]">
                      {BssTaxonomies.Religion.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Caste</label>
                    <select defaultValue={worker.personal.caste} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]">
                      {BssTaxonomies.SocialCategory.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Disability Status</label>
                    <select defaultValue={worker.personal.disabilityStatus} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]">
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Disability Type / %</label>
                    <input type="text" defaultValue={worker.identity.disabilityTypePct} placeholder="If applicable" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]" />
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 pt-6 border-t border-black/5">
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Father Name</label>
                    <input type="text" defaultValue={worker.personal.fatherName} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none" readOnly />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Mother Name</label>
                    <input type="text" defaultValue={worker.personal.motherName} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]" />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Spouse Name</label>
                    <input type="text" defaultValue={worker.personal.spouseName} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]" />
                 </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-1">Emergency Contact</h3>
                <p className="text-[13px] text-[#86868B] mb-4">Used by the site medical officer and safety team in case of an emergency.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6">
                  <div>
                     <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Emergency Contact Name</label>
                     <input type="text" defaultValue={worker.identity.emergencyContactName} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                     <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Emergency Contact Number</label>
                     <input type="tel" maxLength={10} defaultValue={worker.identity.emergencyContactNumber} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                     <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Emergency Contact Relationship</label>
                     <select defaultValue={worker.identity.emergencyContactRelation} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
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
                    <input type="tel" defaultValue={worker.contact.alternateMobile} placeholder="Not provided" className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email ID</p>
                    <input type="email" defaultValue={worker.contact.email} placeholder="Not provided" className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#0066CC]" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                 <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Family Members Count</label>
                   <input type="number" defaultValue={worker.family?.familyMembersCount ?? 0} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                 </div>
                 <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Dependants Count</label>
                   <input type="number" defaultValue={worker.family?.dependantsCount ?? 0} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none" readOnly />
                 </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F]">Official Nominee Details</h3>
                  <button type="button" onClick={addNominee} className="inline-flex items-center gap-1.5 text-[#0066CC] text-[13px] font-semibold hover:underline"><Plus size={15}/> Add Nominee</button>
                </div>
                <p className="text-[13px] text-[#86868B] mb-4">Add multiple nominees — each nominee gets one row with their own relationship, identity documents and share (%). Total share must equal 100%.</p>

                {/* Hidden input shared by every nominee row's document upload */}
                <input ref={nomineeFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { addNomineeDoc(e.target.files?.[0]); e.target.value = ''; }}/>

                <div className="space-y-4">
                  {nominees.map((n, rowIndex) => (
                    <div key={n.id} className="rounded-[16px] border border-black/10 bg-gray-50/40 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Nominee {rowIndex + 1} {n.name && <span className="normal-case text-gray-600">— {n.name}</span>}</p>
                        <button type="button" onClick={() => removeNominee(n.id)} aria-label="Remove nominee" className="w-7 h-7 grid place-items-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-4">
                        <div className="lg:col-span-1">
                          <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Name <span className="text-[#FF3B30]">*</span></label>
                          <input type="text" value={n.name} onChange={e => updateNominee(n.id, { name: e.target.value })} placeholder="Nominee full name" className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]"/>
                        </div>
                        <div>
                          <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Relationship with you <span className="text-[#FF3B30]">*</span></label>
                          <select value={n.relationship} onChange={e => updateNominee(n.id, { relationship: e.target.value })} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
                            {BssTaxonomies.NomineeRelationship.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Nominee Type</label>
                          <select value={n.nomineeType} onChange={e => updateNominee(n.id, { nomineeType: e.target.value })} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
                            <option>Nominee</option>
                            <option>Family Member</option>
                            <option>Dependant</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Nominee Date of Birth</label>
                          <input type="date" value={n.dob} onChange={e => updateNominee(n.id, { dob: e.target.value })} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]"/>
                        </div>
                        <div>
                          <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Nominee Age</label>
                          <input type="text" value={nomineeAge(n.dob)} readOnly className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F]"/>
                        </div>
                        <div>
                          <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Nominee Contact</label>
                          <input type="tel" maxLength={10} value={n.contact} onChange={e => updateNominee(n.id, { contact: e.target.value })} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]"/>
                        </div>
                        <div>
                          <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Dependant</label>
                          <input type="text" value={n.dependant} onChange={e => updateNominee(n.id, { dependant: e.target.value })} placeholder="Name of dependant" className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]"/>
                        </div>
                        <div className="md:col-span-2 lg:col-span-4">
                          <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Nominee / Family Address</label>
                          <textarea rows={1} value={n.address} onChange={e => updateNominee(n.id, { address: e.target.value })} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] resize-none"/>
                        </div>
                        <div className="md:col-span-3 lg:col-span-3">
                          <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Identity Documents</label>
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => pickNomineeDoc(n.id)} className="inline-flex items-center gap-1.5 bg-white border border-black/10 px-3 py-2 rounded-lg text-[12px] font-medium hover:bg-gray-50"><Upload size={14}/> Upload PAN / Aadhaar Copy</button>
                            {n.documents.map((doc, docIndex) => (
                              <span key={doc} className="inline-flex items-center gap-1.5 bg-[#E8F5E9]/70 border border-[#2F9E67]/20 text-[#2F9E67] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"><FileText size={12}/>{doc}<button type="button" onClick={() => updateNominee(n.id, { documents: n.documents.filter((_, i) => i !== docIndex) })} aria-label={`Remove ${doc}`} className="text-gray-400 hover:text-red-600"><Trash2 size={11}/></button></span>
                            ))}
                            {!n.documents.length && <span className="text-[11px] text-gray-400">No document uploaded</span>}
                          </div>
                        </div>
                        <div className="lg:col-span-1">
                          <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Share %</label>
                          <div className="relative">
                            <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <input type="number" min={0} max={100} step={1} value={Number.isFinite(n.percent) ? n.percent : 0} onChange={e => updateNominee(n.id, { percent: Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0))) })} className="w-full bg-white border border-black/10 rounded-xl pl-8 pr-2 py-2.5 text-[13px] font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]"/>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Distribution summary */}
                <div className="mt-5 rounded-[16px] border border-black/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-[#1D1D1F]">Nominee share distribution</p>
                    <span className={`text-[12px] font-bold ${percentBalanced ? 'text-[#2F9E67]' : 'text-[#FF3B30]'}`}>{totalPercent}% of 100%</span>
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
                  {!percentBalanced && <p className="mt-3 text-[12px] text-[#FF3B30] font-semibold flex items-center gap-1.5">Nominee shares must total exactly 100%. Adjust the percentages or use the button to split equally.</p>}
                  {nominees.length > 1 && <button type="button" onClick={splitEqually} className="mt-3 inline-flex items-center gap-1.5 text-[#0066CC] text-[12px] font-semibold hover:underline"><RefreshCw size={13}/> Split equally</button>}
                </div>
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
                   <input type="text" defaultValue={worker.socialSecurity.epfoUan} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                 </div>
                 <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">ESIC IP Number</label>
                   <input type="text" defaultValue={worker.socialSecurity.esicIp} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">LWF Number (Labour Welfare Fund)</label>
                    <input type="text" defaultValue={worker.socialSecurity.lwfNo} placeholder="Enter if available" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">e-Shram Number <span className="ml-1 inline-flex items-center text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase">{worker.socialSecurity.eShramNo ? 'Linked' : 'Not Linked'}</span></label>
                    <input type="text" defaultValue={worker.socialSecurity.eShramNo} placeholder="Enter 12 digit UAN" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">BOCW Registration Number <span className="ml-1 inline-flex items-center text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase">{worker.socialSecurity.bocwRegNumber ? 'Registered' : 'Not Registered'}</span></label>
                    <input type="text" defaultValue={worker.socialSecurity.bocwRegNumber} placeholder="State BOCW ID" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">WC Policy No. (Workmen Compensation)</label>
                    <input type="text" defaultValue={worker.socialSecurity.wcPolicyNo} placeholder="Insurance Policy No." className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">State Worker ID</label>
                    <input type="text" defaultValue={worker.socialSecurity.stateWorkerId} placeholder="State labour department worker ID" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
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
                      <input type="password" defaultValue={worker.identity.aadhaar} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F]" readOnly />
                      <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex-shrink-0 ${worker.identity.aadhaarVerified ? 'bg-[#E8F5E9] text-[#2F9E67]' : 'bg-gray-100 text-[#86868B]'}`}>{worker.identity.aadhaarVerified ? 'Verified' : 'Pending'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">PAN No.</label>
                    <div className="flex items-center gap-3">
                      <input type="text" defaultValue={worker.identity.pan} placeholder="Enter PAN" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] uppercase" />
                      <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex-shrink-0 ${worker.identity.panVerified ? 'bg-[#E8F5E9] text-[#2F9E67]' : 'bg-gray-100 text-[#86868B]'}`}>{worker.identity.panVerified ? 'Verified' : 'Pending'}</span>
                    </div>
                  </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F]">Bank Accounts (Wage Transfer)</h3>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2F9E67] bg-[#E8F5E9] px-2.5 py-1 rounded-full"><CheckCircle2 size={13}/> KYC via bank API</span>
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
                        <input type="text" defaultValue={worker.banking.bankName} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]"/>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Bank Account Holder Name</label>
                        <input type="text" defaultValue={worker.banking.holderName} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]"/>
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Bank Account Number</label>
                        <input type="password" defaultValue={worker.banking.accountNumber} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-mono font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]"/>
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">IFSC Code</label>
                        <input type="text" defaultValue={worker.banking.ifsc} className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[13px] font-mono font-medium text-[#1D1D1F] uppercase focus:outline-none focus:border-[#0066CC]"/>
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
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Sector</label>
                    <select defaultValue={worker.classification?.sector} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
                      {BssTaxonomies.Sector.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Industry</label>
                    <input type="text" defaultValue={worker.classification?.industry} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Occupation</label>
                    <select defaultValue={worker.classification?.occupation} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
                      <option>Bar Bender (Rebar)</option>
                      <option>Mason</option>
                      <option>Carpenter</option>
                      <option>Electrician</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Total Worker Experience (Years)</label>
                    <input type="number" defaultValue={worker.classification?.totalWorkerExperience} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                 </div>
              </div>

              {/* Conditional Block: GIG ACTIVE (taxonomy value "Gig active") */}
              {employmentStatus === 'Gig active' && (
                <div className="pt-6 border-t border-black/5 animate-in slide-in-from-top-2">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Gig Platform Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Platform / Aggregator Name</label>
                      <input type="text" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Platform Worker ID</label>
                      <input type="text" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Date Joined Platform</label>
                      <input type="date" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Platform Type</label>
                      <select className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
                        {BssTaxonomies.PlatformType.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Service Area</label>
                      <input type="text" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Vehicle Type</label>
                      <select className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
                        {BssTaxonomies.VehicleType.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Vehicle Ownership</label>
                      <select className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
                        <option>Owned</option>
                        <option>Leased / Rented</option>
                        <option>Platform Provided</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Average Hours per Day</label>
                      <input type="number" placeholder="Hours" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Average Days per Week</label>
                      <input type="number" placeholder="Days" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Driving Licence Number</label>
                      <input type="text" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Driving Licence Expiry</label>
                      <input type="date" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
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
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Business / Enterprise Name</label>
                      <input type="text" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employer / Business Name</label>
                      <input type="text" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Business Type</label>
                      <input type="text" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Business Registration Status</label>
                      <select className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
                        <option>Registered</option>
                        <option>Unregistered</option>
                        <option>Registration Pending</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Business Start Date</label>
                      <input type="date" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Number of Employees</label>
                      <input type="number" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Average Hours/Day</label>
                      <input type="number" placeholder="Hours" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Average Days/Week</label>
                      <input type="number" placeholder="Days" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Location</label>
                      <input type="text" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
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
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Job / Work Type</label>
                      <input type="text" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Season Start</label>
                        <input type="date" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Season End</label>
                        <input type="date" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Average Hours/Day</label>
                      <input type="number" placeholder="Hours" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Average Days/Week</label>
                      <input type="number" placeholder="Days" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Work Location / Service Area</label>
                      <input type="text" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Expected Seasonal Income</label>
                      <input type="text" placeholder="₹" className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Payment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Payment Frequency</label>
                    <select defaultValue={worker.classification?.paymentFrequency} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
                      <option>Weekly</option>
                      <option>Fortnightly</option>
                      <option>Monthly</option>
                      <option>Per Task / Piece Rate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Payment Mode</label>
                    <select defaultValue={worker.classification?.paymentMode} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]">
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
                    <input type="text" defaultValue={worker.other?.registrationSource} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
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
                   <input type="text" defaultValue={worker.employment.employerDetails?.name ?? worker.employment.employer} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employer Code</label>
                   <input type="text" defaultValue={worker.employment.employerDetails?.code} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employer Email ID</label>
                   <input type="text" defaultValue={worker.employment.employerDetails?.email} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employer State</label>
                  <input type="text" defaultValue={worker.employment.employerDetails?.state} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employer Address</label>
                   <input type="text" defaultValue={worker.employment.employerDetails?.address} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employer Industry</label>
                   <input type="text" defaultValue={worker.employment.employerDetails?.industry} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Principal Employer LIN No.</label>
                   <input type="text" defaultValue={worker.employment.employerDetails?.lin} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Contractor Name</label>
                   <input type="text" defaultValue={worker.employment.contractorDetails?.name ?? worker.employment.contractor} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Contractor Code</label>
                   <input type="text" defaultValue={worker.employment.contractorDetails?.code} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Contractor Email</label>
                   <input type="text" defaultValue={worker.employment.contractorDetails?.email} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Contractor State</label>
                  <input type="text" defaultValue={worker.employment.contractorDetails?.state} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Contractor Address</label>
                   <input type="text" defaultValue={worker.employment.contractorDetails?.address} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Contractor LIN</label>
                   <input type="text" defaultValue={worker.employment.contractorDetails?.lin} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Site & Role Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Site Name</label>
                    <input type="text" defaultValue={worker.employment.siteDetails?.name ?? worker.employment.site} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Site Code</label>
                    <input type="text" defaultValue={worker.employment.siteDetails?.code} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Site Location</label>
                    <input type="text" defaultValue={worker.employment.siteDetails?.location} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">State</label>
                    <input type="text" defaultValue={worker.employment.siteDetails?.state} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Designation & Department</label>
                    <input type="text" defaultValue={[worker.employment.designation, worker.employment.department].filter(Boolean).join(" - ")} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Nature of Job</label>
                    <input type="text" defaultValue={worker.employment.natureOfJob} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Type of Work</label>
                    <input type="text" defaultValue={worker.employment.typeOfWork} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Date of Joining</label>
                    <input type="text" defaultValue={worker.employment.doj} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Employment Status</label>
                    <input type="text" defaultValue={worker.employment.status} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#2F9E67]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Reference Worker ID</label>
                    <input type="text" defaultValue={worker.employment.refWorkerId} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">PF Account</label>
                    <input type="text" defaultValue={worker.employment.pfAccount} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Logistics & Additional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Shift</label>
                    <input type="text" defaultValue={worker.employment.shift} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Camp No.</label>
                    <input type="text" defaultValue={worker.employment.campNo} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Transport Facility</label>
                    <input type="text" defaultValue={worker.employment.transportFacility} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#2F9E67]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Route</label>
                    <input type="text" defaultValue={worker.employment.route} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Bus No.</label>
                    <input type="text" defaultValue={worker.employment.busNo} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">ID Card Issue Date</label>
                    <input type="text" defaultValue={worker.employment.idCardIssueDate} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">ID Card Validity Till</label>
                    <input type="text" defaultValue={worker.employment.idCardValidityTill} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                  </div>
                </div>
              </div>
              
              {/* BINDING HISTORY & ATTENDANCE DETAILS */}
              <div className="pt-6 border-t border-black/5 space-y-8">
                
                {/* Detailed Attendance */}
                <div>
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Attendance Overview</h3>
                  <div className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm">
                    
                    {/* Today's Status (Always Visible) */}
                    <div className="p-5 flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full flex-shrink-0 ${(portal.attendance.records[0]?.presence === 'Present') ? 'bg-[#E8F5E9] text-[#2F9E67]' : 'bg-gray-100 text-gray-400'}`}>
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          {portal.attendance.records.length > 0 ? (
                            <>
                              <p className="font-semibold text-[#1D1D1F] text-[16px]">{portal.attendance.records[0].presence === 'Present' ? 'Present' : portal.attendance.records[0].presence}</p>
                              <p className="text-[13px] text-[#86868B] mt-1 flex items-center gap-1">
                                <Clock size={14} /> {portal.attendance.records[0].date || ''}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-semibold text-[#1D1D1F] text-[16px]">No attendance records</p>
                              <p className="text-[13px] text-[#86868B] mt-1">Attendance is captured once you are bound to a contractor.</p>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => setShowAttendanceCalendar(!showAttendanceCalendar)}
                        className="bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors flex items-center gap-2 self-start md:self-auto"
                      >
                        {showAttendanceCalendar ? (
                          <>Hide Monthly View <ChevronUp size={16} /></>
                        ) : (
                          <>View Full Month <ChevronDown size={16} /></>
                        )}
                      </button>
                    </div>

                    {/* Expandable Monthly Calendar View */}
                    {showAttendanceCalendar && (
                      <div className="border-t border-black/5 animate-in slide-in-from-top-2 duration-300">
                        <div className="p-4 bg-[#F5F5F7]/50 flex items-center justify-between border-b border-black/5">
                          <div className="flex items-center gap-2 text-[#1D1D1F] font-semibold text-sm">
                            <CalendarDays size={18} />
                            August 2024
                          </div>
                          <div className="text-sm font-bold text-[#0066CC]">24 Days Present</div>
                        </div>
                        <div className="p-4 overflow-x-auto">
                          <div className="flex gap-2 min-w-max pb-2">
                            {/* Dummy calendar dates representation */}
                            {Array.from({ length: 30 }).map((_, i) => {
                              const date = i + 1;
                              const isWeekend = date % 7 === 0;
                              const isHalfDay = date === 8;
                              const isAbsent = date === 12 || date === 18;
                              const isFuture = date > 24;
                              
                              let statusColor = "bg-[#E8F5E9] text-[#2F9E67] border-[#2F9E67]/30"; // Present
                              let statusText = "P";
                              
                              if (isFuture) {
                                statusColor = "bg-gray-50 text-gray-300 border-gray-100";
                                statusText = "-";
                              } else if (isWeekend) {
                                statusColor = "bg-gray-100 text-gray-500 border-gray-300"; // Holiday/Off
                                statusText = "WO";
                              } else if (isHalfDay) {
                                statusColor = "bg-[#FFF8F0] text-[#F47A32] border-[#F47A32]/30"; // Half Day
                                statusText = "HD";
                              } else if (isAbsent) {
                                statusColor = "bg-[#FFF0F0] text-[#FF3B30] border-[#FF3B30]/30"; // Absent
                                statusText = "A";
                              }

                              return (
                                <div key={i} className={`flex flex-col items-center justify-center w-[46px] h-[52px] rounded-xl border ${statusColor} shrink-0`}>
                                  <span className="text-[10px] font-bold uppercase opacity-80">{['S','M','T','W','T','F','S'][date % 7]}</span>
                                  <span className="text-sm font-bold">{date}</span>
                                  <span className="text-[9px] font-black mt-0.5">{statusText}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 border-t border-black/5 flex flex-wrap gap-4 text-[11px] font-semibold text-gray-500 justify-center">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2F9E67]"></span> Present (P)</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F47A32]"></span> Half Day (HD)</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30]"></span> Absent (A)</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span> Weekly Off (WO)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Binding History */}
                <div>
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Historical Bindings</h3>
                  <div className="bg-white border border-black/10 rounded-2xl overflow-hidden divide-y divide-black/5">
                    {(portal.bindings ?? []).length ? (portal.bindings ?? []).map(b => {
                      const active = b.status === 'Accepted';
                      return (
                        <div key={b.id} className={`p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 ${active ? '' : 'bg-gray-50/50'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-2 rounded-full ${active ? 'bg-[#E8F5E9] text-[#2F9E67]' : 'bg-gray-200 text-gray-600'}`}>
                              {active ? <Briefcase size={16} /> : <Building2 size={16} />}
                            </div>
                            <div>
                              <p className="font-semibold text-[#1D1D1F] text-[15px]">{b.contractor || '—'}</p>
                              <p className="text-[13px] text-[#86868B]">{[b.site, b.designation].filter(Boolean).join(' • ') || '—'}</p>
                              <p className="text-[12px] text-gray-500 mt-1">{b.requestedOn || '—'}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[12px] font-bold self-start md:self-auto tracking-wider ${active ? 'bg-[#E8F5E9] text-[#2F9E67]' : 'bg-gray-200 text-gray-600'}`}>{active ? 'ACTIVE' : b.status.toUpperCase()}</span>
                        </div>
                      );
                    }) : (
                      <p className="p-8 text-center text-gray-500 text-sm">No binding history yet.</p>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB: SKILLS & EMPLOYABILITY */}
          {activeTab === 'skills' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F]">Education & Languages</h3>
              </div>
              <div className="bg-[#F5F5F7] rounded-[16px] p-5 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qualification / Course</p>
                  <input type="text" value={skillsForm.qualificationCourse} onChange={e => setSkill('qualificationCourse', e.target.value)} placeholder="e.g. 12th Standard (HSC)" className="mt-2 w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Board / University</p>
                  <input type="text" value={skillsForm.boardUniversity} onChange={e => setSkill('boardUniversity', e.target.value)} placeholder="e.g. CBSE" className="mt-2 w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Passing Year</p>
                  <input type="text" inputMode="numeric" value={skillsForm.passingYear} onChange={e => setSkill('passingYear', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="e.g. 2014" className="mt-2 w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Languages Known</p>
                  <input type="text" value={skillsForm.languages} onChange={e => setSkill('languages', e.target.value)} placeholder="Comma separated, e.g. Hindi, English" className="mt-2 w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                </div>
              </div>

              <div className="pt-6 border-t border-black/5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F]">Certified Trades & Skills</h3>
                  <button type="button" className="text-[#0066CC] text-[13px] font-semibold hover:underline">
                    + Add Skill
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {/* Primary Skill */}
                  <div className="bg-white rounded-[12px] shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-[#073B67] text-white">
                      <div className="flex items-center gap-2">
                        <Award size={18} className="text-[#F47A32]" />
                        <h3 className="font-bold text-white">Primary Skill</h3>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${worker.skills?.certification?.verified ? 'bg-[#2F9E67] text-white' : 'bg-yellow-100 text-yellow-800'}`}>
                        {worker.skills?.certification?.verified ? 'Verified' : 'Self-Declared'}
                      </span>
                    </div>
                    <div className="p-5 space-y-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sector</p>
                          <p className="text-sm font-semibold text-gray-800 mt-1">{worker.classification?.sector || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Occupation / Trade</p>
                          <input type="text" value={skillsForm.primaryName} onChange={e => setSkill('primaryName', e.target.value)} placeholder="e.g. Bar Bender (Rebar)" className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Experience</p>
                          <input type="text" value={skillsForm.primaryExperience} onChange={e => setSkill('primaryExperience', e.target.value)} placeholder="e.g. 8 Years" className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assessment Source</p>
                          <p className="text-sm font-semibold text-gray-800 mt-1">{worker.skills?.certification?.verified ? 'Third-Party Assessed' : 'Self-Declared'}</p>
                        </div>
                      </div>
                      {worker.skills?.certification?.verified && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 mb-3">
                            <BadgeCheck size={16} className="text-[#2F9E67]" />
                            <h4 className="text-sm font-bold text-gray-900">Certification Details</h4>
                          </div>
                          <div className="bg-[#E8F5E9]/50 p-4 rounded-lg border border-[#2F9E67]/20 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Certificate Name</p>
                              <p className="text-sm font-bold text-gray-800">{worker.skills?.certification?.name || '—'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Issuing Authority</p>
                              <p className="text-sm font-semibold text-gray-800">{worker.skills?.certification?.authority || '—'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cert. Number</p>
                              <p className="text-xs font-mono font-semibold text-[#073B67]">{worker.skills?.certification?.number || '—'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Validity</p>
                              <p className="text-xs font-semibold text-gray-800">{worker.skills?.certification?.expiry || '—'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Secondary Skill */}
                  <div className="bg-white rounded-[12px] shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Award size={18} className="text-gray-500" />
                        <h3 className="font-bold text-gray-900">Secondary Skill</h3>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-yellow-100 text-yellow-800">
                        Self-Declared
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sector</p>
                          <p className="text-sm font-semibold text-gray-800 mt-1">{worker.classification?.sector || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Occupation / Trade</p>
                          <input type="text" value={skillsForm.secondary} onChange={e => setSkill('secondary', e.target.value)} placeholder="Comma separated trades" className="mt-1 w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-[13px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC]" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Experience</p>
                          <p className="text-sm font-semibold text-gray-800 mt-1">—</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assessment Source</p>
                          <p className="text-sm font-semibold text-gray-800 mt-1">Unassessed</p>
                        </div>
                      </div>
                    </div>
                  </div>
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
                  <input type="text" defaultValue={worker.other?.consentDate} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Registration Source</label>
                  <input type="text" defaultValue={worker.other?.registrationSource} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Registered By</label>
                  <input type="text" defaultValue={worker.other?.registeredBy} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Registration Date</label>
                  <input type="text" defaultValue={worker.other?.registrationDate} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F]" readOnly />
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
                      <p className="text-[13px] text-gray-500 mb-3">Fetch demographics directly from UIDAI.</p>
                      <input type="text" placeholder="XXXX-XXXX-XXXX" defaultValue="8472-XXXX-1234" className="w-full max-w-sm bg-white border border-gray-300 rounded-xl px-4 py-2 text-[14px] font-medium focus:outline-none" />
                    </div>
                    <div className="flex items-center justify-start md:justify-end min-w-[140px]">
                      {verifiedGovIds.aadhaar ? (
                        <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg text-[13px] font-bold border border-green-100"><CheckCircle size={16}/> Verified</span>
                      ) : (
                        <button type="button" onClick={() => handleVerify('aadhaar')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-blue-700 flex items-center gap-2">
                          {verifyingId === 'aadhaar' ? <RefreshCw size={16} className="animate-spin" /> : 'Verify API'}
                        </button>
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
                      <p className="text-[13px] text-gray-500 mb-3">Fetch financial KYC details from NSDL.</p>
                      <input type="text" placeholder="ABCDE1234F" defaultValue={verifiedGovIds.pan ? "BMZPX9241K" : ""} className="w-full max-w-sm bg-white border border-gray-300 rounded-xl px-4 py-2 text-[14px] font-medium uppercase focus:outline-none" />
                    </div>
                    <div className="flex items-center justify-start md:justify-end min-w-[140px]">
                      {verifiedGovIds.pan ? (
                        <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg text-[13px] font-bold border border-green-100"><CheckCircle size={16}/> Verified</span>
                      ) : (
                        <button type="button" onClick={() => handleVerify('pan')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-blue-700 flex items-center gap-2">
                          {verifyingId === 'pan' ? <RefreshCw size={16} className="animate-spin" /> : 'Verify API'}
                        </button>
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
                      <p className="text-[13px] text-gray-500 mb-3">Fetch EPFO records via Universal Account Number.</p>
                      <input type="text" placeholder="12-digit UAN" defaultValue={verifiedGovIds.uan ? "100984736122" : ""} className="w-full max-w-sm bg-white border border-gray-300 rounded-xl px-4 py-2 text-[14px] font-medium focus:outline-none" />
                    </div>
                    <div className="flex items-center justify-start md:justify-end min-w-[140px]">
                      {verifiedGovIds.uan ? (
                        <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg text-[13px] font-bold border border-green-100"><CheckCircle size={16}/> Verified</span>
                      ) : (
                        <button type="button" onClick={() => handleVerify('uan')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-blue-700 flex items-center gap-2">
                          {verifyingId === 'uan' ? <RefreshCw size={16} className="animate-spin" /> : 'Verify API'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bank Accounts — both registered accounts are KYC-verified here */}
                  <div className="flex flex-col md:flex-row gap-4 p-5 rounded-[16px] border border-gray-200 bg-gray-50/50">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                      <Building2 size={24} />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h4 className="text-[15px] font-bold text-gray-900">Bank KYC — Primary &amp; Secondary Accounts (Penny Drop)</h4>
                        <p className="text-[13px] text-gray-500 mt-0.5">Both registered bank accounts are subjected to KYC via the NPCI bank verification API. Primary account receives salary.</p>
                      </div>
                      <div className="rounded-[14px] border border-gray-200 bg-white p-4">
                        <p className="flex items-center justify-between gap-2 text-[13px] font-bold text-gray-800 mb-2"><span className="inline-flex items-center gap-1.5"><CheckCircle size={14} className="text-[#2F9E67]"/> Primary Account</span>{verifiedGovIds.bankPrimary ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-lg px-2 py-1"><CheckCircle size={13}/> KYC Verified</span> : <button type="button" onClick={() => handleVerify('bankPrimary')} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[12px] font-bold hover:bg-blue-700 flex items-center gap-1.5">{verifyingId === 'bankPrimary' ? <RefreshCw size={13} className="animate-spin" /> : 'Verify API'}</button>}</p>
                        <div className="flex gap-2">
                          <input type="text" placeholder="Account No" defaultValue={verifiedGovIds.bankPrimary ? "39201948301" : "31029384756"} className="w-2/3 bg-white border border-gray-300 rounded-xl px-3 py-2 text-[13px] font-medium focus:outline-none" />
                          <input type="text" placeholder="IFSC" defaultValue={verifiedGovIds.bankPrimary ? "SBIN000123" : "SBIN0001234"} className="w-1/3 bg-white border border-gray-300 rounded-xl px-3 py-2 text-[13px] font-medium uppercase focus:outline-none" />
                        </div>
                      </div>
                      <div className="rounded-[14px] border border-gray-200 bg-white p-4">
                        <p className="flex items-center justify-between gap-2 text-[13px] font-bold text-gray-800 mb-2"><span className="inline-flex items-center gap-1.5"><CreditCard size={14} className="text-gray-400"/> Secondary Account</span>{verifiedGovIds.bankSecondary ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-lg px-2 py-1"><CheckCircle size={13}/> KYC Verified</span> : <button type="button" onClick={() => handleVerify('bankSecondary')} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[12px] font-bold hover:bg-blue-700 flex items-center gap-1.5">{verifyingId === 'bankSecondary' ? <RefreshCw size={13} className="animate-spin" /> : 'Verify API'}</button>}</p>
                        <div className="flex gap-2">
                          <input type="text" placeholder="Account No" defaultValue={verifiedGovIds.bankSecondary ? "50100123456789" : "50123456789012"} className="w-2/3 bg-white border border-gray-300 rounded-xl px-3 py-2 text-[13px] font-medium focus:outline-none" />
                          <input type="text" placeholder="IFSC" defaultValue={verifiedGovIds.bankSecondary ? "BARB0MUM123" : "BARB0MUM1234"} className="w-1/3 bg-white border border-gray-300 rounded-xl px-3 py-2 text-[13px] font-medium uppercase focus:outline-none" />
                        </div>
                      </div>
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
              disabled={isSaving}
              className="bg-[#0F172A] hover:bg-black text-white px-8 py-3 rounded-full font-bold text-[14px] shadow-sm transition-all flex justify-center items-center gap-2 min-w-[160px]"
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

    </div>
  );
}
