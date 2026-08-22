import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { qrMgmtApi } from '../api/endpoints';
import './QRManagement.css';

export default function EmployerApprovals() {
  const [employers, setEmployers] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [busyRow, setBusyRow] = useState<number | null>(null);
  const [expiryByEmp, setExpiryByEmp] = useState<Record<number, string>>({});
  const [rowMsg, setRowMsg] = useState<Record<number, { type: 'ok' | 'err'; text: string }>>({});

  const load = useCallback(async () => {
    try {
      const res = await qrMgmtApi.employers(filter || undefined);
      const data = res.data?.Data || [];
      setEmployers(data);
      // Sync local expiry edits with server data
      const sync: Record<number, string> = {};
      data.forEach((e: any) => {
        sync[e.id] = e.plan_expiry ? new Date(e.plan_expiry).toISOString().slice(0, 10) : '';
      });
      setExpiryByEmp((prev) => ({ ...sync, ...prev }));
    } catch (e) {}
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const patchRow = (id: number, patch: any) => {
    setEmployers((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const flash = (id: number, type: 'ok' | 'err', text: string) => {
    setRowMsg((prev) => ({ ...prev, [id]: { type, text } }));
    setTimeout(() => {
      setRowMsg((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }, 3500);
  };

  const decide = async (id: number, decision: 'APPROVE' | 'REJECT') => {
    setBusyRow(id);
    try {
      await qrMgmtApi.approve(id, decision);
      patchRow(id, { approval_status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', is_active: decision === 'APPROVE' });
      flash(id, 'ok', decision === 'APPROVE' ? 'Approved' : 'Rejected');
    } catch (e: any) {
      flash(id, 'err', e?.response?.data?.Message || 'Action failed');
    } finally { setBusyRow(null); }
  };

  const setPlan = async (id: number, plan: string) => {
    if (!plan) return;
    setBusyRow(id);
    try {
      const res = await qrMgmtApi.attachPlan(plan, id, expiryByEmp[id]);
      const updated = res.data?.Data;
      if (updated) patchRow(id, { plan_type: updated.plan_type, plan_expiry: updated.plan_expiry });
      setExpiryByEmp((prev) => ({ ...prev, [id]: updated?.plan_expiry ? new Date(updated.plan_expiry).toISOString().slice(0, 10) : prev[id] }));
      flash(id, 'ok', `${plan} plan saved`);
    } catch (e: any) {
      flash(id, 'err', e?.response?.data?.Message || 'Failed to set plan');
    } finally { setBusyRow(null); }
  };

  const setExpiryOnly = async (id: number) => {
    const emp = employers.find((e) => e.id === id);
    if (!emp?.plan_type) { flash(id, 'err', 'Select a plan first'); return; }
    setBusyRow(id);
    try {
      const res = await qrMgmtApi.attachPlan(emp.plan_type, id, expiryByEmp[id]);
      const updated = res.data?.Data;
      if (updated) patchRow(id, { plan_expiry: updated.plan_expiry });
      flash(id, 'ok', 'Expiry updated');
    } catch (e: any) {
      flash(id, 'err', e?.response?.data?.Message || 'Failed to update expiry');
    } finally { setBusyRow(null); }
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
                        <button className="btn-approve" disabled={busyRow !== null} onClick={() => decide(e.id, 'APPROVE')}>Approve</button>
                        <button className="btn-reject" disabled={busyRow !== null} onClick={() => decide(e.id, 'REJECT')}>Reject</button>
                      </>
                    )}
                    {e.approval_status === 'APPROVED' && (
                      <>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            className="plan-select"
                            value={e.plan_type || ''}
                            disabled={busyRow !== null}
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
                            value={expiryByEmp[e.id] || ''}
                            disabled={busyRow !== null}
                            onChange={(ev) => setExpiryByEmp((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                            title="Set plan expiry date"
                          />
                          <button className="btn-primary" style={{ padding: '6px 10px' }} disabled={busyRow !== null}
                            onClick={() => setExpiryOnly(e.id)}>
                            {busyRow === e.id ? 'Saving...' : 'Set Expiry'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                          <button className="btn-reject" style={{ padding: '4px 10px', fontSize: 12 }} disabled={busyRow !== null}
                            onClick={() => decide(e.id, 'REJECT')}>Reject</button>
                          {rowMsg[e.id] && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: rowMsg[e.id].type === 'ok' ? '#16a34a' : '#ef4444' }}>
                              {rowMsg[e.id].text}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                    {e.approval_status === 'REJECTED' && (
                      <button className="btn-approve" disabled={busyRow !== null} onClick={() => decide(e.id, 'APPROVE')}>Re-approve</button>
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