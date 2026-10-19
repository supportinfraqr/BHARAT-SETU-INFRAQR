"use client";

/**
 * PREVIEW HARNESS EmployerContext. Same surface as prod
 * (`employer`, `replaceEmployer`, `mutate`, `refresh`) but backed by the static
 * mock in `@/data/employer`. `refresh()` re-reads that mock after a short delay;
 * `mutate()` never hits a backend — it just logs and resolves.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { EmployerPortalData } from '@/types/portal';
import { mockEmployer } from '@/data/employer';

type EmployerContextType = {
  employer: EmployerPortalData;
  replaceEmployer: (data: EmployerPortalData) => void;
  mutate: <T>(resource: string, method: 'POST' | 'PATCH' | 'DELETE', payload?: unknown) => Promise<T>;
  refresh: () => Promise<void>;
};

const EmployerContext = createContext<EmployerContextType | null>(null);

export function EmployerProvider({ children, initialData = mockEmployer }: { children: React.ReactNode; initialData?: EmployerPortalData }) {
  const [employer, setEmployer] = useState(initialData);
  const mutate = useCallback(async <T,>(resource: string, method: 'POST' | 'PATCH' | 'DELETE', payload?: unknown): Promise<T> => {
    console.info('[preview] mutate (no-op)', method, resource, payload);
    await new Promise(r => setTimeout(r, 250));
    return { ok: true } as T;
  }, []);
  const refresh = useCallback(async () => {
    await new Promise(r => setTimeout(r, 400));
    setEmployer(structuredClone(mockEmployer));
  }, []);
  const value = useMemo(() => ({ employer, replaceEmployer: setEmployer, mutate, refresh }), [employer, mutate, refresh]);
  return <EmployerContext.Provider value={value}>{children}</EmployerContext.Provider>;
}

export function useEmployer() {
  const context = useContext(EmployerContext);
  if (!context) throw new Error('useEmployer must be used within EmployerProvider');
  return context;
}
