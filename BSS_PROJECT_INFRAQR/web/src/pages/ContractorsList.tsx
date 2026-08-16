import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { qrApi } from '../api/endpoints';
import './QRManagement.css';

export default function ContractorsList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qrApi.contractors();
      setRows(res.data || []);
    } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout title="All Contractors">
      <div className="qr-mgmt">
        <div className="mgmt-toolbar">
          <div className="mgmt-filters"><b>{rows.length} contractors</b></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={() => navigate('/qr/locations')} style={{ background: '#1a3c6e' }}>
              Set Locations
            </button>
            <button className="btn-primary" onClick={load}>Refresh</button>
          </div>
        </div>
        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr><th>Name</th><th>Mobile</th><th>Site</th><th>Location</th><th>Type</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.contact_mobile || '—'}</td>
                  <td>{c.site_name || '—'}</td>
                  <td style={{ fontSize: 12, color: c.location_lat ? '#374151' : '#9ca3af' }}>
                    {c.location_lat ? `${c.location_lat.toFixed(4)}, ${c.location_lng.toFixed(4)}` : 'Not set'}
                  </td>
                  <td>{c.is_primary ? 'Primary' : 'Secondary'}</td>
                  <td><span className={`status-badge ${c.is_active ? 'badge-approved' : 'badge-rejected'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="empty-row">No contractors.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
