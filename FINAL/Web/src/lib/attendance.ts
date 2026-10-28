import type { AttendanceEvent } from '@/types/portal';

export type CameraPresenceSummary = {
  camera: string;
  sessions: number;
  durationSeconds: number;
  firstAt: string;
  lastAt: string;
};

/** Group completed CCTV presence sessions by camera. */
export function cameraPresence(events?: AttendanceEvent[]): CameraPresenceSummary[] {
  const byCamera = new Map<string, CameraPresenceSummary>();
  for (const event of events ?? []) {
    if (event.source !== 'CAMERA' || event.durationSeconds == null || event.durationSeconds <= 0) continue;
    const camera = event.camera || event.area || 'CCTV';
    const current = byCamera.get(camera) ?? {
      camera, sessions: 0, durationSeconds: 0, firstAt: event.at || '', lastAt: event.endedAt || event.at || '',
    };
    current.sessions += 1;
    current.durationSeconds += event.durationSeconds;
    if (event.at && (!current.firstAt || event.at < current.firstAt)) current.firstAt = event.at;
    const endedAt = event.endedAt || event.at || '';
    if (endedAt && (!current.lastAt || endedAt > current.lastAt)) current.lastAt = endedAt;
    byCamera.set(camera, current);
  }
  return Array.from(byCamera.values());
}

/** Human-readable duration: 42s, 7m 12s, 1h 03m. */
export function formatDuration(seconds?: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes < 60) return `${minutes}m${rest ? ` ${rest}s` : ''}`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins ? ` ${String(mins).padStart(2, '0')}m` : ''}`;
}

/** Compact per-camera text for attendance tables. */
export function cameraPresenceText(events?: AttendanceEvent[]): string {
  return cameraPresence(events)
    .map(row => `${row.camera} ${formatDuration(row.durationSeconds)}`)
    .join(' · ');
}
