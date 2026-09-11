// BSS Document Template Engine — configuration & instance models.
// Frontend-first: these shapes are JSON-serialisable so a backend can persist them later.

export type DocumentType = 'appointment-letter' | 'experience-letter' | 'permanent-gate-pass' | 'temporary-gate-pass';

export const DOCUMENT_TYPES: Array<{ id: DocumentType; label: string; short: string; format: 'A4' | 'PGP' | 'A4-LANDSCAPE' }> = [
  { id: 'appointment-letter', label: 'Appointment Letter', short: 'Appointment Letter', format: 'A4' },
  { id: 'experience-letter', label: 'Experience Letter', short: 'Experience Letter', format: 'A4' },
  { id: 'permanent-gate-pass', label: 'Permanent Gate Pass', short: 'Permanent Gate Pass', format: 'PGP' },
  { id: 'temporary-gate-pass', label: 'Temporary Gate Pass', short: 'Temporary Gate Pass', format: 'A4' },
];
export const docTypeLabel = (id: DocumentType) => DOCUMENT_TYPES.find(item => item.id === id)?.short ?? id;
export const docTypeFormat = (id: DocumentType) => DOCUMENT_TYPES.find(item => item.id === id)?.format ?? 'A4';

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
  footerText: string;
  theme: 'bss-navy' | 'bss-midnight' | 'bss-green' | 'bss-plain';
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
  numberingPattern: string;     // e.g. BSS/APPT/{{year}}/{{sequence}}
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
  footerText: 'This is a system-generated document. Verify authenticity by scanning the worker QR code on bharatshramsetu.com.',
  theme: 'bss-navy',
};

export const uid = (prefix = '') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const nowIso = () => new Date().toISOString();
export const today = () => new Date().toISOString().slice(0, 10);

export function formatDate(iso?: string | null, fallback = '—'): string {
  if (!iso) return fallback;
  const value = iso.length <= 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (Number.isNaN(value.getTime())) return fallback;
  return value.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function inr(value?: number | string | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
}
