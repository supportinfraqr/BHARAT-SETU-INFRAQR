/** PREVIEW HARNESS shim for the prod `@/lib/date` helpers. */

function parse(iso?: string | Date | null): Date | null {
  if (!iso) return null;
  if (iso instanceof Date) return Number.isNaN(iso.getTime()) ? null : iso;
  const value = iso.length <= 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return Number.isNaN(value.getTime()) ? null : value;
}

/** "16 Oct 2026" (en-IN). */
export function formatDate(iso?: string | Date | null, fallback = '—'): string {
  const d = parse(iso);
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : fallback;
}

/** "16 Oct 2026, 09:12 am" (en-IN). */
export function formatDateTime(iso?: string | Date | null, fallback = '—'): string {
  const d = parse(iso);
  return d ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : fallback;
}

/** "09:12 am" (en-IN). */
export function formatTime(iso?: string | Date | null, fallback = '—'): string {
  const d = parse(iso);
  return d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : fallback;
}

/** YYYY-MM-DD in local time. */
export function toIsoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole days from today to `iso` (negative if past). */
export function daysUntil(iso?: string | null): number | null {
  const d = parse(iso);
  if (!d) return null;
  const today = parse(toIsoDate());
  return Math.round((d.getTime() - (today as Date).getTime()) / 86_400_000);
}
