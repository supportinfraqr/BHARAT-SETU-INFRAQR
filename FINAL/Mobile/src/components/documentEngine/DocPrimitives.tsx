"use client";

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export const templateStatusTone: Record<string, { cls: string; dot: string }> = {
  Active: { cls: 'bg-green-50 text-green-700 border-green-100', dot: 'bg-green-600' },
  Draft: { cls: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-600' },
  Inactive: { cls: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
  'Needs Review': { cls: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
};

export const documentStatusTone: Record<string, { cls: string }> = {
  Issued: { cls: 'bg-green-50 text-green-700 border-green-100' },
  Draft: { cls: 'bg-blue-50 text-blue-700 border-blue-100' },
  Expired: { cls: 'bg-orange-50 text-orange-700 border-orange-100' },
  Revoked: { cls: 'bg-red-50 text-red-700 border-red-100' },
  'Not Generated': { cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export function TemplateStatusBadge({ status }: { status: string }) {
  const tone = templateStatusTone[status] ?? templateStatusTone.Draft;
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tone.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`}/>{status}</span>;
}

export function DocStatusBadge({ status }: { status: string }) {
  const tone = documentStatusTone[status] ?? documentStatusTone['Not Generated'];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${tone.cls}`}>{status}</span>;
}

export function DocModal({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[120] bg-black/50 p-4 flex items-center justify-center" role="presentation">
      <section role="dialog" aria-modal="true" className={`w-full ${wide ? 'max-w-6xl' : 'max-w-2xl'} max-h-[calc(100vh-2rem)] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col`}>
        <header className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4 flex-shrink-0 bg-white">
          <div><h2 className="font-semibold text-gray-950">{title}</h2>{subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}</div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-100 text-gray-500"><X size={17}/></button>
        </header>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </section>
    </div>
  );
}

export const btnPrimary = 'h-10 px-4 rounded-lg bg-[#0F172A] hover:bg-black text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
export const btnSecondary = 'h-10 px-4 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50';
export const inputCls = 'w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400';
export const textareaCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400';
