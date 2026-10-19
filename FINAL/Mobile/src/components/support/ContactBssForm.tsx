"use client";

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, Clock3, FileText, LifeBuoy, Loader2, Mail, MessageSquareWarning, Phone, Send, ShieldCheck, UserRound } from 'lucide-react';

type Role = 'worker' | 'contractor' | 'employer';

type Props = {
  role: Role;
  backHref: string;
  defaultName?: string;
  defaultBssId?: string;
  defaultEmail?: string;
  defaultPhone?: string;
};

const ROLE_LABEL: Record<Role, string> = {
  worker: 'Worker',
  contractor: 'Contractor',
  employer: 'Employer',
};

const CATEGORIES = [
  { key: 'account', label: 'Account & access', icon: UserRound },
  { key: 'attendance', label: 'Attendance & wages', icon: Clock3 },
  { key: 'gate_pass', label: 'Gate pass', icon: ShieldCheck },
  { key: 'compliance', label: 'Compliance & documents', icon: FileText },
  { key: 'technical', label: 'Technical issue', icon: MessageSquareWarning },
  { key: 'other', label: 'Other', icon: LifeBuoy },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

const input = 'w-full h-11 rounded-xl border border-bss-border bg-white px-3 text-sm text-bss-text-primary placeholder:text-bss-text-muted/70 focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20 focus:border-bss-interactive-blue';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-bss-text-muted mb-1.5';

export default function ContactBssForm({ role, backHref, defaultName = '', defaultBssId = '', defaultEmail = '', defaultPhone = '' }: Props) {
  const [form, setForm] = useState({
    name: defaultName,
    bssId: defaultBssId,
    email: defaultEmail,
    phone: defaultPhone,
    category: 'other' as CategoryKey,
    subject: '',
    message: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<{ reference: string; emailed: boolean } | null>(null);

  const set = (patch: Partial<typeof form>) => setForm(current => ({ ...current, ...patch }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role }),
      });
      const body = await response.json().catch(() => ({})) as { reference?: string; emailed?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Your message could not be sent.');
      setSent({ reference: body.reference ?? '', emailed: Boolean(body.emailed) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-2xl mx-auto space-y-5 pb-10">
        <div className="relative overflow-hidden rounded-3xl border border-bss-border bg-white p-7 sm:p-10 text-center shadow-[0_18px_50px_-32px_rgba(1,24,58,0.5)]">
          <div aria-hidden className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-bss-soft-green blur-2xl" />
          <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-bss-soft-green text-bss-green"><CheckCircle2 size={34}/></span>
          <h1 className="relative mt-5 text-2xl font-bold text-bss-text-primary">Message received</h1>
          <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-bss-text-muted">
            Thank you, {form.name.split(' ')[0] || 'there'}. Our support team has your message and will reply to <strong className="text-bss-text-primary">{form.email}</strong>.
          </p>
          {sent.reference && (
            <div className="relative mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-bss-border bg-bss-bg px-4 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Reference</span>
              <code className="text-xs font-bold text-[#01183A]">{sent.reference}</code>
            </div>
          )}
          <div className="relative mt-7 flex flex-col sm:flex-row justify-center gap-2.5">
            <button type="button" onClick={() => { setSent(null); setForm({ name: defaultName, bssId: defaultBssId, email: defaultEmail, phone: defaultPhone, category: 'other', subject: '', message: '' }); }} className="h-11 rounded-xl border border-bss-border bg-white px-5 text-sm font-bold text-bss-text-primary hover:bg-bss-bg">
              Raise another message
            </button>
            <Link href={backHref} className="h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#01183A] px-5 text-sm font-bold text-white hover:bg-[#022B5E]">
              <ChevronLeft size={15}/>Back to dashboard
            </Link>
          </div>
        </div>
        <p className="text-center text-[11px] text-bss-text-muted">Keep the reference number handy if you need to follow up.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-bss-navy via-bss-deep-navy to-bss-interactive-blue p-5 sm:p-6 text-white shadow-lg">
        <div aria-hidden className="absolute -right-8 -top-10 h-44 w-44 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">Bharat Shram Setu · Support</p>
            <h1 className="mt-1 flex items-center gap-2.5 text-2xl font-bold md:text-3xl"><LifeBuoy size={28} className="text-white/80"/>Contact BSS Support</h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/75">Raise a BSS-related grievance or ask for help. Your message is emailed to our support desk and you get a reference number.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold">Submitting as {ROLE_LABEL[role]}</span>
            <Link href={backHref} className="inline-flex items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-bss-navy hover:bg-white/90"><ChevronLeft size={14}/>Back</Link>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <form onSubmit={submit} className="rounded-3xl border border-bss-border bg-white p-5 shadow-sm sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-bss-text-primary">Your message</h2>
              <p className="mt-0.5 text-[11px] text-bss-text-muted">Fields marked * are required.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bss-soft-green px-2.5 py-1 text-[10px] font-bold text-bss-green"><ShieldCheck size={12}/>Secure</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Full name *</span>
              <input required value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Your full name" className={input} autoComplete="name" />
            </label>
            <label className="block">
              <span className={label}>Email for our reply *</span>
              <input required type="email" value={form.email} onChange={e => set({ email: e.target.value })} placeholder="you@example.com" className={input} autoComplete="email" />
            </label>
            <label className="block">
              <span className={label}>Mobile number</span>
              <input inputMode="tel" value={form.phone} onChange={e => set({ phone: e.target.value.replace(/[^\d+\-\s]/g, '').slice(0, 20) })} placeholder="Optional" className={input} autoComplete="tel" />
            </label>
            <label className="block">
              <span className={label}>BSS ID</span>
              <input value={form.bssId} onChange={e => set({ bssId: e.target.value.toUpperCase() })} placeholder="e.g. BSS-W…" className={`${input} font-mono`} />
            </label>
          </div>

          <div>
            <p className={label}>What is this about? *</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map(category => {
                const selected = form.category === category.key;
                return (
                  <button key={category.key} type="button" onClick={() => set({ category: category.key })} aria-pressed={selected} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[11px] font-semibold transition-colors ${selected ? 'border-[#1E3A8A] bg-[#01183A] text-white shadow-sm' : 'border-bss-border bg-white text-bss-text-secondary hover:bg-bss-bg'}`}>
                    <category.icon size={14} className="flex-shrink-0"/><span className="min-w-0 leading-tight">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className={label}>Subject *</span>
            <input required value={form.subject} onChange={e => set({ subject: e.target.value.slice(0, 160) })} placeholder="A short summary of your grievance" className={input} />
          </label>

          <label className="block">
            <span className={`${label} flex items-center justify-between`}><span>Message *</span><span className="font-semibold normal-case tracking-normal text-bss-text-muted">{form.message.length}/5000</span></span>
            <textarea required value={form.message} onChange={e => set({ message: e.target.value.slice(0, 5000) })} rows={6} placeholder="Explain what happened, where, and when. Include any reference numbers that may help us investigate." className="w-full rounded-xl border border-bss-border bg-white px-3 py-2.5 text-sm leading-relaxed text-bss-text-primary placeholder:text-bss-text-muted/70 focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20 focus:border-bss-interactive-blue resize-y"/>
          </label>

          {error && <p role="alert" className="rounded-2xl border border-bss-orange/20 bg-bss-soft-orange px-3.5 py-3 text-xs font-semibold text-bss-error">{error}</p>}

          <div className="flex flex-col gap-3 border-t border-bss-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-[11px] text-bss-text-muted"><Mail size={13}/>We reply to the email you provide.</p>
            <button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#01183A] px-6 text-sm font-bold text-white shadow-lg shadow-bss-navy/20 transition-all hover:-translate-y-0.5 hover:bg-[#022B5E] disabled:translate-y-0 disabled:opacity-60">
              {busy ? <><Loader2 size={16} className="animate-spin"/>Sending…</> : <><Send size={16}/>Send message</>}
            </button>
          </div>
        </form>

        <aside className="space-y-3">
          <section className="rounded-3xl border border-bss-border bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-bss-text-primary"><Clock3 size={16} className="text-bss-interactive-blue"/>What happens next</h2>
            <ol className="mt-3 space-y-3">
              {[
                ['We receive your message', 'It is logged with a unique reference number.'],
                ['Our team reviews it', 'We route it to the right BSS desk for your role.'],
                ['We reply by email', 'Watch the inbox of the email address you provide.'],
              ].map(([title, detail], index) => (
                <li key={title} className="flex gap-2.5">
                  <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-bss-blue-tint text-[10px] font-bold text-bss-interactive-blue">{index + 1}</span>
                  <div><p className="text-xs font-semibold text-bss-text-primary">{title}</p><p className="mt-0.5 text-[11px] leading-relaxed text-bss-text-muted">{detail}</p></div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-3xl border border-bss-border bg-gradient-to-br from-bss-bg to-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-bss-text-primary"><Phone size={16} className="text-bss-interactive-blue"/>Need urgent help?</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-bss-text-muted">For an on-site emergency, contact your contractor or principal employer immediately. Use this form for BSS platform and grievance matters.</p>
          </section>

          <section className="rounded-3xl border border-bss-border bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-bss-text-primary"><ShieldCheck size={16} className="text-bss-green"/>Your privacy</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-bss-text-muted">Only the BSS support team sees your message. We use your contact details solely to respond to this grievance.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
