import { TemplateConfig, TemplateSection, TemplateStatus, TemplateVersionRecord, GeneratedDocument, DocumentType, OwnerScope, SignatureRole, uid, nowIso, docTypeLabel, docTypeFormat, EMPTY_STYLES, documentTypesFor } from './types';
import { TOKEN_PATTERN } from './tokens';

// ---------------------------------------------------------------- storage keys
const TEMPLATE_KEY = 'bss-doc-templates-v1';
const INSTANCE_KEY = 'bss-doc-instances-v1';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full/blocked */ }
}

// ---------------------------------------------------------------- template cache
// Templates persist server-side via /api/document-templates (Django Postgres) so
// they survive across devices and can render on the worker/contractor side. The
// service keeps a synchronous in-memory cache hydrated from the server.
let TEMPLATE_CACHE: TemplateRecord[] = [];
const hydratedOwners = new Set<string>();
const ownerKey = (ownerType: string, ownerId: string) => `${ownerType}|${ownerId}`;

function groupByOwner(records: TemplateRecord[]): Array<{ ownerType: string; ownerId: string; list: TemplateRecord[] }> {
  const groups = new Map<string, { ownerType: string; ownerId: string; list: TemplateRecord[] }>();
  for (const record of records) {
    const ownerType = record.template.ownerType;
    const ownerId = record.template.ownerId;
    const key = ownerKey(ownerType, ownerId);
    const group = groups.get(key) ?? { ownerType, ownerId, list: [] };
    group.list.push(record);
    groups.set(key, group);
  }
  return [...groups.values()];
}

// ---------------------------------------------------------------- template seed
const DEFAULT_SECTIONS = (type: DocumentType): TemplateSection[] => {
  const id = (name: string) => `sec-${type}-${name}`;
  const wrap = (index: number, section: Partial<TemplateSection> & Pick<TemplateSection, 'type' | 'title' | 'content'>): TemplateSection => ({
    id: id(`${index}`),
    type: section.type,
    title: section.title,
    content: section.content,
    fields: section.fields ?? [],
    editable: section.editable ?? true,
    locked: section.locked ?? false,
    visible: section.visible ?? true,
    order: index,
    align: section.align ?? 'left',
    spacing: section.spacing ?? 'normal',
    tableColumns: section.tableColumns,
  });
  if (type === 'appointment-letter') {
    return [
      wrap(0, { type: 'logo', title: 'Branding / Logo', content: '', fields: [], editable: false, locked: true, visible: true, align: 'center' }),
      wrap(1, { type: 'heading', title: 'Heading', content: 'APPOINTMENT LETTER', fields: [], align: 'center', spacing: 'tight' }),
      wrap(2, { type: 'paragraph', title: 'Reference line', content: 'Appointment Letter No.: {{document.number}}   |   Worker ID: {{worker.bssId}}   |   Date of Issue: {{document.issueDate}}', fields: ['document.number', 'worker.bssId', 'document.issueDate'], align: 'justify' }),
      wrap(3, { type: 'subheading', title: 'Employer details', content: 'A. EMPLOYER DETAILS', align: 'left', spacing: 'tight' }),
      wrap(4, { type: 'paragraph', title: 'Contractor & principal employer', content: 'Contractor / Service Provider: {{contractor.legalName}} (BSS ID {{contractor.bssId}})  \nRegistered Office: {{contractor.registeredAddress}}  \nPrincipal Employer / Establishment: {{employer.legalName}}  \nSite / Project Location: {{site.name}}, {{site.address}}  \nDepartment / Unit: {{employment.department}}', fields: ['contractor.legalName', 'contractor.bssId', 'contractor.registeredAddress', 'employer.legalName', 'site.name', 'site.address', 'employment.department'], align: 'justify' }),
      wrap(5, { type: 'subheading', title: 'Worker particulars', content: 'B. WORKER PARTICULARS', align: 'left', spacing: 'tight' }),
      wrap(6, { type: 'paragraph', title: 'Worker fields', content: 'Full Name: {{worker.fullName}}    \nFather\'s Name: {{worker.fatherName}}  \nDate of Birth: {{worker.dob}}   Gender: {{worker.gender}}   Nationality: {{worker.nationality}}  \nPermanent Address: {{worker.permanentAddress}}', fields: ['worker.fullName', 'worker.fatherName', 'worker.dob', 'worker.gender', 'worker.nationality', 'worker.permanentAddress'], align: 'justify' }),
      wrap(7, { type: 'subheading', title: 'Appointment & employment terms', content: 'C. APPOINTMENT & EMPLOYMENT TERMS', align: 'left', spacing: 'tight' }),
      wrap(8, { type: 'paragraph', title: 'Terms body', content: 'This is to certify that {{worker.fullName}} is hereby appointed as {{employment.designation}} ({{employment.skillCategory}}, {{employment.employmentType}}) at {{site.name}} under {{contractor.legalName}}, on behalf of {{employer.legalName}}, with effect from {{employment.dateOfJoining}}.\n\nYou shall report to the site in-charge of {{site.department}} and carry your identity card at all times.', fields: ['worker.fullName', 'employment.designation', 'employment.skillCategory', 'employment.employmentType', 'site.name', 'contractor.legalName', 'employer.legalName', 'employment.dateOfJoining', 'site.department'], align: 'justify' }),
      wrap(9, { type: 'subheading', title: 'Wages', content: 'D. WAGES DETAIL (per month)', align: 'left', spacing: 'tight' }),
      wrap(10, { type: 'paragraph', title: 'Wage fields', content: 'Basic Wage: {{payroll.basicWage}}   Dearness Allowance: {{payroll.dearnessAllowance}}  \nRetaining Allowance: {{payroll.retainingAllowance}}   Other Components: {{payroll.otherComponents}}  \nGross Monthly Wage: {{payroll.grossMonthlyWage}}', fields: ['payroll.basicWage', 'payroll.dearnessAllowance', 'payroll.retainingAllowance', 'payroll.otherComponents', 'payroll.grossMonthlyWage'], align: 'justify' }),
      wrap(11, { type: 'paragraph', title: 'Social security (E)', content: 'E. SOCIAL SECURITY — You shall be enrolled for applicable statutory benefits (PF/ESIC/LWF) as per law and your EPFO UAN/ESIC IP as declared on the BSS worker profile.', fields: [], align: 'justify' }),
      wrap(12, { type: 'paragraph', title: 'Occupational safety (F)', content: 'F. OCCUPATIONAL SAFETY & HEALTH — You shall follow all safety rules, use the PPE provided, complete site induction, and report any unsafe condition to the site safety officer immediately.', fields: [], align: 'justify' }),
      wrap(13, { type: 'paragraph', title: 'Code of conduct (G)', content: 'G. CODE OF CONDUCT — You shall maintain discipline, follow lawful instructions, protect site property, and not indulge in activities that endanger yourself or co-workers.', fields: [], align: 'justify' }),
      wrap(14, { type: 'paragraph', title: 'Transfer (H)', content: 'H. TRANSFER — Your services may be rotated across departments or work areas of the same site with due notice, consistent with your trade.', fields: [], align: 'justify' }),
      wrap(15, { type: 'paragraph', title: 'Termination (I)', content: 'I. TERMINATION / SEPARATION — Employment may be terminated by either party with notice as per policy and law. On separation you shall be issued an experience letter through the BSS portal.', fields: [], align: 'justify' }),
      wrap(16, { type: 'paragraph', title: 'Grievance redressal (J)', content: 'J. GRIEVANCE REDRESSAL — You may raise any concern through the BSS Grievance module; it will be reviewed by the contractor, principal employer and BSS as applicable.', fields: [], align: 'justify' }),
      wrap(17, { type: 'paragraph', title: 'Declaration (K)', content: 'K. DECLARATION — I accept the above terms of appointment and confirm that the particulars provided by me on the BSS worker profile are true and complete.', fields: [], align: 'justify' }),
      wrap(18, { type: 'signature', title: 'Signatures', content: 'Signatures:', fields: [], editable: false, visible: true }),
    ];
  }
  if (type === 'experience-letter') {
    return [
      wrap(0, { type: 'logo', title: 'Branding / Logo', content: '', editable: false, locked: true }),
      wrap(1, { type: 'heading', title: 'Heading', content: 'EXPERIENCE LETTER', align: 'center' }),
      wrap(2, { type: 'paragraph', title: 'Reference line', content: 'Reference No.: {{document.referenceNumber}}   |   Issue Date: {{document.issueDate}}   |   Place: {{document.place}}', fields: ['document.referenceNumber', 'document.issueDate', 'document.place'] }),
      wrap(3, { type: 'paragraph', title: 'Certification narrative', content: 'This is to certify that {{worker.fullName}} (BSS ID {{worker.bssId}}) successfully worked with {{contractor.legalName}} as {{employment.designation}} in the department of {{employment.department}} at {{site.name}} ({{site.address}}) for {{employer.legalName}} from {{employment.dateOfJoining}} to {{employment.dateOfRelieving}}.\n\nDuring this period {{worker.fullName}} discharged assigned duties diligently. {{document.workDescription}}', fields: ['worker.fullName', 'worker.bssId', 'contractor.legalName', 'employment.designation', 'employment.department', 'site.name', 'site.address', 'employer.legalName', 'employment.dateOfJoining', 'employment.dateOfRelieving', 'document.workDescription'] }),
      wrap(4, { type: 'paragraph', title: 'Closing statement', content: 'We wish {{worker.fullName}} the very best in future endeavours.', fields: ['worker.fullName'] }),
      wrap(5, { type: 'signature', title: 'Signatory', content: 'Signatory:', fields: [], editable: false }),
      wrap(6, { type: 'paragraph', title: 'BSS verification footer', content: 'Verify this certificate by scanning the worker QR on bharatshramsetu.com — reference {{document.number}}.', fields: ['document.number'], align: 'center', spacing: 'tight' }),
    ];
  }
  if (type === 'permanent-gate-pass') {
    return [
      wrap(0, { type: 'logo', title: 'Branding / Logo', content: '', editable: false, locked: true }),
      wrap(1, { type: 'heading', title: 'Card title', content: 'PERMANENT GATE PASS', align: 'center' }),
      wrap(2, { type: 'photo', title: 'Worker photo', content: '{{worker.photo}}', fields: ['worker.photo'], editable: false, locked: true }),
      wrap(3, { type: 'paragraph', title: 'Identity fields', content: 'Name: {{worker.fullName}}   ID: {{worker.bssId}}   Designation: {{employment.designation}}  \nDOB: {{worker.dob}}   Blood Group: {{worker.bloodGroup}}   Emergency Contact: {{worker.emergencyContact}}', fields: ['worker.fullName', 'worker.bssId', 'employment.designation', 'worker.dob', 'worker.bloodGroup', 'worker.emergencyContact'] }),
      wrap(4, { type: 'paragraph', title: 'Org & validity', content: 'Employer: {{employer.legalName}}   Contractor: {{contractor.legalName}}  \nSite: {{site.name}} ({{site.code}}), {{site.address}}  \nValid Up To: {{document.validTo}}   Pass No.: {{document.number}}', fields: ['employer.legalName', 'contractor.legalName', 'site.name', 'site.code', 'site.address', 'document.validTo', 'document.number'] }),
      wrap(5, { type: 'paragraph', title: 'Disclaimer & helpline', content: 'This pass is non-transferable and must be produced on demand. In an emergency call the site safety helpline. Any misuse will lead to withdrawal of site access.', fields: [] }),
      wrap(6, { type: 'signature', title: 'Signatures', content: 'Signatures:', fields: [], editable: false }),
    ];
  }
  // temporary-gate-pass
  return [
    wrap(0, { type: 'logo', title: 'Branding / Logo', content: '', editable: false, locked: true }),
    wrap(1, { type: 'heading', title: 'Heading', content: 'TEMPORARY GATE PASS', align: 'center' }),
    wrap(2, { type: 'paragraph', title: 'Addressee', content: 'To,\nThe Chief Security Officer,\n{{site.name}}, {{site.address}}', fields: ['site.name', 'site.address'] }),
    wrap(3, { type: 'paragraph', title: 'Subject', content: 'Subject: Temporary site access — {{worker.fullName}} for {{employment.designation}} work at {{site.workArea}}', fields: ['worker.fullName', 'employment.designation', 'site.workArea'] }),
    wrap(4, { type: 'paragraph', title: 'Body & dates', content: 'Sir,\nPlease allow {{worker.fullName}} ({{worker.bssId}}), engaged by {{contractor.legalName}} against order/PO {{document.referenceNumber}}, to enter {{site.name}} work area {{site.workArea}} for {{document.days}} day(s) w.e.f. {{document.validFrom}} to {{document.validTo}}.\nReason: {{document.reason}}', fields: ['worker.fullName', 'worker.bssId', 'contractor.legalName', 'document.referenceNumber', 'site.name', 'site.workArea', 'document.days', 'document.validFrom', 'document.validTo', 'document.reason'] }),
    wrap(5, { type: 'table', title: 'Worker list', content: 'Workers covered by this pass:', fields: [], tableColumns: [{ key: 'worker.fullName', header: 'Name' }, { key: 'worker.bssId', header: 'BSS ID' }, { key: 'worker.dob', header: 'DOB / Age' }, { key: 'worker.permanentAddress', header: 'Address' }] }),
    wrap(6, { type: 'paragraph', title: 'Declaration & place/date', content: 'Declaration: The details above are true and the workers will abide by site rules.  \nPass No.: {{document.number}}    Place: {{document.place}}    Date: {{document.issueDate}}', fields: ['document.number', 'document.place', 'document.issueDate'] }),
    wrap(7, { type: 'signature', title: 'Signatures', content: 'Signatures:', fields: [], editable: false }),
  ];
};

export const DEFAULT_NUMBERING: Record<DocumentType, string> = {
  'appointment-letter': 'BSS/APPT/{{year}}/{{sequence}}',
  'experience-letter': 'BSS/EXP/{{year}}/{{sequence}}',
  'permanent-gate-pass': 'PGP/{{siteCode}}/{{sequence}}',
  'temporary-gate-pass': 'TGP/{{siteCode}}/{{year}}/{{sequence}}',
};

export const DEFAULT_SIGNATORIES: Record<DocumentType, SignatureRole[]> = {
  'appointment-letter': ['Worker', 'Contractor', 'Principal Employer'],
  'experience-letter': ['Contractor', 'Authorized Signatory'],
  'permanent-gate-pass': ['Contractor', 'Principal Employer', 'Site In-charge'],
  'temporary-gate-pass': ['Contractor', 'HOD', 'HR Head', 'CSO'],
};

export function makeDefaultTemplate(owner: OwnerScope, type: DocumentType, createdBy = 'System'): TemplateConfig {
  const version = 'v1';
  return {
    id: uid('tpl-'),
    documentType: type,
    ownerType: owner.ownerType,
    ownerId: owner.ownerId,
    ownerName: owner.ownerName,
    name: `${docTypeLabel(type)} Template`,
    version,
    status: 'Active',
    description: `Default ${docTypeLabel(type).toLowerCase()} template for ${owner.ownerName}.`,
    pageFormat: docTypeFormat(type),
    sections: DEFAULT_SECTIONS(type),
    styles: { ...EMPTY_STYLES },
    variables: [],
    signatories: DEFAULT_SIGNATORIES[type],
    numberingPattern: DEFAULT_NUMBERING[type],
    createdBy,
    updatedAt: nowIso(),
  };
}

// ---------------------------------------------------------------- template service
type TemplateRecord = TemplateVersionRecord;

export const templateService = {
  key: TEMPLATE_KEY,

  all(): TemplateRecord[] {
    return TEMPLATE_CACHE;
  },

  /** Load this owner's templates from the server into the cache (once per session). */
  async hydrate(owner: OwnerScope): Promise<void> {
    if (typeof window === 'undefined') return;
    const key = ownerKey(owner.ownerType, owner.ownerId);
    if (hydratedOwners.has(key)) return;
    try {
      const response = await fetch(`/api/document-templates?ownerType=${encodeURIComponent(owner.ownerType)}&ownerId=${encodeURIComponent(owner.ownerId)}`, { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json().catch(() => null);
      const records: TemplateRecord[] = Array.isArray(payload?.data?.records) ? payload.data.records : [];
      TEMPLATE_CACHE = [
        ...TEMPLATE_CACHE.filter(record => ownerKey(record.template.ownerType, record.template.ownerId) !== key),
        ...records,
      ];
      hydratedOwners.add(key);
    } catch { /* leave un-hydrated; a later call retries */ }
  },

  persist(records: TemplateRecord[]) {
    TEMPLATE_CACHE = records;
    if (typeof window === 'undefined') return;
    // Fire-and-forget per owner; the cache is already updated so the UI is instant.
    for (const { ownerType, ownerId, list } of groupByOwner(records)) {
      void fetch('/api/document-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerType, ownerId, records: list }),
      }).catch(() => { /* offline — the next save retries with the full set */ });
    }
  },

  seedFor(owner: OwnerScope, createdBy = 'Admin') {
    const existing = this.all();
    const types: DocumentType[] = documentTypesFor(owner.ownerType).map(item => item.id);
    const missing = types.filter(type => !existing.some(record => record.template.ownerType === owner.ownerType && record.template.ownerId === owner.ownerId && record.template.documentType === type));
    if (!missing.length) return this.all();
    const seeds: TemplateRecord[] = missing.map(type => {
      const template = makeDefaultTemplate(owner, type, createdBy);
      return { id: uid('ver-'), templateId: template.id, template, createdBy, createdAt: nowIso(), note: 'Default template (seeded)', active: true };
    });
    this.persist([...existing, ...seeds]);
    return this.all();
  },

  lineages(owner: OwnerScope): Array<{ lineageId: string; name: string; documentType: DocumentType; status: TemplateStatus; version: string; updatedAt: string; updatedBy: string; activeId?: string }> {
    const ownerRecords = this.all().filter(record => record.template.ownerType === owner.ownerType && record.template.ownerId === owner.ownerId);
    const byLineage = new Map<string, TemplateRecord[]>();
    ownerRecords.forEach(record => {
      const list = byLineage.get(record.templateId) ?? [];
      list.push(record);
      byLineage.set(record.templateId, list);
    });
    return [...byLineage.entries()].map(([lineageId, records]) => {
      records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latest = records[0];
      const active = records.find(record => record.active) ?? latest;
      return {
        lineageId,
        name: latest.template.name,
        documentType: latest.template.documentType,
        status: active ? (active.template.status === 'Active' ? 'Active' : active.template.status) : 'Draft',
        version: active ? active.template.version : latest.template.version,
        updatedAt: active?.createdAt ?? latest.createdAt,
        updatedBy: active?.createdBy ?? latest.createdBy,
        activeId: active?.id,
      };
    });
  },

  activeFor(owner: OwnerScope, type: DocumentType): TemplateConfig | null {
    const record = this.all().find(item => item.active && item.template.ownerType === owner.ownerType && item.template.ownerId === owner.ownerId && item.template.documentType === type);
    return record ? record.template : null;
  },

  versions(lineageId: string): TemplateRecord[] {
    return this.all().filter(record => record.templateId === lineageId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /** The version the designer should open: newest saved Draft, else the Active version, else newest. */
  editingVersion(lineageId: string): TemplateRecord | null {
    const versions = this.versions(lineageId);
    return versions.find(record => !record.active && record.template.status === 'Draft')
      ?? versions.find(record => record.active)
      ?? versions[0]
      ?? null;
  },

  getById(recordId: string): TemplateRecord | null {
    return this.all().find(record => record.id === recordId) ?? null;
  },

  saveRecord(record: TemplateRecord) {
    const existing = this.all();
    const index = existing.findIndex(item => item.id === record.id);
    const next = [...existing];
    if (index >= 0) next[index] = record; else next.push(record);
    this.persist(next);
  },

  /** Edit content of a non-active (draft) or create a Draft vN+1 from active version. */
  saveTemplate(owner: OwnerScope, type: DocumentType, lineageId: string | null, patch: Partial<TemplateConfig>, createdBy: string, note: string): { record: TemplateRecord; isNew: boolean } {
    const existing = this.all();
    const lineage = lineageId ?? existing.find(record => record.template.ownerType === owner.ownerType && record.template.ownerId === owner.ownerId && record.template.documentType === type)?.templateId;
    let base: TemplateConfig;
    if (lineage && !patch.id) {
      const source = existing.find(record => record.templateId === lineage)?.template;
      base = source ? { ...source, ...patch } : makeDefaultTemplate(owner, type, createdBy);
    } else {
      base = patch.id && existing.find(record => record.id === patch.id)?.template
        ? { ...existing.find(record => record.id === patch.id)!.template, ...patch }
        : { ...makeDefaultTemplate(owner, type, createdBy), ...patch };
    }
    const versionNumber = lineage ? this.versions(lineage).length + 1 : 1;
    const template: TemplateConfig = {
      ...base,
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      ownerName: owner.ownerName,
      version: `v${versionNumber}`,
      status: 'Draft',
      updatedAt: nowIso(),
      createdBy,
    };
    const record: TemplateRecord = { id: uid('ver-'), templateId: template.id, template, createdBy, createdAt: nowIso(), note, active: false };
    this.persist([...existing, record]);
    return { record, isNew: true };
  },

  updateDraft(owner: OwnerScope, recordId: string, patch: Partial<TemplateConfig>, createdBy: string) {
    const record = this.getById(recordId);
    if (!record) return;
    if (record.template.status === 'Active' || record.active) {
      // Editing an ACTIVE template forks a Draft vN+1 — historical versions are untouched.
      const forked = this.saveTemplate(owner, record.template.documentType, record.templateId, { ...record.template, ...patch, id: record.template.id }, createdBy, 'Edited copy of ' + record.template.version);
      return forked.record;
    }
    const nextRecord = { ...record, template: { ...record.template, ...patch, updatedAt: nowIso(), createdBy }, createdBy, createdAt: nowIso() };
    this.saveRecord(nextRecord);
    return nextRecord;
  },

  activate(owner: OwnerScope, _lineageId: string, recordId: string, by: string) {
    const target = this.getById(recordId);
    if (!target) return;
    const docType = target.template.documentType;
    const next = this.all().map(record => {
      const sameScope = record.template.ownerType === owner.ownerType && record.template.ownerId === owner.ownerId && record.template.documentType === docType;
      if (!sameScope) return record;
      if (record.id === recordId) {
        return { ...record, active: true, template: { ...record.template, status: 'Active' as TemplateStatus, updatedAt: nowIso() }, createdBy: by, createdAt: nowIso() };
      }
      // Only one version may be Active per document type — demote the rest.
      const status: TemplateStatus = record.template.status === 'Active' ? 'Inactive' : record.template.status;
      return { ...record, active: false, template: { ...record.template, status } };
    });
    this.persist(next);
  },

  setStatus(recordId: string, status: TemplateStatus, by: string, note = '') {
    const record = this.getById(recordId);
    if (!record) return;
    this.saveRecord({ ...record, template: { ...record.template, status, updatedAt: nowIso() }, createdBy: by, createdAt: nowIso(), note: note || record.note });
  },

  duplicate(lineageId: string, by: string): TemplateRecord {
    const source = this.versions(lineageId)[0];
    if (!source) throw new Error('Template not found.');
    const copied: TemplateConfig = { ...source.template, id: uid('tpl-'), name: `${source.template.name} (Copy)`, version: 'v1', status: 'Draft', updatedAt: nowIso(), createdBy: by };
    const record: TemplateRecord = { id: uid('ver-'), templateId: copied.id, template: copied, createdBy: by, createdAt: nowIso(), note: `Duplicate of ${source.template.version}`, active: false };
    this.persist([...this.all(), record]);
    return record;
  },

  restore(lineageId: string, fromRecordId: string, by: string): TemplateRecord {
    const source = this.getById(fromRecordId);
    if (!source) throw new Error('Version not found.');
    const versions = this.versions(lineageId).length + 1;
    const restored: TemplateConfig = { ...source.template, id: uid('tpl-'), version: `v${versions}`, status: 'Draft', updatedAt: nowIso(), createdBy: by, sourceVersionId: source.template.version };
    const record: TemplateRecord = { id: uid('ver-'), templateId: source.templateId, template: restored, createdBy: by, createdAt: nowIso(), note: `Restored from ${source.template.version}`, active: false };
    this.persist([...this.all(), record]);
    return record;
  },

  resetForTesting(owner: OwnerScope) {
    const rest = this.all().filter(record => !(record.template.ownerType === owner.ownerType && record.template.ownerId === owner.ownerId));
    this.persist(rest);
    return this.seedFor(owner, 'Admin');
  },
};

// ---------------------------------------------------------------- document service
export function nextSequence(ownerKey: string, type: DocumentType, seed = 1): number {
  const history = documentService.list().filter(item => item.workerId && item.documentType === type);
  return Math.max(seed, history.length + 1);
}

export const documentService = {
  key: INSTANCE_KEY,
  all(): GeneratedDocument[] {
    return readJson<GeneratedDocument[]>(INSTANCE_KEY, []);
  },
  persist(items: GeneratedDocument[]) {
    writeJson(INSTANCE_KEY, items);
  },
  list(): GeneratedDocument[] {
    return this.all();
  },
  forWorker(workerId: string, ownerKey?: string): GeneratedDocument[] {
    return this.all().filter(item => item.workerId === workerId && (!ownerKey || `${item.generatedByRole}|${item.employerId ?? ''}|${item.contractorId ?? ''}`.includes(ownerKey.split('|')[0]))).sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  },
  listByOwner(ownerType: 'contractor' | 'employer', ownerId?: string): GeneratedDocument[] {
    return this.all().filter(item => item.generatedByRole === ownerType && (!ownerId || item.contractorId === ownerId || item.employerId === ownerId));
  },
  get(id: string): GeneratedDocument | null {
    return this.all().find(item => item.id === id) ?? null;
  },
  upsert(document: GeneratedDocument) {
    const list = this.all();
    const index = list.findIndex(item => item.id === document.id);
    const next = [...list];
    if (index >= 0) next[index] = document; else next.unshift(document);
    this.persist(next);
    return document;
  },
};

export function renderNumbering(pattern: string, values: Record<string, string>, sequence: number): string {
  const map: Record<string, string> = {
    ...values,
    year: String(new Date().getFullYear()),
    sequence: String(sequence).padStart(4, '0'),
    siteCode: (values['site.code'] ?? 'SITE').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 12) || 'SITE',
  };
  return pattern.replace(TOKEN_PATTERN, (_match, key: string) => map[key] ?? '');
}
