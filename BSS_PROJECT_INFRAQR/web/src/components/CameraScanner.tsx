import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
}

export default function CameraScanner({ onScan }: CameraScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const start = async () => {
    if (!containerRef.current || starting) return;
    setStarting(true);
    setCameraError('');
    try {
      const scanner = new Html5Qrcode(containerRef.current.id, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {},
      );
      setStarted(true);
    } catch (e: any) {
      const msg = e?.message || String(e);
      setCameraError(msg);
      // Fallback: try front camera
      try {
        if (scannerRef.current) {
          await scannerRef.current.start(
            { facingMode: 'user' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => onScan(decodedText),
            () => {},
          );
          setStarted(true);
          setCameraError('');
        }
      } catch (e2: any) {
        setCameraError(e2?.message || String(e2));
      }
    } finally {
      setStarting(false);
    }
  };

  const stop = async () => {
    if (scannerRef.current && started) {
      try { await scannerRef.current.stop(); } catch {}
      try { scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    setStarted(false);
  };

  useEffect(() => {
    const t = setTimeout(() => start(), 400);
    return () => {
      clearTimeout(t);
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch {}
        try { scannerRef.current.clear(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPermissionError = /permission|notallowed|denied/i.test(cameraError);

  return (
    <div className="camera-scanner">
      <div id="bss-camera-scanner" ref={containerRef} style={{ width: '100%', minHeight: 250 }} />
      {!started && !starting && !cameraError && (
        <button className="qr-scan-btn" style={{ marginTop: 10 }} onClick={start} disabled={starting}>
          📷 {starting ? 'Starting camera...' : 'Start Camera Scanner'}
        </button>
      )}
      {!started && starting && <div style={{ marginTop: 10, color: '#6b7280', fontSize: 13 }}>Requesting camera access...</div>}
      {cameraError && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>
            {isPermissionError
              ? 'Camera permission denied. Please allow camera access in your browser settings and try again.'
              : `Camera error: ${cameraError}`}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="qr-scan-btn" style={{ marginTop: 0, background: '#1a3c6e' }} onClick={start} disabled={starting}>
              {starting ? 'Retrying...' : 'Retry Camera'}
            </button>
            <button className="qr-scan-btn" style={{ marginTop: 0, background: '#047857' }} onClick={stop}>
              Stop Scanner
            </button>
          </div>
        </div>
      )}
      {started && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
          <button className="qr-scan-btn" style={{ marginTop: 0, background: '#b45309' }} onClick={stop}>
            Stop Scanner
          </button>
        </div>
      )}
    </div>
  );
}