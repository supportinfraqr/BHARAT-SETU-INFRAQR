import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import RoleDashboard from './pages/RoleDashboard';
import ModuleScreen from './pages/ModuleScreen';
import QRScan from './pages/QRScan';
import Workers from './pages/Workers';
import WorkerDetail from './pages/WorkerDetail';
import Terms from './pages/Terms';
import EmployerApprovals from './pages/EmployerApprovals';
import MyPlan from './pages/MyPlan';
import ContractorsList from './pages/ContractorsList';
import WorkerBinding from './pages/WorkerBinding';
import BindingRequests from './pages/BindingRequests';
import MyProfile from './pages/MyProfile';
import ContractorLocations from './pages/ContractorLocations';

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
        <Route path="/qr/workers/:id" element={<RequireAuth><WorkerDetail /></RequireAuth>} />
        <Route path="/qr/contractors" element={<RequireAuth><ContractorsList /></RequireAuth>} />
        <Route path="/qr/locations" element={<RequireAuth><ContractorLocations /></RequireAuth>} />
        <Route path="/qr/binding" element={<RequireAuth><WorkerBinding /></RequireAuth>} />
        <Route path="/qr/binding-requests" element={<RequireAuth><BindingRequests /></RequireAuth>} />
        <Route path="/qr/my-profile" element={<RequireAuth><MyProfile /></RequireAuth>} />
        <Route path="/qr/management/employers" element={<RequireAuth><EmployerApprovals /></RequireAuth>} />
        <Route path="/qr/management/my-plan" element={<RequireAuth><MyPlan /></RequireAuth>} />
        <Route path="/module/:page" element={<RequireAuth><ModuleScreen /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
