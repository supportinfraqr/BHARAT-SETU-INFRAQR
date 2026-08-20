import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import LocationModal from '../components/LocationModal';
import ViewTreeModal from '../components/ViewTreeModal';
import { qrApi, locationApi } from '../api/endpoints';
import './QRManagement.css';

export default function ContractorsList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [savedLocations, setSavedLocations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [treeView, setTreeView] = useState<{ id: number; name: string } | null>(null);
  const [reassign, setReassign] = useState<{ from: number; to: string } | null>(null);
  const [reassignBusy, setReassignBusy] = useState(false);
  const [reassignMsg, setReassignMsg] = useState('');

  const user = JSON.parse(localStorage.getItem('bss_user') || localStorage.getItem('bss_legacy_user') || '{}');
  const isAdmin = String(user.LoginType || user.role) === '1' || String(user.role) === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qrApi.contractors();
      setRows(res.data || []);
      const lRes = await locationApi.list();
      setSavedLocations(lRes.data?.Data || lRes.data || []);
    } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [c.name, c.contact_mobile, c.site_name, c.location_address, c.location_lat, c.location_lng]
      .some((v) => v != null && String(v).toLowerCase().includes(q));
  });

  const doReassign = async () => {
    if (!reassign) return;
    const to = Number(reassign.to);
    if (!to) { setReassignMsg('Select a target contractor'); return; }
    if (!window.confirm(`Reassign ALL workers from contractor #${reassign.from} to #${to}? This cannot be undone.`)) return;
    setReassignBusy(true); setReassignMsg('');
    try {
      await qrApi.reassignContractors(reassign.from, to);
      setReassignMsg('Workers reassigned.');
      setReassign(null);
      load();
    } catch (e: any) {
      setReassignMsg(e?.response?.data?.Message || 'Reassign failed');
    } finally { setReassignBusy(false); }
  };

  return (
    <AppLayout title="All Contractors">
      <div className="qr-mgmt">
        <div className="mgmt-toolbar">
          <div className="mgmt-filters">
            <b>{filtered.length} / {rows.length} contractors</b>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, mobile, site, address..."
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, minWidth: 260 }}
            />
            {search && (
              <button className="btn-primary" style={{ background: '#ef4444', padding: '6px 12px' }} onClick={() => setSearch('')}>Clear</button>
            )}
            <button className="btn-primary" onClick={load}>Refresh</button>
          </div>
        </div>
        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr><th>Name</th><th>Mobile</th><th>Site</th><th>Location</th><th>Type</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.contact_mobile || '—'}</td>
                  <td>{c.site_name || '—'}</td>
                  <td style={{ fontSize: 12, color: c.location_lat ? '#374151' : '#9ca3af' }}>
                    {c.location_address || (c.location_lat ? `${c.location_lat.toFixed(4)}, ${c.location_lng.toFixed(4)}` : 'Not set')}
                  </td>
                  <td>{c.is_primary ? 'Primary' : 'Secondary'}</td>
                  <td><span className={`status-badge ${c.is_active ? 'badge-approved' : 'badge-rejected'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {isAdmin && (
                        <>
                          <button className="btn-primary" style={{ background: '#047857', padding: '6px 10px' }}
                            onClick={() => setTreeView({ id: c.id, name: c.name })}>
                            View Tree
                          </button>
                          <button className="btn-primary" style={{ background: '#b45309', padding: '6px 10px' }}
                            onClick={() => { setReassign({ from: c.id, to: '' }); setReassignMsg(''); }}>
                            Reassign
                          </button>
                        </>
                      )}
                      <button className="btn-primary" style={{ background: '#1a3c6e', padding: '6px 12px' }}
                        onClick={() => setSelected(c)}>
                        Set Location
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="empty-row">No contractors match "{search}".</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <LocationModal
          contractor={selected}
          savedLocations={savedLocations}
          onClose={() => setSelected(null)}
          onSaved={() => { load(); }}
        />
      )}
      {treeView && (
        <ViewTreeModal
          type="contractor"
          id={treeView.id}
          name={treeView.name}
          onClose={() => setTreeView(null)}
        />
      )}
      {reassign && (
        <div className="qr-modal-overlay" onClick={() => !reassignBusy && setReassign(null)}>
          <div className="qr-modal" style={{ width: 'min(460px, 94vw)', padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', color: '#022B5E' }}>Reassign Workers</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
              Move all workers from <b>#{reassign.from}</b> to another contractor. History is preserved.
            </p>
            <select
              className="plan-select"
              style={{ width: '100%', padding: '10px', marginBottom: 12 }}
              value={reassign.to}
              onChange={(e) => setReassign({ ...reassign, to: e.target.value })}
            >
              <option value="">Select target contractor</option>
              {rows.filter((c) => c.id !== reassign.from).map((c) => (
                <option key={c.id} value={c.id}>{c.name} (Site: {c.site_name || '—'})</option>
              ))}
            </select>
            {reassignMsg && <div style={{ marginBottom: 10, fontSize: 13, color: reassignMsg.includes('reassigned') ? '#16a34a' : '#ef4444' }}>{reassignMsg}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-approve" style={{ flex: 1 }} disabled={reassignBusy} onClick={doReassign}>
                {reassignBusy ? 'Reassigning...' : 'Confirm Reassign'}
              </button>
              <button className="btn-reject" style={{ flex: 1 }} disabled={reassignBusy} onClick={() => setReassign(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
