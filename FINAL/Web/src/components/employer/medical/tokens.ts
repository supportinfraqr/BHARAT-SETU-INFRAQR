/** Token dictionary for the medical form.

 *  System tokens are resolved from the worker / exam / tests / site DB when a
 *  certificate is generated. Custom tokens (`{{custom.<key>}}`) are NOT known to
 *  the system — the Medical Officer is asked for them when recording the exam.
 *  Nothing here is tied to a specific form layout; the tokens live in the HTML. */

export type TokenCategory = 'Worker' | 'Exam' | 'Test' | 'Site' | 'System';

export type TokenDef = {
  token: string;
  label: string;
  category: TokenCategory;
  /** Where the value comes from (DB field or "Medical form input"). */
  source: string;
  example: string;
};

const ph = '…………';

export const SYSTEM_TOKENS: TokenDef[] = [
  // Worker / self
  { token: 'self.name', label: 'Worker name', category: 'Worker', source: 'DB · worker.name', example: 'Ramesh Kumar' },
  { token: 'self.bssId', label: 'Worker BSS ID', category: 'Worker', source: 'DB · worker.bss_worker_id', example: 'BSSW328JR7MC3H7' },
  { token: 'self.aadhaar', label: 'Aadhaar (masked)', category: 'Worker', source: 'DB · worker.aadhaar', example: 'XXXX XXXX 1234' },
  { token: 'self.mobile', label: 'Mobile', category: 'Worker', source: 'DB · worker.mobile', example: '+91 98765 43210' },
  { token: 'self.dob', label: 'Date of birth', category: 'Worker', source: 'DB · worker.dob', example: '12/04/1990' },
  { token: 'self.age', label: 'Age', category: 'Worker', source: 'DB · computed from DOB', example: '34 yrs' },
  { token: 'self.age_dob', label: 'Age + DOB', category: 'Worker', source: 'DB · computed from DOB', example: '34 yrs (DOB 12/04/1990)' },
  { token: 'self.gender', label: 'Gender', category: 'Worker', source: 'DB · worker.gender', example: 'Male' },
  { token: 'self.address', label: 'Address', category: 'Worker', source: 'DB · worker.address', example: 'Sector 62, Noida' },
  { token: 'self.email', label: 'Email', category: 'Worker', source: 'DB · worker.email', example: 'worker@example.com' },
  { token: 'self.company', label: 'Company / contractor', category: 'Worker', source: 'DB · employer / contractor', example: 'InfraQR Solutions LLP' },
  { token: 'self.designation', label: 'Designation', category: 'Worker', source: 'DB · worker.designation', example: 'Mason' },
  { token: 'self.department', label: 'Department', category: 'Worker', source: 'DB · worker.department', example: 'Production' },
  { token: 'self.role', label: 'Role', category: 'Worker', source: 'DB · worker.role', example: 'Mason' },
  { token: 'self.uan', label: 'UAN', category: 'Worker', source: 'DB · social_security.epfo_uan', example: '101234567890' },
  // Exam
  { token: 'exam.certNo', label: 'Certificate number', category: 'Exam', source: 'DB · auto-generated', example: 'MED/2026/ABC123' },
  { token: 'exam.date', label: 'Examination date', category: 'Exam', source: 'DB · exam.exam_date', example: '17/10/2026' },
  { token: 'exam.fitness', label: 'Fitness verdict', category: 'Exam', source: 'DB · exam.overall', example: 'Fit' },
  { token: 'exam.doctor', label: 'Examining doctor (name · reg · hospital)', category: 'Exam', source: 'DB · exam.doctor', example: 'Dr. A. K. Sharma · MCI-12345' },
  { token: 'exam.nextDue', label: 'Next examination due', category: 'Exam', source: 'DB · exam.next_due', example: '17/10/2027' },
  { token: 'exam.remarks', label: 'Medical remarks', category: 'Exam', source: 'DB · exam.remarks', example: 'No abnormality detected' },
  { token: 'exam.diagnosis', label: 'Diagnosis / fitness statement', category: 'Exam', source: 'DB · computed', example: 'Medically FIT for Mason' },
  { token: 'exam.incharge', label: 'Employer in-charge', category: 'Exam', source: 'DB · exam.part_a.incharge', example: 'Site Safety Officer' },
  { token: 'exam.illness', label: 'Current illness / medication', category: 'Exam', source: 'DB · exam.part_a.illness', example: 'None reported' },
  { token: 'exam.nature', label: 'Nature of job', category: 'Exam', source: 'DB · exam.part_a.nature', example: 'Physical' },
  { token: 'exam.others', label: 'Other test results', category: 'Exam', source: 'DB · exam.tests (custom)', example: 'Allergy: Dust' },
  { token: 'exam.seizure', label: 'Seizure / height-work flag', category: 'Exam', source: 'DB · exam.height_work', example: 'No' },
  { token: 'exam.otherAbnormality', label: 'Abnormal test names', category: 'Exam', source: 'DB · computed', example: 'BP, ECG' },
  // Site / system
  { token: 'site.name', label: 'Site name', category: 'Site', source: 'DB · site.site_name', example: 'Noida' },
  { token: 'site.location', label: 'Site location', category: 'Site', source: 'DB · site.location', example: 'Noida, Uttar Pradesh' },
  { token: 'state', label: 'State / jurisdiction', category: 'System', source: 'DB · form state', example: 'Uttar Pradesh' },
  { token: 'version', label: 'Form version', category: 'System', source: 'DB · template version', example: '2' },
];

/** Common test tokens (any `test.<key>` present in the HTML is also valid). */
export const TEST_TOKENS: TokenDef[] = [
  'height', 'weight', 'chest', 'waist', 'bmi', 'vision', 'colour', 'bp', 'pulse',
  'cbc', 'fbs', 'ppbs', 'spo2', 'urea', 'creatinine', 'bilirubin', 'sgot', 'sgpt',
  'lipid', 'tsh', 'xray', 'ecg', 'audiometry',
].map(key => ({
  token: `test.${key}`,
  label: `${humanLabel(key)} result`,
  category: 'Test' as TokenCategory,
  source: 'Medical form input · test result',
  example: key === 'height' ? '172' : key === 'bp' ? '120/80' : ph,
}));

/** Special split test tokens. */
export const TEST_SPLIT_TOKENS: TokenDef[] = [
  { token: 'test.chest.insp', label: 'Chest inspiration', category: 'Test', source: 'Medical form input · test result', example: '90' },
  { token: 'test.chest.exp', label: 'Chest expiration', category: 'Test', source: 'Medical form input · test result', example: '92' },
  { token: 'test.vision.right', label: 'Vision — right eye', category: 'Test', source: 'Medical form input · test result', example: '6/6' },
  { token: 'test.vision.left', label: 'Vision — left eye', category: 'Test', source: 'Medical form input · test result', example: '6/9' },
  { token: 'test.audiometry.right', label: 'Hearing — right ear', category: 'Test', source: 'Medical form input · test result', example: 'Normal' },
  { token: 'test.audiometry.left', label: 'Hearing — left ear', category: 'Test', source: 'Medical form input · test result', example: 'Normal' },
];

export const ALL_SYSTEM_TOKENS: TokenDef[] = [...SYSTEM_TOKENS, ...TEST_TOKENS, ...TEST_SPLIT_TOKENS];

export const TOKEN_PLACEHOLDER = ph;

export function humanLabel(key: string): string {
  return key.replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

export type CustomToken = { key: string; label: string; token: string };

/** Every `{{custom.<key>}}` (or `{{custom.<key>|Label}}`) in the HTML. */
export function customTokens(html: string): CustomToken[] {
  const out: CustomToken[] = [];
  const seen = new Set<string>();
  for (const m of (html || '').matchAll(/\{\{\s*custom\.([A-Za-z0-9_]+)\s*(?:\|\s*([^}]+?))?\s*\}\}/g)) {
    const key = m[1];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, label: (m[2] || humanLabel(key)).trim(), token: `custom.${key}` });
  }
  return out;
}

/** Base test keys referenced by `{{test.<key>}}` in the HTML. */
export function testTokens(html: string): string[] {
  const out: string[] = [];
  for (const m of (html || '').matchAll(/\{\{\s*test\.([A-Za-z0-9_]+)(?:\.[A-Za-z0-9_]+)?\s*\}\}/g)) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/** Replace every token with its blank placeholder so the studio shows the form
 *  as it looks before values are recorded. */
export function previewPlaceholders(html: string): string {
  const map = new Map(ALL_SYSTEM_TOKENS.map(t => [t.token, ph]));
  return (html || '').replace(/\{\{\s*([A-Za-z0-9_.]+)\s*(?:\|[^}]*)?\}\}/g, (_m, key: string) => map.get(key) ?? ph);
}

export function tokenDictionaryRows(html: string): Array<{ type: 'System' | 'Custom'; token: string; label: string; source: string; example: string }> {
  const system = ALL_SYSTEM_TOKENS.map(t => ({ type: 'System' as const, token: t.token, label: t.label, source: t.source, example: t.example }));
  const custom = customTokens(html).map(t => ({ type: 'Custom' as const, token: t.token, label: t.label, source: 'Medical form input (optional)', example: t.label }));
  return [...system, ...custom];
}

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One self-contained HTML document listing every token — hand it to GPT when
 *  authoring a new medical form. */
export function buildTokenDictionaryHtml(html: string, title = 'Medical form — token dictionary'): string {
  const rows = tokenDictionaryRows(html);
  const tr = rows.map(r => `<tr><td><span class="t ${r.type.toLowerCase()}">${r.type}</span></td><td><code>{{${esc(r.token)}}}</code></td><td>${esc(r.label)}</td><td>${esc(r.source)}</td><td>${esc(r.example)}</td></tr>`).join('');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  body{margin:0;background:#eef2f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a}
  .page{max-width:1000px;margin:24px auto;background:#fff;padding:28px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  h1{font-size:20px;margin:0;color:#01183A}h2{font-size:13px;margin:22px 0 8px;color:#01183A;text-transform:uppercase;letter-spacing:.06em}
  p{font-size:12px;color:#475569;line-height:1.6}
  table{width:100%;border-collapse:collapse;font-size:11.5px}th{background:#F2F6FC;text-align:left;color:#01183A;font-size:10px;text-transform:uppercase;letter-spacing:.04em;padding:7px 8px}
  td{border:1px solid #DBE3EF;padding:6px 8px;vertical-align:top}code{font-family:"Courier New",monospace;font-size:11px;color:#0b2a6b}
  .t{display:inline-block;padding:1px 6px;border-radius:999px;font-size:9px;font-weight:800;text-transform:uppercase}
  .t.system{background:#EAF5EE;color:#14843C}.t.custom{background:#FDF0EA;color:#C94D18}
  .note{background:#F2F6FC;border:1px solid #DBE3EF;border-radius:10px;padding:12px;font-size:11.5px;color:#334155;margin-top:14px}
  </style></head><body><div class="page">
  <h1>${esc(title)}</h1>
  <p>Use these tokens inside the form HTML. <b>System</b> tokens are filled automatically from the database when the certificate is generated. <b>Custom</b> tokens are asked from the Medical Officer while recording the examination (optional).</p>
  <p>Example: <code>&lt;span class="f"&gt;{{self.name}}&lt;/span&gt;</code> prints the worker's name; <code>&lt;span class="f"&gt;{{custom.item_name}}&lt;/span&gt;</code> asks for “Item Name”.</p>
  <table><thead><tr><th>Type</th><th>Token</th><th>Description</th><th>Filled from</th><th>Example</th></tr></thead><tbody>${tr}</tbody></table>
  <div class="note">Only <b>Custom</b> tokens create inputs in the medical form. To set a custom label use <code>{{custom.key|Your label}}</code>. Every <code>test.&lt;key&gt;</code> token in the HTML creates a test input row automatically.</div>
  </div></body></html>`;
}
