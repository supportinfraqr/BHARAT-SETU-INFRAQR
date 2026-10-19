/** PREVIEW HARNESS implementation of the prod `@/lib/exportXlsx` helpers (uses the `xlsx` package). */
import * as XLSX from 'xlsx';

type Cell = string | number | boolean | null | undefined;

function safeName(name: string) {
  return (name || 'Sheet1').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1';
}

function download(wb: XLSX.WorkBook, filename: string) {
  const name = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, name);
}

/** Export a header row + 2-D matrix. */
export function exportMatrixToXlsx({ filename, head, rows, sheetName = 'Sheet1' }: {
  filename: string; head: string[]; rows: Cell[][]; sheetName?: string;
}) {
  const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
  ws['!cols'] = head.map((h, i) => ({ wch: Math.min(60, Math.max(String(h).length, ...rows.map(r => String(r[i] ?? '').length)) + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeName(sheetName));
  download(wb, filename);
}

/** Export typed rows through column accessors. */
export function exportRowsToXlsx<R>({ filename, rows, columns, sheetName = 'Sheet1' }: {
  filename: string; rows: R[]; columns: Array<{ header: string; value: (row: R) => Cell }>; sheetName?: string;
}) {
  exportMatrixToXlsx({ filename, sheetName, head: columns.map(c => c.header), rows: rows.map(r => columns.map(c => c.value(r))) });
}
