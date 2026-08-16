import { useEffect, useState } from 'react';
import api from '../api/client';
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

  useEffect(() => {
    // Browser geolocation (web)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setLocStatus('Location captured');
          setLocReady(true);
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
  }, []);

  const doScan = async () => {
    const ref = qrInput.trim();
    if (!ref) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await api.post('/qr/qr/scan/', {
        qr_reference: ref,
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
      });
      setResult(res.data);
    } catch (e: any) {
      setResult({
        Result: 'Error',
        Message: e?.response?.data?.Message || 'Could not process QR',
      });
    } finally {
      setBusy(false);
    }
  };

  const att = result?.Data?.attendance;
  const attStatus = att?.attendance_status;
  const isPresent = attStatus === 'PRESENT';
  const isMismatch = attStatus === 'LOCATION_MISMATCH';

  return (
    <AppLayout title="QR Scan">
      <div className="qr-scan-page">
      <h2 className="qr-page-title">QR Scan — Attendance</h2>

      <div className="qr-layout">
        {/* Scanner panel */}
        <div className="qr-panel">
          <div className="qr-scanner-box">
            <div className="qr-frame">
              <div className="qr-corner tl"></div>
              <div className="qr-corner tr"></div>
              <div className="qr-corner bl"></div>
              <div className="qr-corner br"></div>
              <div className="qr-placeholder">
                <span className="qr-icon">▣</span>
                <p>Point camera at worker QR</p>
              </div>
            </div>
            <div className="qr-scanner-line"></div>
          </div>

          <input
            className="qr-input"
            placeholder="Or paste QR reference here"
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doScan()}
          />

          <div className={`qr-loc ${locReady ? 'ok' : 'warn'}`}>
            <span className="loc-dot"></span>
            {locStatus}
            {lat !== null && lng !== null && ` (${lat.toFixed(4)}, ${lng.toFixed(4)})`}
          </div>

          <button className="qr-scan-btn" onClick={doScan} disabled={busy || !qrInput}>
            {busy ? 'Verifying...' : 'Verify & Mark Attendance'}
          </button>
        </div>

        {/* Result panel */}
        <div className="qr-result-panel">
          {!result && (
            <div className="qr-result-empty">
              <div className="qr-big-icon">📱</div>
              <p>Scan a worker's QR to verify identity<br />and mark geo-verified attendance</p>
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

          {att && (
            <div className={`qr-att-box ${isPresent ? 'present' : isMismatch ? 'mismatch' : 'fail'}`}>
              <div className="qr-att-badge">
                {isPresent ? '✓' : isMismatch ? '✕' : '!'}
              </div>
              <h3>{attStatus === 'PRESENT' ? 'Present' : attStatus === 'LOCATION_MISMATCH' ? 'Location Mismatch' : 'Verification Failed'}</h3>
              <p>Location: {att.location_status}</p>
              <p>Date: {att.date} · Time: {att.time}</p>
              {isMismatch && <p className="qr-att-warn">Worker scanned outside permitted location — notified employer.</p>}
            </div>
          )}
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
