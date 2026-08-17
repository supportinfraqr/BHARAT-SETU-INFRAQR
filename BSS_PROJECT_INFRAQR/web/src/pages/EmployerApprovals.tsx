import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { qrMgmtApi } from '../api/endpoints';
import './QRManagement.css';

export default function EmployerApprovals() {
  const [employers, setEmployers] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [expiryByEmp, setExpiryByEmp] = useState<Record<number, string>>({});

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

  const setPlan = async (id: number, plan: string) => {
    if (!plan) return;
    setBusy(true);
    try {
      await qrMgmtApi.attachPlan(plan, id, expiryByEmp[id]);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.Message || 'Failed to set plan');
    } finally { setBusy(false); }
  };

  const statusBadge = (s: string) => {
    const cls = s === 'APPROVED' ? 'badge-approved' : s === 'REJECTED' ? 'badge-rejected' : 'badge-pending';
    return <span className={`status-badge ${cls}`}>{s}</span>;
  };

  return (
    <AppLayout title="Employers">
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
                <th>Employer</th><th>Contact</th><th>Email</th><th>Status</th><th>Plan</th><th>Expiry</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employers.map((e) => (
                <tr key={e.id}>
                  <td><b>{e.name}</b><div className="muted">{e.qr_reference ? 'QR issued' : 'No QR'}</div></td>
                  <td>{e.contact_person || '—'}<div className="muted">{e.contact_mobile || ''}</div></td>
                  <td>{e.email || '—'}</td>
                  <td>{statusBadge(e.approval_status)}</td>
                  <td>{e.plan_type || '—'}</td>
                  <td>
                    {e.plan_expiry ? (
                      <div style={{ fontSize: 12, color: new Date(e.plan_expiry) < new Date() ? '#ef4444' : '#374151' }}>
                        {new Date(e.plan_expiry).toLocaleDateString()}
                        {new Date(e.plan_expiry) < new Date() && <div style={{ color: '#ef4444' }}>Expired</div>}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="actions-cell">
                    {e.approval_status === 'PENDING' && (
                      <>
                        <button className="btn-approve" disabled={busy} onClick={() => decide(e.id, 'APPROVE')}>Approve</button>
                        <button className="btn-reject" disabled={busy} onClick={() => decide(e.id, 'REJECT')}>Reject</button>
                      </>
                    )}
                    {e.approval_status === 'APPROVED' && (
                      <>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            className="plan-select"
                            value={e.plan_type || ''}
                            disabled={busy}
                            onChange={(ev) => setPlan(e.id, ev.target.value)}
                          >
                            <option value="">Select plan</option>
                            <option value="SILVER">Silver</option>
                            <option value="GOLD">Gold</option>
                            <option value="PLATINUM">Platinum</option>
                          </select>
                          <input
                            type="date"
                            className="plan-select"
                            value={expiryByEmp[e.id] || (e.plan_expiry ? new Date(e.plan_expiry).toISOString().slice(0, 10) : '')}
                            disabled={busy}
                            onChange={(ev) => setExpiryByEmp((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                            title="Set plan expiry date"
                          />
                          <button className="btn-primary" style={{ padding: '6px 10px' }} disabled={busy}
                            onClick={() => setPlan(e.id, e.plan_type)}>Set Expiry</button>
                        </div>
                        <button className="btn-reject" disabled={busy} onClick={() => decide(e.id, 'REJECT')} style={{ marginTop: 6 }}>Reject</button>
                      </>
                    )}
                    {e.approval_status === 'REJECTED' && (
                      <button className="btn-approve" disabled={busy} onClick={() => decide(e.id, 'APPROVE')}>Re-approve</button>
                    )}
                  </td>
                </tr>
              ))}
              {employers.length === 0 && <tr><td colSpan={7} className="empty-row">No employers found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
