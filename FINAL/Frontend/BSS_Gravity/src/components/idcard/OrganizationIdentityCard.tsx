"use client";

import { Briefcase, CheckCircle2, RadioTower, ShieldCheck } from 'lucide-react';
import WorkerQr from '@/components/qr/WorkerQr';

// ─────────────────────────────────────────────────────────────────────────────
// Shared BSS Organization Identity Card (Contractor + Employer).
// One role-configured component — worker page remains the untouched person
// identity template. Visual geometry per role is identical to the approved
// card: same shell, colors, watermark, QR zone, RFID, typography & export.
// ─────────────────────────────────────────────────────────────────────────────

export type OrgCardBadge = { icon: 'shield' | 'briefcase' | 'check'; title: string; sub: string };

export type OrganizationCardContent = {
  role: 'contractor' | 'employer';
  /** standard = worker-style layout (Contractor) · compact = Employer layout */
  variant: 'standard' | 'compact';
  entityName: string;
  entityType: string;
  entityIdLabel: string;
  entityId: string;
  dateLabel: string;
  dateValue: string;
  registrationLabel?: string;
  registrationValue?: string;
  initials: string;
  issueDate: string;
  backTagline: string;
  backBadges: OrgCardBadge[];
};

const BADGE_ICONS = { shield: ShieldCheck, briefcase: Briefcase, check: CheckCircle2 } as const;

/** Organization emblem initials — acronym-aware, stopword-free. */
export function entityInitials(name: string): string {
  const stop = new Set(['pvt','ltd','private','limited','llp','company','co','corp','corporation','inc','the','and','&','of','group','services','enterprises','industries','builders']);
  const words = name.split(/\s+/).map(w => w.replace(/[^A-Za-z0-9]/g, '')).filter(w => w && !stop.has(w.toLowerCase()));
  const out: string[] = [];
  for (const w of words) {
    if (/^[A-Z0-9]{2,3}$/.test(w)) { out.push(w); break; }  // brand acronym is the emblem
    out.push(w.charAt(0).toUpperCase());
    if (out.join('').length >= 2) break;
  }
  return out.join('').slice(0, 3) || name.charAt(0).toUpperCase();
}

/** Card date formatter — accepts ISO (YYYY-MM-DD) or DD-MM-YYYY; outputs DD/MM/YYYY. */
export function formatCardDate(raw?: string): string {
  if (!raw || raw === '—') return '—';
  const parts = raw.trim().split(/[-/]/).map(Number);
  if (parts.length !== 3 || parts.some(p => Number.isNaN(p))) return raw;
  const [a, b, c] = parts;
  // ISO: a=year b=month c=day · DD-MM-YYYY: a=day b=month c=year — month is b in both.
  const year = a > 1000 ? a : c;
  const day = a > 1000 ? c : a;
  const month = b;
  if (!year || !month || !day) return raw;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

const waveBackground = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23ffffff' fill-opacity='0.05' d='M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3Cpath fill='%23ffffff' fill-opacity='0.03' d='M0,96L60,117.3C120,139,240,181,360,186.7C480,192,600,160,720,138.7C840,117,960,107,1080,117.3C1200,128,1320,160,1380,176L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`;

export default function OrganizationIdentityCard({
  content,
  frontRef,
  backRef,
  isFlipped,
  onToggleFlip,
}: {
  content: OrganizationCardContent;
  frontRef: React.RefObject<HTMLDivElement | null>;
  backRef: React.RefObject<HTMLDivElement | null>;
  isFlipped: boolean;
  onToggleFlip: () => void;
}) {
  const standard = content.variant === 'standard';

  return (
    <div className="flex justify-center perspective-1000 mb-8">
      <div
        className={`relative w-full max-w-[400px] h-[252px] transition-transform duration-700 preserve-3d bss-flip-card cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
        onClick={() => onToggleFlip()}
      >
        {/* ────────────────────────── FRONT ────────────────────────── */}
        <div
          ref={frontRef}
          data-bss-face
          className={`absolute inset-0 backface-hidden bg-[#0A192F] rounded-xl shadow-2xl overflow-hidden border-2 border-slate-400 text-white flex flex-col font-sans ${standard ? '' : 'p-4'}`}
          style={{ opacity: isFlipped ? 0 : 1, pointerEvents: isFlipped ? 'none' : 'auto' }}
          aria-hidden={isFlipped}
        >
          {/* Navy/silver depth, wave, tricolour edge, watermark — approved artwork */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/[0.07] via-transparent to-black/15 z-0" />
          {standard && <div className="absolute inset-x-0 bottom-0 h-[72px] z-0 opacity-55 mix-blend-screen" style={{ backgroundImage: waveBackground, backgroundPosition: 'bottom', backgroundSize: 'cover' }} />}
          <div aria-hidden="true" className="absolute left-0 inset-y-0 z-20 w-[4px] flex flex-col"><span className="flex-1 bg-[#FF9933]"/><span className="flex-1 bg-white"/><span className="flex-1 bg-[#138808]"/></div>
          {standard && <img aria-hidden="true" src="/bss-construction-watermark.png" className="absolute z-0 inset-x-0 bottom-[23px] w-full h-[142px] object-cover object-center opacity-[0.075]" alt="" />}

          {/* Header */}
          {standard ? (
            <div className="h-[57px] px-4 pt-3 flex justify-between items-start relative z-10 border-b border-white/[0.08]">
              <div className="leading-tight flex flex-col items-start min-w-0">
                <h2 className="text-[15px] font-extrabold tracking-[-0.015em] leading-none whitespace-nowrap" aria-label="Bharat Shram Setu"><span className="text-white">Bharat</span><span className="text-[#FF9933]">Shram</span><span className="text-[#2F9E67]">Setu</span></h2>
                <p className="text-[5.5px] text-slate-300 mt-1.5 tracking-[0.105em] font-semibold uppercase leading-none whitespace-nowrap">One Worker. One Identity. One Future.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 h-[18px] px-2 rounded-full border border-slate-300/35 bg-white/[0.08] shadow-inner" aria-label="RFID enabled card"><RadioTower size={9} className="text-slate-200" strokeWidth={2}/><span className="text-[6px] text-slate-100 uppercase font-extrabold tracking-[0.12em]">RFID Enabled</span></span>
            </div>
          ) : (
            <div className="flex items-center justify-between relative z-10">
              <div><h2 className="text-[15px] font-extrabold tracking-[-0.015em]"><span className="text-white">Bharat</span><span className="text-[#FF9933]">Shram</span><span className="text-[#2F9E67]">Setu</span></h2><p className="text-[5.5px] text-slate-300 tracking-[0.105em] font-semibold uppercase">One Worker. One Identity. One Future.</p></div>
              <span className="inline-flex items-center gap-1.5 h-[18px] px-2 rounded-full border border-slate-300/35 bg-white/[0.08]"><RadioTower size={9} className="text-slate-200"/><span className="text-[6px] text-slate-100 uppercase font-extrabold tracking-[0.12em]">RFID Enabled</span></span>
            </div>
          )}

          {/* Hero: identity · QR (no photo zone — organization identity) */}
          <div className={`flex relative z-10 flex-1 min-h-0 ${standard ? 'px-4 pt-2 pb-2 items-center gap-3' : 'items-center gap-3 mt-3'}`}>
            {/* Identity zone — organization schema */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div>
                <p className="text-[6px] text-slate-300 uppercase tracking-[0.17em] font-bold mb-1">{content.role === 'contractor' ? 'Contractor Name' : 'Employer Name'}</p>
                <p className={`font-extrabold tracking-[0.025em] uppercase text-white leading-[1.05] drop-shadow-sm break-words ${standard ? 'text-[16px]' : 'text-[15px]'}`}>{content.entityName}</p>
              </div>
              <div className="mt-2.5">
                <p className="text-[6px] text-slate-300 uppercase tracking-[0.17em] font-bold mb-1">Entity Type</p>
                <p className="text-[8px] font-bold tracking-[0.06em] text-white leading-none break-words uppercase">{content.entityType}</p>
              </div>
              <div className="mt-2">
                <p className="text-[6px] text-slate-300 uppercase tracking-[0.17em] font-bold mb-1">{content.entityIdLabel}</p>
                <p className={`font-mono font-extrabold tracking-[0.095em] metallic-text embossed-text leading-none ${standard ? 'text-[10px]' : 'text-[9px]'}`}>{content.entityId}</p>
              </div>
              <div className={`flex ${standard ? 'gap-6 mt-2.5' : 'gap-5 mt-2.5'}`}>
                <div>
                  <p className="text-[6px] text-slate-300 uppercase tracking-[0.16em] font-bold mb-1">{content.dateLabel}</p>
                  <p className={`font-bold tracking-[0.06em] text-white leading-none ${standard ? 'text-[9px]' : 'text-[9px]'}`}>{content.dateValue}</p>
                </div>
                {content.registrationValue && (
                  <div>
                    <p className="text-[6px] text-slate-300 uppercase tracking-[0.16em] font-bold mb-1">{content.registrationLabel ?? 'Registration No.'}</p>
                    <p className="font-mono font-bold tracking-[0.05em] text-white leading-none text-[7.5px]">{content.registrationValue}</p>
                  </div>
                )}
              </div>
            </div>

            {/* QR zone — identical geometry, BSS logo overlay (worker parity) */}
            <div className={`w-[92px] flex-shrink-0 ${standard ? 'flex flex-col justify-end items-center pb-0.5' : 'flex flex-col justify-end items-center'}`}>
              <div className="relative bg-white p-1 rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] w-[84px] h-[84px] flex items-center justify-center border border-slate-200">
                <WorkerQr bssId={content.entityId} size={256} />
                <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[13px] h-[13px] bg-white rounded-[3px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[10px] h-[10px] object-contain" /></span></span>
              </div>
              <p className="text-[5px] text-slate-300 uppercase font-bold tracking-[0.12em] mt-1.5 whitespace-nowrap">Scan to Verify</p>
            </div>
          </div>

          {/* Footer — approved issue-date logic retained */}
          {standard ? (
            <div className="h-[36px] px-4 flex justify-between items-center relative z-10 border-t border-white/[0.08] bg-black/[0.08]">
              <div><p className="text-[5.5px] text-slate-300 uppercase tracking-[0.16em] font-bold mb-1">Issue Date</p><p className="text-[9px] font-bold tracking-[0.08em] text-white leading-none">{content.issueDate}</p></div>
              <p className="text-[6px] text-slate-200 font-bold tracking-[0.12em] uppercase">BSS Card · National ID</p>
              <div className="w-[92px]" aria-hidden="true" />
            </div>
          ) : (
            <div className="flex justify-between items-center relative z-10 mt-2"><p className="text-[5.5px] text-slate-300 uppercase tracking-[0.16em] font-bold">Issue Date</p><p className="text-[9px] font-bold text-white">{content.issueDate}</p><div className="w-[92px]"/></div>
          )}
        </div>

        {/* ────────────────────────── BACK ────────────────────────── */}
        <div
          ref={backRef}
          data-bss-face
          className={`absolute inset-0 backface-hidden rotate-y-180 bg-[#0A192F] rounded-xl shadow-2xl overflow-hidden border-2 border-slate-400 text-white flex flex-col font-sans ${standard ? '' : 'px-4 py-3'}`}
          style={{ opacity: isFlipped ? 1 : 0, pointerEvents: isFlipped ? 'auto' : 'none' }}
          aria-hidden={!isFlipped}
        >
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-bl from-transparent via-white/5 to-transparent z-0 opacity-80" />
          {standard && <div className="absolute inset-0 z-0 opacity-70 mix-blend-screen" style={{ backgroundImage: waveBackground, backgroundPosition: 'bottom', backgroundSize: 'cover' }} />}
          {standard && <img aria-hidden="true" src="/bss-construction-watermark.png" className="absolute z-0 inset-x-0 bottom-[23px] w-full h-[142px] object-cover object-center opacity-[0.075]" alt="" />}

          <div className={`flex flex-col h-full items-center justify-between relative z-10 ${standard ? 'px-6 py-2' : ''}`}>
            <div className="absolute top-4 left-0 w-full h-8 bg-black/60 shadow-inner z-0"></div>

            <h3 className={`text-[10px] font-bold text-center tracking-wider text-slate-300 z-10 ${standard ? 'mt-[44px]' : 'mt-6'}`}>{content.backTagline}</h3>

            <div className="flex-1 flex flex-col items-center justify-center w-full my-1">
              <div className="relative bg-white p-1.5 rounded-md shadow-lg w-[120px] h-[120px] flex items-center justify-center z-10 border-2 border-slate-300 flex-shrink-0">
                <WorkerQr bssId={content.entityId} size={320} />
                <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[22px] h-[22px] bg-white rounded-[4px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[16px] h-[16px] object-contain" /></span></span>
              </div>
              <p className="text-[7px] font-bold uppercase tracking-widest text-white/90 z-10 mt-1">Scan to Verify</p>
            </div>

            <div className="flex justify-between w-full z-10">
              {content.backBadges.map(badge => {
                const Icon = BADGE_ICONS[badge.icon];
                return (
                  <div key={badge.title} className={`flex flex-col items-center text-center ${standard ? 'px-4' : 'px-2'}`}>
                    <div className="w-6 h-6 rounded-full border border-slate-400 flex items-center justify-center mb-0.5 bg-white/10 shadow-inner"><Icon size={10} className="text-slate-200"/></div>
                    <p className="text-[5px] font-semibold tracking-widest uppercase leading-tight text-slate-300">{badge.title}<br/>{badge.sub}</p>
                  </div>
                );
              })}
            </div>

            <p className="text-[8px] font-bold text-center w-full tracking-widest text-slate-300 z-10 mt-1 pb-1">www.bharatshramsetu.com</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .perspective-1000 { -webkit-perspective: 1000px; perspective: 1000px; }
        .preserve-3d { -webkit-transform-style: preserve-3d; transform-style: preserve-3d; }
        .backface-hidden { -webkit-backface-visibility: hidden; backface-visibility: hidden; }
        .rotate-y-180 { -webkit-transform: rotateY(180deg); transform: rotateY(180deg); }
        .bss-flip-card { -webkit-transform-style: preserve-3d; transform-style: preserve-3d; }
        .bss-flip-card > [data-bss-face] { will-change: transform, opacity; }
        .metallic-text {
          background: linear-gradient(to bottom, #ffffff 0%, #b3b3b3 50%, #ffffff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent;
        }
        .embossed-text { filter: drop-shadow(0px 1px 1px rgba(0,0,0,0.8)); }
        @media print {
          @page { size: 85.6mm 53.98mm; margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
