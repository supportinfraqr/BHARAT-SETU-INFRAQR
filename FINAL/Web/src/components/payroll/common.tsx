"use client";

import { X } from 'lucide-react';
import type { PayrollWorkerRecord } from '@/types/portal';
import { formatInr } from '@/components/contractor/payroll/PayrollCalculator';

export { formatInr };

export const money = (value: number) => formatInr(value);

export function recordStatusTone(status: PayrollWorkerRecord['status']): string {
  const map: Record<string, string> = { Draft:'bg-gray-100 text-gray-600', Reviewed:'bg-blue-50 text-blue-700', Submitted:'bg-orange-50 text-orange-700', Verified:'bg-green-50 text-green-700', Returned:'bg-red-50 text-red-700', Exception:'bg-red-50 text-red-700' };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

export function paymentTone(status: string): string {
  const map: Record<string, string> = { 'Not Yet Paid':'bg-gray-100 text-gray-600', Pending:'bg-orange-50 text-orange-700', Paid:'bg-green-50 text-green-700', Failed:'bg-red-50 text-red-700', Reversed:'bg-red-50 text-red-700' };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

export function runTone(status: string): string {
  const map: Record<string, string> = { Planned:'bg-gray-100 text-gray-600', Processing:'bg-blue-50 text-blue-700', 'Awaiting Approval':'bg-orange-50 text-orange-700', Approved:'bg-green-50 text-green-700', Paid:'bg-green-50 text-green-700', Rejected:'bg-red-50 text-red-700' };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

export function approvalTone(status: string): string {
  const map: Record<string, string> = { Pending:'bg-orange-50 text-orange-700', Approved:'bg-green-50 text-green-700', Rejected:'bg-red-50 text-red-700', 'Partially Approved':'bg-blue-50 text-blue-700', 'Clarification Requested':'bg-purple-50 text-purple-700' };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

export function StatusPill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${tone}`}>{children}</span>;
}

export function Kpi({ label, value, sub, icon: Icon, tone }: { label: string; value: React.ReactNode; sub?: string; icon: React.ComponentType<{ size?: number }>; tone: string }) {
  return <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{label}</span>{Icon && <span className={`bss-kpi-icon ${tone}`}><Icon size={16}/></span>}</div><strong className="text-xl">{value}</strong>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</article>;
}

export function Section({ title, subtitle, right, children, className }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`bg-white border border-gray-200 rounded-2xl overflow-hidden ${className ?? ''}`}>
    <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-sm font-semibold text-gray-950">{title}</h2>{subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}</div>
      {right}
    </header>
    {children}
  </section>;
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return <div className="px-5 py-10 text-center"><p className="text-sm font-semibold text-gray-600">{title}</p>{text && <p className="text-xs text-gray-400 mt-1">{text}</p>}</div>;
}

export function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"><span className="text-gray-500 text-xs">{label}</span><span className={`text-xs font-semibold text-gray-800 ${tone ?? ''}`}>{value}</span></div>;
}

export function Modal({ title, subtitle, onClose, children, footer, width = 'max-w-lg' }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; width?: string }) {
  return <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
    <div className={`bg-white rounded-2xl w-full ${width} max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200`}>
      <header className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 sticky top-0 bg-white">
        <div><h2 className="font-semibold text-gray-950">{title}</h2>{subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}</div>
        <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0"><X size={16}/></button>
      </header>
      <div className="p-5">{children}</div>
      {footer && <footer className="px-5 py-4 border-t border-gray-100 bg-gray-50/60 flex flex-wrap justify-end gap-2 rounded-b-2xl">{footer}</footer>}
    </div>
  </div>;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block text-xs font-semibold text-gray-600"><span className="block mb-1.5">{label}</span>{children}{hint && <span className="block text-[11px] font-normal text-gray-400 mt-1">{hint}</span>}</label>;
}

export const inputClass = 'w-full h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300';
export const textareaClass = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100';
export const primaryBtn = 'h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed';
export const secondaryBtn = 'h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 inline-flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50';
