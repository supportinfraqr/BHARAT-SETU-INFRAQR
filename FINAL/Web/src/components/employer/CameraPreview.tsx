"use client";

import { useState } from 'react';

/** Live MJPEG preview of one configured CCTV camera. The browser renders the
 *  controller's multipart/x-mixed-replace stream natively in an <img> — smooth,
 *  no polling. Employer-only; the backend enforces the site's feed-view flag. */
export default function CameraPreview({
  cameraId,
  label,
  className = 'w-40 h-24',
}: {
  cameraId: number;
  label?: string;
  className?: string;
}) {
  const [error, setError] = useState(false);
  return (
    <div className={`relative ${className} shrink-0 overflow-hidden rounded-lg border border-bss-border bg-bss-navy`}>
      {error
        ? <div className="grid h-full w-full place-items-center px-2 text-center text-[10px] text-bss-text-muted">Feed unavailable</div>
        : <img src={`/api/employer/cctv/cameras/${cameraId}/stream`} alt={label || 'camera feed'} className="h-full w-full object-cover" onError={() => setError(true)} />}
      <span className={`absolute left-1 top-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${error ? 'bg-black/60 text-bss-text-secondary' : 'bg-bss-error text-white'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${error ? 'bg-bss-surface' : 'animate-pulse bg-white'}`} />
        {error ? 'Offline' : 'LIVE'}
      </span>
    </div>
  );
}
