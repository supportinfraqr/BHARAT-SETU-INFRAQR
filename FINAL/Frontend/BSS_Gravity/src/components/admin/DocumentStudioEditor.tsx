"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, Eye, Pencil } from 'lucide-react';

export type StudioToken = { value: string; label: string; group?: string };

function extractBody(html: string): string {
  if (!html) return '';
  try {
    return new DOMParser().parseFromString(html, 'text/html').body?.innerHTML ?? '';
  } catch {
    return '';
  }
}

function splitShell(html: string): { prefix: string; suffix: string; hasBody: boolean } {
  const m = /<body[^>]*>/i.exec(html || '');
  if (!m) return { prefix: '', suffix: '', hasBody: false };
  const start = m.index + m[0].length;
  const end = (html || '').toLowerCase().lastIndexOf('</body>');
  return { prefix: html.slice(0, start), suffix: end >= 0 ? html.slice(end) : '</body></html>', hasBody: true };
}

/**
 * Word-style document studio: rich canvas + HTML code, searchable token picker,
 * and a live preview — the same authoring experience as the CLRA template maker.
 * It edits the <body> of ``value`` while preserving the surrounding shell/style.
 */
export default function DocumentStudioEditor({
  value, onChange, tokens, renderPreview, defaultHtml = '',
}: {
  value: string;
  onChange: (html: string) => void;
  tokens: StudioToken[];
  renderPreview: (html: string) => string;
  defaultHtml?: string;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [shell] = useState(() => splitShell(value || defaultHtml));
  const [tab, setTab] = useState<'visual' | 'code'>('visual');
  const [body, setBody] = useState(() => extractBody(value) || extractBody(defaultHtml));
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  function build(next: string): string {
    return shell.hasBody ? shell.prefix + next + shell.suffix : next;
  }

  function commit(next: string, syncCanvas = true) {
    setBody(next);
    if (syncCanvas && tab === 'visual' && canvasRef.current && canvasRef.current.innerHTML !== next) {
      canvasRef.current.innerHTML = next;
    }
    onChange(build(next));
  }

  function highlightTokensForCanvas(html: string): string {
    if (!html) return '';
    // Colorize plain {{token}} text into high-contrast pill badges in Word Canvas
    return html.replace(/<span[^>]*contenteditable=["']false["'][^>]*>(\{\{[^}]+\}\})<\/span>|(\{\{[^}]+\}\})/gi, (match, badgeToken, rawToken) => {
      const tok = badgeToken || rawToken;
      if (!tok || tok.toLowerCase().includes('logourl')) return match;
      return `<span style="background:#0284c7;color:#ffffff;padding:2px 7px;border-radius:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:700;letter-spacing:0.3px;display:inline-block;vertical-align:baseline;box-shadow:0 1px 2px rgba(0,0,0,0.1);" contenteditable="false">${tok}</span>`;
    });
  }

  // Sync the canvas whenever the visual tab is shown (and seed it on mount).
  useEffect(() => {
    if (tab === 'visual' && canvasRef.current) {
      const highlighted = highlightTokensForCanvas(body);
      if (canvasRef.current.innerHTML !== highlighted) {
        canvasRef.current.innerHTML = highlighted;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // For a brand-new template, capture the starter body into the parent once.
  useEffect(() => {
    if (!value && body) onChange(build(body));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savedRangeRef = useRef<Range | null>(null);

  function saveSelection() {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && canvasRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0);
    }
  }

  function activeCaret(): Range | null {
    if (typeof window === 'undefined' || !canvasRef.current) return null;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (r.startContainer && r.startContainer.isConnected && canvasRef.current.contains(r.startContainer)) {
        return r;
      }
    }
    return null;
  }

  function restoreSelection() {
    if (typeof window === 'undefined' || !canvasRef.current) return;
    const sel = window.getSelection();
    if (!sel) return;
    let range = activeCaret();
    if (!range) {
      const saved = savedRangeRef.current;
      if (saved && saved.startContainer && saved.startContainer.isConnected && canvasRef.current.contains(saved.startContainer)) {
        range = saved;
      }
    }
    if (!range) {
      // No usable caret inside the canvas (e.g. user clicked a token first):
      // append at the end rather than silently jumping to the top.
      range = document.createRange();
      range.selectNodeContents(canvasRef.current);
      range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
    savedRangeRef.current = range;
  }

  function cleanHtmlForExport(html: string): string {
    // Strip contenteditable token badge wrappers: <span ... contenteditable="false">{{token}}</span> -> {{token}}
    return html.replace(/<span[^>]*contenteditable=["']false["'][^>]*>(\{\{[^}]+\}\})<\/span>/gi, '$1');
  }

  function badgeHtml(tok: string): string {
    return `<span style="background:#0284c7;color:#ffffff;padding:2px 7px;border-radius:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:700;letter-spacing:0.3px;display:inline-block;vertical-align:baseline;box-shadow:0 1px 2px rgba(0,0,0,0.1);" contenteditable="false">${tok}</span>&nbsp;`;
  }

  function emitRich() { 
    const raw = canvasRef.current?.innerHTML ?? '';
    commit(cleanHtmlForExport(raw), false); 
  }
  function cmd(command: string, arg?: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    restoreSelection();
    canvas.focus();
    document.execCommand(command, false, arg);
    saveSelection();
    emitRich();
  }
  function insertToken(tok: string) {
    const canvas = canvasRef.current;
    if (tab === 'visual' && canvas) {
      // Capture the live caret BEFORE focus/token-click side effects reset it.
      restoreSelection();
      const sel = window.getSelection();
      if (tok.toLowerCase().includes('logourl')) {
        cmd('insertHTML', `<img src="{{logoUrl}}" alt="Logo" style="max-height:50px;width:auto;display:inline-block;vertical-align:middle;margin:4px 8px 4px 0;" />&nbsp;`);
        return;
      }
      const range = activeCaret();
      if (range && sel) {
        const div = document.createElement('div');
        div.innerHTML = badgeHtml(tok);
        const node = div.firstElementChild as HTMLElement | null;
        if (node) {
          range.deleteContents();
          range.insertNode(node);
          const next = document.createTextNode('\u00A0');
          node.after(next);
          const caret = document.createRange();
          caret.setStartAfter(next);
          caret.collapse(true);
          sel.removeAllRanges();
          sel.addRange(caret);
          savedRangeRef.current = caret;
          emitRich();
          return;
        }
      }
      // Deterministic fall-back if the DOM path is unavailable.
      const textEnd = document.createRange();
      textEnd.selectNodeContents(canvas);
      textEnd.collapse(false);
      if (sel) { sel.removeAllRanges(); sel.addRange(textEnd); }
      cmd('insertHTML', badgeHtml(tok));
      return;
    }
    if (tok.toLowerCase().includes('logourl')) {
      commit(cleanHtmlForExport(body + `<img src="{{logoUrl}}" alt="Logo" style="max-height:50px;width:auto;" />`));
    } else {
      commit(cleanHtmlForExport(body + tok));
    }
  }

  function getSelectedElement<T extends HTMLElement>(tagName: string): T | null {
    if (typeof window === 'undefined' || !canvasRef.current) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    while (node && node !== canvasRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === tagName.toUpperCase()) {
        return node as T;
      }
      node = node.parentNode;
    }
    return null;
  }

  function handleAddRow(position: 'above' | 'below') {
    const tr = getSelectedElement<HTMLTableRowElement>('TR');
    if (!tr) {
      alert('Please place your cursor inside a table row to add a row.');
      return;
    }
    const newTr = tr.cloneNode(true) as HTMLTableRowElement;
    Array.from(newTr.cells).forEach(cell => {
      cell.innerHTML = 'Data';
    });
    if (position === 'above') tr.before(newTr);
    else tr.after(newTr);
    emitRich();
  }

  function handleDeleteRow() {
    const tr = getSelectedElement<HTMLTableRowElement>('TR');
    if (!tr) {
      alert('Please place your cursor inside a table row to delete it.');
      return;
    }
    tr.remove();
    emitRich();
  }

  function handleAddCol(position: 'left' | 'right') {
    const td = getSelectedElement<HTMLTableCellElement>('TD') || getSelectedElement<HTMLTableCellElement>('TH');
    const table = getSelectedElement<HTMLTableElement>('TABLE');
    if (!td || !table) {
      alert('Please place your cursor inside a table cell to add a column.');
      return;
    }
    const colIdx = td.cellIndex;
    const rows = table.querySelectorAll('tr');
    rows.forEach(r => {
      const targetCell = r.cells[colIdx];
      if (targetCell) {
        const isHeader = targetCell.tagName === 'TH';
        const newCell = document.createElement(isHeader ? 'th' : 'td');
        newCell.innerHTML = isHeader ? 'Header' : 'Data';
        newCell.style.cssText = targetCell.style.cssText;
        if (position === 'left') targetCell.before(newCell);
        else targetCell.after(newCell);
      }
    });
    emitRich();
  }

  function handleDeleteCol() {
    const td = getSelectedElement<HTMLTableCellElement>('TD') || getSelectedElement<HTMLTableCellElement>('TH');
    const table = getSelectedElement<HTMLTableElement>('TABLE');
    if (!td || !table) {
      alert('Please place your cursor inside a table cell to delete a column.');
      return;
    }
    const colIdx = td.cellIndex;
    const rows = table.querySelectorAll('tr');
    rows.forEach(r => {
      if (r.cells[colIdx]) r.cells[colIdx].remove();
    });
    emitRich();
  }

  function insertSalaryTable() {
    const html = `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;">
      <thead>
        <tr style="background:#073B67;color:#ffffff;">
          <th style="padding:6px 10px;text-align:left;border:1px solid #073B67;">Salary Component</th>
          <th style="padding:6px 10px;text-align:right;border:1px solid #073B67;">Monthly Rate (₹)</th>
          <th style="padding:6px 10px;text-align:right;border:1px solid #073B67;">Annual Value (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding:6px 10px;border:1px solid #cbd5e1;">Basic Wage</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">15,000</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">1,80,000</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #cbd5e1;">House Rent Allowance (HRA)</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">6,000</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">72,000</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #cbd5e1;">Special / Site Allowance</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">4,000</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">48,000</td></tr>
        <tr style="background:#f1f5f9;font-weight:bold;"><td style="padding:6px 10px;border:1px solid #94a3b8;color:#073B67;">Gross Monthly Salary</td><td style="padding:6px 10px;text-align:right;border:1px solid #94a3b8;color:#073B67;">25,000</td><td style="padding:6px 10px;text-align:right;border:1px solid #94a3b8;color:#073B67;">3,00,000</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #cbd5e1;">Employer EPF (12%)</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">1,800</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">21,600</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #cbd5e1;">Employer ESIC (3.25%)</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">813</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">9,756</td></tr>
        <tr style="background:#e0f2fe;font-weight:bold;"><td style="padding:6px 10px;border:1px solid #0284c7;color:#0369a1;">Total Cost to Company (CTC)</td><td style="padding:6px 10px;text-align:right;border:1px solid #0284c7;color:#0369a1;">27,613</td><td style="padding:6px 10px;text-align:right;border:1px solid #0284c7;color:#0369a1;">3,31,356</td></tr>
      </tbody>
    </table><p><br></p>`;
    cmd('insertHTML', html);
  }

  function insertRelievingTable() {
    const html = `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;">
      <thead>
        <tr style="background:#073B67;color:#ffffff;">
          <th style="padding:6px 10px;text-align:left;border:1px solid #073B67;">Clearance Category</th>
          <th style="padding:6px 10px;text-align:center;border:1px solid #073B67;">Clearance Status</th>
          <th style="padding:6px 10px;text-align:left;border:1px solid #073B67;">Remarks / Verification</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:600;">Site Equipment & Tools Handover</td><td style="padding:6px 10px;text-align:center;border:1px solid #cbd5e1;color:#166534;font-weight:bold;">CLEARED</td><td style="padding:6px 10px;border:1px solid #cbd5e1;">All issued items returned in full</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:600;">Full & Final Wage Settlement</td><td style="padding:6px 10px;text-align:center;border:1px solid #cbd5e1;color:#166534;font-weight:bold;">CLEARED</td><td style="padding:6px 10px;border:1px solid #cbd5e1;">All wages & statutory dues paid</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:600;">Gate Pass & ID Credentials</td><td style="padding:6px 10px;text-align:center;border:1px solid #cbd5e1;color:#166534;font-weight:bold;">SURRENDERED</td><td style="padding:6px 10px;border:1px solid #cbd5e1;">Identity card surrendered at site</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:600;">Notice Period & Conduct Verification</td><td style="padding:6px 10px;text-align:center;border:1px solid #cbd5e1;color:#166534;font-weight:bold;">SATISFACTORY</td><td style="padding:6px 10px;border:1px solid #cbd5e1;">Good conduct during service</td></tr>
      </tbody>
    </table><p><br></p>`;
    cmd('insertHTML', html);
  }

  function insertFormXVTable() {
    const html = `<table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:11px;text-align:center;border:1px solid #334155;">
      <thead>
        <tr style="background:#f1f5f9;color:#0f172a;font-weight:bold;">
          <th style="padding:8px 6px;border:1px solid #334155;width:6%;" rowspan="2">Sl. No.</th>
          <th style="padding:8px 6px;border:1px solid #334155;" colspan="2">Total period for which employed</th>
          <th style="padding:8px 6px;border:1px solid #334155;width:22%;" rowspan="2">Nature of work done</th>
          <th style="padding:8px 6px;border:1px solid #334155;width:30%;" rowspan="2">Rate of wages (with particulars of unit in case of Piece-work)</th>
          <th style="padding:8px 6px;border:1px solid #334155;width:18%;" rowspan="2">Remarks</th>
        </tr>
        <tr style="background:#f8fafc;color:#0f172a;font-weight:bold;">
          <th style="padding:6px;border:1px solid #334155;width:12%;">From</th>
          <th style="padding:6px;border:1px solid #334155;width:12%;">To</th>
        </tr>
        <tr style="background:#e2e8f0;font-weight:600;font-size:10px;color:#475569;">
          <td style="padding:4px;border:1px solid #334155;">1</td>
          <td style="padding:4px;border:1px solid #334155;">2</td>
          <td style="padding:4px;border:1px solid #334155;">3</td>
          <td style="padding:4px;border:1px solid #334155;">4</td>
          <td style="padding:4px;border:1px solid #334155;">5</td>
          <td style="padding:4px;border:1px solid #334155;">6</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 6px;border:1px solid #334155;">1</td>
          <td style="padding:8px 6px;border:1px solid #334155;">{{doj}}</td>
          <td style="padding:8px 6px;border:1px solid #334155;">{{relievingDate}}</td>
          <td style="padding:8px 6px;border:1px solid #334155;">{{designation}}</td>
          <td style="padding:8px 6px;border:1px solid #334155;">{{wage}} / Month</td>
          <td style="padding:8px 6px;border:1px solid #334155;">Satisfactory</td>
        </tr>
      </tbody>
    </table><p><br></p>`;
    cmd('insertHTML', html);
  }

  function insertCustomGrid(cols: number) {
    const headers = Array.from({ length: cols }, (_, i) => `<th style="padding:6px 10px;border:1px solid #073B67;background:#073B67;color:#fff;text-align:left;">Column ${i + 1}</th>`).join('');
    const cells = Array.from({ length: cols }, () => `<td style="padding:6px 10px;border:1px solid #cbd5e1;">Value</td>`).join('');
    const html = `<table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:12px;"><thead><tr>${headers}</tr></thead><tbody><tr>${cells}</tr><tr>${cells}</tr></tbody></table><p><br></p>`;
    cmd('insertHTML', html);
  }

  const tool = 'h-7 px-2 rounded border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 bg-white';
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? tokens.filter(t => t.value.toLowerCase().includes(q) || t.label.toLowerCase().includes(q)) : tokens;
  }, [tokens, search]);
  const groups = useMemo(() => {
    const map = new Map<string, StudioToken[]>();
    for (const t of filtered) {
      const g = t.group || 'Fields';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(t);
    }
    return [...map.entries()];
  }, [filtered]);

  const [tableMenuOpen, setTableMenuOpen] = useState(false);

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
        <button type="button" onClick={() => setTab('visual')} className={`px-3 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 ${tab === 'visual' ? 'bg-white text-[#073B67] shadow-sm' : 'text-gray-500'}`}><Pencil size={12} />Word Canvas</button>
        <button type="button" onClick={() => setTab('code')} className={`px-3 py-1 rounded-md text-[11px] font-bold ${tab === 'code' ? 'bg-white text-[#073B67] shadow-sm' : 'text-gray-500'}`}>HTML Code</button>
      </div>
      <button type="button" onClick={() => setPickerOpen(v => !v)} className="text-[11px] font-semibold px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50">{pickerOpen ? 'Hide fields' : 'Insert field'}</button>
    </div>

    {tab === 'visual' && (
      <div className="flex flex-wrap items-center gap-1 p-2 border border-gray-200 rounded-lg bg-gray-50 relative">
        <button type="button" className={tool} onClick={() => cmd('bold')}><b>B</b></button>
        <button type="button" className={tool} onClick={() => cmd('italic')}><i>I</i></button>
        <button type="button" className={tool} onClick={() => cmd('underline')}><u>U</u></button>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button type="button" className={tool} onClick={() => cmd('formatBlock', 'H1')}>H1</button>
        <button type="button" className={tool} onClick={() => cmd('formatBlock', 'H2')}>H2</button>
        <button type="button" className={tool} onClick={() => cmd('formatBlock', 'P')}>¶</button>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button type="button" className={tool} onClick={() => cmd('insertUnorderedList')}>• List</button>
        <button type="button" className={tool} onClick={() => cmd('insertOrderedList')}>1. List</button>
        <button type="button" className={tool} onClick={() => cmd('justifyLeft')}>Left</button>
        <button type="button" className={tool} onClick={() => cmd('justifyCenter')}>Center</button>
        
        {/* Table & Column Dropdown */}
        <div className="relative inline-block">
          <button
            type="button"
            className={`${tool} text-[#073B67] font-bold bg-blue-50/70 border-blue-200 flex items-center gap-1`}
            onClick={() => setTableMenuOpen(v => !v)}
          >
            📊 Insert Table / Columns ▾
          </button>
          {tableMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-1.5 space-y-1 text-xs">
              <p className="px-2 py-1 text-[10px] font-extrabold uppercase text-gray-400">Preset Tables</p>
              <button
                type="button"
                onClick={() => { insertSalaryTable(); setTableMenuOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 font-semibold text-gray-800 flex items-center justify-between"
              >
                <span>💰 Salary & CTC Breakdown</span>
                <span className="text-[10px] text-blue-600">Preset</span>
              </button>
              <button
                type="button"
                onClick={() => { insertFormXVTable(); setTableMenuOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 font-semibold text-gray-800 flex items-center justify-between"
              >
                <span>📜 Form XV Service Certificate</span>
                <span className="text-[10px] text-blue-600">CLRA</span>
              </button>
              <button
                type="button"
                onClick={() => { insertRelievingTable(); setTableMenuOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 font-semibold text-gray-800 flex items-center justify-between"
              >
                <span>📋 Relieving Clearance Table</span>
                <span className="text-[10px] text-blue-600">Preset</span>
              </button>
              
              <p className="px-2 py-1 text-[10px] font-extrabold uppercase text-gray-400 border-t border-gray-100 pt-1">Custom Grids</p>
              <button
                type="button"
                onClick={() => { insertCustomGrid(2); setTableMenuOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                📐 2-Column Key/Value Grid
              </button>
              <button
                type="button"
                onClick={() => { insertCustomGrid(3); setTableMenuOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                📊 3-Column Table
              </button>
              <button
                type="button"
                onClick={() => { insertCustomGrid(4); setTableMenuOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                📈 4-Column Table
              </button>
              <button
                type="button"
                onClick={() => { insertCustomGrid(5); setTableMenuOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                🔢 5-Column Excel Grid
              </button>
            </div>
          )}
        </div>

        {/* Live Table Manipulation Tools */}
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button type="button" title="Add Row Above" className={tool} onClick={() => handleAddRow('above')}>+ Row Above</button>
        <button type="button" title="Add Row Below" className={tool} onClick={() => handleAddRow('below')}>+ Row Below</button>
        <button type="button" title="Delete Current Row" className={`${tool} text-red-600`} onClick={handleDeleteRow}>- Row</button>
        <button type="button" title="Add Column Left" className={tool} onClick={() => handleAddCol('left')}>+ Col Left</button>
        <button type="button" title="Add Column Right" className={tool} onClick={() => handleAddCol('right')}>+ Col Right</button>
        <button type="button" title="Delete Current Column" className={`${tool} text-red-600`} onClick={handleDeleteCol}>- Col</button>

        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button type="button" className={`${tool} text-blue-700 bg-blue-50/80 border-blue-200`} onClick={() => insertToken('{{logoUrl}}')}>+ Logo Image</button>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button type="button" className={tool} onClick={() => cmd('undo')}>Undo</button>
        <button type="button" className={tool} onClick={() => cmd('redo')}>Redo</button>
      </div>
    )}

    {pickerOpen && (
      <div className="rounded-xl border border-blue-100 p-3 bg-blue-50/50 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fields to insert (e.g. Worker Name, Date of Birth)…" className="h-9 flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const text = "Available Variable Tokens for Bharat Shram Setu Document Template:\n\n" +
                  tokens.map(t => `- ${t.label}: ${t.value} (${t.group || 'General'})`).join("\n") +
                  "\n\nPlease create an HTML template using these tokens.";
                navigator.clipboard.writeText(text);
                alert("Copied token prompt to clipboard! You can paste this directly into ChatGPT / LLM.");
              }}
              className="h-8 px-2.5 rounded-lg bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-emerald-800 shadow-sm"
            >
              <Copy size={12} />Copy for GPT
            </button>
            <button
              type="button"
              onClick={() => {
                const text = "AVAILABLE VARIABLE TOKENS FOR BHARAT SHRAM SETU:\n\n" +
                  tokens.map(t => `[${t.group || 'General'}] ${t.label} => ${t.value}`).join("\n");
                const blob = new Blob([text], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "bss_template_tokens.txt";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="h-8 px-2.5 rounded-lg bg-[#073B67] text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-[#052949] shadow-sm"
            >
              <Download size={12} />Download Fields (.txt)
            </button>
          </div>
        </div>
        <div className="mt-2.5 max-h-44 overflow-y-auto space-y-2.5 pr-1">
          {groups.map(([group, items]) => <div key={group}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">{group}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">{items.map(t => (
              <button key={t.value} type="button" title={`Insert ${t.value}`} onClick={() => insertToken(t.value)} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-800 shadow-sm hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                <span className="font-medium text-[11px]">{t.label}</span>
                <code className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded">{t.value}</code>
              </button>
            ))}</div>
          </div>)}
          {!filtered.length && <p className="text-[11px] text-gray-400 py-2">No matching fields found.</p>}
        </div>
      </div>
    )}

    {tab === 'visual'
      ? <div className="rounded-lg border border-gray-200 bg-slate-100 p-4 overflow-y-auto max-h-[60vh]">
          {/* Inject template CSS stylesheet into the Word Canvas so visual layout matches live preview */}
          {shell.prefix.includes('<style>') && (
            <style dangerouslySetInnerHTML={{ __html: shell.prefix.slice(shell.prefix.indexOf('<style>') + 7, shell.prefix.indexOf('</style>')) }} />
          )}
          <div ref={canvasRef} contentEditable suppressContentEditableWarning onInput={emitRich} onMouseUp={saveSelection} onKeyUp={saveSelection} onFocus={saveSelection} className="min-h-[450px] w-[794px] mx-auto bg-white p-[32px_44px] shadow-sm rounded border border-gray-200 text-sm leading-relaxed focus:outline-none" />
        </div>
      : <textarea value={build(body)} onChange={e => {
          const val = e.target.value;
          setBody(extractBody(val) || val);
          onChange(val);
        }} rows={18} spellCheck={false} className="w-full rounded-lg border border-gray-200 p-3 font-mono text-[11px] leading-relaxed" />}

    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"><Eye size={13} />Live preview — sample data</p>
      <iframe title="Document live preview" srcDoc={renderPreview(build(body))} className="w-full h-[60vh] rounded-lg border border-gray-200 bg-white" sandbox="" />
    </div>
  </div>;
}
