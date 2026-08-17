import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import LocationModal from '../components/LocationModal';
import { qrApi, locationApi } from '../api/endpoints';
import './QRManagement.css';

export default function ContractorsList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [savedLocations, setSavedLocations] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qrApi.contractors();
      setRows(res.data || []);
      const lRes = await locationApi.list();
      setSavedLocations(lRes.data || []);
    } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [c.name, c.contact_mobile, c.site_name, c.location_address, c.location_lat, c.location_lng]
      .some((v) => v != null && String(v).toLowerCase().includes(q));
  });

  return (
    <AppLayout title="All Contractors">
      <div className="qr-mgmt">
        <div className="mgmt-toolbar">
          <div className="mgmt-filters">
            <b>{filtered.length} / {rows.length} contractors</b>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, mobile, site, address..."
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, minWidth: 260 }}
            />
            {search && (
              <button className="btn-primary" style={{ background: '#ef4444', padding: '6px 12px' }} onClick={() => setSearch('')}>Clear</button>
            )}
            <button className="btn-primary" onClick={load}>Refresh</button>
          </div>
        </div>
        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr><th>Name</th><th>Mobile</th><th>Site</th><th>Location</th><th>Type</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.contact_mobile || '—'}</td>
                  <td>{c.site_name || '—'}</td>
                  <td style={{ fontSize: 12, color: c.location_lat ? '#374151' : '#9ca3af' }}>
                    {c.location_address || (c.location_lat ? `${c.location_lat.toFixed(4)}, ${c.location_lng.toFixed(4)}` : 'Not set')}
                  </td>
                  <td>{c.is_primary ? 'Primary' : 'Secondary'}</td>
                  <td><span className={`status-badge ${c.is_active ? 'badge-approved' : 'badge-rejected'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button className="btn-primary" style={{ background: '#1a3c6e', padding: '6px 12px' }}
                      onClick={() => setSelected(c)}>
                      Set Location
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="empty-row">No contractors match "{search}".</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <LocationModal
          contractor={selected}
          savedLocations={savedLocations}
          onClose={() => setSelected(null)}
          onSaved={() => { load(); }}
        />
      )}
    </AppLayout>
  );
}
