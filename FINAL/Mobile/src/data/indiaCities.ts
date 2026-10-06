import cities from './indiaCities.json';

// Bundled India state -> cities dataset (source: countriesnow.space, generated
// once) so dependent state/city dropdowns work without any runtime API call.
export const INDIA_CITIES: Record<string, string[]> = cities as Record<string, string[]>;
export const INDIA_CITY_STATES: string[] = Object.keys(INDIA_CITIES);

export function citiesForState(state: string): string[] {
  return INDIA_CITIES[state] ?? [];
}
