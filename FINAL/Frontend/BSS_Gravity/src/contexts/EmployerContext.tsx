"use client";

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { EmployerPortalData } from '@/types/portal';

type EmployerContextType = {
  employer: EmployerPortalData;
  replaceEmployer: (data: EmployerPortalData) => void;
  mutate: <T>(resource: string, method: 'POST' | 'PATCH' | 'DELETE', payload?: unknown) => Promise<T>;
};

const EmployerContext = createContext<EmployerContextType | null>(null);

export function EmployerProvider({ children, initialData }: { children: React.ReactNode; initialData: EmployerPortalData }) {
  const [employer, setEmployer] = useState(initialData);
  const mutate = useCallback(async <T,>(resource: string, method: 'POST' | 'PATCH' | 'DELETE', payload?: unknown): Promise<T> => {
    const response = await fetch(`/api/portal/${encodeURIComponent(resource)}`, {
      method,
      headers: payload === undefined ? undefined : { 'Content-Type':'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({})) as T & { error?:string };
    if (!response.ok) throw new Error(result.error ?? 'The update could not be completed.');
    return result;
  }, []);
  const value = useMemo(() => ({ employer, replaceEmployer:setEmployer, mutate }), [employer, mutate]);
  return <EmployerContext.Provider value={value}>{children}</EmployerContext.Provider>;
}

export function useEmployer() {
  const context = useContext(EmployerContext);
  if (!context) throw new Error('useEmployer must be used within EmployerProvider');
  return context;
}
