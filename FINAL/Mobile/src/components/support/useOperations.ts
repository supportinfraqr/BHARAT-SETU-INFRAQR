"use client";

import { useCallback, useEffect, useState } from 'react';
import type { OperationsAction, OperationsActionResult, OperationsSnapshot } from '@/types/operations';

export function useOperations(initialSnapshot: OperationsSnapshot, pollMs = 0) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/operations', { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { data?:OperationsSnapshot; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Operations data could not be refreshed.');
      setSnapshot(body.data);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Operations data could not be refreshed.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!pollMs) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, refresh]);

  const run = useCallback(async (action: OperationsAction, actionId: string = action.action) => {
    setBusyId(actionId);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/operations', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify(action),
      });
      const body = await response.json().catch(() => ({})) as { data?:OperationsSnapshot; result?:OperationsActionResult; error?:string };
      if (!response.ok || !body.data || !body.result) throw new Error(body.error ?? 'The operation could not be completed.');
      setSnapshot(body.data);
      setNotice(body.result.message);
      return body.result;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The operation could not be completed.');
      return null;
    } finally {
      setBusyId('');
    }
  }, []);

  return { snapshot, refreshing, busyId, error, notice, refresh, run, setError, setNotice };
}
