"use client";

import { useState } from 'react';
import { LayoutTemplate } from 'lucide-react';
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
        <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Templates setting</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-bss-text-primary mt-1">Templates Setting</h1>
        <p className="text-sm text-bss-text-muted mt-1">Document templates, organisation branding and worker document operations · {employer.identity.company}</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-bss-border">
        <button className="px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px inline-flex items-center gap-2 border-[#01183A] text-[#01183A]"><LayoutTemplate size={16}/>Document Templates</button>
      </div>

      <DocumentTemplateManager owner={owner} onGenerate={type => setGenerateType(type)} />

      {generateType && <DocumentGeneratorModal owner={owner} view={view} workers={workers} type={generateType} onClose={() => setGenerateType(null)} />}
    </div>
  );
}
