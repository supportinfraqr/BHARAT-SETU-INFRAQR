import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import api from '../api/client';
import './RoleDashboard.css';

interface UserInfo {
  LoginId?: string;
  LoginType?: string;
  username?: string;
  Name?: string;
  role?: string;
  EmailId?: string;
  id?: number;
}

export default function RoleDashboard() {
  const navigate = useNavigate();
  const user: UserInfo = JSON.parse(
    localStorage.getItem('bss_legacy_user') || localStorage.getItem('bss_user') || '{}',
  );
  const loginType = String(user.LoginType || user.role || '1');
  const loginId = Number(user.LoginId || user.id || 1);

  return (
    <AppLayout title="Dashboard">
      <DashboardByRole loginType={loginType} loginId={loginId} user={user} navigate={navigate} />
    </AppLayout>
  );
}

function DashboardByRole({ loginType, loginId, user, navigate }: any) {
  // 1=Admin, 5=PE, 6=Contractor, 7=Worker
  if (loginType === '7') return <WorkerDashboard user={user} loginId={loginId} navigate={navigate} />;
  if (loginType === '6') return <ContractorDashboard user={user} loginId={loginId} navigate={navigate} />;
  if (loginType === '5') return <PEDashboard user={user} loginId={loginId} navigate={navigate} />;
  return <AdminDashboard navigate={navigate} />;
}

// ---------- Admin Dashboard ----------
function AdminDashboard({ navigate }: any) {
  const [stats, setStats] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/qr/dashboard/');
      setStats(res.data?.Data);
    } catch (e) {}
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <QuickLinks navigate={navigate} />
      <div className="stat-cards">
        <div className="stat-card" style={{ background: '#022B5E' }}>
          <h3>{stats?.total_workers ?? '—'}</h3><p>Total Workers</p>
        </div>
        <div className="stat-card" style={{ background: '#148f77' }}>
          <h3>{stats?.total_scans ?? '—'}</h3><p>Total Scans</p>
        </div>
        <div className="stat-card" style={{ background: '#b9770e' }}>
          <h3>{stats?.active_sites ?? '—'}</h3><p>Active Sites</p>
        </div>
        <div className="stat-card" style={{ background: '#7d3c98' }}>
          <h3>{stats?.scan_activity?.today ?? '—'}</h3><p>Scans Today</p>
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
    </div>
  );
}

// ---------- Principal Employer Dashboard ----------
function PEDashboard({ user, loginId, navigate }: any) {
  const [d, setD] = useState<any>({});

  const load = useCallback(async () => {
    try {
      const res = await api.post('/RetailSection/SearchPrincipleEmploye', { Action: 1, LoginId: loginId });
      const r = res.data?.Result?.[0] || res.data?.[0] || {};
      setD(r);
    } catch (e) {}
  }, [loginId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <QuickLinks navigate={navigate} />
      <div className="panel pe-profile">
        <h2>{d.PartyName || d.AgencyName || user?.Name || 'Principal Employer'}</h2>
        <div className="pe-meta">
          <span>Contact: {d.ContactPerson || '—'}</span>
          <span>Mobile: {d.ContactMobile || d.Mobile || '—'}</span>
          <span>Email: {d.EmailId || d.Email || user?.EmailId || '—'}</span>
          <span>Address: {d.Address || '—'}</span>
        </div>
      </div>
      <div className="stat-cards">
        <div className="stat-card" style={{ background: '#022B5E' }}>
          <h3>{d.TotalContractor ?? 0}</h3><p>Contractors</p>
        </div>
        <div className="stat-card" style={{ background: '#148f77' }}>
          <h3>{d.TotalSite ?? 0}</h3><p>Sites</p>
        </div>
        <div className="stat-card" style={{ background: '#b9770e' }}>
          <h3>{d.TotalWorker ?? 0}</h3><p>Workers</p>
        </div>
      </div>
      <div className="panel">
        <h2>My Business</h2>
        <p>PAN: {d.PanNo || '—'} · GSTIN: {d.GSTIN || '—'} · CIN: {d.CIN || '—'}</p>
        <p>State: {d.State || '—'} · City: {d.City || '—'} · Pincode: {d.Pincode || '—'}</p>
      </div>
    </div>
  );
}

// ---------- Contractor Dashboard ----------
function ContractorDashboard({ user, loginId, navigate }: any) {
  const [workers, setWorkers] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({});

  const load = useCallback(async () => {
    try {
      const wres = await api.get('/qr/workers/');
      setWorkers((wres.data || []).filter((w: any) => w.contractor === loginId || !w.contractor));
      const pres = await api.post('/RetailSection/SearchPrincipleEmploye', { Action: 1, LoginId: loginId });
      setProfile(pres.data?.Result?.[0] || pres.data?.[0] || {});
    } catch (e) {}
  }, [loginId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <QuickLinks navigate={navigate} />
      <div className="panel pe-profile">
        <h2>{profile.PartyName || profile.AgencyName || user?.Name || 'Contractor'}</h2>
        <div className="pe-meta">
          <span>Mobile: {profile.ContactMobile || profile.Mobile || '—'}</span>
          <span>Email: {profile.EmailId || profile.Email || '—'}</span>
        </div>
      </div>
      <div className="stat-cards">
        <div className="stat-card" style={{ background: '#022B5E' }}>
          <h3>{workers.length}</h3><p>My Workers</p>
        </div>
      </div>
      <div className="panel">
        <h2>Workers</h2>
        {workers.length === 0 ? <p className="module-empty">No workers assigned.</p> : (
          <ul className="worker-list">
            {workers.slice(0, 20).map((w: any) => (
              <li key={w.id}>
                <span>{w.full_name}</span>
                <span className="worker-id">{w.worker_id}</span>
                <button className="btn-small" onClick={() => navigate(`/qr/workers`)}>View</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------- Worker Dashboard ----------
function WorkerDashboard({ user, loginId, navigate }: any) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [detail, setDetail] = useState<any>({});

  useEffect(() => {
    api.get('/qr/qr/me/', { responseType: 'blob' }).then((r) => {
      const reader = new FileReader();
      reader.onloadend = () => setQrDataUrl(reader.result as string);
      reader.readAsDataURL(r.data);
    }).catch(() => {});
    // Use the QR worker profile (authoritative) instead of legacy bindworkerdetail.
    api.get('/qr/profile/me/').then((r) => {
      const p = r.data?.Data?.profile || {};
      setDetail(p);
    }).catch(() => {});
  }, [loginId]);

  const contractor = detail.contractor_name || detail.contractor || '—';
  const site = detail.site_name || detail.site || '—';

  return (
    <div className="worker-dashboard">
      <QuickLinks navigate={navigate} />
      <div className="panel worker-id-card">
        <div className="worker-id-left">
          <div className="worker-avatar">{String(detail.full_name || user?.Name || 'W')[0]?.toUpperCase() || 'W'}</div>
          <div>
            <h2>{detail.full_name || user?.Name || 'Worker'}</h2>
            <p>Worker ID: {detail.worker_id || '—'}</p>
            <p>Mobile: {detail.mobile || '—'}</p>
            <p>Designation: {detail.designation || '—'}</p>
            <p>Contractor: {contractor}</p>
            <p>Site: {site}</p>
          </div>
        </div>
        <div className="worker-id-right">
          {qrDataUrl ? <img src={qrDataUrl} alt="My QR" className="worker-qr-big" /> : <div className="user-qr-loading">Loading QR...</div>}
          <div className="qr-caption">My Identity QR</div>
        </div>
      </div>
      <div className="panel">
        <h2>My Details</h2>
        <div className="pe-meta">
          <span>Name: {detail.full_name || '—'}</span>
          <span>Worker ID: {detail.worker_id || '—'}</span>
          <span>Mobile: {detail.mobile || '—'}</span>
          <span>Aadhaar: {detail.aadhaar_no || '—'}</span>
          <span>PAN: {detail.pan_no || '—'}</span>
          <span>Contractor: {contractor}</span>
          <span>Site: {site}</span>
        </div>
      </div>
    </div>
  );
}

function QuickLinks({ navigate }: any) {
  return (
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
  );
}
