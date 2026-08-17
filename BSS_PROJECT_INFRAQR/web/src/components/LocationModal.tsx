import { useState } from 'react';
import MapPicker from '../components/MapPicker';
import { locationApi } from '../api/endpoints';

interface LocationModalProps {
  contractor: any;
  savedLocations: any[];
  onClose: () => void;
  onSaved: () => void;
}

export default function LocationModal({ contractor, savedLocations, onClose, onSaved }: LocationModalProps) {
  const [lat, setLat] = useState<number | undefined>(contractor.location_lat || undefined);
  const [lng, setLng] = useState<number | undefined>(contractor.location_lng || undefined);
  const [address, setAddress] = useState('');
  const [siteName, setSiteName] = useState(contractor.site_name || '');
  const [locName, setLocName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleMapChange = (newLat: number, newLng: number, newAddr?: string) => {
    setLat(newLat);
    setLng(newLng);
    if (newAddr) setAddress(newAddr);
  };

  const handleSave = async () => {
    if (lat === undefined || lng === undefined) return;
    setSaving(true);
    setMsg('');
    try {
      await locationApi.setContractorLocation(contractor.id, { latitude: lat, longitude: lng, site_name: siteName, address });
      setMsg('Location saved!');
      onSaved();
    } catch (e: any) {
      setMsg(e?.response?.data?.Message || 'Failed to save location');
    }
    setSaving(false);
  };

  const handleSaveAsStarred = async () => {
    if (lat === undefined || lng === undefined) return;
    setSaving(true);
    setMsg('');
    try {
      await locationApi.save({ name: locName || address || 'Saved Location', latitude: lat, longitude: lng, address });
      setMsg('Location starred for reuse!');
      onSaved();
    } catch { setMsg('Failed to save starred location'); }
    setSaving(false);
  };

  const handleApplyStarred = (loc: any) => {
    setLat(loc.latitude);
    setLng(loc.longitude);
    setAddress(loc.address || '');
    setLocName(loc.name || '');
  };

  const handleDeleteStarred = async (id: number) => {
    await locationApi.delete(id);
    onSaved();
  };

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal" style={{ width: 'min(720px, 94vw)', maxHeight: '90vh', overflowY: 'auto', padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#022B5E' }}>Set Working Location</h3>
            <div style={{ fontSize: 13, color: '#6b7280' }}>{contractor.name} ({contractor.is_primary ? 'Primary' : 'Secondary'})</div>
          </div>
          <button className="qr-modal-close" onClick={onClose}>✕</button>
        </div>

        <MapPicker latitude={lat} longitude={lng} onChange={handleMapChange} height="320px" />

        {savedLocations.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 13, color: '#6b7280' }}>
              <i className="fa fa-star" style={{ color: '#f59e0b' }}></i> Saved Locations (click to reuse)
            </h4>
            <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              {savedLocations.map((loc) => (
                <div key={loc.id} style={{ padding: '7px 12px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleApplyStarred(loc)}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{loc.name || 'Unnamed'}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</div>
                  </div>
                  <button onClick={() => handleDeleteStarred(loc.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: 4 }} title="Remove">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Site Name</label>
            <input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="e.g. Site A, Office B"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, marginTop: 4 }} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Save as Starred</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="Location name"
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }} />
              <button type="button" onClick={handleSaveAsStarred}
                style={{ padding: '8px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>★ Save</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
          <button type="button" onClick={handleSave} disabled={saving || lat === undefined}
            style={{ padding: '10px 28px', background: lat !== undefined ? '#1a3c6e' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 6, cursor: lat !== undefined ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
            {saving ? 'Saving...' : 'Set Working Location'}
          </button>
          {msg && <span style={{ fontSize: 13, color: msg.includes('saved') || msg.includes('starred') ? '#16a34a' : '#ef4444' }}>{msg}</span>}
        </div>
      </div>
    </div>
  );
}
