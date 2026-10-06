/**
 * Pure geo helpers shared by the site create form and the site detail page.
 *
 * Deliberately leaflet-free: importing these from `SiteMap.tsx` (which pulls in
 * `leaflet` at module scope, a browser-only library) dragged leaflet into the
 * server bundle and crashed SSR with "window is not defined".
 */

/** A resolved geo place chosen from OpenStreetMap (Nominatim). */
export type SiteGeo = {
  lat: number;
  lng: number;
  label: string; // human readable site/landmark name (or display_name)
  address?: string;
  state?: string;
  district?: string;
  city?: string;
  pin?: string;
  country?: string;
};

/** Parse "19.0178° N", "19.0178,72.8", "19.0178" into a number (or null). */
export function parseCoordinate(value?: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  const match = text.match(/(-?\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

export function formatLatitude(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return `${Math.abs(n).toFixed(5)}° ${n >= 0 ? "N" : "S"}`;
}

export function formatLongitude(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return `${Math.abs(n).toFixed(5)}° ${n >= 0 ? "E" : "W"}`;
}
