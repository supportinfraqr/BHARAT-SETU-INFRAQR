"use client";

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ContractorPortalData } from '@/types/portal';

type ContractorContextType = {
  contractor: ContractorPortalData;
  replaceContractor: (data: ContractorPortalData) => void;
  mutate: <T>(resource: string, method: 'POST' | 'PATCH' | 'DELETE', payload?: unknown) => Promise<T>;
  employerScope: string;
  setEmployerScope: (value: string) => void;
  scoped: <T>(rows: T[], employerOf: (row: T) => string) => T[];
};

const ContractorContext = createContext<ContractorContextType | null>(null);

export function ContractorProvider({ children, initialData }: { children: React.ReactNode; initialData: ContractorPortalData }) {
  const [contractor, setContractor] = useState(initialData);
  const [employerScope, setEmployerScope] = useState('all');
  const mutate = useCallback(async <T,>(resource: string, method: 'POST' | 'PATCH' | 'DELETE', payload?: unknown): Promise<T> => {
    const response = await fetch(`/api/portal/${encodeURIComponent(resource)}`, {
      method, headers:payload === undefined ? undefined : {'Content-Type':'application/json'}, body:payload === undefined ? undefined : JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({})) as T & { error?:string };
    if (!response.ok) throw new Error(result.error ?? 'The update could not be completed.');
    return result;
  }, []);
  const scoped = useCallback(<T,>(rows: T[], employerOf: (row: T) => string): T[] => employerScope === 'all' ? rows : rows.filter(row => employerOf(row) === employerScope), [employerScope]);
  const value = useMemo(() => ({ contractor, replaceContractor:setContractor, mutate, employerScope, setEmployerScope, scoped }), [contractor, mutate, employerScope, scoped]);
  return <ContractorContext.Provider value={value}>{children}</ContractorContext.Provider>;
}

export function useContractor() {
  const context = useContext(ContractorContext);
  if (!context) throw new Error('useContractor must be used within ContractorProvider');
  return context;
}
