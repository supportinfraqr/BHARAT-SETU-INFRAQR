"use client";

/** Client device identity: a stable id persisted in the browser plus a readable
 *  label derived from the user agent, used to register the device on the server. */

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem('bss_device_id');
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem('bss_device_id', id);
    }
    return id;
  } catch {
    return '';
  }
}

export function deviceInfo(): { deviceId: string; label: string; platform: string } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = /iphone|ipad|ipod/i.test(ua) ? 'iOS'
    : /android/i.test(ua) ? 'Android'
      : /mac os|macintosh/i.test(ua) ? 'macOS'
        : /windows/i.test(ua) ? 'Windows'
          : /linux/i.test(ua) ? 'Linux' : 'Web';
  const browser = /edg\//i.test(ua) ? 'Edge'
    : /chrome|crios/i.test(ua) ? 'Chrome'
      : /firefox|fxios/i.test(ua) ? 'Firefox'
        : /safari/i.test(ua) ? 'Safari' : 'Browser';
  return { deviceId: getDeviceId(), label: `${browser} on ${platform}`, platform };
}
