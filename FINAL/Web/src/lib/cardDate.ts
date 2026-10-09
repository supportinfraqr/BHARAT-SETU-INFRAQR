/**
 * Shared date formatting for the worker ID / employment cards.
 *
 * Every date on the cards follows the day-month-year concept (`09 Oct 2026`),
 * regardless of how the source value is stored (ISO `1990-05-14`, a locale
 * string, or a Date). Unparseable values are returned unchanged.
 */
export function formatCardDate(value?: string | Date | null): string {
  if (!value) return '';
  let parsed: Date;
  if (value instanceof Date) {
    parsed = value;
  } else {
    const raw = value.trim();
    if (!raw) return '';
    // Parse date-only strings as local time so the day never shifts by a timezone.
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    parsed = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(raw);
  }
  if (Number.isNaN(parsed.getTime())) return typeof value === 'string' ? value : '';
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
