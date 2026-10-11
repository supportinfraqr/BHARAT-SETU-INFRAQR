/**
 * Canonical date display for the whole portal: `DD/MM/YYYY` for dates and
 * `DD/MM/YYYY HH:mm` for datetimes.
 *
 * Storage stays ISO in the backend; this only formats for display. Date-only
 * ISO strings are parsed as local time so the day never shifts by timezone.
 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDate(value?: string | Date | null): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value ?? '').trim();
  if (!raw || raw === '—') return null;
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (isoDate) return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** `DD/MM/YYYY` — returns `fallback` for empty/invalid input. */
export function formatDate(value?: string | Date | null, fallback = '—'): string {
  const d = toDate(value);
  if (!d) return fallback;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** `DD/MM/YYYY hh:mm am/pm` — 12-hour clock — returns `fallback` for empty/invalid input. */
export function formatDateTime(value?: string | Date | null, fallback = '—'): string {
  const d = toDate(value);
  if (!d) return fallback;
  const hours24 = d.getHours();
  const ampm = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 || 12;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(hours12)}:${pad(d.getMinutes())} ${ampm}`;
}
