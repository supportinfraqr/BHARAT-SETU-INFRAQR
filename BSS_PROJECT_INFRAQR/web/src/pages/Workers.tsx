import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import ViewTreeModal from '../components/ViewTreeModal';
import './Workers.css';
import AppLayout from '../components/AppLayout';

export default function Workers() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [treeView, setTreeView] = useState<{ id: number; name: string } | null>(null);

  const user = JSON.parse(localStorage.getItem('bss_user') || localStorage.getItem('bss_legacy_user') || '{}');
  const isAdmin = String(user.LoginType || user.role) === '1' || String(user.role) === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    try {
      const res = await api.get('/qr/workers/');
      setWorkers(res.data || []);
    } catch (e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = (w: any) => navigate(`/qr/workers/${w.id}`, { state: { worker: w } });

  const filtered = workers.filter((w) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [w.full_name, w.worker_id, w.mobile, w.designation, w.email]
      .some((v) => v != null && String(v).toLowerCase().includes(q));
  });

  return (
    <AppLayout title="Workers">
      <div className="workers-page">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <h2 className="qr-page-title" style={{ margin: 0, marginRight: 'auto' }}>Workers</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, mobile, designation..."
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, minWidth: 260 }}
          />
          {search && (
            <button className="btn-primary" style={{ background: '#ef4444', padding: '6px 12px' }} onClick={() => setSearch('')}>Clear</button>
          )}
          <button className="btn-primary" onClick={load}>Refresh</button>
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
          {filtered.length} / {workers.length} workers
        </div>
      {loading && <div className="module-loading">Loading workers...</div>}
      <div className="worker-grid">
        {filtered.map((w) => (
          <div key={w.id} className="worker-card" onClick={() => openDetail(w)} style={{ cursor: 'pointer' }}>
            <div className="worker-card-header">
              <div className="worker-avatar">{w.full_name?.[0]?.toUpperCase() || 'W'}</div>
              <div>
                <h4>{w.full_name}</h4>
                <span className="worker-id">{w.worker_id}</span>
              </div>
            </div>
            <div className="worker-meta">
              <p><b>Mobile:</b> {w.mobile || '—'}</p>
              <p><b>Status:</b> <span className={w.is_active ? 'tag-active' : 'tag-inactive'}>{w.is_active ? 'Active' : 'Inactive'}</span></p>
              <p><b>Employer:</b> {w.employer ? `#${w.employer}` : 'Unbound'}</p>
              <p><b>Contractor:</b> {w.contractor ? `#${w.contractor}` : 'Unbound'}</p>
            </div>
            <div className="worker-card-footer">
              <span className="qr-mini-badge">▣ QR</span>
              <span className="worker-card-link" onClick={(e) => e.stopPropagation()}>
                {isAdmin && (
                  <button className="btn-primary" style={{ background: '#047857', padding: '4px 10px', fontSize: 12, marginRight: 6 }}
                    onClick={() => setTreeView({ id: w.id, name: w.full_name })}>
                    View Tree
                  </button>
                )}
                <span onClick={() => openDetail(w)} style={{ cursor: 'pointer' }}>View ID Card →</span>
              </span>
            </div>
          </div>
        ))}
      </div>
      {!loading && workers.length === 0 && <div className="module-empty">No workers registered yet.</div>}
      {!loading && filtered.length === 0 && workers.length > 0 && <div className="module-empty">No workers match "{search}".</div>}
      </div>
      {treeView && (
        <ViewTreeModal
          type="worker"
          id={treeView.id}
          name={treeView.name}
          onClose={() => setTreeView(null)}
        />
      )}
    </AppLayout>
  );
}