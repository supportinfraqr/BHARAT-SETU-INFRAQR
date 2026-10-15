"use client";

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyButton({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy ${value}`}
      className={`inline-flex items-center gap-1 text-[11px] font-medium text-bss-text-muted hover:text-bss-interactive-blue hover:bg-bss-blue-tint border border-bss-border hover:border-bss-interactive-blue rounded-md px-1.5 py-0.5 transition-colors cursor-pointer ${className}`}
    >
      {copied ? <Check size={12} className="text-bss-green" /> : <Copy size={12} />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
