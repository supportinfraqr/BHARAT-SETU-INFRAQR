import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { qrApi } from '../api/endpoints';
import './QRManagement.css';

export default function ContractorsList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          <button className="btn-primary" onClick={load}>Refresh</button>
        </div>
        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr><th>Name</th><th>Mobile</th><th>Site</th><th>Type</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.contact_mobile || '—'}</td>
                  <td>{c.site_name || '—'}</td>
                  <td>{c.is_primary ? 'Primary' : 'Secondary'}</td>
                  <td><span className={`status-badge ${c.is_active ? 'badge-approved' : 'badge-rejected'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
              {!loading && rows.length === 0 && <tr><td colSpan={5} className="empty-row">No contractors.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
