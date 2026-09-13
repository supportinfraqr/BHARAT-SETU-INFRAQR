"use client";

/**
 * Scanner feedback helpers — a short synthesized beep (no audio asset needed)
 * plus haptics, mirroring the "scanner" feel of dedicated QR apps.
 */

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = ctx ?? new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Short high beep on a good scan, lower double-tone on a failed one. */
export function playScanBeep(ok = true): void {
  const ac = audioContext();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const tones = ok ? [1320] : [320, 220];
    tones.forEach((freq, index) => {
      const start = now + index * 0.11;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = ok ? "sine" : "square";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(ok ? 0.25 : 0.15, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (ok ? 0.13 : 0.1));
      osc.connect(gain).connect(ac.destination);
      osc.start(start);
      osc.stop(start + (ok ? 0.15 : 0.12));
    });
  } catch {
    /* audio is best-effort */
  }
  if (ok && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try { navigator.vibrate(60); } catch { /* ignore */ }
  }
}
