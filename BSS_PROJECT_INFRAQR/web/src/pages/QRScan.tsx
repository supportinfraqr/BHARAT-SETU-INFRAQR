import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import CameraScanner from '../components/CameraScanner';
import { beep } from '../utils/beep';
import './QRScan.css';
import AppLayout from '../components/AppLayout';

export default function QRScan() {
  const [qrInput, setQrInput] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locStatus, setLocStatus] = useState('Capturing location...');
  const [locReady, setLocReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [resolved, setResolved] = useState<any>(null);
  const [pending, setPending] = useState<any>(null);
  const [scanFlash, setScanFlash] = useState('');

  const user = JSON.parse(localStorage.getItem('bss_user') || localStorage.getItem('bss_legacy_user') || '{}');
  const loginType = String(user.LoginType || user.role || '');
  const isContractor = loginType === '2' || loginType === '6' || loginType === 'PRIMARY_CONTRACTOR' || loginType === 'SECONDARY_CONTRACTOR';

  const resolveLocation = useCallback(async (la: number, ln: number) => {
    try {
      const res = await api.get('/qr/qr/geocode/', { params: { lat: la, lng: ln } });
      setResolved(res.data?.Data);
    } catch (e) {
      setResolved(null);
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const la = pos.coords.latitude;
          const ln = pos.coords.longitude;
          setLat(la);
          setLng(ln);
          setLocStatus('Location captured');
          setLocReady(true);
          resolveLocation(la, ln);
        },
        (err) => {
          setLocStatus(`Location unavailable: ${err.message}`);
          setLocReady(false);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } else {
      setLocStatus('Geolocation not supported');
    }
  }, [resolveLocation]);

  // Look up the scanned QR and show its details for confirmation
  const lookup = async (ref: string) => {
    setResult(null);
    setScanFlash(`Scanned!`);
    beep();
    setTimeout(() => setScanFlash(''), 1800);
    try {
      const res = await api.get('/qr/qr/', { params: { qr_reference: ref } });
      const info = res.data?.Data;
      if (!info) {
        setPending({ error: 'Could not identify this QR' });
        return;
      }
      setPending({ ...info, details: info.entity_details || null });
    } catch (e: any) {
      setPending({ error: e?.response?.data?.Message || 'Invalid QR reference' });
    }
  };

  // User confirms -> send the actual scan/binding request
  const confirmScan = async () => {
    if (!pending?.qr_reference) return;
    setBusy(true);
    try {
      const res = await api.post('/qr/qr/scan/', {
        qr_reference: pending.qr_reference,
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
      });
      setResult(res.data);
      setPending(null);
    } catch (e: any) {
      setResult({ Result: 'Error', Message: e?.response?.data?.Message || 'Could not process QR' });
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  const handleCameraScan = (decoded: string) => {
    setQrInput(decoded);
    lookup(decoded);
  };

  const doScan = async () => {
    const ref = qrInput.trim();
    if (!ref) return;
    setResult(null);
    setBusy(true);
    beep();
    try {
      const res = await api.post('/qr/qr/scan/', {
        qr_reference: ref,
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
      });
      setResult(res.data);
    } catch (e: any) {
      setResult({ Result: 'Error', Message: e?.response?.data?.Message || 'Could not process QR' });
    } finally {
      setBusy(false);
    }
  };

  const att = result?.Data?.attendance;
  const attStatus = att?.attendance_status;
  const isPresent = attStatus === 'PRESENT';
  const isMismatch = attStatus === 'LOCATION_MISMATCH';

  const fieldRow = (label: string, value: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <b style={{ color: '#022B5E' }}>{value || '—'}</b>
    </div>
  );

  return (
    <AppLayout title="QR Scan">
      <div className="qr-scan-page">
      <h2 className="qr-page-title">QR Scan — Attendance & Binding</h2>

      <div className="qr-layout">
        {/* Scanner panel */}
        <div className="qr-panel">
          <div className="qr-scanner-box">
            <CameraScanner onScan={handleCameraScan} />
            {scanFlash && (
              <div className="qr-scanner-flash">{scanFlash}</div>
            )}
          </div>

          <input
            className="qr-input"
            placeholder="Or paste QR reference here"
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookup(qrInput)}
          />

          <div className={`qr-loc ${locReady ? 'ok' : 'warn'}`}>
            <span className="loc-dot"></span>
            {locStatus}
            {lat !== null && lng !== null && ` (${lat.toFixed(4)}, ${lng.toFixed(4)})`}
          </div>
          {resolved && (
            <div className="qr-resolved">
              <b>📍 {resolved.short_name || resolved.display_name}</b>
            </div>
          )}

          <button className="qr-scan-btn" onClick={doScan} disabled={busy || !qrInput}>
            {busy ? 'Verifying...' : 'Verify & Mark Attendance'}
          </button>
        </div>

        {/* Result panel */}
        <div className="qr-result-panel">
          {!result && !pending && (
            <div className="qr-result-empty">
              <div className="qr-big-icon">📱</div>
              <p>Scan a worker QR for attendance,<br />or an employer QR to request binding</p>
            </div>
          )}

          {result?.Result === 'Error' && (
            <div className="qr-error-box">
              <h3>Scan Failed</h3>
              <p>{result.Message}</p>
            </div>
          )}

          {result?.Data?.worker && (
            <div className="qr-worker-box">
              <div className="qr-worker-avatar">{result.Data.worker.full_name?.[0]?.toUpperCase() || 'W'}</div>
              <h3>{result.Data.worker.full_name}</h3>
              <p className="qr-worker-id">Worker ID: {result.Data.worker.worker_id}</p>
            </div>
          )}

          {result?.Data?.entity_type === 'EMPLOYER' && result?.Data?.employer && (
            <div className="qr-worker-box">
              <div className="qr-worker-avatar">{result.Data.employer.name?.[0]?.toUpperCase() || 'E'}</div>
              <h3>{result.Data.employer.name}</h3>
              <p className="qr-worker-id">Employer ID: {result.Data.employer.id}</p>
              <div className={`qr-att-box ${result.Data.action === 'binding_requested' ? 'present' : 'mismatch'}`} style={{ marginTop: 12 }}>
                <div className="qr-att-badge">{result.Data.action === 'binding_requested' ? '✓' : '!'}</div>
                <h3>
                  {result.Data.action === 'binding_requested' && 'Binding Request Sent'}
                  {result.Data.action === 'already_bound' && 'Already Bound'}
                  {result.Data.action === 'bound_elsewhere' && 'Bound Elsewhere'}
                  {result.Data.action === 'contractor_login_required' && 'Login as Contractor'}
                </h3>
                <p>
                  {result.Data.action === 'binding_requested' && 'The employer will review and approve your request.'}
                  {result.Data.action === 'already_bound' && 'This contractor is already bound to this employer.'}
                  {result.Data.action === 'bound_elsewhere' && 'This contractor is bound to another employer.'}
                  {result.Data.action === 'contractor_login_required' && 'Sign in as a contractor to request binding.'}
                </p>
              </div>
            </div>
          )}

          {att && (
            <div className={`qr-att-box ${isPresent ? 'present' : isMismatch ? 'mismatch' : 'fail'}`}>
              <div className="qr-att-badge">
                {isPresent ? '✓' : isMismatch ? '✕' : '!'}
              </div>
              <h3>{attStatus === 'PRESENT' ? 'Present' : attStatus === 'LOCATION_MISMATCH' ? 'Location Mismatch' : 'Verification Failed'}</h3>
              <p>Location: {att.location_status}</p>
              {result?.Data?.resolved_location?.short_name && (
                <p className="qr-att-place">📍 {result.Data.resolved_location.short_name}</p>
              )}
              <p>Date: {att.date} · Time: {att.time}</p>
              {isMismatch && <p className="qr-att-warn">Worker scanned outside permitted location — notified employer.</p>}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Scan result popup: shows scanned person details + send binding request */}
      {pending && (
        <div className="qr-modal-overlay" onClick={() => pending.error && setPending(null)}>
          <div className="qr-modal" style={{ width: 'min(460px, 94vw)', padding: 24 }} onClick={(e) => e.stopPropagation()}>
            {pending.error ? (
              <div className="qr-error-box">
                <h3>Scan Failed</h3>
                <p>{pending.error}</p>
                <div style={{ marginTop: 16 }}>
                  <button className="qr-scan-btn" onClick={() => setPending(null)}>Close</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 18, color: '#022B5E' }}>Scan Details</h3>
                  <button className="qr-modal-close" onClick={() => setPending(null)}>✕</button>
                </div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div className="qr-worker-avatar" style={{ width: 60, height: 60, fontSize: 26 }}>
                    {pending.details?.name?.[0]?.toUpperCase() || pending.details?.full_name?.[0]?.toUpperCase() || (pending.entity_type === 'EMPLOYER' ? 'E' : pending.entity_type === 'CONTRACTOR' ? 'C' : 'W')}
                  </div>
                  <h3 style={{ margin: '8px 0 2px', color: '#022B5E' }}>{pending.details?.name || pending.details?.full_name || '—'}</h3>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
                    {pending.entity_type === 'EMPLOYER' ? 'Employer' : pending.entity_type === 'CONTRACTOR' ? 'Contractor' : 'Worker'}
                  </p>
                </div>
                {pending.entity_type === 'EMPLOYER' && pending.details && (
                  <div style={{ textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                    {fieldRow('Contact Person', pending.details.contact_person)}
                    {fieldRow('Mobile', pending.details.contact_mobile)}
                    {fieldRow('Email', pending.details.email)}
                    {fieldRow('Industry', pending.details.industry)}
                    {fieldRow('City', pending.details.city)}
                  </div>
                )}
                {pending.entity_type === 'CONTRACTOR' && pending.details && (
                  <div style={{ textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                    {fieldRow('Mobile', pending.details.contact_mobile)}
                    {fieldRow('Site', pending.details.site_name)}
                    {fieldRow('Type', pending.details.is_primary ? 'Primary' : 'Secondary')}
                  </div>
                )}
                {pending.entity_type === 'WORKER' && pending.details && (
                  <div style={{ textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                    {fieldRow('Worker ID', pending.details.worker_id)}
                    {fieldRow('Mobile', pending.details.mobile)}
                    {fieldRow('Designation', pending.details.designation)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
                  {pending.entity_type === 'EMPLOYER' && isContractor && (
                    <button className="qr-scan-btn" style={{ flex: 1 }} onClick={confirmScan} disabled={busy}>
                      {busy ? 'Sending...' : 'Send Binding Request'}
                    </button>
                  )}
                  {pending.entity_type === 'WORKER' && (
                    <button className="qr-scan-btn" style={{ flex: 1 }} onClick={confirmScan} disabled={busy}>
                      {busy ? 'Verifying...' : 'Mark Attendance'}
                    </button>
                  )}
                  {pending.entity_type === 'CONTRACTOR' && (
                    <button className="qr-scan-btn" style={{ flex: 1 }} onClick={confirmScan} disabled={busy}>
                      {busy ? 'Verifying...' : 'Continue'}
                    </button>
                  )}
                  <button className="qr-scan-btn" style={{ flex: 1, background: '#9ca3af' }} onClick={() => setPending(null)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}