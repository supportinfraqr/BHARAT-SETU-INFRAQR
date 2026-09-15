"use client";

import { Printer, X } from 'lucide-react';
import { openPrintHtml } from '@/lib/documentEngine/render';

/** Shared gate-pass viewer: renders the pass HTML in a modal with a Print action
 *  (the print dialog also offers "Save as PDF"). Used by the employer, contractor
 *  and worker portals so the experience is identical. */
export function GatePassViewer({ html, title, onClose }: { html: string; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] bg-black/50 p-4 flex items-center justify-center" role="presentation">
      <section role="dialog" aria-modal="true" aria-label="Gate pass" className="w-full max-w-6xl max-h-[calc(100vh-2rem)] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <header className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div><h2 className="font-semibold text-gray-950">{title}</h2><p className="text-xs text-gray-500 mt-1">Gate pass</p></div>
          <div className="flex items-center gap-2">
            <button onClick={() => openPrintHtml(html, title)} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-gray-50"><Printer size={14}/>Print</button>
            <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-100 text-gray-500"><X size={17}/></button>
          </div>
        </header>
        <div className="p-5 overflow-auto flex-1"><iframe title="Gate pass" srcDoc={html} className="w-full h-[760px] border-0 bg-white"/></div>
      </section>
    </div>
  );
}
