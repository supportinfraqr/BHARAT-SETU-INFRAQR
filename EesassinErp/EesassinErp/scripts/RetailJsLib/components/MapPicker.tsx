import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPickerProps {
  latitude?: number;
  longitude?: number;
  onChange: (lat: number, lng: number, address?: string) => void;
  height?: string;
}

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

export default function MapPicker({ latitude, longitude, onChange, height = '350px' }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView(
      latitude && longitude ? [latitude, longitude] : DEFAULT_CENTER,
      latitude && longitude ? 14 : 5
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:24px;height:24px;background:#1a3c6e;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker(
      latitude && longitude ? [latitude, longitude] : DEFAULT_CENTER,
      { icon, draggable: true }
    ).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      reverseGeocode(pos.lat, pos.lng, (addr) => onChange(pos.lat, pos.lng, addr));
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      reverseGeocode(e.latlng.lat, e.latlng.lng, (addr) => onChange(e.latlng.lat, e.latlng.lng, addr));
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && latitude && longitude) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.setView([latitude, longitude], 14);
    }
  }, [latitude, longitude]);

  const reverseGeocode = (lat: number, lng: number, cb: (addr: string) => void) => {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then(r => r.json())
      .then(d => cb(d.display_name || ''))
      .catch(() => cb(''));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const results = await r.json();
      if (results.length > 0) {
        const { lat, lon } = results[0];
        const fLat = parseFloat(lat), fLng = parseFloat(lon);
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([fLat, fLng], 15);
          markerRef.current.setLatLng([fLat, fLng]);
        }
        onChange(fLat, fLng, results[0].display_name || '');
      }
    } catch {}
    setSearching(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search location (city, address, landmark...)"
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
        />
        <button type="button" onClick={handleSearch} disabled={searching}
          style={{ padding: '8px 16px', background: '#1a3c6e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>
      <div ref={mapRef} style={{ height, borderRadius: 8, border: '2px solid #d1d5db', zIndex: 0 }}></div>
      {latitude && longitude && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
          Selected: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      )}
    </div>
  );
}
