import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { Card, Badge, Button } from '../components';
import './Workers.css';

export default function Workers() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/qr/workers/');
      setWorkers(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.Message || e?.message || 'Failed to load worker records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="workers-page">
      <div className="module-header">
        <h2 className="qr-page-title">Workers</h2>
        <Button variant="outline" onClick={load} loading={loading}>
          Refresh List
        </Button>
      </div>

      {loading && <div className="module-loading">Loading worker records...</div>}
      
      {error && (
        <div className="module-error" role="alert">
          <p>{error}</p>
          <Button variant="secondary" onClick={load} style={{ marginTop: 'var(--space-2)' }}>
            Retry Loading
          </Button>
        </div>
      )}

      {!loading && !error && (
        <div className="worker-grid">
          {workers.map((w) => (
            <Card key={w.id} hoverable>
              <div className="ui-card-header">
                <div className="worker-avatar">{w.full_name?.[0]?.toUpperCase() || 'W'}</div>
                <div className="worker-card-info">
                  <h4>{w.full_name || 'Unnamed Worker'}</h4>
                  <span className="worker-id">{w.worker_id || 'ID Pending'}</span>
                </div>
              </div>
              <div className="worker-meta">
                <p><b>Mobile:</b> {w.mobile || '—'}</p>
                <p>
                  <b>Status: </b>
                  <Badge variant={w.is_active ? 'active' : 'inactive'}>
                    {w.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </p>
                <p><b>Employer:</b> {w.employer ? `#${w.employer}` : 'Unbound'}</p>
                <p><b>Contractor:</b> {w.contractor ? `#${w.contractor}` : 'Unbound'}</p>
              </div>
              <div className="ui-card-footer">
                <Badge variant="qr">▣ QR</Badge>
                <a
                  className="worker-card-link"
                  href={api.defaults.baseURL + `/qr/workers/${w.id}/card/?fmt=png`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`View ID Card for ${w.full_name || 'Worker'} (opens in new window)`}
                >
                  View ID Card
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && workers.length === 0 && (
        <div className="module-empty">No workers registered yet.</div>
      )}
    </div>
  );
}
