import { TemplateConfig, TemplateSection } from './types';
import { TOKEN_PATTERN } from './tokens';

// Theme colours consistent with the BSS portal.
const THEME_COLORS: Record<string, { primary: string; accent: string; light: string }> = {
  'bss-navy': { primary: '#0A192F', accent: '#F47A32', light: '#F0F4FA' },
  'bss-midnight': { primary: '#073B67', accent: '#2F9E67', light: '#EAF2FA' },
  'bss-green': { primary: '#0F5132', accent: '#F47A32', light: '#EAF6EF' },
  'bss-plain': { primary: '#111827', accent: '#2563EB', light: '#F3F4F6' },
};

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Replace tokens with resolved values; unresolved tokens render as readable chips. */
function smartContent(content: string, tokens: Record<string, string>): string {
  let out = '';
  let last = 0;
  for (const match of content.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    out += content.slice(last, index);
    const key = match[1];
    const value = tokens[key];
    if (value === '[[PHOTO]]') out += '[[PHOTO]]';
    else if (value !== undefined && value !== '' && value !== '—') out += esc(value);
    else out += `<span class="doc-token-empty">\{\{${esc(key)}\}\}</span>`;
    last = index + match[0].length;
  }
  out += content.slice(last);
  return out.replace(/\n/g, '<br/>');
}

function renderPhotoBlock() {
  return `<img src="/worker-profile.png" alt="Worker photo" class="doc-photo"/>`;
}

function sectionHtml(section: TemplateSection, tokens: Record<string, string>, workerRows?: Array<Record<string, string>>): string {
  if (section.type === 'logo') return '';
  if (section.type === 'heading') return `<h1 class="doc-heading">${smartContent(section.content, tokens)}</h1>`;
  if (section.type === 'subheading') return `<h3 class="doc-subheading">${smartContent(section.content, tokens)}</h3>`;
  if (section.type === 'photo') return `<div class="doc-photo-row">${renderPhotoBlock()}</div>`;
  if (section.type === 'divider') return '<hr class="doc-divider"/>';
  if (section.type === 'table') {
    const columns = section.tableColumns ?? [{ key: 'worker.fullName', header: 'Name' }];
    const rows = workerRows && workerRows.length ? workerRows : [tokens];
    const header = `<thead><tr>${columns.map(col => `<th>${esc(col.header)}</th>`).join('')}</tr></thead>`;
    const bodyRows = rows.map(row => {
      const cells = columns.map(col => {
        const raw = row[col.key];
        return `<td>${raw !== undefined && raw !== '' ? esc(raw) : `<span class="doc-token-empty">\{\{${esc(col.key)}\}\}</span>`}</td>`;
      });
      return `<tr>${cells.join('')}</tr>`;
    });
    return `<div class="doc-table-wrap"><table class="doc-table">${header}<tbody>${bodyRows.join('')}</tbody></table>${rows.length > 1 && !workerRows ? `<p class="doc-muted">${rows.length} worker(s)</p>` : ''}</div>`;
  }
  if (section.type === 'signature') return '';
  const resolved = smartContent(section.content, tokens).split('[[PHOTO]]');
  return `<div class="doc-body">${resolved.map((part, index) => `${part}${index < resolved.length - 1 ? renderPhotoBlock() : ''}`).join('')}</div>`;
}

export type RenderTarget = { template: TemplateConfig; tokens: Record<string, string>; workerRows?: Array<Record<string, string>> };

function cssFor(template: TemplateConfig): string {
  const colors = THEME_COLORS[template.styles.theme] ?? THEME_COLORS['bss-navy'];
  const fontSize = template.styles.fontSize || 12;
  const isGateCard = template.pageFormat === 'PGP';
  return `
  @page { size: ${isGateCard ? '85.6mm 53.98mm landscape' : 'A4 portrait'}; margin: ${isGateCard ? '0' : '12mm 14mm'}; }
  * { box-sizing: border-box; }
  body { margin:0; background:#fff; font-family: ${template.styles.fontFamily}; color:#111827; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .doc-page { width:794px; margin:0 auto; padding: ${isGateCard ? '0' : '8px 4px 16px'}; position:relative; }
  .doc-logo-row { display:flex; align-items:center; gap:12px; border-bottom:3px solid ${colors.primary}; padding:0 0 10px; margin-bottom:10px; }
  .doc-logo { height:36px; width:auto; }
  .doc-brand strong { display:block; color:${colors.primary}; font-size:17px; letter-spacing:.3px; }
  .doc-brand span { font-size:9px; color:#6b7280; letter-spacing:1.6px; text-transform:uppercase; }
  .doc-heading { text-align:center; color:${colors.primary}; font-size:${fontSize + 5}px; margin:12px 0 8px; letter-spacing:1.4px; border-bottom:2px double ${colors.accent}; padding-bottom:7px; text-transform:uppercase; }
  .doc-subheading { color:${colors.primary}; font-size:${fontSize + 1}px; margin:14px 0 5px; border-bottom:1px solid #d1d5db; padding-bottom:4px; font-weight:700; }
  .doc-body { font-size:${fontSize}px; line-height:1.6; text-align:justify; }
  .doc-body p { margin:0 0 8px; }
  .doc-photo-row { text-align:left; margin:6px 0; }
  .doc-photo { width:96px; height:116px; object-fit:cover; border:2px solid #d7dde5; border-radius:6px; }
  .doc-divider { border:0; border-top:1px dashed #cbd5e1; margin:12px 0; }
  .doc-table-wrap { margin:10px 0; }
  .doc-table { width:100%; border-collapse:collapse; font-size:${fontSize - 1}px; }
  .doc-table th, .doc-table td { border:1px solid #9aa4b2; padding:5px 8px; text-align:left; vertical-align:top; }
  .doc-table th { background:${colors.light}; color:${colors.primary}; }
  .doc-token-empty { background:#fff3e0; color:#b45309; border:1px dashed #f59e0b; border-radius:4px; padding:0 4px; font-size:${fontSize - 2}px; font-family: monospace; }
  .doc-muted { font-size:${fontSize - 3}px; color:#6b7280; margin-top:4px; }
  .doc-signature-grid { display:flex; gap:44px; justify-content:space-between; margin:40px 10px 4px; }
  .doc-signature-grid > div { width:210px; text-align:center; }
  .doc-signature-line { border-top:1px solid #4b5563; margin-top:32px; padding-top:5px; font-size:${fontSize - 1}px; color:#111827; font-weight:600; min-height:18px; }
  .doc-signature-grid p { font-size:${fontSize - 3}px; color:#6b7280; margin:5px 0 0; text-transform:uppercase; letter-spacing:.6px; }
  .doc-footer { font-size:9px; color:#6b7280; text-align:center; margin-top:16px; border-top:1px solid #e5e7eb; padding-top:6px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;
}

/** Standalone printable HTML — used by preview (srcdoc), print and print-to-PDF flows. */
export function renderDocumentHtml(target: RenderTarget): string {
  const { template, tokens, workerRows } = target;
  const sections = [...template.sections].sort((a, b) => a.order - b.order);
  const visible = sections.filter(section => section.visible);
  const signatureSection = visible.find(section => section.type === 'signature');

  const roleValue = (role: string): string => {
    const map: Record<string, string> = {
      Worker: 'worker.fullName',
      Contractor: 'signatory.contractor',
      'Principal Employer': 'signatory.employer',
      HOD: 'signatory.hod',
      'HR Head': 'signatory.hrHead',
      CSO: 'signatory.cso',
      'Authorized Signatory': 'signatory.authorized',
      'Site In-charge': 'signatory.authorized',
      'Medical Officer': '',
    };
    const key = map[role] ?? '';
    const value = tokens[key];
    return value !== undefined && value !== '' && value !== '—' ? value : '';
  };
  const signHtml = signatureSection
    ? `<div class="doc-signature-grid">${template.signatories.map(role => `<div><div class="doc-signature-line">${esc(roleValue(role))}</div><p>${esc(role)}</p></div>`).join('')}</div>`
    : '';

  const headingMeta = template.styles.showBrandHeader
    ? `<div class="doc-logo-row">${template.styles.showLogo ? '<img src="/bss-original-logo.png" alt="logo" class="doc-logo"/>' : ''}<div class="doc-brand"><strong>${esc(template.styles.brandHeaderText || 'Bharat Shram Setu')}</strong><span>One Worker · One Identity · One Future</span></div></div>`
    : '';

  const body = visible
    .filter(section => section.type !== 'signature' && section.type !== 'logo')
    .map(section => sectionHtml(section, tokens, workerRows))
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(template.name)}</title><style>${cssFor(template)}</style></head><body><div class="doc-page">${headingMeta}${body}${signHtml}<div class="doc-footer">${esc(template.styles.footerText)}</div></div></body></html>`;
}

/** Open a clean printable window (browser print dialog → printer or "Save as PDF"). */
export function openPrintHtml(html: string, title = 'Document') {
  const win = window.open('', '_blank', 'width=980,height=1200');
  if (!win) {
    const hidden = document.createElement('iframe');
    hidden.style.position = 'fixed';
    hidden.style.right = '0';
    hidden.style.bottom = '0';
    hidden.style.width = '0';
    hidden.style.height = '0';
    hidden.style.border = '0';
    document.body.appendChild(hidden);
    const doc = hidden.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(html); doc.close();
      setTimeout(() => { hidden.contentWindow?.print(); setTimeout(() => hidden.remove(), 2000); }, 450);
    }
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.document.title = title;
  setTimeout(() => { try { win.focus(); win.print(); } catch { /* blocked */ } }, 500);
}
