import * as XLSX from 'xlsx';

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
  /**
   * When set, the cell is split on this delimiter and expanded into one column
   * per value (e.g. a "Sites" cell "Site A, Site B" -> "Sites 1", "Sites 2").
   */
  split?: string;
};

type ResolvedColumn<T> = { header: string; get: (row: T) => string | number };

function splitValues(value: string | number | null | undefined, delimiter: string): string[] {
  return String(value ?? '')
    .split(delimiter)
    .map(part => part.trim())
    .filter(Boolean);
}

function writeAoa(filename: string, aoa: (string | number)[][], sheetName: string) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const width = aoa.reduce((max, row) => Math.max(max, row.length), 0);
  ws['!cols'] = Array.from({ length: width }, (_, index) => {
    const longest = aoa.reduce((max, row) => Math.max(max, String(row[index] ?? '').length), 0);
    return { wch: Math.min(52, Math.max(10, longest + 2)) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || 'Sheet1');
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Export rows to a real .xlsx workbook with sensible column widths. Columns
 * marked with `split` expand into multiple columns so multi-value cells (such
 * as a comma-separated site list) land in their own columns instead of one cell.
 */
export function exportRowsToXlsx<T>({
  filename,
  columns,
  rows,
  sheetName = 'Sheet1',
}: {
  filename: string;
  columns: ExportColumn<T>[];
  rows: T[];
  sheetName?: string;
}) {
  const resolved: ResolvedColumn<T>[] = [];
  for (const col of columns) {
    if (col.split) {
      const maxParts = rows.reduce(
        (max, row) => Math.max(max, splitValues(col.value(row), col.split!).length),
        0,
      );
      const width = Math.max(1, maxParts);
      for (let i = 0; i < width; i++) {
        resolved.push({
          header: width > 1 ? `${col.header} ${i + 1}` : col.header,
          get: (row: T) => splitValues(col.value(row), col.split!)[i] ?? '',
        });
      }
    } else {
      resolved.push({ header: col.header, get: (row: T) => (col.value(row) ?? '') as string | number });
    }
  }

  writeAoa(
    filename,
    [resolved.map(col => col.header), ...rows.map(row => resolved.map(col => col.get(row)))],
    sheetName,
  );
}

/** Export a header row plus a matrix body to a real .xlsx workbook. */
export function exportMatrixToXlsx({
  filename,
  head,
  rows,
  sheetName = 'Sheet1',
}: {
  filename: string;
  head: string[];
  rows: (string | number)[][];
  sheetName?: string;
}) {
  writeAoa(filename, [head, ...rows], sheetName);
}
