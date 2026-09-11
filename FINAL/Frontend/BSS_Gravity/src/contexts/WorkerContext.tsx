"use client";

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { WorkerPortalData, WorkerRecord } from '@/types/portal';
export type { WorkerRecord } from '@/types/portal';

type Value = {
  worker: WorkerRecord;
  updateWorker: (patch: Partial<WorkerRecord>) => void;
  saveWorker: (patch: Partial<WorkerRecord>) => Promise<void>;
  resetWorker: () => void;
  ready: true;
  portal: WorkerPortalData;
};

const WorkerContext = createContext<Value | null>(null);

export function WorkerProvider({ children, initialData }: { children: React.ReactNode; initialData: WorkerPortalData }) {
  const [worker, setWorker] = useState(initialData.worker);
  const [portal, setPortal] = useState(initialData);
  const updateWorker = useCallback((patch: Partial<WorkerRecord>) => setWorker(current => ({ ...current, ...patch })), []);
  const saveWorker = useCallback(async (patch: Partial<WorkerRecord>) => {
    const response = await fetch('/api/portal/profile', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(patch) });
    const result = await response.json().catch(() => ({})) as { error?:string };
    if (!response.ok) throw new Error(result.error ?? 'Profile could not be saved.');
    updateWorker(patch);
  }, [updateWorker]);
  const value = useMemo(() => ({ worker, portal:{...portal,worker}, updateWorker, saveWorker, resetWorker:() => {setWorker(initialData.worker);setPortal(initialData)}, ready:true as const }), [worker, portal, updateWorker, saveWorker, initialData]);
  return <WorkerContext.Provider value={value}>{children}</WorkerContext.Provider>;
}

export function useWorker() {
  const context = useContext(WorkerContext);
  if (!context) throw new Error('useWorker must be used inside WorkerProvider');
  return context;
}
