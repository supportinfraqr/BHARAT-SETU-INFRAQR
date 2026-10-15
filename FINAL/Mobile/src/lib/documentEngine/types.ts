// BSS Document Template Engine — configuration & instance models.
// Frontend-first: these shapes are JSON-serialisable so a backend can persist them later.

import { formatDate as formatDateDMY } from '@/lib/date';

export type DocumentType = 'appointment-letter' | 'experience-letter' | 'permanent-gate-pass' | 'temporary-gate-pass';

export const DOCUMENT_TYPES: Array<{ id: DocumentType; label: string; short: string; format: 'A4' | 'PGP' | 'A4-LANDSCAPE'; roles?: Array<'employer' | 'contractor'> }> = [
  { id: 'appointment-letter', label: 'Appointment Letter', short: 'Appointment Letter', format: 'A4' },
  { id: 'experience-letter', label: 'Experience Letter', short: 'Experience Letter', format: 'A4' },
  { id: 'permanent-gate-pass', label: 'Permanent Gate Pass', short: 'Permanent Gate Pass', format: 'A4', roles: ['employer'] },
  { id: 'temporary-gate-pass', label: 'Temporary Gate Pass', short: 'Temporary Gate Pass', format: 'A4', roles: ['employer'] },
];
export const docTypeLabel = (id: DocumentType) => DOCUMENT_TYPES.find(item => item.id === id)?.short ?? id;
export const docTypeFormat = (id: DocumentType) => DOCUMENT_TYPES.find(item => item.id === id)?.format ?? 'A4';
export const documentTypesFor = (ownerType: 'employer' | 'contractor') =>
  DOCUMENT_TYPES.filter(item => {
    if (ownerType === 'employer') {
      return item.id === 'permanent-gate-pass' || item.id === 'temporary-gate-pass';
    }
    return !item.roles || item.roles.includes(ownerType);
  });
export const isGatePassType = (id: DocumentType) => id === 'permanent-gate-pass' || id === 'temporary-gate-pass';

// These types have a fixed layout/wording in code — the editor only changes the
// appearance (colour / text colour / text style).
export const APPEARANCE_ONLY_TYPES: DocumentType[] = ['appointment-letter', 'experience-letter', 'permanent-gate-pass', 'temporary-gate-pass'];
export const isAppearanceOnlyType = (id: DocumentType) => APPEARANCE_ONLY_TYPES.includes(id);

export type TemplateStatus = 'Draft' | 'Needs Review' | 'Active' | 'Inactive';

export type OwnerScope = { ownerType: 'contractor' | 'employer'; ownerId: string; ownerName: string; bssId: string };

export type SectionType = 'heading' | 'paragraph' | 'subheading' | 'field' | 'photo' | 'table' | 'signature' | 'divider' | 'logo';

export type SignatureRole = 'Worker' | 'Contractor' | 'Principal Employer' | 'HOD' | 'HR Head' | 'CSO' | 'Authorized Signatory' | 'Site In-charge' | 'Medical Officer';

export type TemplateSection = {
  id: string;
  type: SectionType;
  title: string;           // section label shown in designer list
  content: string;         // template text containing {{tokens}} or plain text (markdown-light)
  fields: string[];        // token identifiers rendered as chips in this section
  editable: boolean;       // template author may edit text
  locked: boolean;         // system-provided block (never editable)
  visible: boolean;
  order: number;
  align?: 'left' | 'center' | 'right' | 'justify';
  spacing?: 'none' | 'tight' | 'normal' | 'loose';
  // table helper for gate-pass worker lists
  tableColumns?: Array<{ key: string; header: string }>;
};

export type TemplateStyles = {
  fontSize: number;        // base px for print (A4)
  fontFamily: string;
  headingColor: string;
  showLogo: boolean;
  showBrandHeader: boolean;
  brandHeaderText: string;
  /** Optional employer-branding overrides (gate-pass compliance template). */
  brandLogoUrl?: string;
  brandTagline?: string;
  /** Per-part wordmark colours (e.g. one part red, another green). */
  brandColors?: string[];
  /** Logo alignment in the header. */
  logoAlign?: 'left' | 'center' | 'right';
  /** An uploaded image used as the whole brand text (instead of the wordmark). */
  brandTextLogoUrl?: string;
  /** A fully custom pass colour (hex) that overrides the preset theme. */
  themeColor?: string;
  /** Selected built-in gate-pass design (1–8; 1–4 permanent, 5–8 temporary). */
  gatePassDesign?: number;
  /** A simple free-form HTML block rendered into the document (script tags stripped). */
  customHtml?: string;
  footerText: string;
  theme: 'bss-navy' | 'bss-midnight' | 'bss-green' | 'bss-red' | 'bss-plain';
};

export type TemplateConfig = {
  id: string;
  documentType: DocumentType;
  ownerType: 'contractor' | 'employer';
  ownerId: string;
  ownerName: string;
  name: string;
  version: string;              // v1, v2 …
  status: TemplateStatus;
  description: string;
  pageFormat: 'A4' | 'PGP' | 'A4-LANDSCAPE';
  sections: TemplateSection[];
  styles: TemplateStyles;
  variables: string[];
  signatories: SignatureRole[];
  numberingPattern: string;     // e.g. BSS-A{{bssSeq}}
  createdBy: string;
  updatedAt: string;
  sourceVersionId?: string;     // template id this version was forked from
};

export type TemplateVersionRecord = {
  id: string;
  templateId: string;           // logical template lineage id
  template: TemplateConfig;
  createdBy: string;
  createdAt: string;
  note: string;
  active: boolean;
};

export type DocumentStatus = 'Not Generated' | 'Draft' | 'Issued' | 'Expired' | 'Revoked';

export type GeneratedDocument = {
  id: string;
  templateLineageId: string;    // logical template lineage (stable across versions)
  templateVersion: string;
  templateName: string;
  documentType: DocumentType;
  documentNumber: string;
  workerId: string;
  workerName: string;
  contractorId?: string;
  contractorName?: string;
  employerId?: string;
  employerName?: string;
  siteId?: string;
  siteName?: string;
  resolvedData: Record<string, string>; // snapshot of tokens at generation time
  instanceOverrides: Record<string, string>;
  renderedHtml?: string;        // historical rendered copy (immutable after finalize)
  status: DocumentStatus;
  validFrom?: string;
  validTo?: string;
  generatedBy: string;
  generatedByRole: 'contractor' | 'employer';
  generatedAt: string;
  finalizedAt?: string;
  issuedBy?: string;
};

export const EMPTY_STYLES: TemplateStyles = {
  fontSize: 12,
  fontFamily: "'Arial', sans-serif",
  headingColor: '#0A192F',
  showLogo: true,
  showBrandHeader: true,
  brandHeaderText: 'Bharat Shram Setu',
  brandTagline: 'One Nation · One Identity · One Future',
  brandColors: ['#022B5E', '#E45D24', '#14843C'],
  logoAlign: 'left',
  brandTextLogoUrl: '',
  customHtml: '',
  footerText: 'This is a system-generated document. Verify authenticity by scanning the worker QR code on bharatshramsetu.com.',
  theme: 'bss-navy',
};

export const uid = (prefix = '') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const nowIso = () => new Date().toISOString();
export const today = () => new Date().toISOString().slice(0, 10);

export function formatDate(iso?: string | null, fallback = '—'): string {
  return formatDateDMY(iso, fallback);
}

export function inr(value?: number | string | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
}
