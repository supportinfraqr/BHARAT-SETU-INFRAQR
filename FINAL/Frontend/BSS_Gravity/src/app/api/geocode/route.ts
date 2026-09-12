import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';

export const dynamic = 'force-dynamic';

// Browser calls to Nominatim are blocked by CORS and subject to its usage
// policy, so we proxy through the Next.js server with an identifying
// User-Agent, a 1 req/s throttle and a short cache.
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'BharatShramSetu/1.0 (+https://bharatshramsetu.com; contact: support@bharatshramsetu.com)';

type GeoPlace = {
  lat: number; lng: number; label: string; address?: string;
  state?: string; district?: string; city?: string; pin?: string; country?: string;
};

type NominatimItem = {
  lat: string; lon: string; display_name?: string; address?: Record<string, string>;
};

function normalize(item: NominatimItem): GeoPlace {
  const address = item.address ?? {};
  const display = String(item.display_name ?? '');
  return {
    lat: Number(item.lat),
    lng: Number(item.lon),
    label: display.split(',')[0]?.trim() || display || `Point (${item.lat}, ${item.lon})`,
    address: display,
    state: address.state ?? address.state_district ?? '',
    district: address.county ?? address.state_district ?? address.suburb ?? '',
    city: address.city ?? address.town ?? address.village ?? address.suburb ?? address.municipality ?? '',
    pin: address.postcode ?? '',
    country: address.country ?? '',
  };
}

const cache = new Map<string, { at: number; data: unknown }>();
const CACHE_TTL_MS = 5 * 60_000;
let lastCallAt = 0;

async function nominatim(path: string): Promise<unknown> {
  const wait = Math.max(0, 1000 - (Date.now() - lastCallAt));
  if (wait) await new Promise(resolve => setTimeout(resolve, wait));
  lastCallAt = Date.now();
  const response = await fetch(`${NOMINATIM}${path}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', 'Accept-Language': 'en' },
    cache: 'no-store',
  });
  if (!response.ok) throw Object.assign(new Error('Location search is unavailable right now.'), { status: 502 });
  return response.json();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    let path: string;
    if (q) {
      if (q.length < 3 || q.length > 200) {
        return NextResponse.json({ error: 'Enter at least 3 characters to search.' }, { status: 400 });
      }
      path = `/search?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(q)}`;
    } else if (lat && lng) {
      path = `/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    } else {
      return NextResponse.json({ error: 'Provide q, or lat and lng.' }, { status: 400 });
    }

    const hit = cache.get(path);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return NextResponse.json({ data: hit.data }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const payload = await nominatim(path);
    const data = Array.isArray(payload)
      ? (payload as NominatimItem[]).map(normalize)
      : (payload && (payload as NominatimItem).lat ? normalize(payload as NominatimItem) : null);

    cache.set(path, { at: Date.now(), data });
    if (cache.size > 500) {
      const now = Date.now();
      for (const [key, entry] of cache) if (now - entry.at > CACHE_TTL_MS) cache.delete(key);
    }
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'Location search could not be completed.');
  }
}
