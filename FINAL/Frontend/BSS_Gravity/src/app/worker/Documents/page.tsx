"use client";

import React, { useMemo, useRef, useState } from 'react';
import { FileText, CheckCircle2, Clock, AlertTriangle, Upload, Eye, XCircle, Download, RefreshCcw, Trash2, Sparkles, Link2, FilePlus2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import EnterpriseDataTable, { DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useNotifications } from '@/contexts/NotificationContext';
import { useWorker } from '@/contexts/WorkerContext';
import { useAutoDocumentState, formatApprovalDate } from '@/lib/workerDocumentWorkflow';

type DocumentRow = {
  name: string;
  mandatory: boolean;
  owner: string;
  status: string;
  date: string | null;
  expiry: string | null;
};

const initialDocuments: DocumentRow[] = [
  { name: "Aadhaar Card", mandatory: true, owner: "Worker", status: "Verified", date: "10 Aug 2024", expiry: null },
  { name: "PAN Card", mandatory: true, owner: "Worker", status: "Missing", date: null, expiry: null },
  { name: "Bank Passbook Copy", mandatory: true, owner: "Worker", status: "Under Verification", date: "12 Aug 2024", expiry: null },
  { name: "Photo", mandatory: true, owner: "Worker", status: "Verified", date: "10 Aug 2024", expiry: null },
  { name: "Signature", mandatory: true, owner: "Worker", status: "Verified", date: "10 Aug 2024", expiry: null },
  { name: "UAN Card", mandatory: false, owner: "Worker", status: "Missing", date: null, expiry: null },
  { name: "ESIC Card", mandatory: false, owner: "Worker", status: "Uploaded", date: "13 Aug 2024", expiry: null },
  { name: "TIC Card", mandatory: false, owner: "Worker", status: "Missing", date: null, expiry: null },
  { name: "BOCW Card", mandatory: false, owner: "Worker", status: "Missing", date: null, expiry: null },
  { name: "Educational Certificate", mandatory: false, owner: "Worker", status: "Rejected", date: "11 Aug 2024", expiry: null },
  { name: "Medical Certificate", mandatory: true, owner: "Contractor", status: "Expired", date: "10 Aug 2023", expiry: "10 Aug 2024" },

  // System documents not listed here — Appointment Letter & Service Certificate
  // are derived from the binding/employment trigger state (see documentRows).
  { name: "Temporary Gate Pass", mandatory: false, owner: "System", status: "Expired", date: "26 Aug 2024", expiry: "26 Aug 2024" },
  { name: "Permanent Gate Pass", mandatory: true, owner: "System", status: "Verified", date: "27 Aug 2024", expiry: "27 Aug 2025" },
];

export default function DocumentsModule() {
  const { t } = useLanguage();
  const { updateNotification } = useNotifications();
  const { worker } = useWorker();
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocuments);
  const [files, setFiles] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);

  // Document Automation — frontend trigger state (demo; see lib/workerDocumentWorkflow.ts).
  // Appointment Letter is generated when the Worker–Contractor binding is approved;
  // Service Certificate is generated when employment becomes Inactive.
  const autoDoc = useAutoDocumentState();
  const [previewInactive, setPreviewInactive] = useState(false);
  const employmentState = previewInactive || worker.employment.status === 'Inactive' ? 'Inactive' : 'Active';
  const binding = autoDoc.binding;

  const documentRows: DocumentRow[] = useMemo(() => {
    // Appointment Letter — available/generated only after the Worker–Contractor
    // binding is approved. Service Certificate — generated only when employment
    // is Inactive (never merely because this page is opened).
    const appointmentLetter: DocumentRow | null = binding
      ? { name: "Appointment Letter", mandatory: true, owner: "System", status: "Verified", date: binding.approvedOn || '14 Aug 2024', expiry: null }
      : null;
    const serviceCertificate: DocumentRow = {
      name: "Service Certificate", mandatory: false, owner: "System",
      status: employmentState === 'Inactive' ? 'Generated' : 'Not Generated',
      date: employmentState === 'Inactive' ? formatApprovalDate(new Date()) : null,
      expiry: null,
    };
    const rows = [...documents];
    const anchorIndex = rows.findIndex(doc => doc.name === 'Temporary Gate Pass');
    const insertAt = anchorIndex >= 0 ? anchorIndex : rows.length;
    if (appointmentLetter) rows.splice(insertAt, 0, appointmentLetter);
    rows.splice(appointmentLetter ? insertAt + 1 : insertAt, 0, serviceCertificate);
    return rows;
  }, [documents, binding, employmentState]);

  const chooseFile = (name: string) => { setUploadName(name); inputRef.current?.click(); };
  const receiveFile = (file?: File) => {
    if (!file || !uploadName) return;
    if (file.size > 5 * 1024 * 1024) return alert('File must be 5 MB or smaller.');
    const url = URL.createObjectURL(file);
    setFiles(current => ({ ...current, [uploadName]: url }));
    setDocuments(current => current.map(doc => doc.name === uploadName ? { ...doc, status: 'Under Verification', date: formatApprovalDate(new Date()) } : doc));
    if (uploadName === 'PAN Card') void updateNotification('doc-pan', 'resolve').catch(() => undefined);
    if (uploadName === 'Medical Certificate') void updateNotification('doc-medical', 'resolve').catch(() => undefined);
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'Verified': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 size={14}/> };
      case 'Generated': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 size={14}/> };
      case 'Not Generated': return { bg: 'bg-gray-100', text: 'text-gray-500', icon: <Clock size={14}/> };
      case 'Missing': return { bg: 'bg-gray-100', text: 'text-gray-500', icon: <FileText size={14}/> };
      case 'Under Verification': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock size={14}/> };
      case 'Uploaded': return { bg: 'bg-blue-50', text: 'text-blue-600', icon: <FileText size={14}/> };
      case 'Rejected': return { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={14}/> };
      case 'Expired': return { bg: 'bg-orange-100', text: 'text-orange-700', icon: <AlertTriangle size={14}/> };
      case 'Pending': return { bg: 'bg-gray-100', text: 'text-gray-500', icon: <Clock size={14}/> };
      default: return { bg: 'bg-gray-100', text: 'text-gray-500', icon: <FileText size={14}/> };
    }
  };

  const systemGenerated = (name: string) => name === 'Appointment Letter' || name === 'Service Certificate';
  const openDocument = (name: string) => {
    if (files[name]) { window.open(files[name], '_blank', 'noopener,noreferrer'); return; }
    alert(systemGenerated(name) ? `Opening ${name} (print-ready PDF) — document auto-generated by the binding / employment workflow.` : 'The original verified document is held in the secure vault and is not included in this prototype dataset.');
  };

  const columns:DataColumn<DocumentRow>[]=[
    {id:'name',header:'Document name',value:d=>d.name,render:d=><span className="font-semibold text-gray-800">{d.name}{d.mandatory&&<span className="text-red-500 ml-1">*</span>}</span>},
    {id:'type',header:'Mandatory / Optional',value:d=>d.mandatory?'Mandatory':'Optional',render:d=><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${d.mandatory?'bg-orange-50 text-[#F47A32]':'bg-gray-100 text-gray-500'}`}>{d.mandatory?'Mandatory':'Optional'}</span>},
    {id:'owner',header:'Document Owner',value:d=>d.owner,render:d=>d.owner==='System'?<span className="text-[10px] font-bold bg-[#073B67]/10 text-[#073B67] px-2 py-0.5 rounded">Auto-Generated</span>:d.owner},
    {id:'status',header:'Document Status',value:d=>d.status,render:d=>{const config=getStatusConfig(d.status);return <span className={`text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1.5 ${config.bg} ${config.text}`}>{config.icon}{d.status}</span>}},
    {id:'date',header:'Upload Date',value:d=>d.date??'-'},
    {id:'expiry',header:'Expiry Date',value:d=>d.expiry??'-',render:d=>d.expiry?<span className={`text-xs font-semibold ${d.status==='Expired'?'text-orange-600':'text-gray-700'}`}>{d.expiry}</span>:<span className="text-gray-300">—</span>},
    {id:'actions',header:'Actions',filterable:false,value:d=>d.status,render:d=>{return <div className="flex gap-1.5 items-center">
      {d.status!=='Missing'&&d.status!=='Expired'&&d.status!=='Not Generated'&&<button onClick={()=>openDocument(d.name)} className="p-1.5 text-gray-400 hover:text-[#073B67] bg-gray-50 rounded border" title="View Document"><Eye size={15}/></button>}
      {d.owner==='System'&&d.status!=='Pending'&&d.status!=='Not Generated'&&<button onClick={()=>alert(`Downloading ${d.name} (print-ready PDF).`)} className="p-1.5 text-gray-400 hover:text-[#073B67] bg-gray-50 rounded border" title="Download"><Download size={15}/></button>}
      {d.owner!=='System'&&['Verified','Uploaded','Under Verification'].includes(d.status)&&<button onClick={()=>chooseFile(d.name)} className="p-1.5 text-gray-400 hover:text-[#073B67] bg-gray-50 rounded border" title="Replace Document"><RefreshCcw size={15}/></button>}
      {d.owner!=='System'&&['Missing','Rejected','Expired'].includes(d.status)&&<button onClick={()=>chooseFile(d.name)} className="bg-[#073B67] text-white px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1"><Upload size={14}/>Upload</button>}
      {d.owner!=='System'&&['Uploaded','Rejected','Under Verification'].includes(d.status)&&<button onClick={()=>{setDocuments(current=>current.map(doc=>doc.name===d.name?{...doc,status:'Missing',date:null}:doc));setFiles(current=>{const next={...current};delete next[d.name];return next;})}} className="p-1.5 text-gray-300 hover:text-red-600 bg-gray-50 rounded border" title="Delete Document"><Trash2 size={15}/></button>}
    </div>}},
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#062D4F]">{t('nav.documents')}</h1>
        <p className="text-sm text-gray-500 mt-1">Manage all your mandatory KYC, compliance, and system-generated credentials.</p>
      </div>
      <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={e => receiveFile(e.target.files?.[0])}/>

      <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 flex flex-col sm:flex-row sm:items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-white border border-blue-100 text-[#073B67] flex items-center justify-center flex-shrink-0"><Sparkles size={18}/></span>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Approval-Based Document Automation</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            <strong>Appointment Letter</strong> is generated when your Worker–Contractor binding is approved, and <strong>Service Certificate</strong> is generated when your employment becomes <strong>Inactive</strong>. Both appear below automatically when the underlying event completes. <strong>Temporary Gate Pass</strong> and <strong>Permanent Gate Pass</strong> update after Principal Employer and Contractor approvals.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
            {binding ? (
              <span className="inline-flex items-center gap-1.5 bg-white border border-blue-100 rounded-full px-3 py-1 text-[#073B67]"><Link2 size={12}/> Binding approved · {binding.contractor} · {binding.approvedOn} — Appointment Letter issued</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-white border border-blue-100 rounded-full px-3 py-1 text-gray-500"><Link2 size={12}/> No approved binding — Appointment Letter is generated after approval</span>
            )}
            <span className={`inline-flex items-center gap-1.5 bg-white border rounded-full px-3 py-1 ${employmentState === 'Inactive' ? 'border-green-200 text-green-700' : 'border-gray-200 text-gray-500'}`}><FilePlus2 size={12}/> Employment: {employmentState} — Service Certificate {employmentState === 'Inactive' ? 'generated' : 'not yet generated'}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Demo preview</span>
            <button type="button" onClick={() => setPreviewInactive(false)} className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${employmentState === 'Active' ? 'bg-[#073B67] text-white border-[#073B67]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#073B67]/40'}`}>Worker Active</button>
            <button type="button" onClick={() => setPreviewInactive(true)} className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${employmentState === 'Inactive' ? 'bg-[#073B67] text-white border-[#073B67]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#073B67]/40'}`}>Worker Inactive (preview Service Certificate)</button>
          </div>
        </div>
      </section>

      <div id="missing-documents"><EnterpriseDataTable title="Document records" rows={documentRows} columns={columns} rowKey={d=>d.name} filename="bss-worker-documents" defaultPageSize={15}/></div>
    </div>
  );
}
