import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { qrApi } from '../api/endpoints';
import './QRManagement.css';

export default function BindingRequests() {
  const [bindings, setBindings] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await qrApi.bindingList();
      setBindings(res.data?.Data || []);
    } catch (e: any) {
      setMsg(e?.response?.data?.Message || 'Failed to load requests');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: number, decision: 'APPROVE' | 'REJECT') => {
    setBusy(true); setMsg('');
    try {
      await qrApi.approveBinding(id, decision);
      setMsg(decision === 'APPROVE' ? 'Binding approved.' : 'Binding rejected.');
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.Message || 'Action failed');
    } finally { setBusy(false); }
  };

  const shown = bindings.filter((b) => filter === 'ALL' || b.status === filter);
  const badge = (s: string) =>
    s === 'ACTIVE' || s === 'APPROVED' ? 'badge-approved' : s === 'REJECTED' || s === 'ENDED' ? 'badge-rejected' : 'badge-pending';

  return (
    <AppLayout title="Binding Requests">
      <div className="qr-mgmt">
        {msg && <div className="mgmt-msg">{msg}</div>}
        <div className="mgmt-toolbar">
          <div className="mgmt-filters">
            <button className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>All</button>
            <button className={`filter-btn ${filter === 'PENDING' ? 'active' : ''}`} onClick={() => setFilter('PENDING')}>Pending</button>
            <button className={`filter-btn ${filter === 'ACTIVE' ? 'active' : ''}`} onClick={() => setFilter('ACTIVE')}>Active</button>
            <button className={`filter-btn ${filter === 'REJECTED' ? 'active' : ''}`} onClick={() => setFilter('REJECTED')}>Rejected</button>
          </div>
          <button className="btn-primary" onClick={load}>Refresh</button>
        </div>

        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr><th>Type</th><th>Contractor</th><th>Employer</th><th>Worker</th><th>Status</th><th>Requested</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.id}>
                  <td>{b.binding_type === 'EMPLOYER_CONTRACTOR' ? 'Employer↔Contractor' : 'Worker↔Contractor'}</td>
                  <td><b>{b.contractor?.name || '—'}</b></td>
                  <td>{b.employer?.name || '—'}</td>
                  <td>{b.worker?.name || '—'}</td>
                  <td><span className={`status-badge ${badge(b.status)}`}>{b.status}</span></td>
                  <td>{b.created_at ? new Date(b.created_at).toLocaleString() : '—'}</td>
                  <td className="actions-cell">
                    {b.status === 'PENDING' && (
                      <>
                        <button className="btn-approve" disabled={busy} onClick={() => decide(b.id, 'APPROVE')}>Approve</button>
                        <button className="btn-reject" disabled={busy} onClick={() => decide(b.id, 'REJECT')}>Reject</button>
                      </>
                    )}
                    {b.status !== 'PENDING' && <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={7} className="empty-row">No binding requests.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
