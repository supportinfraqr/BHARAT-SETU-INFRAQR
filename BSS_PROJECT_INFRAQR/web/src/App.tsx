import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ModuleScreen from './pages/ModuleScreen';
import QRScan from './pages/QRScan';
import Workers from './pages/Workers';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('bss_token');
  return token ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/qr/scan" element={<RequireAuth><QRScan /></RequireAuth>} />
        <Route path="/qr/workers" element={<RequireAuth><Workers /></RequireAuth>} />
        <Route path="/module/:page" element={<RequireAuth><ModuleScreen /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
