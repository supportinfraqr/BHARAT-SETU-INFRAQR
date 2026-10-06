"use client";

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { WorkerPortalData, WorkerRecord } from '@/types/portal';
export type { WorkerRecord } from '@/types/portal';

type Value = {
  worker: WorkerRecord;
  updateWorker: (patch: Partial<WorkerRecord>) => void;
  saveWorker: (patch: Partial<WorkerRecord>) => Promise<void>;
  refresh: () => Promise<void>;
  resetWorker: () => void;
  ready: true;
  portal: WorkerPortalData;
};

const WorkerContext = createContext<Value | null>(null);

export function WorkerProvider({ children, initialData }: { children: React.ReactNode; initialData: WorkerPortalData }) {
  const [worker, setWorker] = useState(initialData.worker);
  const [portal, setPortal] = useState(initialData);
  const updateWorker = useCallback((patch: Partial<WorkerRecord>) => setWorker(current => ({ ...current, ...patch })), []);
  // Re-fetch the whole worker portal so pages reflect server-derived fields
  // after a mutation without a manual page refresh.
  const refresh = useCallback(async () => {
    const response = await fetch('/api/portal', { cache: 'no-store' });
    if (!response.ok) return;
    const result = await response.json().catch(() => null) as { data?: WorkerPortalData } | null;
    if (result?.data) { setPortal(result.data); setWorker(result.data.worker); }
  }, []);
  const saveWorker = useCallback(async (patch: Partial<WorkerRecord>) => {
    const response = await fetch('/api/portal/profile', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(patch) });
    const result = await response.json().catch(() => ({})) as { error?:string };
    if (!response.ok) throw new Error(result.error ?? 'Profile could not be saved.');
    updateWorker(patch);
    void refresh();
  }, [updateWorker, refresh]);
  const value = useMemo(() => ({ worker, portal:{...portal,worker}, updateWorker, saveWorker, refresh, resetWorker:() => {setWorker(initialData.worker);setPortal(initialData)}, ready:true as const }), [worker, portal, updateWorker, saveWorker, refresh, initialData]);
  return <WorkerContext.Provider value={value}>{children}</WorkerContext.Provider>;
}

export function useWorker() {
  const context = useContext(WorkerContext);
  if (!context) throw new Error('useWorker must be used inside WorkerProvider');
  return context;
}
