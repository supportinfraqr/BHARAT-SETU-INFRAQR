import QRCode from 'qrcode';
import { templateService } from './services';
import { renderDocumentHtml, openPrintHtml } from './render';
import { resolveWorkerTokens, type PortalView, type WorkerLike } from './workerDataService';
import { today, type DocumentType, type OwnerScope } from './types';

export type GatePassOverrides = {
  number?: string;
  issueDate?: string;
  validFrom?: string;
  validTo?: string;
  days?: string;
  reason?: string;
  place?: string;
  status?: string;
};

function plusDays(fromIso: string, days: number): string {
  const date = new Date(`${fromIso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fromIso;
  date.setDate(date.getDate() + days);
  // Format from local parts — toISOString would shift the day for IST (+05:30).
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`).getTime();
  const to = new Date(`${toIso}T00:00:00`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 1;
  return Math.max(1, Math.round((to - from) / 86400000));
}

const PASS_PREFIX: Record<string, string> = { 'permanent-gate-pass': 'BSS-P', 'temporary-gate-pass': 'BSS-T' };
const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** BSS-P + 11 alphanumeric (permanent) / BSS-T + 11 alphanumeric (temporary),
 *  derived from the worker BSS id with FNV-1a so it matches the backend number
 *  and stays stable across renders. */
export function autoPassNo(bssId: string, type: DocumentType): string {
  const prefix = PASS_PREFIX[type] ?? 'BSS-P';
  const material = `${bssId}:${type === 'permanent-gate-pass' ? 'PGP' : 'TGP'}`;
  let hash = 2166136261;
  let suffix = '';
  for (let round = 0; round < 11; round += 1) {
    for (let index = 0; index < material.length; index += 1) {
      hash ^= (material.charCodeAt(index) + round) >>> 0;
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    suffix += ALNUM[hash % ALNUM.length];
  }
  return prefix + suffix;
}

function generatedStamp(): string {
  return new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/** QR with the BSS logo composited into its centre. High error correction keeps
 *  the code scannable around the logo. */
async function qrWithLogo(text: string): Promise<string> {
  const size = 240;
  const base = await QRCode.toDataURL(text, { margin: 0, width: size, errorCorrectionLevel: 'H' });
  if (typeof document === 'undefined') return base;
  try {
    const [qrImage, logo] = await Promise.all([loadImage(base), loadImage('/bss-original-logo.png')]);
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return base;
    ctx.drawImage(qrImage, 0, 0, size, size);
    const logoSize = 58;
    const pad = 6;
    const box = logoSize + pad * 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect((size - box) / 2, (size - box) / 2, box, box);
    ctx.drawImage(logo, (size - logoSize) / 2, (size - logoSize) / 2, logoSize, logoSize);
    return canvas.toDataURL('image/png');
  } catch { return base; }
}

/**
 * Render a gate pass on demand — no stored document. The HTML is produced from the
 * owner's ACTIVE gate-pass template (current settings) merged with the worker's
 * live BSS data and the pass's validity. A unique QR encodes both the worker BSS
 * ID and the pass ID, so the pass always reflects current status.
 */
export async function buildGatePassHtml(
  owner: OwnerScope,
  view: PortalView,
  worker: WorkerLike,
  type: DocumentType,
  overrides: GatePassOverrides = {},
): Promise<string> {
  // The gate-pass layout/wording is fixed in code (the editor only changes
  // appearance), so always render from the current default sections and take
  // just the saved styles — otherwise stale saved templates mask layout fixes.
  const template = templateService.renderTemplate(owner, type);
  const { tokens } = resolveWorkerTokens(view, worker);
  const passNo = overrides.number || tokens['document.number'] || autoPassNo(worker.bssId, type);
  const issue = overrides.issueDate || overrides.validFrom || today();
  let validTo = overrides.validTo || plusDays(issue, type === 'permanent-gate-pass' ? 365 : 7);
  // A temporary pass is never valid for more than 7 days, whatever dates are set.
  if (type === 'temporary-gate-pass') {
    const cap = plusDays(issue, 7);
    if (validTo > cap) validTo = cap;
  }
  // QR carries two things: the worker BSS ID and the pass/card ID.
  // Every pass carries a unique QR so it can be scanned at the gate.
  const verifyUrl = `https://bharatshramsetu.com/verify/pass?worker=${encodeURIComponent(worker.bssId)}&pass=${encodeURIComponent(passNo)}`;
  let qr = '';
  try { qr = await qrWithLogo(verifyUrl); } catch { qr = ''; }
  const merged: Record<string, string> = {
    ...tokens,
    'document.number': passNo,
    'document.generatedAt': generatedStamp(),
    'document.qr': qr,
    'document.issueDate': issue,
    'document.validFrom': overrides.validFrom || issue,
    'document.validTo': validTo,
    'document.days': overrides.days ?? (type === 'temporary-gate-pass' ? String(daysBetween(issue, validTo)) : ''),
    'document.reason': overrides.reason ?? tokens['document.reason'] ?? '',
    'document.place': overrides.place ?? tokens['document.place'] ?? '',
  };
  const html = renderDocumentHtml({ template, tokens: merged });
  const status = String(overrides.status || '');
  if (status === 'Expired' || status === 'Revoked') {
    const mark = `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:9999;font:900 64px/1 Arial,sans-serif;color:rgba(190,20,20,0.16);transform:rotate(-24deg);letter-spacing:.12em;text-transform:uppercase">${status}</div>`;
    return html.replace(/<\/body>/i, `${mark}</body>`);
  }
  return html;
}

/** Open the freshly-rendered pass in a printable window (print / Save as PDF). */
export async function openGatePass(
  owner: OwnerScope,
  view: PortalView,
  worker: WorkerLike,
  type: DocumentType,
  overrides: GatePassOverrides = {},
): Promise<void> {
  const html = await buildGatePassHtml(owner, view, worker, type, overrides);
  const label = type === 'permanent-gate-pass' ? 'Permanent' : 'Temporary';
  openPrintHtml(html, `${worker.name} · ${label} Gate Pass`);
}
