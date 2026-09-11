"use client";

import React, { useState, useRef } from 'react';
import { Download, Share2, ChevronLeft, Home } from 'lucide-react';
import Link from 'next/link';
import { useContractor } from '@/contexts/ContractorContext';
import OrganizationIdentityCard, { entityInitials, formatCardDate, type OrganizationCardContent } from '@/components/idcard/OrganizationIdentityCard';

export default function ContractorIdentityCardPage() {
  const { contractor: portal } = useContractor();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportNotice, setExportNotice] = useState('');

  const cardRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const entityId = portal.identity.bssId;
  // Registration number (single concise corporate identifier — CIN from profile).
  const registrationValue = portal.profileSections.registration?.find(f => f.label === 'CIN')?.value;
  // Date of incorporation / formation from entity profile.
  const incorpRaw = portal.identity.incorpDate ?? portal.profileSections.identity?.find(f => f.label === 'Date of Incorporation')?.value ?? '';
  const incorpDate = formatCardDate(incorpRaw);

  const content: OrganizationCardContent = {
    role: 'contractor',
    variant: 'standard',
    entityName: portal.identity.company,
    entityType: portal.identity.entity,
    entityIdLabel: 'BSS Contractor ID',
    entityId,
    dateLabel: 'Date of Incorporation',
    dateValue: incorpDate,
    registrationLabel: 'Registration No.',
    registrationValue,
    initials: entityInitials(portal.identity.company),
    issueDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    backTagline: 'Your Company. Your Compliance. Your Security.',
    backBadges: [
      { icon: 'shield', title: 'Verified', sub: 'Organization' },
      { icon: 'briefcase', title: 'Registered', sub: 'Entity' },
      { icon: 'check', title: 'Secure', sub: '& Trusted' },
    ],
  };

  const handleDownload = async () => {
    if (!frontRef.current || !backRef.current || isExporting) return;
    const preview = window.open('about:blank', '_blank');
    if (preview) {
      preview.opener = null;
      preview.document.title = 'Preparing BSS Contractor ID Card…';
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
      pdf.setProperties({ title: `BSS Contractor ID Card - ${entityId}`, subject: 'Print-ready ISO/IEC 7810 ID-1 contractor organization identity card', author: 'Bharat Shram Setu' });
      pdf.addImage(frontImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
      pdf.addPage([cardWidth, cardHeight], 'landscape');
      pdf.addImage(backImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
      const pdfUrl = URL.createObjectURL(pdf.output('blob'));
      if (preview && !preview.closed) {
        preview.location.replace(pdfUrl);
      } else {
        const download = document.createElement('a');
        download.href = pdfUrl;
        download.download = `BSS-Contractor-ID-${entityId}.pdf`;
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
      pdf.setProperties({ title: `BSS Contractor ID Card - ${entityId}`, subject: 'Contractor organization identity card', author: 'Bharat Shram Setu', creator: 'Bharat Shram Setu Contractor Portal' });
      pdf.addImage(frontImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
      pdf.addPage([cardWidth, cardHeight], 'landscape');
      pdf.addImage(backImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');

      const blob = pdf.output('blob');
      const fileName = `BSS-Contractor-ID-${entityId}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(entityId)}`;
      const shareText = `${portal.identity.company} · ${entityId}\nVerify: ${verifyUrl}`;

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'BSS Contractor ID Card', text: shareText, url: verifyUrl });
        setExportNotice('BSS ID card shared.');
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
        if (navigator.share) await navigator.share({ title: 'BSS Contractor ID', text: shareText });
        else await navigator.clipboard.writeText(verifyUrl);
        setExportNotice('ID card downloaded — file sharing isn’t supported here, so the verification link was shared instead.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('ID card share failed', error);
      setExportError('The ID card could not be shared. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#062D4F]">Contractor Identity Card</h1>
          <p className="text-sm text-gray-500 mt-1">Your official BSS digital credential as a registered contractor organization.</p>
        </div>
      </header>

      {/* FLIP CONTROLS */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 p-1 rounded-xl flex gap-1 shadow-inner">
          <button onClick={() => setIsFlipped(false)} className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${!isFlipped ? 'bg-white text-[#073B67] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Front Side</button>
          <button onClick={() => setIsFlipped(true)} className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${isFlipped ? 'bg-white text-[#073B67] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Back Side</button>
        </div>
      </div>

      <div ref={cardRef}>
        <OrganizationIdentityCard content={content} frontRef={frontRef} backRef={backRef} isFlipped={isFlipped} onToggleFlip={() => setIsFlipped(v => !v)} />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={handleDownload} disabled={isExporting} className="flex-1 bg-[#073B67] hover:bg-[#062D4F] disabled:opacity-60 disabled:cursor-wait text-white px-4 py-3 rounded-[12px] font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2">
          <Download size={18} /> {isExporting ? 'Creating print PDF…' : 'View / Download Print-Ready PDF'}
        </button>
        <button onClick={handleShare} disabled={isExporting} className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-wait px-4 py-3 rounded-[12px] font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2">
          <Share2 size={18} /> {isExporting ? 'Preparing…' : 'Share Digital ID'}
        </button>
      </div>
      <p className="text-center text-xs text-gray-500 mt-4">ISO/IEC 7810 ID-1 · 85.60 × 53.98 mm · front and back · 4× raster capture</p>

      {exportError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{exportError}</p>}
      {exportNotice && <p role="status" className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">{exportNotice}</p>}
    </div>
  );
}
