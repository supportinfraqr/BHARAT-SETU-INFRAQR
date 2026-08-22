import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import RoleDashboard from './pages/RoleDashboard';
import ModuleScreen from './pages/ModuleScreen';
import QRScan from './pages/QRScan';
import Workers from './pages/Workers';
import WorkerDetail from './pages/WorkerDetail';
import Terms from './pages/Terms';
import EmployerApprovals from './pages/EmployerApprovals';
import ContractorsList from './pages/ContractorsList';
import WorkerBinding from './pages/WorkerBinding';
import BindingRequests from './pages/BindingRequests';
import MyProfile from './pages/MyProfile';
import MyEmployers from './pages/MyEmployers';
import MyContractor from './pages/MyContractor';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('bss_token');
    const legacy = localStorage.getItem('bss_legacy_login');
    if (!token && !legacy) {
      setOk(false);
      setReady(true);
      return;
    }
    // Validate the stored session against the backend (covers blocked accounts).
    let cancelled = false;
    fetch('/api/auth/me/', { headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(legacy ? { 'X-Legacy-Login-Id': legacy } : {}),
    } })
      .then((r) => {
        if (r.status === 401 || r.status === 403) throw new Error('blocked');
      })
      .then(() => { if (!cancelled) setOk(true); })
      .catch(() => {
        localStorage.removeItem('bss_token');
        localStorage.removeItem('bss_user');
        localStorage.removeItem('bss_legacy_login');
        localStorage.removeItem('bss_legacy_user');
        if (!cancelled) setOk(false);
      })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  if (!ready) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>Loading...</div>;
  return ok ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/dashboard" element={<RequireAuth><RoleDashboard /></RequireAuth>} />
        <Route path="/qr/scan" element={<RequireAuth><QRScan /></RequireAuth>} />
        <Route path="/qr/workers" element={<RequireAuth><Workers /></RequireAuth>} />
        <Route path="/qr/workers/:id" element={<RequireAuth><WorkerDetail /></RequireAuth>} />
        <Route path="/qr/contractors" element={<RequireAuth><ContractorsList /></RequireAuth>} />
        <Route path="/qr/binding" element={<RequireAuth><WorkerBinding /></RequireAuth>} />
        <Route path="/qr/binding-requests" element={<RequireAuth><BindingRequests /></RequireAuth>} />
        <Route path="/qr/my-profile" element={<RequireAuth><MyProfile /></RequireAuth>} />
        <Route path="/qr/my-employers" element={<RequireAuth><MyEmployers /></RequireAuth>} />
        <Route path="/qr/my-contractor" element={<RequireAuth><MyContractor /></RequireAuth>} />
        <Route path="/qr/management/employers" element={<RequireAuth><EmployerApprovals /></RequireAuth>} />
        <Route path="/module/:page" element={<RequireAuth><ModuleScreen /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
