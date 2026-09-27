"use client";

import { useState } from 'react';
import { FileDown, LayoutTemplate } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import DocumentTemplateManager from '@/components/documentEngine/TemplateManager';
import { DocumentGeneratorModal } from '@/components/documentEngine/DocumentFlow';
import { useEmployerDocView } from '@/components/documentEngine/portalAdapters';
import type { DocumentType } from '@/lib/documentEngine/types';

export default function EmployerTemplatesPage() {
  const { employer } = useEmployer();
  const { owner, view } = useEmployerDocView();
  const workers = view.workers.length ? view.workers : [];
  const [generateType, setGenerateType] = useState<DocumentType | null>(null);

  return (
    <div className="space-y-6 pb-12">
      <header>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Templates setting</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Templates Setting</h1>
        <p className="text-sm text-gray-500 mt-1">Document templates, organisation branding and worker document operations · {employer.identity.company}</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        <button className="px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px inline-flex items-center gap-2 border-[#073B67] text-[#073B67]"><LayoutTemplate size={16}/>Document Templates</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold inline-flex items-center gap-2" onClick={() => setGenerateType('permanent-gate-pass')}><FileDown size={15}/>Generate a gate pass</button>
      </div>

      <DocumentTemplateManager owner={owner} onGenerate={type => setGenerateType(type)} />

      {generateType && <DocumentGeneratorModal owner={owner} view={view} workers={workers} type={generateType} onClose={() => setGenerateType(null)} />}
    </div>
  );
}
