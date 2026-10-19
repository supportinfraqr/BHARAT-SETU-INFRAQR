"use client";

import type { ReactNode } from "react";
import { BadgeCheck, Building2, CalendarDays, CheckCircle2, ChevronDown, CircleDashed, Droplet, GraduationCap, HeartPulse, MapPin, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { formatDate } from "@/lib/date";

export type GatePassInfo = {
  status?: string; number?: string; validFrom?: string; validTo?: string; site?: string;
  issued?: boolean; dispatched?: boolean; source?: string;
};

export type GatePassEligibility = {
  medical?: string; healthSafety?: string; compliance?: string;
  safetyKit?: string; safetyTraining?: string; siteInduction?: string;
  ppe?: string; welfareSafety?: string;
  aadhaar?: string; pan?: string; bank?: string; uan?: string; esi?: string;
  temporaryEligible?: boolean; permanentEligible?: boolean;
};

export type ScanVerifyData = {
  relationship?: "public" | "bound" | "self";
  id?: number;
  name?: string;
  company?: string;
  bssId?: string;
  verified?: boolean;
  bssMemberSince?: string;
  consentDate?: string;
  bindingDate?: string;
  identity?: {
    name?: string; bssId?: string; photoUrl?: string; company?: string;
    gender?: string; age?: number | string; bloodGroup?: string;
    category?: string; occupation?: string; sector?: string;
    aadhaarVerified?: boolean; panVerified?: boolean;
    mobileMasked?: string; aadhaarMasked?: string; location?: string;
    availableForWork?: boolean; verified?: boolean;
    bssMemberSince?: string; consentDate?: string; bindingDate?: string;
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
    employment?: { contractor?: string; contractorBssId?: string; employer?: string; employerBssId?: string; site?: string; siteCode?: string; designation?: string; department?: string; shift?: string; doj?: string; natureOfJob?: string; typeOfWork?: string };
    wages?: { lastGross?: number | null; frequency?: string; periodEnd?: string } | null;
    welfare?: {
      ppeRequired?: boolean | null; ppe?: string; safetyTraining?: boolean;
      siteInduction?: string; insurance?: string; policeVerification?: string;
      trainingDate?: string; trainerName?: string; contractorVerified?: boolean;
    };
    gatePass?: {
      temporary?: GatePassInfo;
      permanent?: GatePassInfo;
      eligibility?: GatePassEligibility;
    };
    verification?: {
      aadhaar?: boolean; pan?: boolean; bank?: boolean; uan?: boolean; esi?: boolean;
    };
    medical?: {
      examinationStatus?: string; lastExamination?: string; fitnessStatus?: string; nextDue?: string;
    };
    org?: {
      tradeName?: string; category?: string; contactPerson?: string; mobile?: string; email?: string;
      address?: string; state?: string; district?: string; lin?: string; cin?: string;
      clraLicence?: string; operatingStates?: string; pan?: string; gstin?: string;
      sites?: string[]; contractors?: number; workers?: number;
      bssMemberSince?: string; consentDate?: string; bindingDate?: string;
    };
  };
};

function Field({ label, value, empty }: { label: string; value?: ReactNode; empty?: string }) {
  const missing = value === undefined || value === null || value === "" || value === "—";
  if (missing && !empty) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className={`break-words text-xs ${missing ? "font-medium text-gray-400" : "font-semibold text-gray-800"}`}>{missing ? empty : value}</dd>
    </div>
  );
}

function VerifyChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
      {ok ? <BadgeCheck size={12} /> : <CircleDashed size={12} />}
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{ok ? "VERIFIED" : "PENDING"}</span>
    </span>
  );
}

function StatusPill({ label, ok, okText = "Done", pendingText = "Pending" }: { label: string; ok: boolean; okText?: string; pendingText?: string }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold ${ok ? "text-emerald-700" : "text-amber-700"}`}>
        {ok ? <CheckCircle2 size={12} /> : <CircleDashed size={12} />}{ok ? okText : pendingText}
      </p>
    </div>
  );
}

const passValidity = (p?: { validFrom?: string; validTo?: string }) => {
  const from = formatDate(p?.validFrom, "");
  const to = formatDate(p?.validTo, "");
  if (from && to) return `${from} – ${to}`;
  return from || to;
};

function GatePassCard({ gp }: { gp?: { temporary?: GatePassInfo; permanent?: GatePassInfo; eligibility?: GatePassEligibility } }) {
  const temp = gp?.temporary;
  const perm = gp?.permanent;
  const elig = gp?.eligibility;
  const tempIssued = Boolean(temp?.issued || temp?.number || (temp?.status && temp.status.toUpperCase() !== "PENDING"));
  const permIssued = Boolean(perm?.issued || perm?.number || (perm?.status && perm.status.toUpperCase() !== "PENDING"));
  const active = (pass?: GatePassInfo) => Boolean(pass?.issued && /active|issued|approved|valid/i.test(pass?.status || ""));
  const permActive = active(perm);
  const tempActive = active(temp);
  const issued = permIssued || tempIssued;
  const type = permActive ? "Permanent" : tempActive ? "Temporary" : permIssued ? "Permanent" : tempIssued ? "Temporary" : "";
  const primary = type === "Permanent" ? perm : type === "Temporary" ? temp : undefined;
  const status = primary?.status || "";
  const eligible = Boolean(elig?.permanentEligible || elig?.temporaryEligible);
  const headline = issued ? `${type} gate pass` : "Gate pass not issued";
  const statusLabel = issued ? (status || "Issued") : elig?.permanentEligible ? "Eligible for Permanent" : elig?.temporaryEligible ? "Eligible for Temporary" : "Not eligible";
  const tone = issued
    ? /expired|revoked|rejected/i.test(statusLabel)
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : /pending/i.test(statusLabel)
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700"
    : eligible
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-gray-200 bg-gray-50 text-gray-600";
  const subline = issued
    ? [status, primary?.number, passValidity(primary)].filter(Boolean).join(" · ")
    : elig?.permanentEligible
      ? "All permanent-pass requirements are met."
      : elig?.temporaryEligible
        ? "Temporary-pass requirements are met; compliance is still pending."
        : "Medical, health & safety or compliance requirements are pending.";
  const steps: Array<[string, string | undefined]> = [
    ["Medical", elig?.medical],
    ["Health & safety", elig?.healthSafety],
    ["Compliance", elig?.compliance],
  ];
  const missing: string[] = [];
  if (elig?.aadhaar === "Pending") missing.push("Aadhaar");
  if (elig?.bank === "Pending") missing.push("Bank");
  if (elig?.uan === "Pending") missing.push("UAN");
  if (elig?.esi === "Pending") missing.push("ESIC");

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${issued ? (tone.includes("rose") ? "border-rose-200 from-rose-50" : tone.includes("amber") ? "border-amber-200 from-amber-50" : "border-emerald-200 from-emerald-50") : eligible ? "border-amber-200 from-amber-50" : "border-gray-200 from-gray-50"} bg-gradient-to-br to-white`}>
      <div aria-hidden className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/60 blur-xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Current status</p>
          <p className="mt-0.5 text-lg font-bold leading-tight text-gray-900">{headline}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{subline}</p>
        </div>
        <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${tone}`}>
          {issued ? <ShieldCheck size={12} /> : <CircleDashed size={12} />}
          {statusLabel}
        </span>
      </div>
      <div className="relative mt-3 grid grid-cols-2 gap-2">
        {([
          ["Temporary", temp, Boolean(elig?.temporaryEligible)],
          ["Permanent", perm, Boolean(elig?.permanentEligible)],
        ] as const).map(([label, pass, isEligible]) => (
          <div key={label} className="rounded-xl border border-white/80 bg-white/75 p-2.5 backdrop-blur">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400">{label}</p>
            <p className={`mt-0.5 text-xs font-bold ${pass?.number || pass?.issued ? "text-gray-900" : "text-gray-400"}`}>{pass?.number || (pass?.issued ? "Issued" : "Not issued")}</p>
            <p className="mt-0.5 text-[10px] text-gray-500">{pass?.status || (isEligible ? "Eligible" : "Not eligible")}</p>
            {passValidity(pass) && <p className="mt-0.5 text-[10px] text-gray-500">{passValidity(pass)}</p>}
            {pass?.site && <p className="mt-0.5 truncate text-[10px] text-gray-500">{pass.site}</p>}
          </div>
        ))}
      </div>
      <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
        {steps.map(([label, value]) => {
          const done = String(value || "").toLowerCase() === "done";
          return <span key={label} className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{label} · {done ? "Done" : "Pending"}</span>;
        })}
        {!issued && missing.length > 0 && <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-gray-500">Missing: {missing.join(", ")}</span>}
      </div>
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

const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  navy: 'bg-[#E8EEF9] text-[#1E3A8A]',
  amber: 'bg-amber-50 text-amber-600',
  green: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  slate: 'bg-slate-100 text-slate-500',
  teal: 'bg-teal-50 text-teal-600',
};

function Tile({ icon, title, summary, open, tone = 'slate', children }: { icon: ReactNode; title: string; summary?: ReactNode; open?: boolean; tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <details open={open} className="group rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow open:shadow-md">
      <summary className="list-none flex items-center gap-3 px-3.5 py-3 cursor-pointer select-none">
        <span className={`w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 ${TONES[tone]}`}>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-gray-800">{title}</span>
          {summary ? <span className="mt-0.5 block truncate text-[11px] text-gray-500">{summary}</span> : null}
        </span>
        <span className="grid w-7 h-7 place-items-center rounded-full bg-gray-50 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-180"><ChevronDown size={14}/></span>
      </summary>
      <div className="border-t border-gray-100 px-3.5 pb-3.5 pt-3 space-y-3.5">{children}</div>
    </details>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2">{children}</dl>
    </div>
  );
}

const money = (n?: number | null) => (n === null || n === undefined ? "" : `₹${Number(n).toLocaleString("en-IN")}`);

/**
 * Binding-aware identity card shared by the worker/contractor/employer scanners.
 * Public scans show the safe tier. A bound/own worker card is grouped into four
 * collapsible tiles: Profile, Gate Pass, Medical and Safety & Training.
 */
export default function ScanIdentityCard({ data }: { data: ScanVerifyData }) {
  const id = data.identity ?? {};
  const name = id.name || data.name || "BSS identity";
  const bssId = id.bssId || data.bssId || "";
  const relationship = data.relationship ?? "public";
  const extended = relationship === "bound" || relationship === "self";
  const d = data.details;
  const workerExtended = extended && Boolean(d) && !d?.org;
  const skills = data.skills ?? {};
  const secondary = (skills.secondary ?? []).filter(Boolean);

  const verification = {
    aadhaar: Boolean(d?.verification?.aadhaar ?? id.aadhaarVerified),
    pan: Boolean(d?.verification?.pan ?? id.panVerified),
    bank: Boolean(d?.verification?.bank ?? (d?.banking?.status || "").toLowerCase() === "verified"),
    uan: Boolean(d?.verification?.uan),
    esi: Boolean(d?.verification?.esi),
  };
  const gp = d?.gatePass;
  const gatePassSummary = gp?.permanent?.issued || gp?.permanent?.number
    ? `Permanent · ${gp.permanent.status || "Issued"}`
    : gp?.temporary?.issued || gp?.temporary?.number
      ? `Temporary · ${gp.temporary.status || "Issued"}`
      : gp?.eligibility?.permanentEligible
        ? "Not issued · Permanent eligible"
        : gp?.eligibility?.temporaryEligible
          ? "Not issued · Temporary eligible"
          : "Not issued";
  const medicalSummary = [d?.medical?.fitnessStatus, d?.medical?.nextDue ? `Next due ${formatDate(d.medical.nextDue, "")}` : ""].filter(Boolean).join(" · ");
  const ppeItems = (d?.welfare?.ppe || "").split(",").map(item => item.trim()).filter(Boolean);
  const inductionDone = ["done", "completed"].includes(String(d?.welfare?.siteInduction || "").toLowerCase());
  const safetySummary = [ppeItems.length ? `${ppeItems.length} PPE items` : "", d?.welfare?.safetyTraining ? "Training done" : "", inductionDone ? "Induction done" : ""].filter(Boolean).join(" · ");

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-blue-50/50 p-4">
        <div aria-hidden className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-blue-100/40 blur-xl" />
        <div className="relative flex items-center gap-3.5">
          {id.photoUrl
            ? <img src={id.photoUrl} alt={name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow-sm flex-shrink-0" />
            : <span className="w-16 h-16 rounded-2xl bg-white border border-gray-200 grid place-items-center text-gray-400 flex-shrink-0"><UserRound size={26} /></span>}
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold leading-tight text-gray-900">{name}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <code className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-[#073B67]">{bssId}</code>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${extended ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                {relationship === "self" ? "Your profile" : relationship === "bound" ? "Bound — full details" : "Verified credential"}
              </span>
            </div>
            {(id.company || data.company) && <p className="mt-1 text-[11px] text-gray-500">{id.company || data.company}</p>}
          </div>
        </div>
      </div>

      {workerExtended && d ? (
        <>
          <Tile icon={<UserRound size={14} />} title="Profile" tone="navy" open summary={[d.employment?.site, d.mobile].filter(Boolean).join(" · ")}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Verification</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <VerifyChip label="Aadhaar" ok={verification.aadhaar} />
                <VerifyChip label="PAN" ok={verification.pan} />
                <VerifyChip label="Bank" ok={verification.bank} />
                <VerifyChip label="UAN" ok={verification.uan} />
                <VerifyChip label="ESIC" ok={verification.esi} />
              </div>
            </div>

            <Group label="Basic details">
              <Field label="Category" value={id.category} />
              <Field label="Gender" value={id.gender} />
              <Field label="Age" value={id.age ? `${id.age}` : ""} />
              <Field label="Blood group" value={id.bloodGroup ? <span className="inline-flex items-center gap-1 text-red-700"><Droplet size={12} />{id.bloodGroup}</span> : ""} />
              <Field label="Occupation" value={id.occupation || id.sector} />
              <Field label="Location" value={id.location ? <span className="inline-flex items-center gap-1"><MapPin size={12} />{id.location}</span> : ""} />
              <Field label="Primary skill" value={skills.primary?.name} />
              <Field label="Experience" value={skills.primary?.experienceYears ? `${skills.primary.experienceYears} yrs` : ""} />
              <Field label="Languages" value={skills.languages} />
              <Field label="Other skills" value={secondary.join(", ")} />
              <Field label="Availability" value={id.availableForWork ? "Available for work" : ""} />
              <Field label="Certification" value={skills.certification} />
              <Field label="Member of BSS since" value={formatDate(data.bssMemberSince || id.bssMemberSince, "")} />
              <Field label="Consent accepted" value={formatDate(data.consentDate || id.consentDate, "")} />
              <Field label={relationship === "self" ? "First binding on BSS since" : "Bound to you since"} value={formatDate(data.bindingDate || id.bindingDate, "")} />
              <Field label="Education" value={data.education?.qualification ? <span className="inline-flex items-center gap-1"><GraduationCap size={12} />{data.education.qualification}{data.education.board ? ` · ${data.education.board}` : ""}{data.education.year ? ` · ${data.education.year}` : ""}</span> : ""} />
            </Group>

            <Group label="Personal">
              <Field label="Date of birth" value={d.dateOfBirth ? <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{formatDate(d.dateOfBirth, "")}</span> : ""} empty="Not provided" />
              <Field label="Father's name" value={d.fatherName} empty="Not provided" />
              <Field label="Mother's name" value={d.motherName} />
              <Field label="Spouse" value={d.spouseName} />
              <Field label="Marital status" value={d.maritalStatus} />
              <Field label="Place of birth" value={d.placeOfBirth} />
              <Field label="Disability" value={d.disability} />
            </Group>

            <Group label="Identity documents">
              <Field label="Aadhaar" value={d.aadhaar} empty="Not provided" />
              <Field label="Aadhaar status" value={verification.aadhaar ? "Verified" : "Pending"} />
              <Field label="PAN" value={d.pan} empty="Not provided" />
              <Field label="PAN status" value={verification.pan ? "Verified" : "Pending"} />
            </Group>

            <Group label="Contact">
              <Field label="Mobile" value={d.mobile} empty="Not provided" />
              <Field label="Alternate mobile" value={d.alternateMobile} />
              <Field label="Email" value={d.email} empty="Not provided" />
              <Field label="Emergency contact" value={d.emergency?.name ? `${d.emergency.name}${d.emergency.relation ? ` (${d.emergency.relation})` : ""}${d.emergency.number ? ` · ${d.emergency.number}` : ""}` : ""} />
            </Group>

            <Group label="Address">
              <Field label="Current" value={d.address?.current} empty="Not provided" />
              <Field label="Permanent" value={d.address?.permanent} empty="Not provided" />
              <Field label="Migrant worker" value={d.address?.migrant ? "Yes" : ""} />
            </Group>

            <Group label="Employment">
              <Field
                label="Contractor"
                empty="Not linked"
                value={d.employment?.contractor || d.employment?.contractorBssId
                  ? <span className="block">{d.employment?.contractor || "Contractor"}{d.employment?.contractorBssId && <span className="mt-0.5 block font-mono text-[10px] font-medium text-gray-500">{d.employment.contractorBssId}</span>}</span>
                  : undefined}
              />
              <Field
                label="Principal employer"
                empty="Not linked"
                value={d.employment?.employer || d.employment?.employerBssId
                  ? <span className="block">{d.employment?.employer || "Employer"}{d.employment?.employerBssId && <span className="mt-0.5 block font-mono text-[10px] font-medium text-gray-500">{d.employment.employerBssId}</span>}</span>
                  : undefined}
              />
              <Field
                label="Site"
                empty="Not allotted"
                value={d.employment?.site || d.employment?.siteCode
                  ? <span className="block">{d.employment?.site || "Site"}{d.employment?.siteCode && <span className="mt-0.5 block font-mono text-[10px] font-medium text-gray-500">{d.employment.siteCode}</span>}</span>
                  : undefined}
              />
              <Field label="Designation" value={d.employment?.designation} empty="Not provided" />
              <Field label="Department" value={d.employment?.department} />
              <Field label="Shift" value={d.employment?.shift} />
              <Field label="Date of joining" value={formatDate(d.employment?.doj, "")} empty="Not recorded" />
              <Field label="Nature of job" value={d.employment?.natureOfJob} />
              <Field label="Type of work" value={d.employment?.typeOfWork} />
            </Group>

            <Group label="Bank account">
              <Field label="Bank" value={d.banking?.bankName} empty="Not linked" />
              <Field label="Account holder" value={d.banking?.accountHolder} empty="Not provided" />
              <Field label="Account" value={d.banking?.accountMasked} empty="Not provided" />
              <Field label="IFSC" value={d.banking?.ifsc} empty="Not provided" />
              <Field label="Verification" value={d.banking?.status || (verification.bank ? "Verified" : "Pending")} />
            </Group>

            <Group label="Social security">
              <Field label="EPFO UAN" value={d.socialSecurity?.uan} empty="Not provided" />
              <Field label="UAN status" value={verification.uan ? "Verified" : "Pending"} />
              <Field label="ESIC IP" value={d.socialSecurity?.esic} empty="Not provided" />
              <Field label="ESIC status" value={verification.esi ? "Verified" : "Pending"} />
              <Field label="LWF" value={d.socialSecurity?.lwf} />
              <Field label="BOCW" value={d.socialSecurity?.bocw} />
              <Field label="e-Shram" value={d.socialSecurity?.eshram} />
            </Group>

            {d.wages && (
              <Group label="Wages">
                <Field label="Last gross" value={money(d.wages.lastGross)} empty="Not recorded" />
                <Field label="Frequency" value={d.wages.frequency} />
                <Field label="Period end" value={formatDate(d.wages.periodEnd, "")} />
              </Group>
            )}
          </Tile>

          <Tile icon={<ShieldCheck size={14} />} title="Gate Pass" tone="amber" summary={gatePassSummary}>
            <GatePassCard gp={d.gatePass} />
          </Tile>

          <Tile icon={<Stethoscope size={14} />} title="Medical" tone="rose" summary={medicalSummary}>
            <Group label="Examination">
              <Field label="Status" value={d.medical?.examinationStatus} empty="Not recorded" />
              <Field label="Last examination" value={formatDate(d.medical?.lastExamination, "")} empty="Not recorded" />
              <Field label="Fitness" value={d.medical?.fitnessStatus} empty="Not recorded" />
              <Field label="Next due" value={formatDate(d.medical?.nextDue, "")} empty="Not recorded" />
            </Group>
          </Tile>

          <Tile icon={<HeartPulse size={14} />} title="Safety & Training" tone="green" summary={safetySummary}>
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400"><ShieldCheck size={12} />PPE kit</p>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${ppeItems.length ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>{ppeItems.length ? `${ppeItems.length} issued` : "Not recorded"}</span>
              </div>
              {ppeItems.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ppeItems.map(item => <span key={item} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800"><CheckCircle2 size={11} />{item}</span>)}
                </div>
              ) : (
                <p className="mt-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-400">No PPE kit recorded.</p>
              )}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <StatusPill label="Safety training" ok={Boolean(d.welfare?.safetyTraining)} okText="Completed" />
                <StatusPill label="Site induction" ok={inductionDone} okText="Done" />
              </div>
            </div>
            <Group label="Programme details">
              <Field label="PPE required" value={d.welfare?.ppeRequired === true ? "Yes" : d.welfare?.ppeRequired === false ? "No" : ""} empty="Not recorded" />
              <Field label="Training date" value={formatDate(d.welfare?.trainingDate, "")} empty="Not recorded" />
              <Field label="Trainer" value={d.welfare?.trainerName} />
            </Group>
          </Tile>
        </>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50/80 to-white p-3.5 text-xs sm:grid-cols-3">
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
            <Field label="Member of BSS since" value={formatDate(data.bssMemberSince || id.bssMemberSince || data.details?.org?.bssMemberSince, "")} />
            <Field label="Consent accepted" value={formatDate(data.consentDate || id.consentDate || data.details?.org?.consentDate, "")} />
            {extended ? (
              <Field label={relationship === "self" ? "First binding on BSS since" : "Bound to you since"} value={formatDate(data.bindingDate || id.bindingDate || data.details?.org?.bindingDate, "")} />
            ) : null}
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
            <p className="rounded-2xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-xs leading-relaxed text-blue-900">
              Sensitive identifiers, contact, address and banking details are withheld. They are shared automatically once the binding is complete.
            </p>
          )}

          {extended && d?.org && (
            <div className="space-y-3">
              <Section icon={<Building2 size={13} />} title={d.org.category === "Contractor" ? "Contractor details" : "Organisation details"}>
                <Field label="Trade name" value={d.org.tradeName} />
                <Field label="Category" value={d.org.category} />
                <Field label="Contact person" value={d.org.contactPerson} />
                <Field label="Mobile" value={d.org.mobile} />
                <Field label="Email" value={d.org.email} />
                <Field label="State" value={d.org.state} />
                <Field label="District" value={d.org.district} />
                <Field label="LIN" value={d.org.lin} />
                <Field label="CIN" value={d.org.cin} />
                <Field label="PAN" value={d.org.pan} />
                <Field label="GSTIN" value={d.org.gstin} />
                <Field label="CLRA licence" value={d.org.clraLicence} />
                <Field label="Operating states" value={d.org.operatingStates} />
                <Field label="Workers" value={d.org.workers ? String(d.org.workers) : ""} />
                <Field label="Contractors" value={d.org.contractors ? String(d.org.contractors) : ""} />
                <Field label="Registered address" value={d.org.address} />
              </Section>
              {(d.org.sites ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(d.org.sites ?? []).map(s => <span key={s} className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">{s}</span>)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
