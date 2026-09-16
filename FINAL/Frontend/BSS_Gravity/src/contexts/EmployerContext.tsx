"use client";

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { EmployerPortalData } from '@/types/portal';

type EmployerContextType = {
  employer: EmployerPortalData;
  replaceEmployer: (data: EmployerPortalData) => void;
  refresh: () => Promise<void>;
  mutate: <T>(resource: string, method: 'POST' | 'PATCH' | 'DELETE', payload?: unknown) => Promise<T>;
};

const EmployerContext = createContext<EmployerContextType | null>(null);

export function EmployerProvider({ children, initialData }: { children: React.ReactNode; initialData: EmployerPortalData }) {
  const [employer, setEmployer] = useState(initialData);
  // Re-fetch the whole portal from the server. Use after a mutation whose
  // response is partial (e.g. creating a site returns only its id) so the UI
  // reflects server-derived fields (qrToken, bssId, default site) without a
  // manual page refresh.
  const refresh = useCallback(async () => {
    const response = await fetch('/api/portal', { cache: 'no-store' });
    if (!response.ok) return;
    const result = await response.json().catch(() => null) as { data?: EmployerPortalData } | null;
    if (result?.data) setEmployer(result.data);
  }, []);
  const mutate = useCallback(async <T,>(resource: string, method: 'POST' | 'PATCH' | 'DELETE', payload?: unknown): Promise<T> => {
    const response = await fetch(`/api/portal/${encodeURIComponent(resource)}`, {
      method,
      headers: payload === undefined ? undefined : { 'Content-Type':'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({})) as T & { error?:string };
    if (!response.ok) throw new Error(result.error ?? 'The update could not be completed.');
    // Sync the portal with the server after every mutation so server-derived
    // fields (ids, QR tokens, computed status/counts, default site) show up
    // without a manual page refresh.
    void refresh();
    return result;
  }, [refresh]);
  const value = useMemo(() => ({ employer, replaceEmployer:setEmployer, refresh, mutate }), [employer, refresh, mutate]);
  return <EmployerContext.Provider value={value}>{children}</EmployerContext.Provider>;
}

export function useEmployer() {
  const context = useContext(EmployerContext);
  if (!context) throw new Error('useEmployer must be used within EmployerProvider');
  return context;
}
