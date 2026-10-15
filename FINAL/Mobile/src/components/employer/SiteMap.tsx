"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { loadGoogleMaps } from "@/lib/googleMaps";

// The pure geo helpers live in a leaflet-free module (siteGeo) so server code
// can import them without pulling in leaflet, which touches `window` at module
// scope and crashes SSR. Re-exported here for existing import sites.
import { formatLatitude, formatLongitude, type SiteGeo } from "./siteGeo";
export { parseCoordinate, formatLatitude, formatLongitude } from "./siteGeo";
export type { SiteGeo } from "./siteGeo";

/* eslint-disable @typescript-eslint/no-explicit-any */

const OSM_TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

type Engine = "loading" | "google" | "osm";

function pinIcon() {
  return L.divIcon({
    className: "",
    html: '<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.3 12.8 24.2 13.9 25.4a1.6 1.6 0 0 0 2.2 0C17.2 39.2 30 26.3 30 15 30 6.7 23.3 0 15 0Z" fill="#01183A"/><circle cx="15" cy="15" r="6.2" fill="#fff"/><circle cx="15" cy="15" r="3.1" fill="#E45D24"/></svg>',
    iconSize: [30, 42],
    iconAnchor: [15, 40],
    popupAnchor: [0, -34],
  });
}

// Geocoding: use the Google Maps JS Geocoder when the API is loaded (single
// browser key), otherwise the /api/geocode proxy (Google server key → Nominatim).
type GoogleComponent = { long_name: string; types: string[] };

function fromGoogleResult(r: any): SiteGeo {
  const parts: GoogleComponent[] = r.address_components ?? [];
  const comp = (t: string) => parts.find(p => p.types.includes(t))?.long_name ?? '';
  const loc = r.geometry?.location;
  const lat = typeof loc?.lat === "function" ? loc.lat() : (loc?.lat ?? 0);
  const lng = typeof loc?.lng === "function" ? loc.lng() : (loc?.lng ?? 0);
  const city = comp("locality") || comp("postal_town") || comp("administrative_area_level_3");
  return {
    lat, lng,
    label: city || comp("route") || comp("administrative_area_level_2") || (r.formatted_address ?? "").split(",")[0]?.trim() || `Point (${lat}, ${lng})`,
    address: r.formatted_address ?? "",
    state: comp("administrative_area_level_1"),
    district: comp("administrative_area_level_2"),
    city,
    pin: comp("postal_code"),
    country: comp("country"),
  };
}

function googleGeocoder(): any {
  const g = (window as unknown as { google?: any }).google;
  return g?.maps?.Geocoder ? new g.maps.Geocoder() : null;
}

async function reverseGeocode(lat: number, lng: number): Promise<Partial<SiteGeo>> {
  const geocoder = googleGeocoder();
  if (geocoder) {
    try {
      const res = await geocoder.geocode({ location: { lat, lng } });
      if (res.results?.[0]) return fromGoogleResult(res.results[0]);
    } catch { /* fall back to the proxy */ }
  }
  try {
    const response = await fetch(`/api/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
    if (!response.ok) return {};
    const result = (await response.json()) as { data?: SiteGeo | null };
    return result.data ?? {};
  } catch {
    return {};
  }
}

async function searchPlaces(query: string): Promise<SiteGeo[]> {
  const geocoder = googleGeocoder();
  if (geocoder) {
    try {
      const res = await geocoder.geocode({ address: query });
      if (res.results?.length) return (res.results as any[]).slice(0, 6).map(fromGoogleResult);
    } catch { /* fall back to the proxy */ }
  }
  try {
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    const result = (await response.json()) as { data?: SiteGeo[] };
    return result.data ?? [];
  } catch {
    return [];
  }
}

/** Fetch the public Maps key and try to load the Google Maps JS API. */
async function resolveEngine(): Promise<{ engine: Engine; key: string }> {
  try {
    const response = await fetch("/api/maps/config", { cache: "no-store" });
    const body = (await response.json()) as { googleMapsKey?: string };
    const key = (body.googleMapsKey ?? "").trim();
    if (key) {
      const ok = await loadGoogleMaps(key);
      if (ok) return { engine: "google", key };
    }
  } catch {
    /* fall through to OSM */
  }
  return { engine: "osm", key: "" };
}

function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Interactive location picker. Uses **Google Maps** when a key is configured and
 * the API loads, and automatically **falls back to OpenStreetMap** (Leaflet +
 * Nominatim) otherwise. Search, click-to-place, drag, and "use my location" all
 * resolve the marker and call ``onPick`` with the geo fields.
 */
export default function SiteMapPicker({
  initial,
  height = 280,
  onPick,
}: {
  initial?: { lat: number; lng: number };
  height?: number;
  onPick: (place: SiteGeo) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkerRef = useRef<L.Marker | null>(null);
  const googleMapRef = useRef<any>(null);
  const googleMarkerRef = useRef<any>(null);
  const onPickRef = useRef(onPick);
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  const [engine, setEngine] = useState<Engine>("loading");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SiteGeo[]>([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState("");
  const [picked, setPicked] = useState<SiteGeo | null>(null);

  const hasInitial = !!(initial && Number.isFinite(initial.lat) && Number.isFinite(initial.lng));

  // Decide the engine once on mount.
  useEffect(() => {
    let cancelled = false;
    void resolveEngine().then(({ engine: chosen }) => { if (!cancelled) setEngine(chosen); });
    return () => { cancelled = true; };
  }, []);

  // ── Build the Google map ──────────────────────────────────────────────────
  useEffect(() => {
    if (engine !== "google" || !containerRef.current) return;
    const g = (window as unknown as { google?: any }).google;
    if (!g?.maps) return;
    const center = hasInitial ? { lat: initial!.lat, lng: initial!.lng } : INDIA_CENTER;
    const map = new g.maps.Map(containerRef.current, {
      center, zoom: hasInitial ? 15 : 5, mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
    });
    googleMapRef.current = map;

    const placeGoogleMarker = (lat: number, lng: number, draggable = true) => {
      if (googleMarkerRef.current) googleMarkerRef.current.setMap(null);
      const marker = new g.maps.Marker({ position: { lat, lng }, map, draggable });
      googleMarkerRef.current = marker;
      marker.addListener("dragend", async (e: any) => {
        const la = e.latLng.lat(); const ln = e.latLng.lng();
        const extra = await reverseGeocode(la, ln);
        const place: SiteGeo = { lat: la, lng: ln, label: extra.label ?? "Selected point", ...extra };
        setPicked(place); onPickRef.current(place);
      });
    };
    (map as any).__place = placeGoogleMarker;
    if (hasInitial) placeGoogleMarker(initial!.lat, initial!.lng);

    map.addListener("click", async (e: any) => {
      const la = e.latLng.lat(); const ln = e.latLng.lng();
      placeGoogleMarker(la, ln);
      const extra = await reverseGeocode(la, ln);
      const place: SiteGeo = { lat: la, lng: ln, label: extra.label ?? `Point (${la.toFixed(5)}, ${ln.toFixed(5)})`, ...extra };
      setPicked(place); onPickRef.current(place);
    });
    return () => { if (googleMarkerRef.current) googleMarkerRef.current.setMap(null); googleMapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // ── Build the OpenStreetMap (Leaflet) map — fallback ──────────────────────
  useEffect(() => {
    if (engine !== "osm" || !containerRef.current) return;
    const center: L.LatLngExpression = hasInitial ? [initial!.lat, initial!.lng] : [INDIA_CENTER.lat, INDIA_CENTER.lng];
    const map = L.map(containerRef.current, { center, zoom: hasInitial ? 15 : 5, attributionControl: true });
    L.tileLayer(OSM_TILE, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map);
    leafletMapRef.current = map;

    const placeLeafletMarker = (position: L.LatLngExpression) => {
      if (leafletMarkerRef.current) leafletMarkerRef.current.remove();
      leafletMarkerRef.current = L.marker(position, { icon: pinIcon(), draggable: true }).addTo(map);
      leafletMarkerRef.current.on("dragend", async () => {
        const latlng = leafletMarkerRef.current?.getLatLng();
        if (!latlng) return;
        const extra = await reverseGeocode(latlng.lat, latlng.lng);
        const place: SiteGeo = { lat: latlng.lat, lng: latlng.lng, label: extra.label ?? "Selected point", ...extra };
        setPicked(place); onPickRef.current(place);
      });
    };
    (map as any).__place = placeLeafletMarker;
    if (hasInitial) placeLeafletMarker([initial!.lat, initial!.lng]);

    const onMapClick = async (event: L.LeafletMouseEvent) => {
      const { lat, lng } = event.latlng;
      placeLeafletMarker([lat, lng]);
      const extra = await reverseGeocode(lat, lng);
      const place: SiteGeo = { lat, lng, label: extra.label ?? `Point (${lat.toFixed(5)}, ${lng.toFixed(5)})`, ...extra };
      setPicked(place); onPickRef.current(place);
    };
    map.on("click", onMapClick);
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);
    return () => {
      clearTimeout(timer1); clearTimeout(timer2);
      map.off("click", onMapClick); map.remove(); leafletMapRef.current = null; leafletMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  function moveTo(lat: number, lng: number, zoom = 16) {
    if (engine === "google" && googleMapRef.current) {
      googleMapRef.current.panTo({ lat, lng });
      googleMapRef.current.setZoom(zoom);
      googleMapRef.current.__place?.(lat, lng);
    } else if (leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lng], zoom);
      (leafletMapRef.current as any).__place?.([lat, lng]);
    }
  }

  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) return;
    const handle = setTimeout(async () => {
      setSearching(true);
      const found = await searchPlaces(term);
      setResults(found);
      setSearching(false);
      if (found.length) setNotice("");
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  async function runSearch() {
    const term = query.trim();
    if (!term) return;
    setSearching(true);
    setNotice("");
    try {
      const found = await searchPlaces(term);
      setResults(found);
      if (!found.length) setNotice("No places found — try a more specific name (city, project landmark, pin code).");
    } catch {
      setNotice("Search is unavailable right now. You can still click the map to set the site location.");
    } finally {
      setSearching(false);
    }
  }

  function chooseResult(place: SiteGeo) {
    setResults([]); setNotice(""); setPicked(place); onPickRef.current(place);
    moveTo(place.lat, place.lng);
  }

  async function locateMe() {
    if (!navigator.geolocation) { setNotice("Geolocation is not supported by this browser."); return; }
    setNotice("Locating…");
    navigator.geolocation.getCurrentPosition(async position => {
      const { latitude: lat, longitude: lng } = position.coords;
      moveTo(lat, lng);
      const extra = await reverseGeocode(lat, lng);
      const place: SiteGeo = { lat, lng, label: extra.label ?? "My location", ...extra };
      setPicked(place); onPickRef.current(place); setNotice("");
    }, () => setNotice("Could not read your location — search for the place or click the map."), { enableHighAccuracy: true, timeout: 12000 });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2" role="search">
        <label className="relative flex-1">
          <span className="sr-only">Search place</span>
          <input
            value={query}
            onChange={event => { const value = event.target.value; setQuery(value); if (value.trim().length < 3) setResults([]); }}
            onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void runSearch(); } }}
            placeholder="Search site location — project, landmark, city or PIN…"
            className="w-full h-10 rounded-lg border border-bss-border px-3 pr-9 text-sm"
          />
        </label>
        <button type="button" onClick={() => void runSearch()} disabled={searching} className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-sm font-semibold disabled:opacity-50">
          {searching ? "Searching…" : "Search"}
        </button>
        <button type="button" onClick={locateMe} className="h-10 px-3 rounded-lg border border-bss-border text-xs font-semibold flex items-center gap-1.5 hover:bg-bss-bg" title="Use my current location">
          Use my location
        </button>
      </div>

      {results.length > 0 && (
        <ul className="bg-white border border-bss-border rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto divide-y divide-bss-border">
          {results.map((place, index) => (
            <li key={index}>
              <button type="button" onClick={() => chooseResult(place)} className="w-full text-left px-3 py-2 hover:bg-bss-bg">
                <strong className="block text-xs text-bss-text-primary">{place.label}</strong>
                <span className="block text-[10px] text-bss-text-muted truncate">{place.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-bss-border z-0" style={{ height }} aria-label="Site location picker" />
        {engine === "loading" && <div className="absolute inset-0 grid place-items-center text-xs text-bss-text-muted bg-bss-bg/60 rounded-xl">Loading map…</div>}
        {engine === "osm" && <span className="absolute bottom-1 right-2 text-[9px] text-bss-text-muted bg-white/80 rounded px-1">OpenStreetMap</span>}
        {engine === "google" && <span className="absolute bottom-1 right-2 text-[9px] text-bss-text-muted bg-white/80 rounded px-1">Google Maps</span>}
      </div>
      {notice && <p className="text-xs text-bss-orange bg-bss-soft-orange border border-bss-border rounded-lg px-3 py-2" role="status">{notice}</p>}

      {picked && (
        <div className="rounded-xl border border-bss-border bg-bss-soft-green/60 px-3 py-2 text-xs text-bss-text-primary">
          <span className="font-bold text-[#01183A]">{picked.label}</span>
          <p className="text-[11px] text-bss-text-muted mt-0.5">{picked.address}</p>
          <p className="text-[11px] text-bss-text-muted mt-0.5">
            {formatLatitude(picked.lat)} · {formatLongitude(picked.lng)}
            {picked.city ? ` · ${picked.city}` : ""}{picked.district ? `, ${picked.district}` : ""}{picked.state ? `, ${picked.state}` : ""}{picked.pin ? ` · PIN ${picked.pin}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

/** Read-only mini map for the site detail page — Google Maps, OSM fallback. */
export function SiteMapView({ lat, lng, name = "Works site", height = 220, link = true }: { lat: number | null; lng: number | null; name?: string; height?: number; link?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<Engine>("loading");

  useEffect(() => {
    let cancelled = false;
    void resolveEngine().then(({ engine: chosen }) => { if (!cancelled) setEngine(chosen); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (engine === "loading") return;
    if (engine === "google") {
      const g = (window as unknown as { google?: any }).google;
      if (!g?.maps) return; // resolveEngine only reports google after a successful load
      const map = new g.maps.Map(containerRef.current, { center: { lat, lng }, zoom: 15, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
      const marker = new g.maps.Marker({ position: { lat, lng }, map, title: name });
      const info = new g.maps.InfoWindow({ content: `<strong>${name}</strong>` });
      marker.addListener("click", () => info.open({ anchor: marker, map }));
      return () => { marker.setMap(null); };
    }
    const map = L.map(containerRef.current, { center: [lat!, lng!], zoom: 15, attributionControl: true });
    L.tileLayer(OSM_TILE, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map);
    const marker = L.marker([lat!, lng!], { icon: pinIcon() }).addTo(map).bindPopup(`<strong>${name}</strong>`);
    const timer1 = setTimeout(() => { map.invalidateSize(); }, 100);
    const timer2 = setTimeout(() => { map.invalidateSize(); }, 500);
    return () => { clearTimeout(timer1); clearTimeout(timer2); map.remove(); marker.remove(); };
  }, [engine, lat, lng, name]);

  if (lat === null || lng === null) return null;

  const externalUrl = engine === "google" && Number.isFinite(lat) && Number.isFinite(lng)
    ? googleMapsUrl(lat, lng)
    : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;

  return (
    <div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-bss-border" style={{ height }} aria-label={`Map preview for ${name}`} />
      {link && (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-[11px] font-semibold text-[#01183A] hover:underline">
          {engine === "google" ? "Open in Google Maps ↗" : "Open in OpenStreetMap ↗"}
        </a>
      )}
    </div>
  );
}
