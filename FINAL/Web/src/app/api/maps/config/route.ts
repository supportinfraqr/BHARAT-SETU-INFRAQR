import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Exposes the public Google Maps browser key (if configured) so the client can
 * load the Maps JS API. Falls back to OpenStreetMap when it's blank. This key is
 * a browser key (restrict it by HTTP referrer in Google Cloud Console).
 */
export async function GET() {
  return NextResponse.json(
    { googleMapsKey: process.env.GOOGLE_MAPS_API_KEY ?? '' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
