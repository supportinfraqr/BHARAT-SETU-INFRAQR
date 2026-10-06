"use client";

/**
 * Scanner feedback helpers — a short synthesized beep (no audio asset needed)
 * plus haptics, mirroring the "scanner" feel of dedicated QR apps.
 *
 * Browsers block audio until a user gesture; `primeAudio()` must be called from
 * the tap that starts the camera. `playScanBeep()` then resumes the context
 * (some browsers re-suspend it) before playing so the beep is always audible.
 */

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try { ctx = new Ctor(); } catch { return null; }
  }
  return ctx;
}

/** Play a near-silent buffer — fully unlocks audio output on iOS Safari. */
function unlock(ac: AudioContext): void {
  try {
    const buffer = ac.createBuffer(1, 1, 22050);
    const source = ac.createBufferSource();
    source.buffer = buffer;
    source.connect(ac.destination);
    source.start(0);
  } catch { /* best-effort */ }
}

/** Call inside the user gesture (e.g. the "Use camera" tap) to unlock audio. */
export function primeAudio(): void {
  const ac = audioContext();
  if (!ac) return;
  const ready = ac.state === "suspended" ? ac.resume() : Promise.resolve();
  void ready.then(() => unlock(ac)).catch(() => {});
}

function emit(ac: AudioContext, ok: boolean): void {
  const now = ac.currentTime;
  const tones = ok ? [1500, 2000] : [320, 220];
  tones.forEach((freq, index) => {
    const start = now + index * (ok ? 0.06 : 0.12);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = ok ? "square" : "sawtooth";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(ok ? 0.5 : 0.3, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + (ok ? 0.14 : 0.16));
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + (ok ? 0.16 : 0.18));
  });
}

/** Short high beep on a good scan, lower double-tone on a failed one. */
export function playScanBeep(ok = true): void {
  const ac = audioContext();
  if (ac) {
    try {
      if (ac.state === "suspended") {
        void ac.resume().then(() => emit(ac, ok)).catch(() => {});
      } else {
        emit(ac, ok);
      }
    } catch { /* audio is best-effort */ }
  }
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try { navigator.vibrate(ok ? 60 : [40, 40, 40]); } catch { /* ignore */ }
  }
}
