import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { qrApi } from '../api/endpoints';
import './QRManagement.css';


type Party = 'initiator' | 'approver';

export default function BindingRequests() {
  const [bindings, setBindings] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('bss_user') || localStorage.getItem('bss_legacy_user') || '{}');
  const lt = String(currentUser.LoginType || currentUser.role || '');

  const myParty = (b: any): Party | null => {
    if (b.binding_type === 'EMPLOYER_CONTRACTOR') {
      if (lt === '2' || lt === '6' || lt === 'PRIMARY_CONTRACTOR' || lt === 'SECONDARY_CONTRACTOR') return 'initiator';
      if (lt === '5' || lt === 'EMPLOYER') return 'approver';
    } else if (b.binding_type === 'WORKER_CONTRACTOR') {
      if (lt === '7' || lt === 'WORKER') return 'initiator';
      if (lt === '2' || lt === '6' || lt === 'PRIMARY_CONTRACTOR' || lt === 'SECONDARY_CONTRACTOR') return 'approver';
    }
    return null;
  };

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

  const unbind = async (b: any) => {
    const id = String(b.id);
    // Synthetic worker-binding entries (id like "w<workerId>") represent a worker
    // directly assigned to the contractor — unbind via the worker-unbind endpoint.
    if (id.startsWith('w')) {
      const workerId = id.slice(1);
      if (!window.confirm('Unbind this worker from the contractor?')) return;
      setBusy(true); setMsg('');
      try {
        await qrApi.unbind(Number(workerId));
        setMsg('Worker unbound.');
        await load();
      } catch (e: any) {
        setMsg(e?.response?.data?.Message || 'Unbind failed');
      } finally { setBusy(false); }
      return;
    }
    // Real binding record -> initiate unbind request; the other party approves.
    if (!window.confirm('Request to unbind this contract? The other party must approve.')) return;
    setBusy(true); setMsg('');
    try {
      await qrApi.unbindBinding(Number(id));
      setMsg('Unbind request created. Waiting for the other party to approve.');
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.Message || 'Unbind request failed');
    } finally { setBusy(false); }
  };

  const unbindApprove = async (b: any, approve: boolean) => {
    const party = myParty(b);
    if (!party) { setMsg('You cannot act on this binding.'); return; }
    setBusy(true); setMsg('');
    try {
      const res = await qrApi.unbindConsentResolve(Number(b.id), party, approve);
      const d = res.data?.Data;
      if (d?.binding_complete) setMsg('Binding unbound.');
      else if (approve) setMsg('You approved the unbind. Waiting for the other party.');
      else setMsg('Unbind rejected.');
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
              <tr><th>Type</th><th>Contractor</th><th>Employer</th><th>Worker</th><th>Status</th><th>Consent</th><th>Requested</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {shown.map((b) => {
                const consents = [
                  { party: 'initiator' as Party, value: b.initiator_consent },
                  { party: 'approver' as Party, value: b.approver_consent },
                ];
                const bothApproved = consents.every((c) => c.value === 'APPROVED');
                return (
                  <tr key={b.id}>
                    <td>{b.binding_type === 'EMPLOYER_CONTRACTOR' ? 'Employer - Contractor' : 'Worker - Contractor'}</td>
                    <td><b>{b.contractor?.name || '—'}</b></td>
                    <td>{b.employer?.name || '—'}</td>
                    <td>{b.worker?.name || '—'}</td>
                    <td><span className={`status-badge ${badge(b.status)}`}>{b.status}</span></td>
                    <td>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {b.binding_type === 'EMPLOYER_CONTRACTOR'
                          ? `C:${b.initiator_consent || '—'} / E:${b.approver_consent || '—'}`
                          : `W:${b.initiator_consent || '—'} / C:${b.approver_consent || '—'}`}
                        {bothApproved && b.status !== 'ACTIVE' ? ' (auto-activate)' : ''}
                        {b.unbind_status === 'PENDING' && (
                          <div style={{ marginTop: 4, color: '#b45309' }}>
                            Unbind pending (I:{b.initiator_unbind_consent || 'NONE'} / A:{b.approver_unbind_consent || 'NONE'})
                          </div>
                        )}
                      </span>
                    </td>
                    <td>{b.created_at ? new Date(b.created_at).toLocaleString() : '—'}</td>
                    <td className="actions-cell">
                      {b.status === 'PENDING' && (
                        <>
                          <button className="btn-approve" disabled={busy} onClick={() => decide(b.id, 'APPROVE')}>Approve</button>
                          <button className="btn-reject" disabled={busy} onClick={() => decide(b.id, 'REJECT')}>Reject</button>
                        </>
                      )}
                      {b.status === 'ACTIVE' && b.unbind_status !== 'PENDING' && (
                        <button className="btn-reject" disabled={busy} onClick={() => unbind(b)}>Unbind</button>
                      )}
                      {b.status === 'ACTIVE' && b.unbind_status === 'PENDING' && (() => {
                        const myP = myParty(b);
                        const myConsent = myP === 'initiator' ? b.initiator_unbind_consent : b.approver_unbind_consent;
                        if (myConsent === 'APPROVED') {
                          return <span className="muted" style={{ fontSize: 12 }}>Waiting for other party</span>;
                        }
                        return (
                          <>
                            <button className="btn-approve" disabled={busy} onClick={() => unbindApprove(b, true)}>Approve Unbind</button>
                            <button className="btn-reject" disabled={busy} onClick={() => unbindApprove(b, false)}>Reject Unbind</button>
                          </>
                        );
                      })()}
                      {b.status !== 'PENDING' && b.status !== 'ACTIVE' && <span className="muted">—</span>}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && <tr><td colSpan={8} className="empty-row">No binding requests.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
