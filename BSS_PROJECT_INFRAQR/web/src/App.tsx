import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ModuleScreen = lazy(() => import('./pages/ModuleScreen'));
const QRScan = lazy(() => import('./pages/QRScan'));
const Workers = lazy(() => import('./pages/Workers'));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('bss_token');
  return token ? <>{children}</> : <Navigate to="/" replace />;
}

function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg-page)',
      color: 'var(--color-primary)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 600
    }}>
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/qr/scan" element={<RequireAuth><QRScan /></RequireAuth>} />
          <Route path="/qr/workers" element={<RequireAuth><Workers /></RequireAuth>} />
          <Route path="/module/:page" element={<RequireAuth><ModuleScreen /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
