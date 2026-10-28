'use client';
import { useCallback, useEffect, useState } from 'react';

export type AdoptionStatus = {
  required: boolean;
  complete: boolean;
  siteCount: number;
  appointmentLetter: { adopted: boolean; templateName?: string };
  medical: { complete: boolean; states: Array<{ state:string; required:boolean; adopted:boolean; mineRequired?:boolean; templateName?:string }> };
  registers: { complete: boolean; states: Array<{ state:string; required:boolean; adopted:boolean; adoptedCount:number; total:number }> };
  costSheet: { required: boolean; scope: string };
};

export function useAdoptionStatus(enabled = true, reloadKey = "") {
  const [status, setStatus] = useState<AdoptionStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    if (!enabled) { setStatus(null); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/employer/adoption-status', { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { data?:AdoptionStatus; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error || 'Adoption status could not be loaded.');
      setStatus(body.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Adoption status could not be loaded.'); }
    finally { setLoading(false); }
  }, [enabled]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void reload(); }, [reload, reloadKey]);
  return { status, loading, error, reload };
}
