"use client";

import type { ReactNode } from "react";
import { BadgeCheck, Banknote, Briefcase, CalendarDays, Droplet, GraduationCap, HeartPulse, IdCard, Landmark, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";

export type ScanVerifyData = {
  relationship?: "public" | "bound" | "self";
  id?: number;
  name?: string;
  company?: string;
  bssId?: string;
  verified?: boolean;
  identity?: {
    name?: string; bssId?: string; photoUrl?: string; company?: string;
    gender?: string; age?: number | string; bloodGroup?: string;
    category?: string; occupation?: string; sector?: string;
    aadhaarVerified?: boolean; panVerified?: boolean;
    mobileMasked?: string; aadhaarMasked?: string; location?: string;
    availableForWork?: boolean; verified?: boolean;
  };
  employment?: {
    status?: string; contractor?: string; employer?: string; site?: string;
    designation?: string; department?: string; shift?: string; doj?: string;
  };
  skills?: {
    primary?: { name?: string; experienceYears?: string; level?: string };
    secondary?: string[]; certification?: string; certificationVerified?: boolean; languages?: string;
  };
  education?: { qualification?: string; board?: string; year?: string };
  details?: {
    aadhaar?: string; pan?: string; dateOfBirth?: string; fatherName?: string;
    motherName?: string; spouseName?: string; maritalStatus?: string;
    mobile?: string; alternateMobile?: string; email?: string; placeOfBirth?: string; disability?: string;
    emergency?: { name?: string; number?: string; relation?: string };
    address?: { current?: string; permanent?: string; migrant?: boolean };
    banking?: { bankName?: string; accountHolder?: string; accountMasked?: string; ifsc?: string; status?: string };
    socialSecurity?: { uan?: string; esic?: string; lwf?: string; bocw?: string; eshram?: string };
    employment?: { contractor?: string; employer?: string; site?: string; designation?: string; department?: string; shift?: string; doj?: string; natureOfJob?: string; typeOfWork?: string };
    wages?: { lastGross?: number | null; frequency?: string; periodEnd?: string } | null;
    welfare?: { ppe?: string; safetyTraining?: boolean; insurance?: string; policeVerification?: string };
  };
};

function Field({ label, value }: { label: string; value?: ReactNode }) {
  if (value === undefined || value === null || value === "" || value === "—") return null;
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="text-xs font-semibold text-gray-800 break-words">{value}</dd>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">{icon}{title}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">{children}</dl>
    </div>
  );
}

const money = (n?: number | null) => (n === null || n === undefined ? "" : `₹${Number(n).toLocaleString("en-IN")}`);

/**
 * Binding-aware identity card shared by the worker/contractor/employer scanners.
 * Always shows the public-safe tier; when the viewer is bound (or it is the
 * worker's own card) it adds the extensive post-binding record.
 */
export default function ScanIdentityCard({ data }: { data: ScanVerifyData }) {
  const id = data.identity ?? {};
  const name = id.name || data.name || "BSS identity";
  const bssId = id.bssId || data.bssId || "";
  const relationship = data.relationship ?? "public";
  const extended = relationship === "bound" || relationship === "self";
  const d = data.details;
  const skills = data.skills ?? {};
  const secondary = (skills.secondary ?? []).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {id.photoUrl
          ? <img src={id.photoUrl} alt={name} className="w-16 h-16 rounded-full object-cover border border-gray-200" />
          : <span className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 grid place-items-center text-gray-400"><UserRound size={26} /></span>}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-lg truncate">{name}</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${extended ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
              {relationship === "self" ? "Your profile" : relationship === "bound" ? "Bound — full details" : "Verified credential"}
            </span>
          </div>
          <code className="text-xs text-[#073B67]">{bssId}</code>
          {(id.company || data.company) && <p className="text-xs text-gray-500 mt-0.5">{id.company || data.company}</p>}
        </div>
      </div>

      {/* Public-safe tier */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs rounded-xl border border-gray-100 p-3">
        <Field label="Category" value={id.category} />
        <Field label="Gender" value={id.gender} />
        <Field label="Age" value={id.age ? `${id.age}` : ""} />
        <Field label="Blood group" value={id.bloodGroup ? <span className="inline-flex items-center gap-1 text-red-700"><Droplet size={12} />{id.bloodGroup}</span> : ""} />
        <Field label="Occupation" value={id.occupation || id.sector} />
        <Field label="Location" value={id.location ? <span className="inline-flex items-center gap-1"><MapPin size={12} />{id.location}</span> : ""} />
        <Field label="Mobile" value={extended ? undefined : id.mobileMasked} />
        <Field label="Aadhaar" value={extended ? undefined : id.aadhaarMasked} />
        <Field label="Primary skill" value={skills.primary?.name} />
        <Field label="Experience" value={skills.primary?.experienceYears ? `${skills.primary.experienceYears} yrs` : ""} />
        <Field label="Languages" value={skills.languages} />
        <Field label="Availability" value={id.availableForWork ? "Available for work" : ""} />
      </dl>

      <div className="flex flex-wrap gap-1.5">
        {id.aadhaarVerified && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5"><BadgeCheck size={11} />Aadhaar verified</span>}
        {id.panVerified && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5"><BadgeCheck size={11} />PAN verified</span>}
        {skills.certificationVerified && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5"><ShieldCheck size={11} />{skills.certification || "Certified"}</span>}
        {(data.verified ?? id.verified) && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5"><ShieldCheck size={11} />BSS verified</span>}
      </div>

      {secondary.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {secondary.map(s => <span key={s} className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">{s}</span>)}
        </div>
      )}

      {(data.education?.qualification || data.education?.board) && (
        <p className="flex items-center gap-1.5 text-xs text-gray-600"><GraduationCap size={14} className="text-gray-400" />{data.education?.qualification}{data.education?.board ? ` · ${data.education.board}` : ""}{data.education?.year ? ` · ${data.education.year}` : ""}</p>
      )}

      {!extended && (
        <p className="p-3 bg-blue-50 rounded-lg text-xs text-blue-900">
          Sensitive identifiers, contact, address and banking details are withheld. They are shared automatically once this worker is bound to you.
        </p>
      )}

      {/* Extensive post-binding tier */}
      {extended && d && (
        <div className="space-y-3">
          <Section icon={<IdCard size={13} />} title="Personal">
            <Field label="Date of birth" value={d.dateOfBirth ? <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{d.dateOfBirth}</span> : ""} />
            <Field label="Father's name" value={d.fatherName} />
            <Field label="Mother's name" value={d.motherName} />
            <Field label="Spouse" value={d.spouseName} />
            <Field label="Marital status" value={d.maritalStatus} />
            <Field label="Place of birth" value={d.placeOfBirth} />
            <Field label="Aadhaar" value={d.aadhaar} />
            <Field label="PAN" value={d.pan} />
            <Field label="Disability" value={d.disability} />
          </Section>

          <Section icon={<Phone size={13} />} title="Contact">
            <Field label="Mobile" value={d.mobile} />
            <Field label="Alternate mobile" value={d.alternateMobile} />
            <Field label="Email" value={d.email} />
            <Field label="Emergency contact" value={d.emergency?.name ? `${d.emergency.name}${d.emergency.relation ? ` (${d.emergency.relation})` : ""}${d.emergency.number ? ` · ${d.emergency.number}` : ""}` : ""} />
          </Section>

          <Section icon={<MapPin size={13} />} title="Address">
            <Field label="Current" value={d.address?.current} />
            <Field label="Permanent" value={d.address?.permanent} />
            <Field label="Migrant worker" value={d.address?.migrant ? "Yes" : ""} />
          </Section>

          {d.employment && (
            <Section icon={<Briefcase size={13} />} title="Employment">
              <Field label="Contractor" value={d.employment.contractor || data.employment?.contractor} />
              <Field label="Principal employer" value={d.employment.employer || data.employment?.employer} />
              <Field label="Site" value={d.employment.site || data.employment?.site} />
              <Field label="Designation" value={d.employment.designation || data.employment?.designation} />
              <Field label="Department" value={d.employment.department} />
              <Field label="Shift" value={d.employment.shift} />
              <Field label="Date of joining" value={d.employment.doj} />
              <Field label="Nature of job" value={d.employment.natureOfJob} />
            </Section>
          )}

          {d.banking && (d.banking.bankName || d.banking.accountMasked) && (
            <Section icon={<Landmark size={13} />} title="Banking">
              <Field label="Bank" value={d.banking.bankName} />
              <Field label="Account holder" value={d.banking.accountHolder} />
              <Field label="Account" value={d.banking.accountMasked} />
              <Field label="IFSC" value={d.banking.ifsc} />
              <Field label="Verification" value={d.banking.status} />
            </Section>
          )}

          {d.socialSecurity && (d.socialSecurity.uan || d.socialSecurity.esic || d.socialSecurity.eshram || d.socialSecurity.bocw || d.socialSecurity.lwf) && (
            <Section icon={<ShieldCheck size={13} />} title="Social security">
              <Field label="EPFO UAN" value={d.socialSecurity.uan} />
              <Field label="ESIC IP" value={d.socialSecurity.esic} />
              <Field label="LWF" value={d.socialSecurity.lwf} />
              <Field label="BOCW" value={d.socialSecurity.bocw} />
              <Field label="e-Shram" value={d.socialSecurity.eshram} />
            </Section>
          )}

          {d.wages && (
            <Section icon={<Banknote size={13} />} title="Wages">
              <Field label="Last gross" value={money(d.wages.lastGross)} />
              <Field label="Frequency" value={d.wages.frequency} />
              <Field label="Period end" value={d.wages.periodEnd} />
            </Section>
          )}

          {d.welfare && (
            <Section icon={<HeartPulse size={13} />} title="Welfare & safety">
              <Field label="PPE given" value={d.welfare.ppe} />
              <Field label="Safety training" value={d.welfare.safetyTraining ? "Completed" : ""} />
              <Field label="Insurance" value={d.welfare.insurance} />
              <Field label="Police verification" value={d.welfare.policeVerification} />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
