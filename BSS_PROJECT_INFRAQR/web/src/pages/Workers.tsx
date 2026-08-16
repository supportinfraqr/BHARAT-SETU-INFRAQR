import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import './Workers.css';
import AppLayout from '../components/AppLayout';

export default function Workers() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/qr/workers/');
      setWorkers(res.data || []);
    } catch (e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout title="Workers">
      <div className="workers-page">
        <h2 className="qr-page-title">Workers</h2>
      {loading && <div className="module-loading">Loading workers...</div>}
      <div className="worker-grid">
        {workers.map((w) => (
          <div key={w.id} className="worker-card">
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
              <a className="worker-card-link" href={api.defaults.baseURL + `/qr/workers/${w.id}/card/?fmt=png`} target="_blank" rel="noreferrer">
                View ID Card
              </a>
            </div>
          </div>
        ))}
      </div>
      {!loading && workers.length === 0 && <div className="module-empty">No workers registered yet.</div>}
      </div>
    </AppLayout>
  );
}
