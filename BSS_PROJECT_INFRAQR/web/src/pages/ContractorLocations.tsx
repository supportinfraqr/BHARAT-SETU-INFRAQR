import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import MapPicker from '../components/MapPicker';
import { qrApi, locationApi } from '../api/endpoints';
import './QRManagement.css';

export default function ContractorLocations() {
  const [contractors, setContractors] = useState<any[]>([]);
  const [savedLocations, setSavedLocations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [address, setAddress] = useState('');
  const [siteName, setSiteName] = useState('');
  const [locName, setLocName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [cRes, lRes] = await Promise.all([qrApi.contractors(), locationApi.list()]);
      setContractors(cRes.data || []);
      setSavedLocations(lRes.data || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMapChange = (newLat: number, newLng: number, newAddr?: string) => {
    setLat(newLat);
    setLng(newLng);
    if (newAddr) setAddress(newAddr);
  };

  const handleSelect = (c: any) => {
    setSelectedId(c.id);
    setLat(c.location_lat || undefined);
    setLng(c.location_lng || undefined);
    setSiteName(c.site_name || '');
    setMsg('');
  };

  const handleSave = async () => {
    if (!selectedId || lat === undefined || lng === undefined) return;
    setSaving(true);
    setMsg('');
    try {
      await locationApi.setContractorLocation(selectedId, { latitude: lat, longitude: lng, site_name: siteName, address });
      setMsg('Location saved!');
      load();
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
      load();
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
    load();
  };

  return (
    <AppLayout title="Set Contractor Locations">
      <div className="qr-mgmt">
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>
          <div>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Select Contractor</h3>
            <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              {contractors.map((c) => (
                <div key={c.id}
                  onClick={() => handleSelect(c)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                    background: selectedId === c.id ? '#eff6ff' : '#fff',
                    borderLeft: selectedId === c.id ? '3px solid #1a3c6e' : '3px solid transparent',
                  }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {c.location_lat ? `${c.location_lat.toFixed(4)}, ${c.location_lng.toFixed(4)}` : 'No location set'}
                    {c.site_name ? ` • ${c.site_name}` : ''}
                  </div>
                </div>
              ))}
              {contractors.length === 0 && <div style={{ padding: 16, color: '#9ca3af', textAlign: 'center' }}>No contractors found.</div>}
            </div>

            {savedLocations.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#6b7280' }}>
                  <i className="fa fa-star" style={{ color: '#f59e0b' }}></i> Saved Locations
                </h3>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  {savedLocations.map((loc) => (
                    <div key={loc.id} style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleApplyStarred(loc)}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{loc.name || 'Unnamed'}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</div>
                      </div>
                      <button onClick={() => handleDeleteStarred(loc.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: 4 }} title="Remove">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <MapPicker latitude={lat} longitude={lng} onChange={handleMapChange} height="420px" />
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Site Name</label>
                <input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="e.g. Site A, Office B"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, marginTop: 4 }} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Save as Starred Location</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="Location name"
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }} />
                  <button type="button" onClick={handleSaveAsStarred}
                    style={{ padding: '8px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    ★ Save
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
              <button type="button" onClick={handleSave} disabled={!selectedId || saving || lat === undefined}
                style={{ padding: '10px 28px', background: selectedId && lat !== undefined ? '#1a3c6e' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 6, cursor: selectedId && lat !== undefined ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
                {saving ? 'Saving...' : 'Set Working Location'}
              </button>
              {msg && <span style={{ fontSize: 13, color: msg.includes('saved') || msg.includes('starred') ? '#16a34a' : '#ef4444' }}>{msg}</span>}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
