"use client";

import { useEffect } from "react";

/**
 * Keep a portal page fresh without a manual refresh: re-fetch on mount, when the
 * tab regains focus, and (optionally) on a timer. The portal payload is loaded
 * once per session by the layout context, so pages that can change from the
 * server side (a binding created/accepted by the other party, an async
 * DigiLocker fetch, background updates) opt in here to auto-sync.
 */
export function usePortalAutoRefresh(
  refresh: () => void | Promise<void>,
  { onMount = true, onFocus = true, pollMs = 0 }: { onMount?: boolean; onFocus?: boolean; pollMs?: number } = {},
) {
  // Re-fetch on mount / whenever the refresh callback identity changes.
  useEffect(() => {
    if (!onMount) return;
    void refresh();
  }, [refresh, onMount]);

  // Re-fetch when the tab becomes visible again (returning to the app).
  useEffect(() => {
    if (!onFocus) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh, onFocus]);

  // Optional light polling while the page is open.
  useEffect(() => {
    if (!pollMs) return;
    const timer = window.setInterval(() => { void refresh(); }, pollMs);
    return () => window.clearInterval(timer);
  }, [refresh, pollMs]);
}
