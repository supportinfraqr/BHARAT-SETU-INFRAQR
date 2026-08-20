import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { siteApi, qrApi } from '../api/endpoints';
import './QRManagement.css';

export default function Sites() {
  const [sites, setSites] = useState<any[]>([]);
  const [employers, setEmployers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const user = JSON.parse(localStorage.getItem('bss_user') || localStorage.getItem('bss_legacy_user') || '{}');
  const loginType = String(user.LoginType || user.role || '');
  const isAdmin = loginType === '1';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await siteApi.list();
      setSites(res.data?.Data || []);
      if (isAdmin) {
        const e = await qrApi.employers();
        setEmployers(e.data || []);
      }
    } catch (e) {} finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name || !form.employer) { setMsg('Name and Employer are required'); return; }
    setBusy(true); setMsg('');
    try {
      await siteApi.create(form);
      setMsg('Site created!');
      setShowForm(false);
      setForm({});
      load();
    } catch (e: any) { setMsg(e?.response?.data?.Message || 'Failed to create site'); }
    finally { setBusy(false); }
  };

  const deactivate = async (id: number) => {
    setBusy(true);
    try {
      await siteApi.remove(id);
      load();
    } catch (e: any) { setMsg(e?.response?.data?.Message || 'Failed'); }
    finally { setBusy(false); }
  };

  const input = (label: string, key: string, type = 'text') => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</label>
      <input type={type} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, marginTop: 3 }} />
    </div>
  );

  return (
    <AppLayout title="Sites">
      <div className="qr-mgmt">
        {msg && <div style={{ color: msg.includes('!') ? '#16a34a' : '#ef4444', marginBottom: 10 }}>{msg}</div>}
        <div className="mgmt-toolbar">
          <div className="mgmt-filters"><b>{sites.length} sites</b></div>
          {!isAdmin && (
            <button className="btn-primary" onClick={() => { setShowForm(!showForm); setMsg(''); }}>{showForm ? 'Close' : '+ Add Site'}</button>
          )}
        </div>

        {showForm && !isAdmin && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 16, background: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 16px', color: '#022B5E' }}>New Site (belongs to Employer)</h4>
            {isAdmin && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Employer *</label>
                <select value={form.employer || ''} onChange={(e) => setForm({ ...form, employer: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, marginTop: 3 }}>
                  <option value="">Select employer</option>
                  {employers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {input('Site Name *', 'name')}
              {input('Site Code', 'site_code')}
              {input('Address', 'address')}
              {input('City', 'city')}
              {input('State', 'state')}
              {input('Pincode', 'pincode')}
              {input('Latitude', 'latitude')}
              {input('Longitude', 'longitude')}
              {input('Contact Person', 'contact_person')}
              {input('Contact Mobile', 'contact_mobile')}
              {input('GSTIN', 'gstin')}
              {input('PAN', 'pan_no')}
              {input('Valid From', 'valid_from')}
              {input('Valid To', 'valid_to')}
            </div>
            <div style={{ marginTop: 14 }}>
              <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save Site'}</button>
            </div>
          </div>
        )}

        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr><th>Site</th><th>Employer</th><th>City</th><th>State</th><th>Coordinates</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.name}</b>{s.site_code && <div className="muted">{s.site_code}</div>}</td>
                  <td>#{s.employer}</td>
                  <td>{s.city || '—'}</td>
                  <td>{s.state || '—'}</td>
                  <td style={{ fontSize: 12 }}>{s.latitude ? `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}` : '—'}</td>
                  <td><span className={`status-badge ${s.is_active ? 'badge-approved' : 'badge-rejected'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    {!isAdmin && (
                      <button className="btn-reject" style={{ padding: '4px 10px', fontSize: 12 }} disabled={busy} onClick={() => deactivate(s.id)}>Deactivate</button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && sites.length === 0 && <tr><td colSpan={7} className="empty-row">No sites. Add your first site.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}