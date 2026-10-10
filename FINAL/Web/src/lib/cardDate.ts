/**
 * Shared date formatting for the worker ID / employment cards.
 *
 * Every date on the cards follows the day-month-year concept (`DD/MM/YYYY`),
 * regardless of how the source value is stored (ISO `1990-05-14`, a locale
 * string, or a Date). Delegates to the portal-wide formatter.
 */
import { formatDate } from './date';

export function formatCardDate(value?: string | Date | null): string {
  return formatDate(value, '');
}
