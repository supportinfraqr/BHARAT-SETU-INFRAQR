"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { TOKEN_CATEGORIES, TOKEN_DEFS, tokenCategoryOf, TOKEN_BY_KEY } from '@/lib/documentEngine/tokens';
import type { TokenCategory } from '@/lib/documentEngine/tokens';

/**
 * Searchable "Insert BSS Field" control. Inserting calls onInsert(tokenKey) and the
 * editor places the token at the current text caret — workers never type tokens manually.
 */
export function FieldTokenPicker({ onInsert, compact = false }: { onInsert: (tokenKey: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<TokenCategory>('Worker');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const grouped = useMemo(() => {
    const term = query.trim().toLowerCase();
    const defs = term ? TOKEN_DEFS.filter(token => token.label.toLowerCase().includes(term) || token.key.toLowerCase().includes(term)) : TOKEN_DEFS.filter(token => token.category === active);
    return defs;
  }, [query, active]);

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen(value => !value)} className="w-full h-9 rounded-lg border border-dashed border-[#073B67]/40 bg-blue-50/50 text-[#073B67] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-blue-50">
        <Search size={13}/> Insert BSS Field <ChevronDown size={13} className={open ? 'rotate-180 transition-transform' : 'transition-transform'}/>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl p-2">
          <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search worker, wage, site, date…" className="w-full h-9 rounded-lg border border-gray-200 px-3 text-xs mb-2"/>
          {!query && <div className="flex flex-wrap gap-1 mb-2">{TOKEN_CATEGORIES.map(category => <button key={category} type="button" onClick={() => setActive(category)} className={`px-2 py-1 rounded-md text-[10px] font-bold ${active === category ? 'bg-[#073B67] text-white' : 'bg-gray-100 text-gray-600'}`}>{category}</button>)}</div>}
          <ul className="max-h-56 overflow-y-auto divide-y divide-gray-50">
            {grouped.map(token => <li key={token.key}><button type="button" onClick={() => { onInsert(token.key); setOpen(false); }} className="w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-blue-50"><span className="text-xs text-gray-800">{token.label}</span><code className="text-[10px] text-[#073B67]">{token.key}</code></button></li>)}
            {!grouped.length && <li className="px-2 py-4 text-center text-xs text-gray-400">No matching fields.</li>}
          </ul>
        </div>
      )}
      {!compact && <p className="text-[10px] text-gray-400 mt-1">Token inserts at the current cursor position.</p>}
    </div>
  );
}

export function TokenChip({ tokenKey }: { tokenKey: string }) {
  const def = TOKEN_BY_KEY[tokenKey];
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[10px] font-mono text-[#073B67]"><span className="font-sans font-bold text-blue-300">{tokenCategoryOf(tokenKey).slice(0, 1)}</span>{def?.label ?? tokenKey.split('.').pop()}</span>;
}

export { tokenCategoryOf };
