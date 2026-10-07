"use client";

import React, { useState, useRef, useMemo } from 'react';
import { Download, Share2, ChevronLeft, Home, RadioTower, ShieldCheck, Briefcase, CheckCircle2, UserRound, IdCard } from 'lucide-react';
import Link from 'next/link';
import WorkerQr from '@/components/qr/WorkerQr';
import CredentialQrPanel from '@/components/idcard/CredentialQrPanel';
import { GatePassViewer } from '@/components/documentEngine/GatePassViewer';
import { buildGatePassHtml } from '@/lib/documentEngine/gatePass';
import type { OwnerScope } from '@/lib/documentEngine/types';
import type { PortalView, WorkerLike } from '@/lib/documentEngine/workerDataService';
import { useWorker } from '@/contexts/WorkerContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function IdentityCardPage() {
  const [cardFormat, setCardFormat] = useState<'standard' | 'employment'>('standard');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportNotice, setExportNotice] = useState('');
  const { worker } = useWorker();
  const { t } = useLanguage();
  const [passPreview, setPassPreview] = useState<{ html: string; title: string } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // The Employment Card is only available once the worker is bound to a
  // contractor. Until then, only the Standard BSS ID Card is shown.
  const isBound = Boolean((worker.employment.contractor || worker.employment.contractorDetails?.code || '').trim());
  const isEmployment = cardFormat === 'employment' && isBound;

  const handleDownload = async () => {
    if (!frontRef.current || !backRef.current || isExporting) return;
    const preview = window.open('about:blank', '_blank');
    if (preview) {
      preview.opener = null;
      preview.document.title = `Preparing ${isEmployment ? 'Employment' : 'BSS'} Card…`;
      preview.document.body.innerHTML = '<main style="font:14px system-ui;padding:32px;color:#334155">Preparing your print-ready ID Card…</main>';
    }
    setIsExporting(true);
    setExportError('');
    setExportNotice('');
    try {
      await document.fonts.ready;
      const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
      const w = isEmployment ? 374 : 400;
      const h = isEmployment ? 560 : 252;
      const captureOptions = {
        width: w,
        height: h,
        pixelRatio: 4,
        cacheBust: true,
        backgroundColor: isEmployment ? '#ffffff' : '#0A192F',
        style: {
          position: 'relative',
          inset: 'auto',
          width: `${w}px`,
          height: `${h}px`,
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
      const cardWidth = isEmployment ? 85.6 : 85.6;
      const cardHeight = isEmployment ? 128 : 53.98;
      const orientation = isEmployment ? 'portrait' : 'landscape';
      const pdf = new jsPDF({ orientation, unit: 'mm', format: [cardWidth, cardHeight], compress: true, precision: 16 });
      pdf.setProperties({
        title: `BSS ${isEmployment ? 'Employment' : 'ID'} Card - ${worker.identity.bssId}`,
        subject: `Print-ready ${isEmployment ? 'Form XV Employment' : 'ISO/IEC 7810 ID-1'} worker identity card`,
        author: 'Bharat Shram Setu',
        creator: 'Bharat Shram Setu Worker Portal'
      });
      pdf.addImage(frontImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
      pdf.addPage([cardWidth, cardHeight], orientation);
      pdf.addImage(backImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
      const pdfUrl = URL.createObjectURL(pdf.output('blob'));
      if (preview && !preview.closed) {
        preview.location.replace(pdfUrl);
      } else {
        const download = document.createElement('a');
        download.href = pdfUrl;
        download.download = `BSS-${isEmployment ? 'Employment' : 'ID'}-Card-${worker.identity.bssId}.pdf`;
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
      const w = isEmployment ? 374 : 400;
      const h = isEmployment ? 560 : 252;
      const captureOptions = {
        width: w,
        height: h,
        pixelRatio: 4,
        cacheBust: true,
        backgroundColor: isEmployment ? '#ffffff' : '#0A192F',
        style: {
          position: 'relative',
          inset: 'auto',
          width: `${w}px`,
          height: `${h}px`,
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
      const cardWidth = isEmployment ? 85.6 : 85.6;
      const cardHeight = isEmployment ? 128 : 53.98;
      const orientation = isEmployment ? 'portrait' : 'landscape';
      const pdf = new jsPDF({ orientation, unit: 'mm', format: [cardWidth, cardHeight], compress: true, precision: 16 });
      pdf.setProperties({ title: `BSS ID Card - ${worker.identity.bssId}`, subject: 'Worker identity card', author: 'Bharat Shram Setu', creator: 'Bharat Shram Setu Worker Portal' });
      pdf.addImage(frontImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
      pdf.addPage([cardWidth, cardHeight], orientation);
      pdf.addImage(backImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');

      const blob = pdf.output('blob');
      const fileName = `BSS-${isEmployment ? 'Employment' : 'ID'}-Card-${worker.identity.bssId}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(worker.identity.bssId)}`;
      const shareText = `${worker.identity.name} · ${worker.identity.bssId}\nVerify: ${verifyUrl}`;

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `BSS Worker ${isEmployment ? 'Employment' : 'ID'} Card`, text: shareText, url: verifyUrl });
        setExportNotice('Card shared.');
      } else {
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
        setExportNotice('Card downloaded — file sharing isn’t supported here, so the verification link was shared instead.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
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

  const fallbackIssue = new Date();
  const fallbackValidity = new Date();
  fallbackValidity.setFullYear(fallbackValidity.getFullYear() + 3);
  const formatCardDate = (value?: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const currentDate = formatCardDate(worker.employment.idCardIssueDate) || fallbackIssue.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const validTill = formatCardDate(worker.employment.idCardValidityTill) || fallbackValidity.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  // Site colour drives the card's top band (front & back). Falls back to a
  // neutral band when the site has no colour set.
  const siteColour = (worker.employment.siteDetails?.colour || '').trim() || '#F47A32';
  const employerName = worker.employment.employer || '—';
  const siteCode = worker.employment.siteDetails?.code || '—';

  const gatePasses = worker.gatePasses ?? [];
  const issuedPass = gatePasses[0];
  const docView = useMemo(() => {
    const employment = worker.employment;
    const owner: OwnerScope = { ownerType: 'employer', ownerId: employment.employerDetails?.code ?? '', ownerName: employment.employer, bssId: employment.employerDetails?.code ?? '' };
    const workerLike: WorkerLike = { name: worker.identity.name, bssId: worker.identity.bssId, site: employment.site, designation: employment.designation, employer: employment.employer, contractor: employment.contractor, doj: employment.doj, gender: worker.identity.gender, photoUrl: worker.identity.photoUrl, status: employment.status };
    const view: PortalView = {
      owner,
      workers: [workerLike],
      sites: [{ name: employment.site, code: employment.siteDetails?.code, address: employment.siteDetails?.location }],
      contractors: [{ name: employment.contractor, bssId: employment.contractorDetails?.code ?? '', address: employment.contractorDetails?.address }],
      employers: [{ name: employment.employer, bssId: employment.employerDetails?.code ?? '', address: employment.employerDetails?.address }],
    };
    return { owner, view, workerLike };
  }, [worker]);

  async function seeGatePass() {
    if (!issuedPass) return;
    const type = issuedPass.type === 'Permanent' ? 'permanent-gate-pass' : 'temporary-gate-pass';
    const html = await buildGatePassHtml(docView.owner, docView.view, docView.workerLike, type, { validFrom: issuedPass.validFrom, validTo: issuedPass.validTo, number: issuedPass.number, status: issuedPass.status, branding: issuedPass.branding });
    setPassPreview({ html, title: `${docView.workerLike.name} · ${issuedPass.type} Gate Pass` });
  }

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

      {/* CARD FORMAT SELECTOR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex gap-1 w-full sm:w-auto">
          <button
            onClick={() => setCardFormat('standard')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${!isEmployment ? 'bg-[#073B67] text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            <IdCard size={15}/> Standard BSS ID Card
          </button>
          {isBound && (
          <button
            onClick={() => setCardFormat('employment')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${isEmployment ? 'bg-[#073B67] text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            <Briefcase size={15} className="text-orange-400"/> Employment Card
          </button>
          )}
        </div>

        {/* SIDE FLIP CONTROLS */}
        <div className="bg-gray-100 p-1 rounded-xl flex gap-1 shadow-inner w-full sm:w-auto">
          <button 
            onClick={() => setIsFlipped(false)}
            className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!isFlipped ? 'bg-white text-[#073B67] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Front Side
          </button>
          <button 
            onClick={() => setIsFlipped(true)}
            className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isFlipped ? 'bg-white text-[#073B67] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Back Side
          </button>
        </div>
      </div>

      {/* 3D SCENE FOR FLIPPING */}
      <div className="flex justify-center perspective-1000 mb-8">
        <div 
          ref={cardRef}
          className={`relative transition-transform duration-700 preserve-3d bss-flip-card cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{
            width: isEmployment ? '374px' : '100%',
            maxWidth: '400px',
            height: isEmployment ? '560px' : '252px',
          }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          
          {/* ==================================================== */}
          {/* 1. STANDARD BSS CARD - FRONT SIDE */}
          {/* ==================================================== */}
          {!isEmployment && (
            <div 
              ref={frontRef}
              data-bss-face
              className="absolute inset-0 backface-hidden bg-[#0A192F] rounded-xl shadow-2xl overflow-hidden border-2 border-slate-400 text-white flex flex-col font-sans"
              style={{ opacity: isFlipped ? 0 : 1, pointerEvents: isFlipped ? 'none' : 'auto' }}
              aria-hidden={isFlipped}
            >
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/[0.07] via-transparent to-black/15 z-0" />
              <div className="absolute inset-x-0 bottom-0 h-[72px] z-0 opacity-55 mix-blend-screen" style={{ backgroundImage: waveBackground, backgroundPosition: 'bottom', backgroundSize: 'cover' }} />
              <div aria-hidden="true" className="absolute left-0 inset-y-0 z-20 w-[4px] flex flex-col"><span className="flex-1 bg-[#FF9933]"/><span className="flex-1 bg-white"/><span className="flex-1 bg-[#138808]"/></div>
              <img aria-hidden="true" src="/bss-construction-watermark.png" className="absolute z-0 inset-x-0 bottom-[23px] w-full h-[142px] object-cover object-center opacity-[0.075]" alt="" />

              <div className="h-[57px] px-4 pt-3 flex justify-between items-start relative z-10 border-b border-white/[0.08]">
                 <div className="flex items-center gap-2.5 min-w-0">
                   <div className="leading-tight flex flex-col items-start min-w-0">
                     <h2 className="text-[15px] font-extrabold tracking-[-0.015em] leading-none whitespace-nowrap" aria-label="Bharat Shram Setu"><span className="text-white">Bharat</span><span className="text-[#FF9933]">Shram</span><span className="text-[#2F9E67]">Setu</span></h2>
                     <p className="text-[5.5px] text-slate-300 mt-1.5 tracking-[0.105em] font-semibold uppercase leading-none whitespace-nowrap">One Nation. One Identity. One Future.</p>
                   </div>
                 </div>
                 <div className="flex flex-col items-end">
                   <div className="inline-flex items-center gap-1.5 h-[18px] px-2 rounded-full border border-slate-300/35 bg-white/[0.08] shadow-inner" aria-label="RFID enabled card">
                     <RadioTower size={9} className="text-slate-200" strokeWidth={2} />
                     <span className="text-[6px] text-slate-100 uppercase font-extrabold tracking-[0.12em]">RFID Enabled</span>
                   </div>
                 </div>
              </div>

              <div className="flex px-4 pt-3 pb-2 items-stretch gap-3 relative z-10 flex-1 min-h-0">
                 <div className="w-[91px] h-[116px] bg-slate-100 rounded-[9px] overflow-hidden border-[2px] border-slate-200 shadow-[0_5px_14px_rgba(0,0,0,0.32)] ring-1 ring-white/25 flex-shrink-0 flex items-center justify-center">
                   {worker.identity.photoUrl && worker.identity.photoUrl !== '/worker-profile.png' ? (
                     <img src={worker.identity.photoUrl} className="w-full h-full object-cover filter contrast-[1.08] saturate-[1.03]" alt={`${worker.identity.name} profile`} />
                   ) : (
                     <UserRound size={42} className="text-slate-400" />
                   )}
                 </div>

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

                 <div className="w-[92px] flex-shrink-0 flex flex-col justify-end items-center pb-0.5">
                    <div className="relative bg-white p-1 rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] w-[84px] h-[84px] flex items-center justify-center border border-slate-200">
                      <WorkerQr bssId={worker.identity.bssId} size={256} />
                      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[13px] h-[13px] bg-white rounded-[3px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[10px] h-[10px] object-contain" /></span></span>
                    </div>
                   <p className="text-[5px] text-slate-300 uppercase font-bold tracking-[0.12em] mt-1.5 whitespace-nowrap">Scan to Verify</p>
                 </div>
              </div>

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
          )}

          {/* ==================================================== */}
          {/* 1. STANDARD BSS CARD - BACK SIDE */}
          {/* ==================================================== */}
          {!isEmployment && (
            <div 
              ref={backRef}
              data-bss-face
              className="absolute inset-0 backface-hidden rotate-y-180 bg-[#0A192F] rounded-xl shadow-2xl overflow-hidden border-2 border-slate-400 text-white flex flex-col font-sans"
              style={{ opacity: isFlipped ? 1 : 0, pointerEvents: isFlipped ? 'auto' : 'none' }}
              aria-hidden={!isFlipped}
            >
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-bl from-transparent via-white/5 to-transparent z-0 opacity-80" />
              <div className="absolute inset-0 z-0 opacity-70 mix-blend-screen" style={{ backgroundImage: waveBackground, backgroundPosition: 'bottom', backgroundSize: 'cover' }} />
              <img aria-hidden="true" src="/bss-construction-watermark.png" className="absolute z-0 inset-x-0 bottom-[23px] w-full h-[142px] object-cover object-center opacity-[0.075]" alt="" />

              <div className="px-6 py-2 flex flex-col h-full items-center justify-between relative z-10">
                 <div className="absolute top-4 left-0 w-full h-8 bg-black/60 shadow-inner z-0"></div>
                 <h3 className="text-[10px] font-bold text-center tracking-wider text-slate-300 mt-[44px] z-10">Your Identity. Your Work. Your Security.</h3>
                 
                 <div className="flex-1 flex flex-col items-center justify-center w-full my-1">
                     <div className="relative bg-white p-1.5 rounded-md shadow-lg w-[120px] h-[120px] flex items-center justify-center z-10 border-2 border-slate-300 flex-shrink-0">
                       <WorkerQr bssId={worker.identity.bssId} size={320} />
                       <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[22px] h-[22px] bg-white rounded-[4px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[16px] h-[16px] object-contain" /></span></span>
                     </div>
                   <p className="text-[7px] font-bold uppercase tracking-widest text-white/90 z-10 mt-1">Scan to Verify</p>
                 </div>

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

                 <p className="text-[8px] font-bold text-center w-full tracking-widest text-slate-300 z-10 mt-1 pb-1">www.bharatshramsetu.com</p>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 2. EMPLOYMENT CARD - FRONT SIDE */}
          {/* ==================================================== */}
          {isEmployment && (
            <div
              ref={frontRef}
              data-bss-face
              className="absolute inset-0 backface-hidden bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300 text-slate-900 flex flex-col font-sans"
              style={{ opacity: isFlipped ? 0 : 1, pointerEvents: isFlipped ? 'none' : 'auto' }}
              aria-hidden={isFlipped}
            >
              {/* Bridge watermark (login-page background) */}
              <img aria-hidden="true" src="/login-bg.jpg" className="absolute z-0 inset-0 w-full h-full object-cover object-bottom opacity-[0.22] pointer-events-none" alt="" />

              {/* Coloured Header — uses the linked site's colour */}
              <div className="text-white text-center pt-3 px-4 pb-0 relative z-10" style={{ background: siteColour }}>
                <div className="mb-1.5">
                  <div className="text-[13px] font-extrabold leading-tight tracking-tight">{employerName}</div>
                  <div className="text-[9px] font-mono font-bold text-white/90 tracking-[0.08em] mt-0.5">{siteCode}</div>
                </div>

                {/* 3-Color Line */}
                <div className="flex h-[4px] w-full">
                  <div className="flex-1 bg-[#FF9933]" />
                  <div className="flex-1 bg-white" />
                  <div className="flex-1 bg-[#138808]" />
                </div>
              </div>

              {/* Front Body */}
              <div className="p-4 pt-3.5 pb-10 flex-1 relative z-10 flex flex-col">
                {/* Photo */}
                <div className="w-[120px] h-[134px] mx-auto mb-1.5 border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-100 shadow-xs flex items-center justify-center">
                  {worker.identity.photoUrl && worker.identity.photoUrl !== '/worker-profile.png' ? (
                    <img src={worker.identity.photoUrl} alt={worker.identity.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserRound size={52} className="text-slate-400" />
                  )}
                </div>

                {/* Worker Name & Role Badge */}
                <div className="text-center text-[15px] font-extrabold text-slate-900 tracking-wide mt-0.5">{worker.identity.name.toUpperCase()}</div>
                <div className="w-fit mx-auto my-1 px-3.5 py-0.5 border border-emerald-400 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                  {worker.employment.designation || (worker as any).details?.employment?.designation || 'Mason'}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-[10px] mt-2">
                  <div className="flex flex-col gap-1.5">
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">BSS ID</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold font-mono">{worker.identity.bssId}</strong>
                    </div>
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">UAN NO.</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold">{(worker.socialSecurity as any)?.epfoUan || (worker as any).details?.socialSecurity?.epfoUan || '—'}</strong>
                    </div>
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">ESIC NO.</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold">{(worker.socialSecurity as any)?.esicIp || (worker as any).details?.socialSecurity?.esicIp || '—'}</strong>
                    </div>
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">CAMP NO.</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold">{worker.employment.campNo || (worker as any).details?.employment?.campNo || 'Skilled'}</strong>
                    </div>
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">ROUTE/BUS NO.</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold">{(worker.employment as any).route || (worker.employment as any).busNo || '—'}</strong>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">MOBILE NUMBER</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold">{(worker.identity as any).mobile || (worker.identity as any).mobileMasked || (worker as any).details?.mobile || '—'}</strong>
                    </div>
                    <div>
                      <label className="block text-[#64748B] font-bold text-[8.5px] tracking-wider mb-0.5">DEPARTMENT</label>
                      <strong className="block text-[#0F172A] text-[11.5px] font-extrabold">{worker.employment.department || (worker as any).details?.employment?.department || 'Civil Works'}</strong>
                    </div>

                    {/* QR Code */}
                    <div className="relative w-[96px] h-[96px] bg-white p-1 rounded-lg border border-slate-300 shadow-xs flex items-center justify-center mt-1">
                      <WorkerQr bssId={worker.identity.bssId} size={220} />
                      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="w-[26px] h-[26px] bg-white rounded-full grid place-items-center shadow-md border border-blue-900/30 p-[2px]">
                          <img src="/bss-original-logo.png" alt="" className="w-full h-full object-contain rounded-full" />
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Front Footer */}
              <div className="absolute left-0 right-0 bottom-0 h-[32px] bg-[#07182b] text-white flex justify-center items-center text-[8.5px] font-bold tracking-wider gap-3 z-20">
                <span>✓ Verified Worker</span>
                <span className="text-white/30">|</span>
                <span><span className="text-sky-400">👤</span> Formal Employment</span>
                <span className="text-white/30">|</span>
                <span><span className="text-amber-400">↗</span> Better Opportunities</span>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 2. EMPLOYMENT CARD - BACK SIDE */}
          {/* ==================================================== */}
          {isEmployment && (
            <div
              ref={backRef}
              data-bss-face
              className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300 text-slate-900 flex flex-col font-sans"
              style={{ opacity: isFlipped ? 1 : 0, pointerEvents: isFlipped ? 'auto' : 'none' }}
              aria-hidden={!isFlipped}
            >
              {/* Bridge watermark (login-page background) */}
              <img aria-hidden="true" src="/login-bg.jpg" className="absolute z-0 inset-0 w-full h-full object-cover object-bottom opacity-[0.22] pointer-events-none" alt="" />

              {/* Site-colour upper boundary + brand tricolour */}
              <div aria-hidden="true" className="relative z-20 h-2 w-full shrink-0" style={{ background: siteColour }} />
              <div className="relative z-10 flex h-[4px] w-full shrink-0">
                <div className="flex-1 bg-[#FF9933]" />
                <div className="flex-1 bg-white" />
                <div className="flex-1 bg-[#138808]" />
              </div>

              {/* Back Content */}
              <div className="p-3 pb-10 flex-1 relative z-10 flex flex-col gap-1.5">
                {/* Contractor Section */}
                <div className="border border-slate-300 border-l-[3px] border-l-[#153C71] bg-white p-2 rounded-md shadow-2xs">
                  <h3 className="m-0 text-[#153C71] text-[11px] font-extrabold mb-0.5">Contractor Details</h3>
                  <div className="text-[10.5px] font-extrabold text-slate-900">{worker.employment.contractor || '—'}</div>
                  <div className="flex flex-wrap justify-between items-center text-slate-600 text-[8.5px] mt-0.5 gap-x-2">
                    <span>Contractor ID: <b className="text-slate-900">{worker.employment.contractorDetails?.code || '—'}</b></span>
                    <span>Contact: <b className="text-slate-900">{worker.employment.contractorDetails?.contact || '—'}</b></span>
                    {worker.employment.contractorDetails?.email ? <span>Email: <b className="text-slate-900">{worker.employment.contractorDetails.email}</b></span> : null}
                  </div>
                </div>

                {/* Site Section */}
                <div className="border border-slate-300 border-l-[3px] border-l-[#153C71] bg-white p-2 rounded-md shadow-2xs">
                  <h3 className="m-0 text-[#153C71] text-[11px] font-extrabold mb-0.5">Site Details</h3>
                  <div className="text-[10.5px] font-extrabold text-slate-900">{worker.employment.site || '—'}</div>
                  <div className="flex justify-between items-center text-slate-600 text-[8.5px] mt-0.5">
                    <span>{worker.employment.siteDetails?.location || '—'}</span>
                    <span>Site ID: <b className="text-slate-900">{worker.employment.siteDetails?.code || '—'}</b></span>
                  </div>
                </div>

                {/* Supervisor Section */}
                <div className="border border-slate-300 border-l-[3px] border-l-[#153C71] bg-white p-2 rounded-md shadow-2xs">
                  <h3 className="m-0 text-[#153C71] text-[11px] font-extrabold mb-0.5">Supervisor Detail</h3>
                  <div className="text-[10.5px] font-extrabold text-slate-900">{(worker.employment as any).supervisorName || (worker.employment.siteDetails as any)?.manager || '—'}</div>
                  <div className="text-slate-600 text-[8.5px] mt-0.5">
                    <span>Contact No.: <b className="text-slate-900">{(worker.employment as any).supervisorContact || '—'}</b></span>
                  </div>
                </div>

                {/* Emergency & Blood Group */}
                <div className="grid grid-cols-2 gap-2 my-0.5">
                  <div className="bg-[#FFF3F3] border border-rose-200 border-l-[3px] border-l-rose-600 p-2 rounded-lg text-[8px] relative">
                    <div className="text-rose-600 font-extrabold text-[8.5px] mb-1">☎ EMERGENCY CONTACT</div>
                    <div className="text-slate-700">Name: <b className="text-slate-900">{worker.identity.emergencyContactName || '—'}</b></div>
                    <div className="text-slate-700">Number: <b className="text-slate-900">{worker.identity.emergencyContactNumber || '—'}</b></div>
                    <div className="text-slate-700">Relation: <b className="text-slate-900">{worker.identity.emergencyContactRelation || '—'}</b></div>
                  </div>

                  <div className="bg-[#FFF3F3] border border-rose-200 border-l-[3px] border-l-rose-600 p-2 rounded-lg text-[8px] relative">
                    <div className="text-rose-600 font-extrabold text-[8.5px] mb-1">♦ BLOOD GROUP</div>
                    <span className="absolute top-1.5 right-2 text-[18px] font-black text-rose-600">{worker.personal.bloodGroup || '—'}</span>
                    <div className="text-slate-500 text-[7.5px] mt-4">In case of emergency please contact</div>
                  </div>
                </div>

                {/* Notice Container */}
                <div className="mt-auto bg-[#F1F5F9] border border-slate-200 p-2 rounded-lg text-[8px] leading-snug text-slate-600 space-y-0.5">
                  <p className="m-0">• This identity card must always be carried & displayed for security & identification.</p>
                  {worker.employment.contractor ? (
                    <p className="m-0">• Loss or theft of this card should be reported immediately to the Contractor — <b>{worker.employment.contractor}</b>{worker.employment.contractorDetails?.contact ? <> · <b>{worker.employment.contractorDetails.contact}</b></> : null}{worker.employment.contractorDetails?.email ? <> · <b>{worker.employment.contractorDetails.email}</b></> : null}.</p>
                  ) : (
                    <p className="m-0">• Loss or theft of this card should be reported immediately to site security.</p>
                  )}
                  <p className="m-0">• This card is not transferable & must be returned immediately on cessation of employment.</p>
                </div>

                {/* Issue & Validity Dates */}
                <div className="flex justify-between items-center text-[8.5px] px-1">
                  <div>
                    <span className="text-slate-500 font-bold uppercase text-[8px]">Issue Date</span>
                    <strong className="block text-[11px] font-extrabold font-mono text-slate-900">{currentDate}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-bold uppercase text-[8px]">Valid Till</span>
                    <strong className="block text-[11px] font-extrabold font-mono text-slate-900">{validTill}</strong>
                  </div>
                </div>
              </div>

              {/* Bottom Footer */}
              <div className="absolute left-0 right-0 bottom-0 h-[32px] bg-[#07182b] text-white flex items-center justify-center text-[7.5px] font-bold tracking-wider z-20 px-2 text-center">
                This card is the property of the issuing organisation. Misuse is punishable under applicable laws.
              </div>
            </div>
          )}

          
        </div>
      </div>

      {/* See Gate Pass — under the ID card */}
      <button
        onClick={() => { void seeGatePass(); }}
        disabled={!issuedPass}
        className="w-full h-12 rounded-[12px] bg-[#0F5132] hover:bg-[#0b3d26] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
      >
        <ShieldCheck size={18} /> {issuedPass ? `See Gate Pass (${issuedPass.type})` : 'No gate pass issued'}
      </button>

      {/* Large QR — easier to scan than the small QR printed on the card */}
      <CredentialQrPanel
        bssId={worker.identity.bssId}
        name={worker.identity.name}
        idLabel="worker"
        description="This large QR carries the same BSS credential as the card — use it when the printed card QR is too small to scan. Anyone can scan it to verify your identity."
      />

      <div className="flex gap-3 pt-2">
        <button onClick={handleDownload} disabled={isExporting} className="flex-1 bg-[#073B67] hover:bg-[#062D4F] disabled:opacity-60 disabled:cursor-wait text-white px-4 py-3 rounded-[12px] font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2">
          <Download size={18} /> {isExporting ? 'Creating print PDF…' : 'View / Download Print-Ready PDF'}
        </button>
        <button onClick={handleShare} disabled={isExporting} className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-wait px-4 py-3 rounded-[12px] font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2">
          <Share2 size={18} /> {isExporting ? 'Preparing…' : 'Share Digital ID'}
        </button>
      </div>

      <p className="text-center text-xs text-gray-500">ISO/IEC 7810 ID-1 · 85.60 × 53.98 mm · front and back · 4× raster capture</p>
      {exportError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{exportError}</p>}
      {exportNotice && <p role="status" className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">{exportNotice}</p>}

      {passPreview && <GatePassViewer html={passPreview.html} title={passPreview.title} onClose={() => setPassPreview(null)} />}

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
        }
      `}</style>
    </div>
  );
}
