import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { qrApi } from '../api/endpoints';
import './QRManagement.css';

export default function WorkerBinding() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL'); // ALL | BOUND | UNBOUND
  const [selContractor, setSelContractor] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [wres, cres] = await Promise.all([qrApi.workers(), qrApi.contractors()]);
      setWorkers(wres.data || []);
      setContractors(cres.data || []);
    } catch (e: any) {
      setMsg(e?.response?.data?.Message || 'Failed to load');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const bind = async (worker: any) => {
    const cid = selContractor[worker.id];
    if (!cid) { setMsg(`Select a contractor for ${worker.full_name}`); return; }
    if (!loc) { setMsg('Location unavailable — allow geolocation to bind by geo-verification.'); return; }
    setBusy(true); setMsg('');
    try {
      await qrApi.createBinding({
        binding_type: 'WORKER_CONTRACTOR',
        worker: worker.id,
        contractor: Number(cid),
        latitude: loc.lat,
        longitude: loc.lng,
      });
      setMsg(`${worker.full_name} bound.`);
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.Message || 'Bind failed');
    } finally { setBusy(false); }
  };

  const unbind = async (worker: any) => {
    if (!window.confirm(`Unbind ${worker.full_name}?`)) return;
    setBusy(true); setMsg('');
    try {
      await qrApi.unbind(worker.id);
      setMsg(`${worker.full_name} unbound.`);
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.Message || 'Unbind failed');
    } finally { setBusy(false); }
  };

  const shown = workers.filter((w) => {
    const b = !!w.contractor;
    if (filter === 'BOUND') return b;
    if (filter === 'UNBOUND') return !b;
    return true;
  });

  return (
    <AppLayout title="Worker Binding">
      <div className="qr-mgmt">
        {msg && <div className="mgmt-msg">{msg}</div>}
        <div className="mgmt-toolbar">
          <div className="mgmt-filters">
            <button className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>All ({workers.length})</button>
            <button className={`filter-btn ${filter === 'UNBOUND' ? 'active' : ''}`} onClick={() => setFilter('UNBOUND')}>Unbound</button>
            <button className={`filter-btn ${filter === 'BOUND' ? 'active' : ''}`} onClick={() => setFilter('BOUND')}>Bound</button>
          </div>
          <button className="btn-primary" onClick={load}>Refresh</button>
        </div>

        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th>Worker</th><th>Status</th><th>Contractor</th><th>Bind / Unbind</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((w) => {
                const isBound = !!w.contractor;
                return (
                  <tr key={w.id}>
                    <td>
                      <b>{w.full_name}</b>
                      <div className="muted">{w.worker_id || `#${w.id}`}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${isBound ? 'badge-approved' : 'badge-pending'}`}>
                        {isBound ? 'BOUND' : 'UNBOUND'}
                      </span>
                    </td>
                    <td>
                      {isBound
                        ? <>#{w.contractor} <span className="muted">({contractors.find((c) => c.id === w.contractor)?.name || ''})</span></>
                        : '—'}
                    </td>
                    <td className="actions-cell">
                      {isBound ? (
                        <button className="btn-reject" disabled={busy} onClick={() => unbind(w)}>Unbind</button>
                      ) : (
                        <>
                          <select
                            className="plan-select"
                            value={selContractor[w.id] || ''}
                            onChange={(e) => setSelContractor({ ...selContractor, [w.id]: e.target.value })}
                          >
                            <option value="">Select contractor</option>
                            {contractors.map((c) => (
                              <option key={c.id} value={c.id}>{c.name} (Site: {c.site_name || '—'})</option>
                            ))}
                          </select>
                          <button className="btn-approve" disabled={busy || !selContractor[w.id]} onClick={() => bind(w)}>Bind</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && <tr><td colSpan={4} className="empty-row">No workers in this view.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
