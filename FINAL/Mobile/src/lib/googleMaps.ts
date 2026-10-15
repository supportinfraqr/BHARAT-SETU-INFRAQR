"use client";

/**
 * Loads the Google Maps JavaScript API once, on demand. Returns ``true`` when
 * the API is usable and ``false`` when it can't be loaded (no key, script error,
 * or an auth/billing failure) so callers can fall back to OpenStreetMap.
 */

type GoogleMapsWindow = Window & {
  google?: { maps?: unknown };
  __bssGoogleMapsInit?: () => void;
};

let loaderPromise: Promise<boolean> | null = null;

export function loadGoogleMaps(key: string, libraries = "places"): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  const win = window as GoogleMapsWindow;
  if (win.google?.maps) return Promise.resolve(true);
  if (!key) return Promise.resolve(false);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<boolean>((resolve) => {
    const callback = "__bssGoogleMapsInit";
    win[callback] = () => resolve(true);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=${encodeURIComponent(libraries)}&callback=${callback}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
    // Guard against a silent failure (e.g. invalid key) — fall back to OSM.
    window.setTimeout(() => { if (!win.google?.maps) resolve(false); }, 8000);
  }).then((ok) => {
    if (!ok) loaderPromise = null; // allow a later retry
    return ok;
  });

  return loaderPromise;
}
