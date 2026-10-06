"use client";

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ContractorPortalData } from '@/types/portal';

type ContractorContextType = {
  contractor: ContractorPortalData;
  replaceContractor: (data: ContractorPortalData) => void;
  refresh: () => Promise<void>;
  mutate: <T>(resource: string, method: 'POST' | 'PATCH' | 'DELETE', payload?: unknown) => Promise<T>;
  employerScope: string;
  setEmployerScope: (value: string) => void;
  scoped: <T>(rows: T[], employerOf: (row: T) => string) => T[];
};

const ContractorContext = createContext<ContractorContextType | null>(null);

export function ContractorProvider({ children, initialData }: { children: React.ReactNode; initialData: ContractorPortalData }) {
  const [contractor, setContractor] = useState(initialData);
  const [employerScope, setEmployerScope] = useState('all');
  // Re-fetch the whole portal so UI reflects server-derived fields after a
  // mutation whose response is partial (no manual page refresh needed).
  const refresh = useCallback(async () => {
    const response = await fetch('/api/portal', { cache: 'no-store' });
    if (!response.ok) return;
    const result = await response.json().catch(() => null) as { data?: ContractorPortalData } | null;
    if (result?.data) setContractor(result.data);
  }, []);
  const mutate = useCallback(async <T,>(resource: string, method: 'POST' | 'PATCH' | 'DELETE', payload?: unknown): Promise<T> => {
    const response = await fetch(`/api/portal/${encodeURIComponent(resource)}`, {
      method, headers:payload === undefined ? undefined : {'Content-Type':'application/json'}, body:payload === undefined ? undefined : JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({})) as T & { error?:string };
    if (!response.ok) throw new Error(result.error ?? 'The update could not be completed.');
    // Sync the portal with the server after every mutation so server-derived
    // fields (ids, computed status/counts, default site) show up without a
    // manual page refresh.
    void refresh();
    return result;
  }, [refresh]);
  const scoped = useCallback(<T,>(rows: T[], employerOf: (row: T) => string): T[] => employerScope === 'all' ? rows : rows.filter(row => employerOf(row) === employerScope), [employerScope]);
  const value = useMemo(() => ({ contractor, replaceContractor:setContractor, refresh, mutate, employerScope, setEmployerScope, scoped }), [contractor, refresh, mutate, employerScope, scoped]);
  return <ContractorContext.Provider value={value}>{children}</ContractorContext.Provider>;
}

export function useContractor() {
  const context = useContext(ContractorContext);
  if (!context) throw new Error('useContractor must be used within ContractorProvider');
  return context;
}
