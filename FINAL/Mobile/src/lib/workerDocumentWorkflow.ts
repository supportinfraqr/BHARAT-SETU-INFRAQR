/**
 * Worker Document Automation — frontend binding trigger state (DEMO ONLY).
 *
 * The production trigger is a backend workflow: when a Worker–Contractor
 * binding reaches the approved/completed state, the backend issues the
 * Appointment Letter; when the worker's employment becomes Inactive, the
 * backend issues the Service Certificate (see WorkerPortalData.documents).
 *
 * Until that backend hook exists, this module isolates a small client-side
 * demo state that drives the Appointment Letter in /worker/Documents:
 *   • binding → Appointment Letter (written by the Binding page when the
 *     worker approves a binding request — the live frontend trigger).
 *
 * The Service Certificate trigger reads the real worker employment status
 * (worker.employment.status === 'Inactive'); the Documents page offers a
 * clearly-labelled demo preview for that state.
 *
 * Nothing in this file touches production APIs; swap `readAutoDocumentState`
 * consumers to server data when backend generation lands.
 */
"use client";

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/date';

export type ApprovedBinding = { contractor: string; approvedOn: string };

export type WorkerAutoDocumentState = {
  /** Latest Worker–Contractor binding approved by the worker. */
  binding: ApprovedBinding | null;
};

const STORAGE_KEY = 'bss-worker-autodoc-demo-v1';
const CHANGE_EVENT = 'bss-worker-autodoc-change';

/** Demo default — the seeded accepted binding (12 Aug 2024) that produced the
 * existing Appointment Letter dated 14 Aug 2024. */
export const DEMO_APPROVED_BINDING: ApprovedBinding = { contractor: 'RK Buildcon Pvt. Ltd.', approvedOn: '14 Aug 2024' };

export function defaultAutoDocumentState(): WorkerAutoDocumentState {
  return { binding: DEMO_APPROVED_BINDING };
}

function isValidBinding(value: unknown): value is ApprovedBinding {
  if (!value || typeof value !== 'object') return false;
  const binding = value as Partial<ApprovedBinding>;
  return typeof binding.contractor === 'string' && binding.contractor.length > 0 && typeof binding.approvedOn === 'string';
}

export function readAutoDocumentState(): WorkerAutoDocumentState {
  const fallback = defaultAutoDocumentState();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<WorkerAutoDocumentState>;
    return {
      binding: isValidBinding(parsed.binding) ? { contractor: parsed.binding.contractor, approvedOn: parsed.binding.approvedOn } : fallback.binding,
    };
  } catch {
    return fallback;
  }
}

function writeAutoDocumentState(state: WorkerAutoDocumentState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* storage unavailable (private mode) — demo preview stays in-memory only */
  }
}

/** Called by the Binding page when the worker approves a binding request. */
export function recordBindingApproval(binding: ApprovedBinding): void {
  writeAutoDocumentState({ binding });
}

/** Reactive view of the demo binding state (localStorage-backed). */
export function useAutoDocumentState(): WorkerAutoDocumentState {
  const [state, setState] = useState<WorkerAutoDocumentState>(defaultAutoDocumentState);
  useEffect(() => {
    const sync = () => setState(readAutoDocumentState());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);
  return state;
}

/** Display format used across the document list (e.g. "02/09/2026"). */
export function formatApprovalDate(value: string | Date): string {
  return formatDate(value, '');
}
