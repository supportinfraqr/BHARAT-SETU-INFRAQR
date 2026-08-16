import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { qrMgmtApi } from '../api/endpoints';
import './QRManagement.css';

export default function EmployerApprovals() {
  const [employers, setEmployers] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await qrMgmtApi.employers(filter || undefined);
      setEmployers(res.data?.Data || []);
    } catch (e) {}
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: number, decision: 'APPROVE' | 'REJECT') => {
    setBusy(true);
    try {
      await qrMgmtApi.approve(id, decision);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.Message || 'Action failed');
    } finally { setBusy(false); }
  };

  const statusBadge = (s: string) => {
    const cls = s === 'APPROVED' ? 'badge-approved' : s === 'REJECTED' ? 'badge-rejected' : 'badge-pending';
    return <span className={`status-badge ${cls}`}>{s}</span>;
  };

  return (
    <AppLayout title="Employer Approvals">
      <div className="qr-mgmt">
        <div className="mgmt-toolbar">
          <div className="mgmt-filters">
            <button className={`filter-btn ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>All</button>
            <button className={`filter-btn ${filter === 'PENDING' ? 'active' : ''}`} onClick={() => setFilter('PENDING')}>Pending</button>
            <button className={`filter-btn ${filter === 'APPROVED' ? 'active' : ''}`} onClick={() => setFilter('APPROVED')}>Approved</button>
            <button className={`filter-btn ${filter === 'REJECTED' ? 'active' : ''}`} onClick={() => setFilter('REJECTED')}>Rejected</button>
          </div>
          <button className="btn-primary" onClick={load}>Refresh</button>
        </div>

        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th>Employer</th><th>Contact</th><th>Email</th><th>Status</th><th>Plan</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employers.map((e) => (
                <tr key={e.id}>
                  <td><b>{e.name}</b><div className="muted">{e.qr_reference ? 'QR issued' : 'No QR'}</div></td>
                  <td>{e.contact_person || '—'}<div className="muted">{e.contact_mobile || ''}</div></td>
                  <td>{e.email || '—'}</td>
                  <td>{statusBadge(e.approval_status)}</td>
                  <td>{e.plan_type || 'FREE'}</td>
                  <td className="actions-cell">
                    {e.approval_status === 'PENDING' && (
                      <>
                        <button className="btn-approve" disabled={busy} onClick={() => decide(e.id, 'APPROVE')}>Approve</button>
                        <button className="btn-reject" disabled={busy} onClick={() => decide(e.id, 'REJECT')}>Reject</button>
                      </>
                    )}
                    {e.approval_status !== 'PENDING' && <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
              {employers.length === 0 && <tr><td colSpan={6} className="empty-row">No employers found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
