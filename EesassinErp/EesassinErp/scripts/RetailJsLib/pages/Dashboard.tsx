import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import AppLayout from '../components/AppLayout';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/qr/dashboard/');
      setStats(res.data?.Data);
    } catch (e) {
      console.error('load failed', e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout title="Dashboard">
      <div className="qr-quick-row">
        <a href="#/qr/scan" className="qr-quick-card scan" onClick={() => navigate('/qr/scan')}>
          <span className="qr-quick-icon">▣</span>
          <div><h4>Scan Worker QR</h4><p>Geo-verified attendance</p></div>
        </a>
        <a href="#/qr/workers" className="qr-quick-card workers" onClick={() => navigate('/qr/workers')}>
          <span className="qr-quick-icon">👷</span>
          <div><h4>Workers</h4><p>Profiles & ID cards</p></div>
        </a>
      </div>

      <div className="stat-cards">
        <div className="stat-card" style={{ background: '#022B5E' }}>
          <h3>{stats?.total_workers ?? '—'}</h3>
          <p>Total Workers</p>
        </div>
        <div className="stat-card" style={{ background: '#148f77' }}>
          <h3>{stats?.total_scans ?? '—'}</h3>
          <p>Total Scans</p>
        </div>
        <div className="stat-card" style={{ background: '#b9770e' }}>
          <h3>{stats?.active_sites ?? '—'}</h3>
          <p>Active Sites</p>
        </div>
        <div className="stat-card" style={{ background: '#7d3c98' }}>
          <h3>{stats?.scan_activity?.today ?? '—'}</h3>
          <p>Scans Today</p>
        </div>
      </div>

      <div className="panel">
        <h2>Scan Activity</h2>
        <div className="activity-row">
          <div className="activity-item"><span>Today</span><b>{stats?.scan_activity?.today ?? 0}</b></div>
          <div className="activity-item"><span>This Week</span><b>{stats?.scan_activity?.this_week ?? 0}</b></div>
          <div className="activity-item"><span>This Month</span><b>{stats?.scan_activity?.this_month ?? 0}</b></div>
        </div>
      </div>
    </AppLayout>
  );
}
