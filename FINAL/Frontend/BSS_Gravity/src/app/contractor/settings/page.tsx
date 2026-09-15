"use client";

import { useState } from 'react';
import { FileDown, Layers } from 'lucide-react';
import ConsentPanel from '@/components/ConsentPanel';
import { useContractor } from '@/contexts/ContractorContext';
import BulkGenerateModal from '@/components/documentEngine/BulkGenerateModal';
import { DocumentGeneratorModal } from '@/components/documentEngine/DocumentFlow';
import { useContractorDocView } from '@/components/documentEngine/portalAdapters';
import type { DocumentType } from '@/lib/documentEngine/types';

export default function ContractorSettingsPage() {
  const { contractor } = useContractor();
  const { owner, view } = useContractorDocView();
  const workers = view.workers.length ? view.workers : [];
  const [generateType, setGenerateType] = useState<DocumentType | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Contractor settings</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Organisation defaults and worker document operations · {contractor.identity.company}</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <button className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold inline-flex items-center gap-2" onClick={() => setGenerateType('appointment-letter')}><FileDown size={15}/>Generate a document</button>
        <button className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-semibold inline-flex items-center gap-2" onClick={() => setBulkOpen(true)}><Layers size={15}/>Bulk generate</button>
      </div>

      <ConsentPanel role="contractor"/>

      {generateType && <DocumentGeneratorModal owner={owner} view={view} workers={workers} type={generateType} onClose={() => setGenerateType(null)} />}
      {bulkOpen && <BulkGenerateModal owner={owner} view={view} workers={workers} onClose={() => setBulkOpen(false)} />}
    </div>
  );
}
