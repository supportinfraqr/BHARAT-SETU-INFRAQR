"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

function pinIcon() {
  return L.divIcon({
    className: "",
    html: '<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.3 12.8 24.2 13.9 25.4a1.6 1.6 0 0 0 2.2 0C17.2 39.2 30 26.3 30 15 30 6.7 23.3 0 15 0Z" fill="#073B67"/><circle cx="15" cy="15" r="6.2" fill="#fff"/><circle cx="15" cy="15" r="3.1" fill="#F47A32"/></svg>',
    iconSize: [30, 42],
    iconAnchor: [15, 40],
    popupAnchor: [0, -34],
  });
}

const OSM_TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

async function reverseGeocode(lat: number, lng: number): Promise<Partial<SiteGeo>> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1&zoom=18`;
  const response = await fetch(url);
  if (!response.ok) return {};
  const data = (await response.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };
  const address = data.address ?? {};
  return {
    address: data.display_name ?? "",
    label: data.display_name?.split(",")[0] ?? `Selected point (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    state: address.state ?? address.state_district ?? "",
    district: address.county ?? address.state_district ?? address.suburb ?? "",
    city: address.city ?? address.town ?? address.village ?? address.suburb ?? address.municipality ?? "",
    pin: address.postcode ?? "",
    country: address.country ?? "",
  };
}

async function searchPlaces(query: string): Promise<SiteGeo[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: Record<string, string>;
  }>;
  return data.map(item => {
    const address = item.address ?? {};
    return {
      lat: Number(item.lat),
      lng: Number(item.lon),
      label: item.display_name?.split(",")[0] ?? item.display_name,
      address: item.display_name,
      state: address.state ?? address.state_district ?? "",
      district: address.county ?? address.state_district ?? "",
      city: address.city ?? address.town ?? address.village ?? address.suburb ?? "",
      pin: address.postcode ?? "",
      country: address.country ?? "",
    };
  });
}

/**
 * Interactive OpenStreetMap picker used while registering a site.
 * Search (Nominatim), click-to-place, and "use my location" all resolve the
 * marker and call onPick with the geo fields so the site form can store them.
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
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SiteGeo[]>([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState("");
  const [picked, setPicked] = useState<SiteGeo | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center: L.LatLngExpression =
      initial && Number.isFinite(initial.lat) && Number.isFinite(initial.lng)
        ? [initial.lat, initial.lng]
        : [20.5937, 78.9629]; // India by default
    const map = L.map(containerRef.current, { center, zoom: initial ? 15 : 5, attributionControl: true });
    L.tileLayer(OSM_TILE, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map);
    mapRef.current = map;
    const onMapClick = async (event: L.LeafletMouseEvent) => {
      const { lat, lng } = event.latlng;
      placeMarker([lat, lng]);
      const extra = await reverseGeocode(lat, lng);
      const place: SiteGeo = { lat, lng, label: extra.label ?? `Point (${lat.toFixed(5)}, ${lng.toFixed(5)})`, ...extra };
      setPicked(place);
      onPick(place);
    };
    map.on("click", onMapClick);
    setTimeout(() => map.invalidateSize(), 120);
    return () => { map.off("click", onMapClick); map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeMarker(position: L.LatLngExpression) {
    if (!mapRef.current) return;
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = L.marker(position, { icon: pinIcon(), draggable: true }).addTo(mapRef.current);
    markerRef.current.on("dragend", async () => {
      const latlng = markerRef.current?.getLatLng();
      if (!latlng) return;
      const extra = await reverseGeocode(latlng.lat, latlng.lng);
      const place: SiteGeo = { lat: latlng.lat, lng: latlng.lng, label: extra.label ?? "Selected point", ...extra };
      setPicked(place);
      onPick(place);
    });
  }

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term || !mapRef.current) return;
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
    setResults([]);
    setPicked(place);
    onPick(place);
    if (mapRef.current) {
      mapRef.current.setView([place.lat, place.lng], 16);
      placeMarker([place.lat, place.lng]);
    }
  }

  async function locateMe() {
    if (!navigator.geolocation) { setNotice("Geolocation is not supported by this browser."); return; }
    setNotice("Locating…");
    navigator.geolocation.getCurrentPosition(async position => {
      const { latitude: lat, longitude: lng } = position.coords;
      if (mapRef.current) mapRef.current.setView([lat, lng], 16);
      placeMarker([lat, lng]);
      const extra = await reverseGeocode(lat, lng);
      const place: SiteGeo = { lat, lng, label: extra.label ?? "My location", ...extra };
      setPicked(place);
      onPick(place);
      setNotice("");
    }, () => setNotice("Could not read your location — search for the place or click the map."), { enableHighAccuracy: true, timeout: 12000 });
  }

  return (
    <div className="space-y-2">
      <form onSubmit={runSearch} className="flex gap-2" role="search">
        <label className="relative flex-1">
          <span className="sr-only">Search place</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search site location — project, landmark, city or PIN…"
            className="w-full h-10 rounded-lg border border-gray-200 px-3 pr-9 text-sm"
          />
        </label>
        <button type="submit" disabled={searching} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-sm font-semibold disabled:opacity-50">
          {searching ? "Searching…" : "Search"}
        </button>
        <button type="button" onClick={locateMe} className="h-10 px-3 rounded-lg border border-gray-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-50" title="Use my current location">
          Use my location
        </button>
      </form>

      {results.length > 0 && (
        <ul className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto divide-y divide-gray-100">
          {results.map((place, index) => (
            <li key={index}>
              <button type="button" onClick={() => chooseResult(place)} className="w-full text-left px-3 py-2 hover:bg-gray-50">
                <strong className="block text-xs text-gray-900">{place.label}</strong>
                <span className="block text-[10px] text-gray-500 truncate">{place.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-gray-200 z-0" style={{ height }} aria-label="OpenStreetMap site location picker" />
      {notice && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2" role="status">{notice}</p>}

      {picked && (
        <div className="rounded-xl border border-green-100 bg-green-50/60 px-3 py-2 text-xs text-gray-700">
          <span className="font-bold text-[#073B67]">{picked.label}</span>
          <p className="text-[11px] text-gray-500 mt-0.5">{picked.address}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {formatLatitude(picked.lat)} · {formatLongitude(picked.lng)}
            {picked.city ? ` · ${picked.city}` : ""}{picked.district ? `, ${picked.district}` : ""}{picked.state ? `, ${picked.state}` : ""}{picked.pin ? ` · PIN ${picked.pin}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

/** Read-only mini map used on the site detail page to preview the geo location. */
export function SiteMapView({ lat, lng, name = "Works site" }: { lat: number | null; lng: number | null; name?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const map = L.map(containerRef.current, { center: [lat!, lng!], zoom: 15, attributionControl: true });
    L.tileLayer(OSM_TILE, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map);
    const marker = L.marker([lat!, lng!], { icon: pinIcon() }).addTo(map).bindPopup(`<strong>${name}</strong>`);
    setTimeout(() => { map.invalidateSize(); }, 120);
    return () => { map.remove(); marker.remove(); };
  }, [lat, lng, name]);

  if (lat === null || lng === null) return null;

  return (
    <div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-gray-200" style={{ height: 220 }} aria-label={`OpenStreetMap preview for ${name}`} />
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex text-[11px] font-semibold text-[#073B67] hover:underline"
      >
        Open in OpenStreetMap ↗
      </a>
    </div>
  );
}
