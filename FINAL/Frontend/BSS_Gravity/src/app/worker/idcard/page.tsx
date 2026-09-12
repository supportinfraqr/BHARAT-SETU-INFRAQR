"use client";

import React, { useState, useRef } from 'react';
import { Download, Share2, ChevronLeft, Home, RadioTower, ShieldCheck, Briefcase, CheckCircle2, PackageCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import WorkerQr from '@/components/qr/WorkerQr';
import { useWorker } from '@/contexts/WorkerContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function IdentityCardPage() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportNotice, setExportNotice] = useState('');
  const { worker } = useWorker();
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!frontRef.current || !backRef.current || isExporting) return;
    // Reserve the tab synchronously while this click still has browser user activation.
    // Opening it after image/PDF generation is commonly blocked by popup protection.
    const preview = window.open('about:blank', '_blank');
    if (preview) {
      preview.opener = null;
      preview.document.title = 'Preparing BSS ID Card…';
      preview.document.body.innerHTML = '<main style="font:14px system-ui;padding:32px;color:#334155">Preparing your print-ready BSS ID Card…</main>';
    }
    setIsExporting(true);
    setExportError('');
    setExportNotice('');
    try {
      await document.fonts.ready;
      const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
      const captureOptions = {
        width: 400,
        height: 252,
        pixelRatio: 4,
        cacheBust: true,
        backgroundColor: '#0A192F',
        style: {
          position: 'relative',
          inset: 'auto',
          width: '400px',
          height: '252px',
          transform: 'none',
          backfaceVisibility: 'visible',
          WebkitBackfaceVisibility: 'visible',
          opacity: '1',
          boxShadow: 'none',
        },
      } as const;
      const [frontImage, backImage] = await Promise.all([
        toPng(frontRef.current, captureOptions),
        toPng(backRef.current, captureOptions),
      ]);
      const cardWidth = 85.6;
      const cardHeight = 53.98;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [cardWidth, cardHeight], compress: true, precision: 16 });
      pdf.setProperties({ title: `BSS ID Card - ${worker.identity.bssId}`, subject: 'Print-ready ISO/IEC 7810 ID-1 worker identity card', author: 'Bharat Shram Setu', creator: 'Bharat Shram Setu Worker Portal' });
      pdf.addImage(frontImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
      pdf.addPage([cardWidth, cardHeight], 'landscape');
      pdf.addImage(backImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
      const pdfUrl = URL.createObjectURL(pdf.output('blob'));
      if (preview && !preview.closed) {
        preview.location.replace(pdfUrl);
      } else {
        const download = document.createElement('a');
        download.href = pdfUrl;
        download.download = `BSS-ID-Card-${worker.identity.bssId}.pdf`;
        download.rel = 'noopener';
        document.body.appendChild(download);
        download.click();
        download.remove();
        setExportNotice('Your browser blocked the preview tab, so the PDF was downloaded instead.');
      }
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
    } catch (error) {
      if (preview && !preview.closed) preview.close();
      console.error('ID card PDF export failed', error);
      setExportError('The print-ready PDF could not be created. Please ensure card images have loaded and try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!frontRef.current || !backRef.current || isExporting) return;
    setIsExporting(true);
    setExportError('');
    setExportNotice('');
    try {
      await document.fonts.ready;
      const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
      const captureOptions = {
        width: 400,
        height: 252,
        pixelRatio: 4,
        cacheBust: true,
        backgroundColor: '#0A192F',
        style: {
          position: 'relative',
          inset: 'auto',
          width: '400px',
          height: '252px',
          transform: 'none',
          backfaceVisibility: 'visible',
          WebkitBackfaceVisibility: 'visible',
          opacity: '1',
          boxShadow: 'none',
        },
      } as const;
      const [frontImage, backImage] = await Promise.all([
        toPng(frontRef.current, captureOptions),
        toPng(backRef.current, captureOptions),
      ]);
      const cardWidth = 85.6;
      const cardHeight = 53.98;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [cardWidth, cardHeight], compress: true, precision: 16 });
      pdf.setProperties({ title: `BSS ID Card - ${worker.identity.bssId}`, subject: 'Worker identity card', author: 'Bharat Shram Setu', creator: 'Bharat Shram Setu Worker Portal' });
      pdf.addImage(frontImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
      pdf.addPage([cardWidth, cardHeight], 'landscape');
      pdf.addImage(backImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');

      const blob = pdf.output('blob');
      const fileName = `BSS-ID-Card-${worker.identity.bssId}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(worker.identity.bssId)}`;
      const shareText = `${worker.identity.name} · ${worker.identity.bssId}\nVerify: ${verifyUrl}`;

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'BSS Worker ID Card', text: shareText, url: verifyUrl });
        setExportNotice('BSS ID card shared.');
      } else {
        // File sharing unsupported: download the card and share/copy the verify link.
        const url = URL.createObjectURL(blob);
        const download = document.createElement('a');
        download.href = url;
        download.download = fileName;
        download.rel = 'noopener';
        document.body.appendChild(download);
        download.click();
        download.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        if (navigator.share) await navigator.share({ title: 'BSS Worker ID', text: worker.identity.bssId, url: verifyUrl });
        else await navigator.clipboard.writeText(verifyUrl);
        setExportNotice('ID card downloaded — file sharing isn’t supported here, so the verification link was shared instead.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return; // user dismissed the share sheet
      console.error('ID card share failed', error);
      setExportError('The ID card could not be shared. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getGenderInitial = (gender?: string) => {
    if (!gender) return 'M';
    return gender.charAt(0).toUpperCase();
  };

  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const validTillDate = new Date();
  validTillDate.setFullYear(validTillDate.getFullYear() + 1);
  const validTill = validTillDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Generate SVG wave background
  const waveBackground = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23ffffff' fill-opacity='0.05' d='M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3Cpath fill='%23ffffff' fill-opacity='0.03' d='M0,96L60,117.3C120,139,240,181,360,186.7C480,192,600,160,720,138.7C840,117,960,107,1080,117.3C1200,128,1320,160,1380,176L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`;

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      
      <div className="flex items-center gap-4">
        <Link href="/worker/scan" className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-[#073B67] hover:border-[#073B67] transition-all" title="Back to Scanner">
          <ChevronLeft size={20} />
        </Link>
        <Link href="/worker" className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-[#073B67] hover:border-[#073B67] transition-all" title="Go to Dashboard">
          <Home size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#062D4F]">{t('dash.view_card')}</h1>
          <p className="text-sm text-gray-500">Your official BSS digital credential.</p>
        </div>
      </div>

      {/* FLIP CONTROLS */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 p-1 rounded-xl flex gap-1 shadow-inner">
          <button 
            onClick={() => setIsFlipped(false)}
            className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${!isFlipped ? 'bg-white text-[#073B67] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Front Side
          </button>
          <button 
            onClick={() => setIsFlipped(true)}
            className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${isFlipped ? 'bg-white text-[#073B67] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Back Side
          </button>
        </div>
      </div>

      {/* 3D SCENE FOR FLIPPING */}
      <div className="flex justify-center perspective-1000 mb-8">
        <div 
          ref={cardRef}
          // Standard credit card aspect ratio is 1.586 (width / height). 
          // 400px width / 1.586 = ~252px height.
          className={`relative w-full max-w-[400px] h-[252px] transition-transform duration-700 preserve-3d bss-flip-card cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          
          {/* ==================================================== */}
          {/* FRONT SIDE */}
          {/* ==================================================== */}
          <div 
            ref={frontRef}
            data-bss-face
            className="absolute inset-0 backface-hidden bg-[#0A192F] rounded-xl shadow-2xl overflow-hidden border-2 border-slate-400 text-white flex flex-col font-sans"
            style={{ opacity: isFlipped ? 0 : 1, pointerEvents: isFlipped ? 'none' : 'auto' }}
            aria-hidden={isFlipped}
          >
            {/* Existing navy/silver palette with restrained premium depth */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/[0.07] via-transparent to-black/15 z-0" />
            <div className="absolute inset-x-0 bottom-0 h-[72px] z-0 opacity-55 mix-blend-screen" style={{ backgroundImage: waveBackground, backgroundPosition: 'bottom', backgroundSize: 'cover' }} />

            {/* Indian tricolour edge inspired by the approved front-card reference */}
            <div aria-hidden="true" className="absolute left-0 inset-y-0 z-20 w-[4px] flex flex-col"><span className="flex-1 bg-[#FF9933]"/><span className="flex-1 bg-white"/><span className="flex-1 bg-[#138808]"/></div>

            {/* Fresh monochrome BSS emblem and lateral construction-site watermark */}
            <img aria-hidden="true" src="/bss-construction-watermark.png" className="absolute z-0 inset-x-0 bottom-[23px] w-full h-[142px] object-cover object-center opacity-[0.075]" alt="" />

            {/* Header */}
            <div className="h-[57px] px-4 pt-3 flex justify-between items-start relative z-10 border-b border-white/[0.08]">
               <div className="flex items-center gap-2.5 min-w-0">
                 <div className="leading-tight flex flex-col items-start min-w-0">
                   <h2 className="text-[15px] font-extrabold tracking-[-0.015em] leading-none whitespace-nowrap" aria-label="Bharat Shram Setu"><span className="text-white">Bharat</span><span className="text-[#FF9933]">Shram</span><span className="text-[#2F9E67]">Setu</span></h2>
                   <p className="text-[5.5px] text-slate-300 mt-1.5 tracking-[0.105em] font-semibold uppercase leading-none whitespace-nowrap">One Worker. One Identity. One Future.</p>
                 </div>
               </div>
               <div className="flex flex-col items-end">
                 <div className="inline-flex items-center gap-1.5 h-[18px] px-2 rounded-full border border-slate-300/35 bg-white/[0.08] shadow-inner" aria-label="RFID enabled card">
                   <RadioTower size={9} className="text-slate-200" strokeWidth={2} />
                   <span className="text-[6px] text-slate-100 uppercase font-extrabold tracking-[0.12em]">RFID Enabled</span>
                 </div>
               </div>
            </div>

            {/* Hero body: photo, identity information and QR zones */}
            <div className="flex px-4 pt-3 pb-2 items-stretch gap-3 relative z-10 flex-1 min-h-0">
               {/* Prominent photo zone */}
               <div className="w-[91px] h-[116px] bg-slate-100 rounded-[9px] overflow-hidden border-[2px] border-slate-200 shadow-[0_5px_14px_rgba(0,0,0,0.32)] ring-1 ring-white/25 flex-shrink-0 flex items-center justify-center">
                 {worker.identity.photoUrl && worker.identity.photoUrl !== '/worker-profile.png' ? (
                   <img src={worker.identity.photoUrl} className="w-full h-full object-cover filter contrast-[1.08] saturate-[1.03]" alt={`${worker.identity.name} profile`} />
                 ) : (
                   <UserRound size={42} className="text-slate-400" />
                 )}
               </div>

               {/* Identity information zone */}
               <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                 <div>
                   <p className="text-[6px] text-slate-300 uppercase tracking-[0.17em] font-bold mb-1">Worker Name</p>
                   <p className="text-[16px] font-extrabold tracking-[0.025em] uppercase text-white leading-[1.05] drop-shadow-sm break-words">{worker.identity.name}</p>
                 </div>
                 <div className="mt-3">
                   <p className="text-[6px] text-slate-300 uppercase tracking-[0.17em] font-bold mb-1">BSS ID</p>
                   <p className="text-[10px] font-mono font-extrabold tracking-[0.095em] metallic-text embossed-text leading-none">{worker.identity.bssId}</p>
                 </div>
                 <div className="flex gap-7 mt-3.5">
                   <div>
                     <p className="text-[6px] text-slate-300 uppercase tracking-[0.16em] font-bold mb-1">Date of Birth</p>
                     <p className="text-[10px] font-bold tracking-[0.06em] text-white leading-none">{worker.identity.dob}</p>
                   </div>
                   <div>
                     <p className="text-[6px] text-slate-300 uppercase tracking-[0.16em] font-bold mb-1">Gender</p>
                     <p className="text-[10px] font-bold tracking-[0.06em] text-white leading-none">{getGenderInitial(worker.identity.gender)}</p>
                   </div>
                 </div>
               </div>

               {/* Deliberate QR zone */}
               <div className="w-[57px] flex-shrink-0 flex flex-col justify-end items-center pb-0.5">
                 <div className="relative bg-white p-1.5 rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] w-[53px] h-[53px] flex items-center justify-center border border-slate-200">
                   <WorkerQr bssId={worker.identity.bssId} />
                   <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[17px] h-[17px] bg-white rounded-[3px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[13px] h-[13px] object-contain" /></span></span>
                 </div>
                 <p className="text-[5px] text-slate-300 uppercase font-bold tracking-[0.12em] mt-1.5 whitespace-nowrap">Scan to Verify</p>
               </div>
            </div>

            {/* Balanced footer; approved issue-date logic retained */}
            <div className="h-[36px] px-4 flex justify-between items-center relative z-10 border-t border-white/[0.08] bg-black/[0.08]">
               <div>
                 <p className="text-[5.5px] text-slate-300 uppercase tracking-[0.16em] font-bold mb-1">Issue Date</p>
                 <p className="text-[9px] font-bold tracking-[0.08em] text-white leading-none">{currentDate}</p>
               </div>
               <div>
                 <p className="text-[5.5px] text-slate-300 uppercase tracking-[0.16em] font-bold mb-1">Valid Till</p>
                 <p className="text-[9px] font-bold tracking-[0.08em] text-[#FFD9A8] leading-none">{validTill}</p>
               </div>
               <p className="text-[6px] text-slate-200 font-bold tracking-[0.12em] uppercase">BSS Card · National ID</p>
               <div className="w-[57px]" aria-hidden="true" />
            </div>
          </div>

          {/* ==================================================== */}
          {/* BACK SIDE */}
          {/* ==================================================== */}
          <div 
            ref={backRef}
            data-bss-face
            className="absolute inset-0 backface-hidden rotate-y-180 bg-[#0A192F] rounded-xl shadow-2xl overflow-hidden border-2 border-slate-400 text-white flex flex-col font-sans"
            style={{ opacity: isFlipped ? 1 : 0, pointerEvents: isFlipped ? 'auto' : 'none' }}
            aria-hidden={!isFlipped}
          >
            {/* Glossy Sheen Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-bl from-transparent via-white/5 to-transparent z-0 opacity-80" />
            <div className="absolute inset-0 z-0 opacity-70 mix-blend-screen" style={{ backgroundImage: waveBackground, backgroundPosition: 'bottom', backgroundSize: 'cover' }} />

            <div className="px-6 py-2 flex flex-col h-full items-center justify-between relative z-10">
               {/* Magnetic strip aesthetic */}
               <div className="absolute top-4 left-0 w-full h-8 bg-black/60 shadow-inner z-0"></div>

               <h3 className="text-[10px] font-bold text-center tracking-wider text-slate-300 mt-[44px] z-10">Your Identity. Your Work. Your Security.</h3>
               
               {/* Large QR Code Wrapper */}
               <div className="flex-1 flex flex-col items-center justify-center w-full my-1">
                  <div className="relative bg-white p-1.5 rounded-md shadow-lg w-[100px] h-[100px] flex items-center justify-center z-10 border-2 border-slate-300 flex-shrink-0">
                    <WorkerQr bssId={worker.identity.bssId} />
                    <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[30px] h-[30px] bg-white rounded-[4px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[23px] h-[23px] object-contain" /></span></span>
                  </div>
                 <p className="text-[7px] font-bold uppercase tracking-widest text-white/90 z-10 mt-1">Scan to Verify</p>
               </div>

               {/* Trust Badges */}
               <div className="flex justify-between w-full px-4 z-10">
                 <div className="flex flex-col items-center text-center">
                   <div className="w-6 h-6 rounded-full border border-slate-400 flex items-center justify-center mb-0.5 bg-white/10 shadow-inner">
                     <ShieldCheck size={10} className="text-slate-200" />
                   </div>
                   <p className="text-[5px] font-semibold tracking-widest uppercase leading-tight text-slate-300">Verified<br/>Identity</p>
                 </div>
                 <div className="flex flex-col items-center text-center">
                   <div className="w-6 h-6 rounded-full border border-slate-400 flex items-center justify-center mb-0.5 bg-white/10 shadow-inner">
                     <Briefcase size={10} className="text-slate-200" />
                   </div>
                   <p className="text-[5px] font-semibold tracking-widest uppercase leading-tight text-slate-300">Portable<br/>Across Jobs</p>
                 </div>
                 <div className="flex flex-col items-center text-center">
                   <div className="w-6 h-6 rounded-full border border-slate-400 flex items-center justify-center mb-0.5 bg-white/10 shadow-inner">
                     <CheckCircle2 size={10} className="text-slate-200" />
                   </div>
                   <p className="text-[5px] font-semibold tracking-widest uppercase leading-tight text-slate-300">Secure<br/>& Trusted</p>
                 </div>
               </div>

               {/* URL */}
               <p className="text-[8px] font-bold text-center w-full tracking-widest text-slate-300 z-10 mt-1 pb-1">www.bharatshramsetu.com</p>
            </div>
          </div>
          
        </div>
      </div>

      {/* Large QR — easier to scan than the small QR printed on the card */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-56 h-56 sm:w-60 sm:h-60 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center flex-shrink-0">
          <WorkerQr bssId={worker.identity.bssId} className="w-full h-full" />
          <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-[46px] h-[46px] bg-white rounded-[9px] grid place-items-center shadow-sm">
              <img src="/bss-original-logo.png" alt="" className="w-[36px] h-[36px] object-contain" />
            </span>
          </span>
        </div>
        <div className="text-center sm:text-left min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">Scan to verify</p>
          <h2 className="text-lg font-bold text-[#062D4F] mt-1 break-words">{worker.identity.name}</h2>
          <p className="font-mono text-sm text-gray-500 mt-1 break-all">{worker.identity.bssId}</p>
          <p className="text-xs text-gray-500 mt-3">This large QR carries the same BSS credential as the card — use it when the printed card QR is too small to scan. Anyone can scan it to verify your identity.</p>
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        <button onClick={handleDownload} disabled={isExporting} className="flex-1 bg-[#073B67] hover:bg-[#062D4F] disabled:opacity-60 disabled:cursor-wait text-white px-4 py-3 rounded-[12px] font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2">
          <Download size={18} /> {isExporting ? 'Creating print PDF…' : 'View / Download Print-Ready PDF'}
        </button>
        <button onClick={handleShare} disabled={isExporting} className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-wait px-4 py-3 rounded-[12px] font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2">
          <Share2 size={18} /> {isExporting ? 'Preparing…' : 'Share Digital ID'}
        </button>
      </div>
      <Link href="/worker/OrderCard" className="w-full h-11 rounded-[12px] border border-[#073B67]/20 bg-blue-50/60 text-[#073B67] font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-50"><PackageCheck size={18}/>Order Physical Card</Link>
      <p className="text-center text-xs text-gray-500">ISO/IEC 7810 ID-1 · 85.60 × 53.98 mm · front and back · 4× raster capture</p>
      {exportError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{exportError}</p>}
      {exportNotice && <p role="status" className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">{exportNotice}</p>}

      <style jsx global>{`
        .perspective-1000 { -webkit-perspective: 1000px; perspective: 1000px; }
        .preserve-3d { -webkit-transform-style: preserve-3d; transform-style: preserve-3d; }
        .backface-hidden { -webkit-backface-visibility: hidden; backface-visibility: hidden; }
        .rotate-y-180 { -webkit-transform: rotateY(180deg); transform: rotateY(180deg); }
        .bss-flip-card { -webkit-transform-style: preserve-3d; transform-style: preserve-3d; }
        .bss-flip-card > [data-bss-face] { will-change: transform, opacity; }
        
        /* Metallic silver text effect */
        .metallic-text {
          background: linear-gradient(to bottom, #ffffff 0%, #b3b3b3 50%, #ffffff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent;
        }

        /* Embossed drop shadow for text */
        .embossed-text {
          filter: drop-shadow(0px 1px 1px rgba(0,0,0,0.8));
        }
        @media print {
          @page { size: 85.6mm 53.98mm; margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

    </div>
  );
}
