import { TemplateConfig, TemplateSection, isGatePassType } from './types';
import { TOKEN_PATTERN } from './tokens';

// Theme colours consistent with the BSS portal.
const THEME_COLORS: Record<string, { primary: string; accent: string; light: string }> = {
  'bss-navy': { primary: '#0A192F', accent: '#F47A32', light: '#F0F4FA' },
  'bss-midnight': { primary: '#073B67', accent: '#2F9E67', light: '#EAF2FA' },
  'bss-green': { primary: '#0F5132', accent: '#F47A32', light: '#EAF6EF' },
  'bss-red': { primary: '#B91C1C', accent: '#DC2626', light: '#FEF2F2' },
  'bss-plain': { primary: '#111827', accent: '#2563EB', light: '#F3F4F6' },
};

function esc(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    else if (typeof value === 'string' && value.startsWith('data:image/')) out += `<img class="doc-qr" src="${value}" alt="QR"/>`;
    else if (value !== undefined && value !== '' && value !== '—') out += esc(value);
    else out += '<span class="doc-value-na">NA</span>';
    last = index + match[0].length;
  }
  out += content.slice(last);
  // Field labels ("Name:", "DOB:", "Issue Date:") are always bold.
  return out
    .replace(/\n/g, '<br/>')
    .replace(/(^|<br\/>| {2,})([A-Z][A-Za-z0-9 &/.'’-]{0,28}):/g, '$1<strong>$2:</strong>');
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
        return `<td>${raw !== undefined && raw !== '' ? esc(raw) : '<span class="doc-value-na">NA</span>'}</td>`;
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
  // Gate passes expose a single "text colour" control for the body; headings
  // always take the pass colour (green for permanent, red for temporary) and
  // stay bold regardless of that choice.
  const gatePass = isGatePassType(template.documentType);
  const textColor = gatePass ? (template.styles.headingColor || '#111827') : '#111827';
  // The pass title is strictly green (permanent) / red (temporary), regardless
  // of the saved template theme.
  const gatePassHeading = template.documentType === 'permanent-gate-pass' ? '#15803D'
    : template.documentType === 'temporary-gate-pass' ? '#B91C1C'
    : null;
  const headingColor = gatePassHeading ?? colors.primary;
  return `
  @page { size: ${isGateCard ? '85.6mm 53.98mm landscape' : 'A4 portrait'}; margin: ${isGateCard ? '0' : '12mm 14mm'}; }
  * { box-sizing: border-box; }
  body { margin:0; background:#fff; font-family: ${template.styles.fontFamily}; color:${textColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .doc-page { width:794px; margin:0 auto; padding: ${isGateCard ? '0' : '8px 4px 16px'}; position:relative; }
  .doc-logo-row { display:flex; align-items:center; gap:12px; border-bottom:3px solid #073B67; padding:0 0 10px; margin-bottom:10px; }
  .doc-logo { height:36px; width:auto; }
  .doc-brand strong { display:block; color:#073B67; font-size:17px; letter-spacing:.3px; font-weight:800; }
  .doc-brand span { font-size:9px; color:#6b7280; letter-spacing:1.6px; text-transform:uppercase; }
  .doc-heading { text-align:center; color:${headingColor}; font-size:${fontSize + 5}px; margin:12px 0 8px; letter-spacing:1.4px; border-bottom:2px double ${gatePass ? headingColor : colors.accent}; padding-bottom:7px; text-transform:uppercase; font-weight:800; }
  .doc-subheading { color:${headingColor}; font-size:${fontSize + 1}px; margin:14px 0 5px; border-bottom:1px solid #d1d5db; padding-bottom:4px; font-weight:700; }
  .doc-body { font-size:${fontSize}px; line-height:1.6; text-align:justify; }
  .doc-body p { margin:0 0 8px; }
  .doc-photo-row { text-align:left; margin:6px 0; }
  .doc-photo { width:96px; height:116px; object-fit:cover; border:2px solid #d7dde5; border-radius:6px; }
  .doc-qr { width:150px; height:150px; display:block; margin:8px auto; }
  .doc-divider { border:0; border-top:1px dashed #cbd5e1; margin:12px 0; }
  .doc-table-wrap { margin:10px 0; }
  .doc-table { width:100%; border-collapse:collapse; font-size:${fontSize - 1}px; }
  .doc-table th, .doc-table td { border:1px solid #9aa4b2; padding:5px 8px; text-align:left; vertical-align:top; }
  .doc-table th { background:${colors.light}; color:${colors.primary}; font-weight:700; }
  .doc-value-na { color:#9ca3af; }
  .doc-token-empty { background:#fff3e0; color:#b45309; border:1px dashed #f59e0b; border-radius:4px; padding:0 4px; font-size:${fontSize - 2}px; font-family: monospace; }
  .doc-muted { font-size:${fontSize - 3}px; color:#6b7280; margin-top:4px; }
  .doc-signature-grid { display:flex; gap:44px; justify-content:space-between; margin:40px 10px 4px; }
  .doc-signature-grid > div { width:210px; text-align:center; }
  .doc-signature-line { border-top:1px solid #4b5563; margin-top:32px; padding-top:5px; font-size:${fontSize - 1}px; color:#111827; font-weight:600; min-height:18px; }
  .doc-signature-grid p { font-size:${fontSize - 3}px; color:#6b7280; margin:5px 0 0; text-transform:uppercase; letter-spacing:.6px; }
  .doc-signatory-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; text-transform:none; letter-spacing:.4px; color:#4b5563; }
  .doc-footer { font-size:9px; color:#6b7280; text-align:center; margin-top:16px; border-top:1px solid #e5e7eb; padding-top:6px; }
  ${template.documentType === 'temporary-gate-pass' ? `
  .doc-watermark { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:${fontSize * 9}px; font-weight:800; color:rgba(220,38,38,0.14); transform:rotate(-30deg); letter-spacing:12px; pointer-events:none; z-index:0; user-select:none; }
  .doc-page > *:not(.doc-watermark) { position:relative; z-index:1; }` : ''}
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;
}

/** Standalone printable HTML — used by preview (srcdoc), print and print-to-PDF flows. */
export function renderDocumentHtml(target: RenderTarget): string {
  const { template, tokens, workerRows } = target;
  const sections = [...template.sections].sort((a, b) => a.order - b.order);
  const visible = sections.filter(section => section.visible)
    // Drop a QR block when there is no QR (e.g. temporary passes).
    .filter(section => !(section.content.includes('{{document.qr}}') && !tokens['document.qr']));
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
  const roleBssId = (role: string): string => {
    const map: Record<string, string> = {
      Worker: 'worker.bssId',
      Contractor: 'contractor.bssId',
      'Principal Employer': 'employer.bssId',
      'Site In-charge': 'employer.bssId',
    };
    const key = map[role] ?? '';
    return key ? (tokens[key] ?? '') : '';
  };
  // Gate passes always use the same signatories (contractor, principal employer,
  // site in-charge) — no HOD/HR/CSO — regardless of any stored template.
  const gatePassSignatories = isGatePassType(template.documentType)
    ? ['Contractor', 'Principal Employer', 'Site In-charge']
    : template.signatories;
  const signHtml = signatureSection
    ? `<div class="doc-signature-grid">${gatePassSignatories.map(role => `<div><div class="doc-signature-line">${esc(roleValue(role))}</div><p>${esc(role)}</p>${roleBssId(role) ? `<p class="doc-signatory-id">${esc(roleBssId(role))}</p>` : ''}</div>`).join('')}</div>`
    : '';

  const brandName = template.styles.brandHeaderText || 'Bharat Shram Setu';
  // Wordmark keeps the Indian tricolour treatment used across the portal.
  const brandWordmark = brandName.trim().toLowerCase() === 'bharat shram setu'
    ? '<span style="color:#022B5E">Bharat</span><span style="color:#E45D24"> Shram</span><span style="color:#14843C"> Setu</span>'
    : esc(brandName);
  const logoUrl = template.styles.brandLogoUrl || '/bss-original-logo.png';
  const tagline = template.styles.brandTagline || 'One Nation · One Identity · One Future';
  const headingMeta = template.styles.showBrandHeader
    ? `<div class="doc-logo-row">${template.styles.showLogo ? `<img src="${esc(logoUrl)}" alt="logo" class="doc-logo"/>` : ''}<div class="doc-brand"><strong>${brandWordmark}</strong><span>${esc(tagline)}</span></div></div>`
    : '';

  const body = visible
    .filter(section => section.type !== 'signature' && section.type !== 'logo')
    .map(section => sectionHtml(section, tokens, workerRows))
    .join('');

  const watermark = template.documentType === 'temporary-gate-pass' ? '<div class="doc-watermark">TEMP</div>' : '';

  return `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(template.name)}</title><style>${cssFor(template)}</style></head><body><div class="doc-page">${watermark}${headingMeta}${body}${signHtml}<div class="doc-footer">${esc(template.styles.footerText)}</div></div></body></html>`;
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
