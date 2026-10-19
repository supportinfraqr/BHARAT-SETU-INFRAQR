"use client";

import { Building2, CheckCircle2, Clock, Info, MapPin, X } from 'lucide-react';
import { formatDate } from '@/lib/date';
import type { AttendanceRecord } from '@/types/portal';

type AttendanceRecordWithLeave = AttendanceRecord & { leaveType?: string; leaveStatus?: string };

/** Presence → badge classes. Shared by the attendance tables + detail dialog. */
export const statusStyle = (presence: string) => {
  switch (presence) {
    case 'Present': return 'bg-bss-soft-green text-bss-green border-bss-border';
    case 'Absent': return 'bg-bss-soft-red text-bss-error border-bss-border';
    case 'Leave': return 'bg-bss-soft-orange text-bss-orange border-bss-border';
    case 'Holiday': return 'bg-bss-blue-tint text-bss-interactive-blue border-bss-border';
    case 'Weekly Off': return 'bg-bss-bg text-bss-text-secondary border-bss-border';
    default: return 'bg-bss-blue-tint text-bss-interactive-blue border-bss-border';
  }
};

/** Distance in m, switching to km at/above 1000 m. */
export const fmtDist = (m?: number | null): string =>
  m == null ? '' : m >= 1000 ? `${(m / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} km` : `${Math.round(m)} m`;

/** "16.532800, 80.793300" */
export const fmtCoord = (lat?: number | null, lng?: number | null): string =>
  lat != null && lng != null ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : '';

function DetailRow({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="text-xs text-bss-text-muted font-semibold shrink-0">{label}</span>
      <span className={`text-xs font-bold text-right ${tone === 'warn' ? 'text-bss-orange' : tone === 'ok' ? 'text-bss-green' : 'text-bss-text-primary'}`}>{value}</span>
    </div>
  );
}

/**
 * Rich attendance-detail dialog shared by the worker, contractor and employer
 * attendance views. Shows the day's attendance details (source, verification,
 * geo-fence, first-check-in location + remarks) first, then the per-source
 * session timeline built from the linked AttendanceEvent records.
 */
export default function AttendanceDetailDialog({ record, onClose, subtitle }: {
  record: AttendanceRecord;
  onClose: () => void;
  subtitle?: string;
}) {
  const allEvents = record.events ?? [];
  const timedEvents = allEvents.filter(e => e.source !== 'SHEET');
  const hasSheet = allEvents.some(e => e.source === 'SHEET');
  const firstEvent = timedEvents[0] ?? allEvents[0];
  const attendanceSource = firstEvent ? (firstEvent.sourceLabel || firstEvent.source) : (record.source || record.method || '');
  const firstSourceIsCamera = firstEvent ? firstEvent.source === 'CAMERA' : !!record.camera;
  const detailAddress = firstEvent?.address || record.gpsAddress || '';
  const detailCoords = fmtCoord(firstEvent?.gpsLat ?? record.gpsLat, firstEvent?.gpsLong ?? record.gpsLong);
  const detailRemarks = firstEvent?.remarks || record.remarks || '';
  const inPremises = !!record.events?.length && record.events[record.events.length - 1].type === 'IN';
  const premisesSince = inPremises ? record.events![record.events!.length - 1].at : '';

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-bss-navy/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
        <header className="relative overflow-hidden bg-gradient-to-br from-bss-navy via-bss-deep-navy to-bss-interactive-blue text-white px-5 py-4 flex items-start justify-between gap-3">
          <div className="relative z-10 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">Attendance Detail</p>
            <h3 className="text-lg font-bold mt-0.5 truncate">{formatDate(record.date)}</h3>
            {subtitle && <p className="text-[11px] text-white/70 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className="relative z-10 flex items-center gap-2 flex-shrink-0">
            {inPremises
              ? <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full border bg-bss-soft-green text-bss-green border-bss-border inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-bss-green animate-pulse" />In premises</span>
              : <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${statusStyle(record.presence)}`}>{record.presence}</span>}
            <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><X size={18} /></button>
          </div>
        </header>

        <div className="p-5 space-y-4 overflow-y-auto">
          {inPremises && (
            <div className="p-3 rounded-2xl bg-bss-soft-green border border-bss-border flex items-center gap-2 text-sm text-bss-green font-semibold">
              <CheckCircle2 size={16} /> Currently in premises — checked in at {premisesSince ? new Date(premisesSince).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
          )}
          {(record.site || record.shift) && (
            <div className="grid grid-cols-2 gap-3">
              {record.site && (
                <div className="p-3 rounded-2xl bg-bss-bg border border-bss-border">
                  <span className="text-[10px] font-bold uppercase text-bss-text-muted flex items-center gap-1"><Building2 size={11} />Worksite</span>
                  <p className="mt-1 text-sm font-bold text-bss-text-primary truncate" title={record.site}>{record.site}</p>
                </div>
              )}
              {record.shift && (
                <div className="p-3 rounded-2xl bg-bss-bg border border-bss-border">
                  <span className="text-[10px] font-bold uppercase text-bss-text-muted flex items-center gap-1"><Clock size={11} />Shift</span>
                  <p className="mt-1 text-sm font-bold text-bss-text-primary">{record.shift}</p>
                </div>
              )}
            </div>
          )}

          {(record.checkIn || record.checkOut) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-bss-soft-green border border-bss-border">
                <span className="text-[10px] font-bold uppercase text-bss-green block">Check In</span>
                <strong className="text-base text-bss-text-primary">{record.checkIn || '—'}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-bss-blue-tint border border-bss-border">
                <span className="text-[10px] font-bold uppercase text-bss-interactive-blue block">Check Out</span>
                <strong className="text-base text-bss-text-primary">{inPremises ? 'In premises' : (record.checkOut || '—')}</strong>
              </div>
            </div>
          )}

          {record.presence === 'Leave' && (record as AttendanceRecordWithLeave).leaveType && (
            <div className="p-3 rounded-2xl bg-bss-soft-orange border border-bss-border space-y-1">
              <span className="text-[10px] font-bold text-bss-orange uppercase block">Leave Application</span>
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm text-bss-text-primary">{(record as AttendanceRecordWithLeave).leaveType}</strong>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${(record as AttendanceRecordWithLeave).leaveStatus === 'Approved' ? 'bg-bss-soft-green text-bss-green border-bss-border' : (record as AttendanceRecordWithLeave).leaveStatus === 'Rejected' ? 'bg-bss-soft-red text-bss-error border-bss-border' : 'bg-bss-soft-orange text-bss-orange border-bss-border'}`}>
                  {(record as AttendanceRecordWithLeave).leaveStatus}
                </span>
              </div>
            </div>
          )}

          {(attendanceSource || record.verification || (firstSourceIsCamera && (record.matchStatus || record.camera)) || (record.geofenceOk !== undefined && record.geofenceOk !== null)) && (
            <div className="rounded-2xl border border-bss-border divide-y divide-bss-border overflow-hidden">
              {attendanceSource && <DetailRow label="Source" value={attendanceSource} />}
              {record.verification && <DetailRow label="Verification" value={record.verification} />}
              {firstSourceIsCamera && record.matchStatus && <DetailRow label="Face match" value={record.matchStatus} tone={record.matchStatus === 'Verified' ? 'ok' : 'warn'} />}
              {firstSourceIsCamera && record.camera && <DetailRow label="CCTV camera" value={`${record.camera}${record.cameraArea && record.cameraArea !== record.camera ? ` · ${record.cameraArea}` : ''}`} />}
              {(record.geofenceOk !== undefined && record.geofenceOk !== null) && (
                <DetailRow label="Geo-fence" tone={record.geofenceOk ? 'ok' : 'warn'} value={`${record.geofenceOk ? 'Within site' : 'Flagged outside'}${record.distanceM != null ? ` · ${fmtDist(record.distanceM)}${record.accuracyM != null ? ` (±${fmtDist(record.accuracyM)})` : ''}` : ''}`} />
              )}
            </div>
          )}

          {(detailAddress || detailCoords) && (
            <div className="p-3 rounded-2xl bg-bss-bg border border-bss-border flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 text-bss-interactive-blue shrink-0" />
              <div className="min-w-0 space-y-1">
                <span className="text-[10px] font-bold uppercase text-bss-text-muted block">Location · first check-in</span>
                {detailAddress && <span className="text-xs text-bss-text-secondary block">{detailAddress}</span>}
                {detailCoords && (
                  <a href={`https://www.google.com/maps?q=${detailCoords.replace(/\s/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono font-semibold text-bss-interactive-blue hover:underline inline-flex items-center gap-1">
                    {detailCoords}
                  </a>
                )}
              </div>
            </div>
          )}

          {detailRemarks && (
            <div className="p-3 rounded-2xl bg-bss-soft-orange border border-bss-border flex items-start gap-2">
              <Info size={14} className="mt-0.5 text-bss-orange shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-bss-orange block">Remarks · first check-in</span>
                <span className="text-xs text-bss-text-secondary">{detailRemarks}</span>
              </div>
            </div>
          )}

          {timedEvents.length > 0 && (
            <div className="rounded-2xl border border-bss-border overflow-hidden">
              <div className="px-3 py-2 bg-bss-bg border-b border-bss-border flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Session timeline ({timedEvents.length})</span>
                <span className="text-[10px] text-bss-text-muted">check-in · break · check-out</span>
              </div>
              <ol className="divide-y divide-bss-border">
                {timedEvents.map((ev, i) => {
                  const isOut = ev.type === 'OUT';
                  const time = ev.at ? new Date(ev.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
                  const endTime = ev.endedAt ? new Date(ev.endedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
                  const coords = fmtCoord(ev.gpsLat, ev.gpsLong);
                  return (
                    <li key={i} className="px-3 py-2.5 text-[11px] space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOut ? 'bg-bss-interactive-blue' : 'bg-bss-green'}`} />
                        <span className="font-bold text-bss-text-primary">{ev.typeLabel || ev.type}</span>
                        <span className="text-bss-text-muted truncate">· {ev.sourceLabel || ev.source}{ev.method ? ` (${ev.method})` : ''}</span>
                        <span className="ml-auto font-semibold text-bss-text-primary flex-shrink-0">{time}{endTime ? ` – ${endTime}` : ''}{ev.durationSeconds != null ? ` · ${Math.round(ev.durationSeconds / 60)} min` : ''}</span>
                      </div>
                      {(ev.address || coords) && (
                        <div className="pl-4 text-bss-text-secondary flex items-start gap-1.5">
                          <MapPin size={11} className="mt-0.5 shrink-0 text-bss-interactive-blue" />
                          <span className="min-w-0">{ev.address}{coords ? `${ev.address ? ' · ' : ''}${coords}` : ''}</span>
                        </div>
                      )}
                      {ev.geofenceOk != null && (
                        <div className="pl-4">
                          <span className={`text-[10px] font-bold ${ev.geofenceOk ? 'text-bss-green' : 'text-bss-orange'}`}>
                            {ev.geofenceOk ? 'Within site' : 'Outside geo-fence'}{ev.distanceM != null ? ` · ${fmtDist(ev.distanceM)}` : ''}
                          </span>
                        </div>
                      )}
                      {ev.remarks && <div className="pl-4 text-[10px] text-bss-text-muted">{ev.remarks}</div>}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {hasSheet && (
            <div className="p-3 rounded-2xl bg-bss-bg border border-bss-border text-[11px] text-bss-text-muted flex items-start gap-1.5">
              <Info size={13} className="mt-0.5 shrink-0 text-bss-interactive-blue" />
              <span>Marked from an uploaded attendance sheet — sheets don&apos;t carry per-punch times, so there&apos;s no check-in/out timeline for this day.</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-bss-border">
          <button onClick={onClose} className="w-full h-11 rounded-xl bg-bss-navy text-white text-sm font-bold hover:bg-bss-deep-navy transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
