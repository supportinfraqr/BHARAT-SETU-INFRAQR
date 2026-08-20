import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import api from '../api/client';
import { qrApi } from '../api/endpoints';
import './QRManagement.css';

export default function MyEmployers() {
  const [rows, setRows] = useState<any[]>([]);
  const [contractor, setContractor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Resolve the logged-in contractor's id from the session (contractor_id / employer link).
      let conId: number | null = null;
      const meRes = await api.get('/auth/me/').catch(() => null);
      conId = meRes?.data?.Data?.contractor_id || null;
      if (!conId) {
        const user = JSON.parse(localStorage.getItem('bss_user') || localStorage.getItem('bss_legacy_user') || '{}');
        conId = user.contractor_id || user.LoginId || null;
      }
      if (!conId) {
        setMsg('Contractor account not linked to a contractor entity yet.');
        setRows([]);
        return;
      }
      const res = await qrApi.contractorEmployments(Number(conId));
      const data = res.data?.Data;
      if (data) {
        setContractor(data.contractor);
        setRows(data.employers || []);
      }
    } catch (e: any) {
      setMsg(e?.response?.data?.Message || 'Failed to load employers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout title="My Employers">
      <div className="qr-mgmt">
        {msg && <div className="mgmt-msg">{msg}</div>}
        {contractor && (
          <div className="my-plan-header">
            <h2>{contractor.name}</h2>
            <p>Employers this contractor is linked to.</p>
          </div>
        )}
        <div className="mgmt-toolbar">
          <div className="mgmt-filters"><b>{rows.length} employers</b></div>
          <button className="btn-primary" onClick={load}>Refresh</button>
        </div>
        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr><th>Employer</th><th>Contact</th><th>Email</th><th>City</th><th>Industry</th></tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td><b>{e.name}</b></td>
                  <td>{e.contact_person || '—'}</td>
                  <td>{e.email || '—'}</td>
                  <td>{e.city || '—'}</td>
                  <td>{e.industry || '—'}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="empty-row">No employers linked to this contractor yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
