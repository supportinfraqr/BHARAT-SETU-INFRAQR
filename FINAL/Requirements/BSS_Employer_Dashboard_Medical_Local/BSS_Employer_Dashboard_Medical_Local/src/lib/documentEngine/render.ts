/** PREVIEW HARNESS shim for prod `@/lib/documentEngine/render` (only what the dashboard imports). */

/** Open a clean printable window (browser print dialog -> printer or "Save as PDF"). Copied from BSS_Gravity. */
export function openPrintHtml(html: string, title = 'Document') {
  const win = window.open('', '_blank', 'width=980,height=1200');
  if (!win) {
    const hidden = document.createElement('iframe');
    hidden.style.position = 'fixed';
    hidden.style.right = '0';
    hidden.style.bottom = '0';
    hidden.style.width = '0';
    hidden.style.height = '0';
    hidden.style.border = '0';
    document.body.appendChild(hidden);
    const doc = hidden.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(html); doc.close();
      setTimeout(() => { hidden.contentWindow?.print(); setTimeout(() => hidden.remove(), 2000); }, 450);
    }
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.document.title = title;
  setTimeout(() => { try { win.focus(); win.print(); } catch { /* blocked */ } }, 500);
}
