import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { qrApi } from '../api/endpoints';
import './QRManagement.css';

type Party = 'initiator' | 'approver';
type Channel = 'APP' | 'SMS_OTP' | 'IVR' | 'VOICE';

interface ConsentUi {
  party: Party;
  channel: Channel;
  otp: string;
  sentOtp: string;
  busy: boolean;
  msg: string;
}

function PartyConsent({ binding, party, onRequest, onResolve }: any) {
  const [ui, setUi] = useState<ConsentUi>({ party, channel: 'APP', otp: '', sentOtp: '', busy: false, msg: '' });
  const status = party === 'initiator' ? binding.initiator_consent : binding.approver_consent;
  const label = party === 'initiator' ? 'Initiator' : 'Approver';

  const badge = (s?: string) => {
    if (s === 'APPROVED') return <span className="status-badge badge-approved">APPROVED</span>;
    if (s === 'REJECTED') return <span className="status-badge badge-rejected">REJECTED</span>;
    if (s === 'TIMEOUT') return <span className="status-badge badge-rejected">TIMEOUT</span>;
    return <span className="status-badge badge-pending">{s || 'NONE'}</span>;
  };

  const send = async () => {
    setUi((u) => ({ ...u, busy: true, msg: '' }));
    try {
      const res = await onRequest(party, ui.channel);
      const sentOtp = res.data?.Data?.otp || '';
      setUi((u) => ({ ...u, busy: false, sentOtp, msg: res.data?.Data?.status === 'PENDING' ? 'Consent requested' : 'Requested' }));
    } catch (e: any) {
      setUi((u) => ({ ...u, busy: false, msg: e?.response?.data?.Message || 'Failed to request consent' }));
    }
  };

  const resolve = async (decision: boolean) => {
    setUi((u) => ({ ...u, busy: true, msg: '' }));
    try {
      const res = await onResolve(party, decision, ui.otp);
      const d = res.data?.Data;
      if (d?.invalid_otp) setUi((u) => ({ ...u, busy: false, msg: 'Invalid OTP' }));
      else if (d?.timed_out) setUi((u) => ({ ...u, busy: false, msg: 'Consent timed out' }));
      else setUi((u) => ({ ...u, busy: false, sentOtp: '', otp: '', msg: decision ? 'Approved' : 'Rejected' }));
    } catch (e: any) {
      setUi((u) => ({ ...u, busy: false, msg: e?.response?.data?.Message || 'Action failed' }));
    }
  };

  const otp = ui.channel === 'SMS_OTP';

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginTop: 8, background: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b>{label}</b> {badge(status)}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <select
          className="plan-select"
          value={ui.channel}
          disabled={ui.busy || status === 'APPROVED' || status === 'REJECTED'}
          onChange={(e) => setUi((u) => ({ ...u, channel: e.target.value as Channel, otp: '', sentOtp: '' }))}
        >
          <option value="APP">App Push</option>
          <option value="SMS_OTP">SMS OTP</option>
          <option value="IVR">IVR Call</option>
          <option value="VOICE">Voice Prompt</option>
        </select>
        <button className="btn-primary" style={{ padding: '6px 12px' }} disabled={ui.busy || status === 'APPROVED' || status === 'REJECTED'} onClick={send}>
          {ui.busy ? 'Sending...' : 'Send Consent Request'}
        </button>
      </div>
      {ui.sentOtp && otp && (
        <div style={{ marginTop: 8, fontSize: 13, color: '#b45309' }}>
          Dev OTP: <b>{ui.sentOtp}</b>
        </div>
      )}
      {otp && (status === 'PENDING' || ui.sentOtp) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
          <input
            className="plan-select"
            placeholder="Enter OTP"
            value={ui.otp}
            onChange={(e) => setUi((u) => ({ ...u, otp: e.target.value }))}
            style={{ width: 140 }}
          />
          <button className="btn-approve" disabled={ui.busy || !ui.otp} onClick={() => resolve(true)}>Approve</button>
          <button className="btn-reject" disabled={ui.busy} onClick={() => resolve(false)}>Reject</button>
        </div>
      )}
      {(status === 'PENDING' || (status !== 'APPROVED' && status !== 'REJECTED')) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn-approve" disabled={ui.busy} onClick={() => resolve(true)}>Approve</button>
          <button className="btn-reject" disabled={ui.busy} onClick={() => resolve(false)}>Reject</button>
        </div>
      )}
      {ui.msg && <div style={{ marginTop: 6, fontSize: 13, color: '#374151' }}>{ui.msg}</div>}
    </div>
  );
}

export default function BindingRequests() {
  const [bindings, setBindings] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

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

  const consentRequest = async (id: number, party: Party, channel: Channel) =>
    qrApi.consentRequest(id, party, channel);
  const consentResolve = async (id: number, party: Party, decision: boolean, otp: string) => {
    const res = await qrApi.consentResolve(id, party, decision, otp || undefined);
    await load();
    return res;
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
                    <td>{b.binding_type === 'EMPLOYER_CONTRACTOR' ? 'Employer↔Contractor' : 'Worker↔Contractor'}</td>
                    <td><b>{b.contractor?.name || '—'}</b></td>
                    <td>{b.employer?.name || '—'}</td>
                    <td>{b.worker?.name || '—'}</td>
                    <td><span className={`status-badge ${badge(b.status)}`}>{b.status}</span></td>
                    <td>
                      <span className="muted" style={{ fontSize: 12 }}>
                        I:{b.initiator_consent || '—'} / A:{b.approver_consent || '—'}
                        {bothApproved && b.status !== 'ACTIVE' ? ' (auto-activate)' : ''}
                      </span>
                    </td>
                    <td>{b.created_at ? new Date(b.created_at).toLocaleString() : '—'}</td>
                    <td className="actions-cell">
                      {b.status === 'PENDING' && (
                        <>
                          <button className="btn-primary" style={{ padding: '4px 10px', marginBottom: 4, fontSize: 12 }}
                            onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
                            {expanded === b.id ? 'Close Consent' : 'Consent'}
                          </button>
                          <button className="btn-approve" disabled={busy} onClick={() => decide(b.id, 'APPROVE')}>Approve</button>
                          <button className="btn-reject" disabled={busy} onClick={() => decide(b.id, 'REJECT')}>Reject</button>
                        </>
                      )}
                      {b.status !== 'PENDING' && <span className="muted">—</span>}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && <tr><td colSpan={8} className="empty-row">No binding requests.</td></tr>}
            </tbody>
          </table>
        </div>

        {expanded != null && (() => {
          const b = bindings.find((x) => x.id === expanded);
          if (!b) return null;
          return (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginTop: 16, background: '#fff' }}>
              <h4 style={{ margin: '0 0 8px', color: '#022B5E' }}>Dual-Handshake Consent — Binding #{b.id}</h4>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b7280' }}>
                Both parties must explicitly consent (APP / SMS OTP / IVR). When both approve, the binding auto-activates.
              </p>
              <PartyConsent binding={b} party="initiator" onRequest={(p: Party, c: Channel) => consentRequest(b.id, p, c)} onResolve={(p: Party, d: boolean, o: string) => consentResolve(b.id, p, d, o)} />
              <PartyConsent binding={b} party="approver" onRequest={(p: Party, c: Channel) => consentRequest(b.id, p, c)} onResolve={(p: Party, d: boolean, o: string) => consentResolve(b.id, p, d, o)} />
            </div>
          );
        })()}
      </div>
    </AppLayout>
  );
}
