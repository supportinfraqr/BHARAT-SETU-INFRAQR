import { templateService, makeDefaultTemplate } from './services';
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
};

function plusDays(fromIso: string, days: number): string {
  const date = new Date(`${fromIso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fromIso;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`).getTime();
  const to = new Date(`${toIso}T00:00:00`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 1;
  return Math.max(1, Math.round((to - from) / 86400000));
}

const PASS_PREFIX: Record<string, string> = { 'permanent-gate-pass': 'BSS-P', 'temporary-gate-pass': 'BSS-T' };
const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** BSS-P + 10 alphanumeric (permanent) / BSS-T + 10 alphanumeric (temporary). */
function randomPassNo(type: DocumentType): string {
  let suffix = '';
  for (let index = 0; index < 10; index += 1) suffix += ALNUM[Math.floor(Math.random() * ALNUM.length)];
  return `${PASS_PREFIX[type] ?? 'BSS-P'}${suffix}`;
}

function generatedStamp(): string {
  return new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Render a gate pass on demand — no stored document. The HTML is produced from the
 * owner's ACTIVE gate-pass template (current settings) merged with the worker's
 * live BSS data and the pass's validity, so the pass always reflects current status.
 */
export function buildGatePassHtml(
  owner: OwnerScope,
  view: PortalView,
  worker: WorkerLike,
  type: DocumentType,
  overrides: GatePassOverrides = {},
): string {
  const template = templateService.activeFor(owner, type) ?? makeDefaultTemplate(owner, type, 'System');
  const { tokens } = resolveWorkerTokens(view, worker);
  const issue = overrides.issueDate || overrides.validFrom || today();
  const validTo = overrides.validTo || plusDays(issue, type === 'permanent-gate-pass' ? 365 : 30);
  const merged: Record<string, string> = {
    ...tokens,
    'document.issueDate': issue,
    'document.validFrom': overrides.validFrom || issue,
    'document.validTo': validTo,
    'document.number': overrides.number || tokens['document.number'] || randomPassNo(type),
    'document.generatedAt': generatedStamp(),
    'document.days': overrides.days ?? (type === 'temporary-gate-pass' ? String(daysBetween(issue, validTo)) : ''),
    'document.reason': overrides.reason ?? tokens['document.reason'] ?? '',
    'document.place': overrides.place ?? tokens['document.place'] ?? '',
  };
  return renderDocumentHtml({ template, tokens: merged });
}

/** Open the freshly-rendered pass in a printable window (print / Save as PDF). */
export function openGatePass(
  owner: OwnerScope,
  view: PortalView,
  worker: WorkerLike,
  type: DocumentType,
  overrides: GatePassOverrides = {},
): void {
  const label = type === 'permanent-gate-pass' ? 'Permanent' : 'Temporary';
  openPrintHtml(buildGatePassHtml(owner, view, worker, type, overrides), `${worker.name} · ${label} Gate Pass`);
}
