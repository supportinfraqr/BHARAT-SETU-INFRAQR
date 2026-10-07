"use client";

import { useRef, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import OrganizationIdentityCard, { entityInitials, formatCardDate, type OrganizationCardContent } from '@/components/idcard/OrganizationIdentityCard';
import CredentialQrPanel from '@/components/idcard/CredentialQrPanel';

export default function EmployerIdentityCardPage() {
  const { employer } = useEmployer();
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const entityId = employer.identity.bssId;
  const findLabel = (section: string | undefined, label: string) => employer.profileSections[section ?? '']?.find(f => f.label === label)?.value;
  const incorpDate = formatCardDate(findLabel('identity', 'Date of Incorporation') ?? findLabel('identity', 'Date of Incorporation / Constitution') ?? findLabel('registration', 'Date of Incorporation'));

  const content: OrganizationCardContent = {
    role: 'employer',
    variant: 'compact',
    entityName: employer.identity.company,
    entityType: employer.identity.entity,
    entityIdLabel: 'BSS Employer ID',
    entityId,
    dateLabel: 'Date of Incorporation',
    dateValue: incorpDate,
    initials: entityInitials(employer.identity.company),
    issueDate: formatCardDate(employer.identity.cardIssueDate) || new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' }),
    validTill: formatCardDate(employer.identity.cardValidTill) || '',
    backTagline: 'Your Workforce. Your Sites. Your Governance.',
    backBadges: [
      { icon: 'shield', title: 'Verified', sub: 'Organization' },
      { icon: 'briefcase', title: 'Site', sub: 'Oversight' },
      { icon: 'check', title: 'Auditable', sub: 'Access' },
    ],
  };

  async function handleDownload() {
    if (!frontRef.current || !backRef.current || isExporting) return;
    const preview = window.open('about:blank', '_blank');
    if (preview) { preview.opener = null; preview.document.title = 'Preparing BSS Employer ID Card…'; preview.document.body.innerHTML = '<main style="font:14px system-ui;padding:32px;color:#334155">Preparing your print-ready BSS ID Card…</main>'; }
    setIsExporting(true); setError(''); setNotice('');
    try {
      await document.fonts.ready;
      const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
      const captureOptions = { width:400, height:252, pixelRatio:4, cacheBust:true, backgroundColor:'#0A192F', style:{ position:'relative', width:'400px', height:'252px', transform:'none', backfaceVisibility:'visible', WebkitBackfaceVisibility:'visible', opacity:'1', boxShadow:'none' } } as const;
      const [frontImage, backImage] = await Promise.all([toPng(frontRef.current, captureOptions), toPng(backRef.current, captureOptions)]);
      const cardWidth = 85.6, cardHeight = 53.98;
      const pdf = new jsPDF({ orientation:'landscape', unit:'mm', format:[cardWidth, cardHeight], compress:true, precision:16 });
      pdf.setProperties({ title:`BSS Employer ID Card - ${entityId}`, subject:'Print-ready ISO/IEC 7810 ID-1 employer organization identity card', author:'Bharat Shram Setu' });
      pdf.addImage(frontImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
      pdf.addPage([cardWidth, cardHeight], 'landscape');
      pdf.addImage(backImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
      const pdfUrl = URL.createObjectURL(pdf.output('blob'));
      if (preview && !preview.closed) preview.location.replace(pdfUrl);
      else { const download = document.createElement('a'); download.href = pdfUrl; download.download = `BSS-Employer-ID-${entityId}.pdf`; document.body.appendChild(download); download.click(); download.remove(); setNotice('Your browser blocked the preview tab, so the PDF was downloaded instead.'); }
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
    } catch (reason) { if (preview && !preview.closed) preview.close(); console.error('ID card PDF export failed', reason); setError('The print-ready PDF could not be created.'); }
    finally { setIsExporting(false); }
  }

  async function handleShare() {
    if (!frontRef.current || !backRef.current || isExporting) return;
    setIsExporting(true); setError(''); setNotice('');
    try {
      await document.fonts.ready;
      const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
      const captureOptions = { width:400, height:252, pixelRatio:4, cacheBust:true, backgroundColor:'#0A192F', style:{ position:'relative', width:'400px', height:'252px', transform:'none', backfaceVisibility:'visible', WebkitBackfaceVisibility:'visible', opacity:'1', boxShadow:'none' } } as const;
      const [frontImage, backImage] = await Promise.all([toPng(frontRef.current, captureOptions), toPng(backRef.current, captureOptions)]);
      const cardWidth = 85.6, cardHeight = 53.98;
      const pdf = new jsPDF({ orientation:'landscape', unit:'mm', format:[cardWidth, cardHeight], compress:true, precision:16 });
      pdf.setProperties({ title:`BSS Employer ID Card - ${entityId}`, subject:'Employer organization identity card', author:'Bharat Shram Setu', creator:'Bharat Shram Setu Employer Portal' });
      pdf.addImage(frontImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
      pdf.addPage([cardWidth, cardHeight], 'landscape');
      pdf.addImage(backImage, 'PNG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
      const blob = pdf.output('blob');
      const fileName = `BSS-Employer-ID-${entityId}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(entityId)}`;
      const shareText = `${employer.identity.company} · ${entityId}\nVerify: ${verifyUrl}`;
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title:'BSS Employer ID Card', text: shareText, url: verifyUrl });
        setNotice('BSS ID card shared.');
      } else {
        const url = URL.createObjectURL(blob);
        const download = document.createElement('a'); download.href = url; download.download = fileName; download.rel = 'noopener';
        document.body.appendChild(download); download.click(); download.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        if (navigator.share) await navigator.share({ title:'BSS Employer ID', text: shareText });
        else await navigator.clipboard.writeText(verifyUrl);
        setNotice('ID card downloaded — file sharing isn’t supported here, so the verification link was shared instead.');
      }
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      console.error('ID card share failed', reason); setError('The ID card could not be shared. Please try again.');
    } finally { setIsExporting(false); }
  }

  return <div className="max-w-2xl mx-auto space-y-6">
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h1 className="text-2xl font-bold text-[#062D4F]">Employer Identity Card</h1><p className="text-sm text-gray-500 mt-1">Your official BSS digital credential as a registered principal employer organization.</p></div></header>

    <div className="flex justify-center mb-6"><div className="bg-gray-100 p-1 rounded-xl flex gap-1 shadow-inner"><button onClick={() => setIsFlipped(false)} className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${!isFlipped ? 'bg-white text-[#073B67] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Front Side</button><button onClick={() => setIsFlipped(true)} className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${isFlipped ? 'bg-white text-[#073B67] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Back Side</button></div></div>

    <OrganizationIdentityCard content={content} frontRef={frontRef} backRef={backRef} isFlipped={isFlipped} onToggleFlip={() => setIsFlipped(v => !v)} />

    <CredentialQrPanel bssId={entityId} name={employer.identity.company} idLabel="employer" />

    <div className="flex gap-3"><button disabled title="ID Card PDF download option is disabled" className="flex-1 bg-gray-400 opacity-60 cursor-not-allowed text-white px-4 py-3 rounded-[12px] font-bold text-sm flex justify-center items-center gap-2"><Download size={18}/>View / Download Print-Ready PDF</button><button disabled title="Share Digital ID option is disabled" className="bg-gray-100 border border-gray-200 text-gray-400 opacity-60 cursor-not-allowed px-4 py-3 rounded-[12px] font-bold text-sm flex justify-center items-center gap-2"><Share2 size={18}/>Share Digital ID</button></div>
    <p className="text-center text-xs text-gray-500 mt-4">ISO/IEC 7810 ID-1 · 85.60 × 53.98 mm · front and back · 4× raster capture</p>
    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">{notice}</p>}
  </div>;
}
