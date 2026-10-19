"use client";

/** BSS-styled building blocks shared by the Medical and Health & Safety workspaces. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Tone } from '@/components/employer/DashboardUI';
import { TONE_SOFT, TONE_TEXT } from '@/components/employer/DashboardUI';

export function Modal({ title, subtitle, onClose, children, footer, size = 'lg' }: {
  title: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; size?: 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  const width = size === 'xl' ? 'sm:max-w-6xl' : size === 'lg' ? 'sm:max-w-5xl' : 'sm:max-w-3xl';
  return <div className="fixed inset-0 z-[140] grid items-end sm:place-items-center bg-[#01183A]/55 backdrop-blur-sm p-0 sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" className={`w-full ${width} max-h-[94vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-[0_30px_60px_-20px_rgba(1,24,58,0.55)]`}>
      <header className="relative px-5 sm:px-6 py-4 text-white flex items-start justify-between gap-3" style={{ background: 'linear-gradient(120deg, #01183A 0%, #022B5E 70%, #1E3A8A 130%)' }}>
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-extrabold tracking-tight">{title}</h3>
          {subtitle && <div className="text-xs text-white/65 mt-0.5">{subtitle}</div>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center shrink-0"><X size={16} /></button>
        <span className="absolute inset-x-0 bottom-0 flex h-1" aria-hidden><span className="flex-1 bg-[#E45D24]" /><span className="flex-1 bg-white/80" /><span className="flex-1 bg-[#14843C]" /></span>
      </header>
      <div className="flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
      {footer && <footer className="px-5 sm:px-6 py-3.5 border-t border-[#DBE3EF] bg-[#F2F6FC]/70 flex flex-wrap items-center justify-end gap-2">{footer}</footer>}
    </div>
  </div>;
}

/** Renders an HTML document (a state form or a certificate) without exposing
 *  its code. Scripts are blocked by the sandbox; pages are zoomed to fit width. */
export function FormFrame({ html, title, className = '', onFrame }: { html: string; title: string; className?: string; onFrame?: (f: HTMLIFrameElement | null) => void }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const fit = useCallback(() => {
    const f = ref.current, doc = f?.contentDocument;
    if (!f || !doc?.documentElement) return;
    const page = doc.querySelector<HTMLElement>('.page');
    const natural = Math.max(page?.offsetWidth ?? 0, 820) + 40;
    doc.documentElement.style.zoom = String(Math.min(1, f.clientWidth / natural));
  }, []);
  useEffect(() => {
    const f = ref.current;
    if (!f) return;
    const ro = new ResizeObserver(fit);
    ro.observe(f);
    return () => ro.disconnect();
  }, [fit]);
  useEffect(() => { onFrame?.(ref.current); }, [onFrame]);
  return <iframe ref={ref} title={title} srcDoc={html} onLoad={fit} sandbox="allow-same-origin allow-modals"
    className={`w-full bg-[#E6E9EE] border-0 ${className}`} />;
}

export function printFrame(frame: HTMLIFrameElement | null) {
  const w = frame?.contentWindow;
  if (!w) return;
  const root = frame.contentDocument?.documentElement;
  const zoom = root?.style.zoom ?? '';
  if (root) root.style.zoom = '1';
  w.focus();
  w.print();
  if (root) root.style.zoom = zoom;
}

export function Pill({ tone, children, dot = true }: { tone: Tone; children: React.ReactNode; dot?: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold ${TONE_SOFT[tone]} ${TONE_TEXT[tone]}`}>
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}{children}
  </span>;
}

export function KpiTile({ label, value, icon: Icon, tone, hint }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ size?: number }>; tone: Tone; hint?: string }) {
  return <article className="relative rounded-2xl bg-white border border-[#DBE3EF] p-4 overflow-hidden">
    <span className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${tone === 'green' ? 'bg-[#14843C]' : tone === 'orange' ? 'bg-[#E45D24]' : tone === 'red' ? 'bg-[#DC2626]' : 'bg-[#1E3A8A]'}`} />
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-bss-text-muted">{label}</span>
      <span className={`w-8 h-8 rounded-full grid place-items-center ${TONE_SOFT[tone]} ${TONE_TEXT[tone]}`}><Icon size={15} /></span>
    </div>
    <strong className="block mt-2 text-3xl font-extrabold leading-none tabular-nums text-[#01183A]">{value}</strong>
    {hint && <p className="mt-1.5 text-[11px] text-bss-text-muted">{hint}</p>}
  </article>;
}

export const INPUT = 'w-full h-9 rounded-xl border border-[#DBE3EF] bg-white px-3 text-xs text-[#01183A] placeholder:text-bss-text-muted focus:outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15 disabled:bg-[#F2F6FC] disabled:text-bss-text-muted';
export const TEXTAREA = 'w-full rounded-xl border border-[#DBE3EF] bg-white px-3 py-2 text-xs text-[#01183A] placeholder:text-bss-text-muted focus:outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15';
export const BTN_PRIMARY = 'h-9 px-4 rounded-full bg-[#01183A] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#022B5E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_ACCENT = 'h-9 px-4 rounded-full bg-[#E45D24] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#C94D18] transition-colors shadow-[0_8px_20px_-10px_#E45D24] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none';
export const BTN_GHOST = 'h-9 px-4 rounded-full border border-[#DBE3EF] bg-white text-xs font-semibold text-[#01183A] inline-flex items-center gap-1.5 hover:border-[#1E3A8A]/40 transition-colors disabled:opacity-50';
export const BTN_SM = 'h-8 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap';

export function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="block text-[11px] font-semibold text-bss-text-secondary mb-1">{label}</span>{children}</label>;
}

export function SubHead({ icon: Icon, title, hint, right }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; hint?: string; right?: React.ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
    <div className="flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-full bg-[#F2F6FC] text-[#1E3A8A] grid place-items-center"><Icon size={14} /></span>
      <div><h4 className="text-xs font-extrabold uppercase tracking-wider text-[#01183A]">{title}</h4>{hint && <p className="text-[11px] text-bss-text-muted">{hint}</p>}</div>
    </div>
    {right}
  </div>;
}

export function useToast() {
  const [msg, setMsg] = useState<{ text: string; tone: 'green' | 'red' } | null>(null);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 3200); return () => clearTimeout(t); }, [msg]);
  const node = msg ? <div role="status" className={`fixed bottom-5 right-5 z-[160] rounded-2xl px-4 py-3 text-xs font-semibold text-white shadow-lg ${msg.tone === 'green' ? 'bg-[#14843C]' : 'bg-[#DC2626]'}`}>{msg.text}</div> : null;
  const toast = useCallback((text: string, tone: 'green' | 'red' = 'green') => setMsg({ text, tone }), []);
  return { toast, node };
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '•';
}
