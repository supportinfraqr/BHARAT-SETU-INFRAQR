import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import RoleDashboard from './pages/RoleDashboard';
import ModuleScreen from './pages/ModuleScreen';
import QRScan from './pages/QRScan';
import Workers from './pages/Workers';
import Terms from './pages/Terms';
import EmployerApprovals from './pages/EmployerApprovals';
import MyPlan from './pages/MyPlan';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('bss_token');
  const legacy = localStorage.getItem('bss_legacy_login');
  return token || legacy ? <>{children}</> : <Navigate to="/" replace />;
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
        <Route path="/qr/management/employers" element={<RequireAuth><EmployerApprovals /></RequireAuth>} />
        <Route path="/qr/management/my-plan" element={<RequireAuth><MyPlan /></RequireAuth>} />
        <Route path="/module/:page" element={<RequireAuth><ModuleScreen /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
