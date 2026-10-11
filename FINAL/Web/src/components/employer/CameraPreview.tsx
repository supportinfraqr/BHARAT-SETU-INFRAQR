"use client";

import { useEffect, useRef, useState } from 'react';

/** A small, auto-refreshing live preview of one configured CCTV camera.
 *  Employer-only; polls the JPEG snapshot endpoint (~1.5s) and shows a
 *  LIVE/Offline badge. */
export default function CameraPreview({
  cameraId,
  label,
  className = 'w-40 h-24',
}: {
  cameraId: number;
  label?: string;
  className?: string;
}) {
  const [src, setSrc] = useState('');
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const base = '/api/employer/cctv';

  useEffect(() => {
    let active = true;
    let url: string | null = null;
    async function tick() {
      try {
        const res = await fetch(`${base}/cameras/${cameraId}/snapshot?t=${Date.now()}`, { cache: 'no-store' });
        if (!active) return;
        if (res.ok) {
          const blob = await res.blob();
          if (!active) return;
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(blob);
          setSrc(url);
          setLive(true);
        } else {
          setLive(false);
        }
      } catch {
        if (active) setLive(false);
      }
      if (active) timer.current = setTimeout(tick, 1500);
    }
    tick();
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      if (url) URL.revokeObjectURL(url);
    };
  }, [cameraId, base]);

  return (
    <div className={`relative ${className} shrink-0 overflow-hidden rounded-lg border border-bss-border bg-bss-navy`}>
      {src
        ? <img src={src} alt={label || 'camera feed'} className="h-full w-full object-cover" />
        : <div className="grid h-full w-full place-items-center text-[10px] text-bss-text-muted">No preview</div>}
      <span className={`absolute left-1 top-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${live ? 'bg-bss-error text-white' : 'bg-black/60 text-bss-text-secondary'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse bg-white' : 'bg-bss-surface'}`} />
        {live ? 'LIVE' : 'Offline'}
      </span>
    </div>
  );
}
