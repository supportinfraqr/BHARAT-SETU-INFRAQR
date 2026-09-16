"use client";

import { useState } from "react";
import { Briefcase, CheckCircle2, RadioTower, ShieldCheck, UserRound } from "lucide-react";
import WorkerQr from "@/components/qr/WorkerQr";

export type WorkerCardData = {
  name: string;
  bssId: string;
  photoUrl?: string;
  dob?: string;
  gender?: string;
  designation?: string;
  site?: string;
  employer?: string;
  issueDate?: string;
  validTill?: string;
};

const waveBackground = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23ffffff' fill-opacity='0.05' d='M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3Cpath fill='%23ffffff' fill-opacity='0.03' d='M0,96L60,117.3C120,139,240,181,360,186.7C480,192,600,160,720,138.7C840,117,960,107,1080,117.3C1200,128,1320,160,1380,176L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`;

function genderInitial(g?: string): string {
  const v = (g || '').trim().toLowerCase();
  if (v.startsWith('m')) return 'M';
  if (v.startsWith('f')) return 'F';
  if (v.startsWith('t') || v.startsWith('o')) return 'O';
  return (g || '').trim() || '—';
}

const hasPhoto = (url?: string) => Boolean(url) && url !== '/worker-profile.png';

/**
 * The worker's BSS identity card (front and back), matching the worker portal's
 * card so it can be previewed from other portals (e.g. a contractor's worker
 * directory). Click the card or use the buttons to flip between sides.
 */
export default function WorkerIdentityCard({ data, className = "" }: { data: WorkerCardData; className?: string }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className={className}>
      <div className="flex justify-center">
        <div
          className={`relative w-full max-w-[400px] h-[252px] transition-transform duration-700 preserve-3d cursor-pointer ${flipped ? 'rotate-y-180' : ''}`}
          onClick={() => setFlipped(v => !v)}
          role="button"
          aria-label={flipped ? "Show card front" : "Show card back"}
        >
          {/* ───────────────── FRONT ───────────────── */}
          <div
            className="absolute inset-0 backface-hidden bg-[#0A192F] rounded-xl shadow-2xl overflow-hidden border-2 border-slate-400 text-white flex flex-col font-sans"
            style={{ opacity: flipped ? 0 : 1, pointerEvents: flipped ? 'none' : 'auto' }}
            aria-hidden={flipped}
          >
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/[0.07] via-transparent to-black/15 z-0" />
            <div className="absolute inset-x-0 bottom-0 h-[72px] z-0 opacity-55 mix-blend-screen" style={{ backgroundImage: waveBackground, backgroundPosition: 'bottom', backgroundSize: 'cover' }} />
            <div aria-hidden="true" className="absolute left-0 inset-y-0 z-20 w-[4px] flex flex-col"><span className="flex-1 bg-[#FF9933]"/><span className="flex-1 bg-white"/><span className="flex-1 bg-[#138808]"/></div>
            <img aria-hidden="true" src="/bss-construction-watermark.png" className="absolute z-0 inset-x-0 bottom-[23px] w-full h-[142px] object-cover object-center opacity-[0.075]" alt="" />

            <div className="h-[57px] px-4 pt-3 flex justify-between items-start relative z-10 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="leading-tight flex flex-col items-start min-w-0">
                  <h2 className="text-[15px] font-extrabold tracking-[-0.015em] leading-none whitespace-nowrap" aria-label="Bharat Shram Setu"><span className="text-white">Bharat</span><span className="text-[#FF9933]">Shram</span><span className="text-[#2F9E67]">Setu</span></h2>
                  <p className="text-[5.5px] text-slate-300 mt-1.5 tracking-[0.105em] font-semibold uppercase leading-none whitespace-nowrap">One Worker. One Identity. One Future.</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 h-[18px] px-2 rounded-full border border-slate-300/35 bg-white/[0.08] shadow-inner" aria-label="RFID enabled card">
                <RadioTower size={9} className="text-slate-200" strokeWidth={2} />
                <span className="text-[6px] text-slate-100 uppercase font-extrabold tracking-[0.12em]">RFID Enabled</span>
              </div>
            </div>

            <div className="flex px-4 pt-3 pb-2 items-stretch gap-3 relative z-10 flex-1 min-h-0">
              <div className="w-[91px] h-[116px] bg-slate-100 rounded-[9px] overflow-hidden border-[2px] border-slate-200 shadow-[0_5px_14px_rgba(0,0,0,0.32)] ring-1 ring-white/25 flex-shrink-0 flex items-center justify-center">
                {hasPhoto(data.photoUrl)
                  ? <img src={data.photoUrl} className="w-full h-full object-cover filter contrast-[1.08] saturate-[1.03]" alt={`${data.name} profile`} />
                  : <UserRound size={42} className="text-slate-400" />}
              </div>

              <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                <div>
                  <p className="text-[6px] text-slate-300 uppercase tracking-[0.17em] font-bold mb-1">Worker Name</p>
                  <p className="text-[16px] font-extrabold tracking-[0.025em] uppercase text-white leading-[1.05] drop-shadow-sm break-words">{data.name}</p>
                </div>
                <div className="mt-3">
                  <p className="text-[6px] text-slate-300 uppercase tracking-[0.17em] font-bold mb-1">BSS ID</p>
                  <p className="text-[10px] font-mono font-extrabold tracking-[0.095em] metallic-text embossed-text leading-none">{data.bssId}</p>
                </div>
                <div className="flex gap-7 mt-3.5">
                  <div>
                    <p className="text-[6px] text-slate-300 uppercase tracking-[0.16em] font-bold mb-1">Date of Birth</p>
                    <p className="text-[10px] font-bold tracking-[0.06em] text-white leading-none">{data.dob || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[6px] text-slate-300 uppercase tracking-[0.16em] font-bold mb-1">Gender</p>
                    <p className="text-[10px] font-bold tracking-[0.06em] text-white leading-none">{genderInitial(data.gender)}</p>
                  </div>
                </div>
              </div>

              <div className="w-[92px] flex-shrink-0 flex flex-col justify-end items-center pb-0.5">
                <div className="relative bg-white p-1 rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] w-[84px] h-[84px] flex items-center justify-center border border-slate-200">
                  <WorkerQr bssId={data.bssId} size={256} />
                  <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[13px] h-[13px] bg-white rounded-[3px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[10px] h-[10px] object-contain" /></span></span>
                </div>
                <p className="text-[5px] text-slate-300 uppercase font-bold tracking-[0.12em] mt-1.5 whitespace-nowrap">Scan to Verify</p>
              </div>
            </div>

            <div className="h-[36px] px-4 flex justify-between items-center relative z-10 border-t border-white/[0.08] bg-black/[0.08]">
              <div>
                <p className="text-[5.5px] text-slate-300 uppercase tracking-[0.16em] font-bold mb-1">Issue Date</p>
                <p className="text-[9px] font-bold tracking-[0.08em] text-white leading-none">{data.issueDate || '—'}</p>
              </div>
              <div>
                <p className="text-[5.5px] text-slate-300 uppercase tracking-[0.16em] font-bold mb-1">Valid Till</p>
                <p className="text-[9px] font-bold tracking-[0.08em] text-[#FFD9A8] leading-none">{data.validTill || '—'}</p>
              </div>
              <p className="text-[6px] text-slate-200 font-bold tracking-[0.12em] uppercase">BSS Card · National ID</p>
              <div className="w-[57px]" aria-hidden="true" />
            </div>
          </div>

          {/* ───────────────── BACK ───────────────── */}
          <div
            className="absolute inset-0 backface-hidden rotate-y-180 bg-[#0A192F] rounded-xl shadow-2xl overflow-hidden border-2 border-slate-400 text-white flex flex-col font-sans"
            style={{ opacity: flipped ? 1 : 0, pointerEvents: flipped ? 'auto' : 'none' }}
            aria-hidden={!flipped}
          >
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-bl from-transparent via-white/5 to-transparent z-0 opacity-80" />
            <div className="absolute inset-0 z-0 opacity-70 mix-blend-screen" style={{ backgroundImage: waveBackground, backgroundPosition: 'bottom', backgroundSize: 'cover' }} />
            <img aria-hidden="true" src="/bss-construction-watermark.png" className="absolute z-0 inset-x-0 bottom-[23px] w-full h-[142px] object-cover object-center opacity-[0.075]" alt="" />

            <div className="px-6 py-2 flex flex-col h-full items-center justify-between relative z-10">
              <div className="absolute top-4 left-0 w-full h-8 bg-black/60 shadow-inner z-0"></div>
              <h3 className="text-[10px] font-bold text-center tracking-wider text-slate-300 mt-[44px] z-10">Your Identity. Your Work. Your Security.</h3>

              <div className="flex-1 flex flex-col items-center justify-center w-full my-1">
                <div className="relative bg-white p-1.5 rounded-md shadow-lg w-[120px] h-[120px] flex items-center justify-center z-10 border-2 border-slate-300 flex-shrink-0">
                  <WorkerQr bssId={data.bssId} size={320} />
                  <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[22px] h-[22px] bg-white rounded-[4px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[16px] h-[16px] object-contain" /></span></span>
                </div>
                <p className="text-[7px] font-bold uppercase tracking-widest text-white/90 z-10 mt-1">Scan to Verify</p>
              </div>

              <div className="flex justify-between w-full px-4 z-10">
                <div className="flex flex-col items-center text-center">
                  <div className="w-6 h-6 rounded-full border border-slate-400 flex items-center justify-center mb-0.5 bg-white/10 shadow-inner"><ShieldCheck size={10} className="text-slate-200" /></div>
                  <p className="text-[5px] font-semibold tracking-widest uppercase leading-tight text-slate-300">Verified<br/>Identity</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-6 h-6 rounded-full border border-slate-400 flex items-center justify-center mb-0.5 bg-white/10 shadow-inner"><Briefcase size={10} className="text-slate-200" /></div>
                  <p className="text-[5px] font-semibold tracking-widest uppercase leading-tight text-slate-300">Portable<br/>Across Jobs</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-6 h-6 rounded-full border border-slate-400 flex items-center justify-center mb-0.5 bg-white/10 shadow-inner"><CheckCircle2 size={10} className="text-slate-200" /></div>
                  <p className="text-[5px] font-semibold tracking-widest uppercase leading-tight text-slate-300">Secure<br/>&amp; Trusted</p>
                </div>
              </div>

              <p className="text-[8px] font-bold text-center w-full tracking-widest text-slate-300 z-10 mt-1 pb-1">www.bharatshramsetu.com</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-3">
        <button type="button" onClick={() => setFlipped(false)} className={`h-8 px-3 rounded-lg text-xs font-semibold border ${flipped ? 'border-gray-200 text-gray-600 hover:bg-gray-50' : 'border-[#073B67] bg-[#073B67]/5 text-[#073B67]'}`}>Front</button>
        <button type="button" onClick={() => setFlipped(true)} className={`h-8 px-3 rounded-lg text-xs font-semibold border ${flipped ? 'border-[#073B67] bg-[#073B67]/5 text-[#073B67]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Back</button>
      </div>

      <style jsx global>{`
        .perspective-1000 { -webkit-perspective: 1000px; perspective: 1000px; }
        .preserve-3d { -webkit-transform-style: preserve-3d; transform-style: preserve-3d; }
        .backface-hidden { -webkit-backface-visibility: hidden; backface-visibility: hidden; }
        .rotate-y-180 { -webkit-transform: rotateY(180deg); transform: rotateY(180deg); }
        .metallic-text { background: linear-gradient(to bottom, #ffffff 0%, #b3b3b3 50%, #ffffff 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .embossed-text { text-shadow: 0 1px 0 rgba(255,255,255,0.25), 0 -1px 0 rgba(0,0,0,0.5); }
      `}</style>
    </div>
  );
}
