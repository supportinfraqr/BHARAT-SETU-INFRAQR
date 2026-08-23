import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import api from '../api/client';
import './QRManagement.css';

export default function MyContractor() {
  const [p, setP] = useState<any>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/qr/profile/me/');
      setP(res.data?.Data?.profile || {});
    } catch (e: any) {
      setMsg(e?.response?.data?.Message || 'Could not load contractor');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const contractor = p?.contractor_name || (p?.contractor ? `#${p.contractor}` : '—');
  const site = p?.site_name || (p?.site ? `#${p.site}` : '—');

  return (
    <AppLayout title="My Contractor">
      <div className="qr-mgmt">
        {msg && <div className="mgmt-msg">{msg}</div>}
        <div className="my-plan-header">
          <h2>{contractor}</h2>
          <p>Contractor you are currently assigned to.</p>
        </div>
        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr><th>Detail</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td><b>Contractor</b></td><td>{contractor}</td></tr>
              <tr><td><b>Site</b></td><td>{site}</td></tr>
              <tr><td><b>Employer</b></td><td>{p?.employer_name || '—'}</td></tr>
              <tr><td><b>Worker ID</b></td><td>{p?.worker_id || '—'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
