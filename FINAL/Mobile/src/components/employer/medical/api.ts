/** Client calls for the Medical / Health & Safety workspaces. All endpoints are
 *  new (src/app/api/admin/** and src/app/api/employer/{medical-*,safety-records}). */

import type { DirectoryEmployer, FormDispatch, FormStatus, MedicalExam, SafetyRecord, StateForm } from './types';

export type StateFormSummary = { state: string; code: string; kind: 'State' | 'UT'; formType: 'VIII' | 'IX'; status: FormStatus; version: number; updatedAt: string; updatedBy: string; dispatches: number; sites: number; lastSentAt: string };
export type DispatchSummary = Omit<FormDispatch, 'html'>;

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init, headers: init?.body ? { 'Content-Type': 'application/json' } : undefined });
  const data = await res.json().catch(() => ({})) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
  return data;
}
const q = encodeURIComponent;

export const medicalApi = {
  listForms: (formType: 'VIII' | 'IX' = 'VIII') => call<{ forms: StateFormSummary[] }>(`/api/admin/medical-forms?formType=${formType}`).then(r => r.forms),
  getForm: (state: string, formType: 'VIII' | 'IX' = 'VIII') => call<{ form: StateForm }>(`/api/admin/medical-forms?state=${q(state)}&formType=${formType}`).then(r => r.form),
  saveForm: (state: string, formType: 'VIII' | 'IX', html: string, status: 'draft' | 'frozen') => call<{ form: StateForm }>('/api/admin/medical-forms', { method: 'PUT', body: JSON.stringify({ state, formType, html, status }) }).then(r => r.form),
  resetForm: (state: string, formType: 'VIII' | 'IX' = 'VIII') => call<{ form: StateForm }>(`/api/admin/medical-forms?state=${q(state)}&formType=${formType}`, { method: 'DELETE' }).then(r => r.form),
  publishAll: (formType: 'VIII' | 'IX') => call<{ published: number }>('/api/admin/medical-forms/bulk', { method: 'POST', body: JSON.stringify({ action: 'publish-all', formType }) }),
  resetAll: (formType: 'VIII' | 'IX') => call<{ reset: number }>('/api/admin/medical-forms/bulk', { method: 'POST', body: JSON.stringify({ action: 'reset-all', formType }) }),
  listEmployers: () => call<{ employers: DirectoryEmployer[] }>('/api/admin/medical-forms/employers').then(r => r.employers),
  history: (state: string) => call<{ dispatches: DispatchSummary[] }>(`/api/admin/medical-forms/dispatch?state=${q(state)}`).then(r => r.dispatches),
  send: (body: { state: string; employerId: string; siteIds: string[]; note?: string }) => call<{ dispatch: DispatchSummary }>('/api/admin/medical-forms/dispatch', { method: 'POST', body: JSON.stringify(body) }).then(r => r.dispatch),

  receivedForms: (employerId: string) => call<{ dispatches: FormDispatch[] }>(`/api/employer/medical-forms?employerId=${q(employerId)}`).then(r => r.dispatches),
  exams: (workerIds: string[]) => call<{ exams: Record<string, MedicalExam[]> }>(`/api/employer/medical-exams?workers=${q(workerIds.join(','))}`).then(r => r.exams),
  saveExam: (exam: MedicalExam) => call<{ exam: MedicalExam }>('/api/employer/medical-exams', { method: 'POST', body: JSON.stringify(exam) }).then(r => r.exam),
  safety: (workerIds: string[]) => call<{ records: Record<string, SafetyRecord> }>(`/api/employer/safety-records?workers=${q(workerIds.join(','))}`).then(r => r.records),
  saveSafety: (rec: SafetyRecord) => call<{ record: SafetyRecord }>('/api/employer/safety-records', { method: 'POST', body: JSON.stringify(rec) }).then(r => r.record),
  issueSafetyCertificate: (workerId: string | number) => call<{ certificate: { certNo: string; issuedAt: string } }>('/api/employer/safety-certificate', { method: 'POST', body: JSON.stringify({ workerId }) }).then(r => r.certificate),
};
