/** Shared shapes for the Medical and Health & Safety Training workspaces.
 *  The same types are used by the route handlers in src/app/api/** and the
 *  demo store in src/server/medical/store.ts. */

export type FormStatus = 'default' | 'draft' | 'frozen';

/** One editable health form per Indian state / UT (BSS Staff side). */
export type StateForm = {
  state: string;
  /** Form-VIII and Form-IX are independent forms with their own status/version. */
  formType: 'VIII' | 'IX';
  templateId: string;
  html: string;
  /** default = untouched replica · draft = unlocked & edited · frozen = locked version ready to send */
  status: FormStatus;
  version: number;
  updatedAt: string;
  updatedBy: string;
};

/** A frozen form pushed by BSS Staff to specific sites of one employer. */
export type FormDispatch = {
  id: string;
  state: string;
  formType?: 'VIII' | 'IX';
  /** True when the employer's pinned version is older than the published one. */
  reAdoptAvailable?: boolean;
  /** Both published forms for the state (Form-VIII / Form-IX). */
  forms?: Partial<Record<'VIII' | 'IX', FormDispatch>>;
  version: number;
  html: string;
  employerId: string;
  employerName: string;
  siteIds: string[];
  siteNames: string[];
  note?: string;
  sentAt: string;
  sentBy: string;
};

export type DirectoryEmployer = {
  id: string;
  name: string;
  sites: Array<{ id: string; name: string; location: string; state: string }>;
};

export type TestFlag = 'Normal' | 'Abnormal' | 'Not Done';
export type TestResult = { key: string; name: string; result: string; unit: string; flag: TestFlag; fileName: string; custom?: boolean };
export type Fitness = 'Fit' | 'Fit with restrictions' | 'Unfit';

/** One medical examination recorded by the employer's Medical Officer. */
export type MedicalExam = {
  id: string;
  workerId: string;
  siteId: string;
  state: string;
  formType: 'VIII' | 'IX';
  dispatchId: string | null;
  formVersion: number | null;
  partA: {
    name: string; gender: string; dob: string; company: string; designation: string; department: string; role: string;
    uan: string; aadhaar: string; incharge: string; mobile: string; email: string; address: string; illness: string; nature: string;
  };
  tests: TestResult[];
  /** Values for {{custom.<key>}} tokens — asked from the Medical Officer. */
  customFields: Record<string, string>;
  doctor: { name: string; reg: string; hospital: string };
  examDate: string;
  intervalMonths: number;
  nextDue: string;
  remarks: string;
  heightWork: { value: 'NA' | 'No' | 'Yes'; detail: string };
  overall: Fitness;
  restrictions: string;
  altFit: { enabled: boolean; role: string; work: string; dept: string; remarks: string };
  unfit: { role: string; work: string; dept: string; recommendation: string };
  recordedAt: string;
};

export type KitItemRecord = { issued: boolean; issueDate?: string; size?: string; condition?: string; remarks?: string; na?: boolean; custom?: boolean; name?: string; replMonths?: number; mandatory?: boolean };
export type TrainingRecord = { completed: boolean; date?: string; trainer?: string; score?: string; validUntil?: string; remarks?: string; na?: boolean; custom?: boolean; name?: string; validityMonths?: number; duration?: string; mandatory?: boolean };

/** PPE kit + training record for one worker (Safety Office). */
export type SafetyRecord = {
  workerId: string;
  siteId?: string | number;
  kitItems: Record<string, KitItemRecord>;
  trainings: Record<string, TrainingRecord>;
  issuedBy?: string;
  storeRef?: string;
  kitCondition?: string;
  notes?: string;
  updatedAt: string;
  eligibility?: {
    temporaryEligible?: boolean; permanentEligible?: boolean;
    medical?: string; healthSafety?: string; compliance?: string;
    safetyKit?: string; safetyTraining?: string; siteInduction?: string;
    aadhaar?: string; bank?: string; uan?: string; esi?: string;
  };
};
