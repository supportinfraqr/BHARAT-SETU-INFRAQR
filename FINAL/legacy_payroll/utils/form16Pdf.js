const PDFDocument = require('pdfkit');

const C = { black: '#000000', border: '#000000', headerBg: '#eeeeee' };
const MARGIN = 32;
const ROW_H = 18;
const HDR_H = 20;
const CELL_PAD = 6;
const LABEL_W = 78;
const GAP_LINE = 6;
const GAP_SECTION = 6;
const GAP_BLOCK = 4;
const PART_BREAK = 10;
const PAGE_TOP = MARGIN;

function formatInr(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

function safeStr(v, fb = '—') {
  if (v === undefined || v === null || String(v).trim() === '') return fb;
  return String(v).replace(/\s+/g, ' ').trim();
}

/** Fixed column layout — all tables share identical x positions and full content width. */
function buildTableLayout(contentW) {
  const sl = 34;
  const amt = 112;
  const mid = contentW - sl - amt;
  return {
    widths: [sl, mid, amt],
    sl,
    amt,
    tableW: contentW,
  };
}

/**
 * PDF layout using explicit Y only — never advance PDFKit doc.y (prevents blank gaps).
 */
class Form16Layout {
  constructor(doc) {
    this.doc = doc;
    this.left = MARGIN;
    this.w = doc.page.width - MARGIN * 2;
    this.y = MARGIN;
    this.pageBottom = doc.page.height - MARGIN;
    const tbl = buildTableLayout(this.w);
    this.colWidths = tbl.widths;
    this.tableW = tbl.tableW;
    this.colX = [
      this.left,
      this.left + tbl.sl,
      this.left + tbl.sl + tbl.widths[1],
      this.left + this.tableW,
    ];
  }

  syncCursor() {
    this.doc.x = this.left;
    this.doc.y = this.y;
  }

  addPage() {
    this.doc.addPage();
    this.y = PAGE_TOP;
    this.syncCursor();
  }

  spaceLeft() {
    return this.pageBottom - this.y;
  }

  rowsFitOnPage(includeHeader = true) {
    const overhead = includeHeader ? HDR_H : 0;
    return Math.max(0, Math.floor((this.spaceLeft() - overhead) / ROW_H));
  }

  rowHeight(row) {
    const heights = row.map((cell, idx) => {
      const isAmt = idx === row.length - 1;
      const txt = isAmt && typeof cell === 'number' ? formatInr(cell) : safeStr(cell);
      const width = this.colWidths[idx] - CELL_PAD * 2;
      const wrap = idx === 1;
      return Math.max(ROW_H, Math.ceil(this.measure(txt, width, 8, isAmt, wrap)) + 8);
    });
    return Math.max(...heights);
  }

  /** How many table rows fit from startIdx using variable row heights. */
  countRowsThatFit(includeHeader, startIdx, rows) {
    let used = includeHeader ? HDR_H : 0;
    let count = 0;
    for (let i = startIdx; i < rows.length; i += 1) {
      const rh = this.rowHeight(rows[i]);
      if (count > 0 && used + rh > this.spaceLeft()) {
        break;
      }
      if (count === 0 && used + rh > this.spaceLeft()) {
        break;
      }
      used += rh;
      count += 1;
    }
    return count;
  }

  tableBlockHeight(rowList, includeHeader = true) {
    let h = includeHeader ? HDR_H : 0;
    rowList.forEach((row) => {
      h += this.rowHeight(row);
    });
    return h;
  }

  measure(str, width, size = 8, bold = false, lineBreak = true) {
    this.doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    return this.doc.heightOfString(safeStr(str, ''), { width, lineBreak });
  }

  paint(y, str, opts = {}) {
    const {
      size = 8,
      bold = false,
      width = this.w,
      align = 'left',
      lineBreak = true,
      x = this.left,
    } = opts;
    const text = safeStr(str, '—');
    this.doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(C.black);
    this.doc.text(text, x, y, { width, align, lineBreak });
    const h = this.measure(text, width, size, bold);
    this.doc.x = x;
    this.doc.y = y + h;
    return h;
  }

  line(str, opts = {}) {
    const gap = opts.gapAfter ?? GAP_LINE;
    const h = this.measure(str, opts.width ?? this.w, opts.size ?? 8, opts.bold ?? false);
    if (this.y + h + gap > this.pageBottom) {
      this.addPage();
    }
    const drawn = this.paint(this.y, str, opts);
    this.y += drawn + gap;
    this.syncCursor();
    return drawn;
  }

  sectionBreak(extra = GAP_SECTION) {
    this.y += extra;
    this.syncCursor();
  }

  startPartB() {
    const roomNeeded = 80;
    if (this.y + roomNeeded > this.pageBottom) {
      this.addPage();
    } else {
      this.y += PART_BREAK;
      this.syncCursor();
    }
  }

  centered(lines, opts = {}) {
    const { size = 8, bold = false, gap = 6 } = opts;
    lines.forEach((t) => {
      this.line(t, { size, bold, width: this.w, align: 'center', lineBreak: true, gapAfter: gap });
    });
  }

  partHeader(title, subtitle) {
    this.syncCursor();
    this.line(title, { size: 11, bold: true, align: 'center', lineBreak: false, gapAfter: 6 });
    if (subtitle) {
      this.line(subtitle, { size: 8, align: 'center', lineBreak: true, gapAfter: GAP_BLOCK });
    }
  }

  drawDetailGrid(rows) {
    const half = this.w / 2;
    const valueW = half - LABEL_W - CELL_PAD * 2;
    const rowHeights = rows.map(([ll, lv, rl, rv]) => {
      const h1 = Math.max(this.measure(ll, LABEL_W - 2, 7), this.measure(lv, valueW, 8, true));
      const h2 = Math.max(this.measure(rl, LABEL_W - 2, 7), this.measure(rv, valueW, 8, true));
      return Math.max(22, h1, h2) + CELL_PAD * 2;
    });
    const blockH = rowHeights.reduce((s, h) => s + h, 0);
    if (this.y + blockH > this.pageBottom) this.addPage();

    const x0 = this.left;
    const y0 = this.y;
    let ry = y0;

    this.doc.rect(x0, y0, this.w, blockH).lineWidth(0.6).strokeColor(C.border).stroke();
    this.doc
      .moveTo(x0 + half, y0)
      .lineTo(x0 + half, y0 + blockH)
      .lineWidth(0.5)
      .strokeColor(C.border)
      .stroke();

    rows.forEach(([ll, lv, rl, rv], i) => {
      if (i > 0) {
        this.doc.moveTo(x0, ry).lineTo(x0 + this.w, ry).lineWidth(0.4).strokeColor(C.border).stroke();
      }
      const ty = ry + CELL_PAD;
      this.paint(ty, ll, { x: x0 + CELL_PAD, size: 7, width: LABEL_W - 2, lineBreak: true });
      this.paint(ty, lv, { x: x0 + LABEL_W + CELL_PAD, size: 8, bold: true, width: valueW, lineBreak: true });
      this.paint(ty, rl, { x: x0 + half + CELL_PAD, size: 7, width: LABEL_W - 2, lineBreak: true });
      this.paint(ty, rv, {
        x: x0 + half + LABEL_W + CELL_PAD,
        size: 8,
        bold: true,
        width: valueW,
        lineBreak: true,
      });
      ry += rowHeights[i];
    });

    this.y = y0 + blockH + GAP_BLOCK;
    this.syncCursor();
  }

  drawTableHeader(y0) {
    const { colX, colWidths } = this;
    const x0 = colX[0];
    const tableW = this.tableW;

    this.doc.save();
    this.doc.rect(x0, y0, tableW, HDR_H).fill(C.headerBg);
    this.doc.restore();

    const headers = ['Sl.', 'Particulars', 'Amount (Rs.)'];
    headers.forEach((h, i) => {
      this.paint(y0 + 5, h, {
        x: colX[i] + CELL_PAD,
        size: 8,
        bold: true,
        width: colWidths[i] - CELL_PAD * 2,
        align: i === 2 ? 'right' : i === 0 ? 'center' : 'left',
        lineBreak: false,
      });
    });
  }

  drawTableRow(cy, row, rowH = ROW_H) {
    const { colX, colWidths } = this;
    const x0 = colX[0];
    const tableW = this.tableW;

    this.doc.moveTo(x0, cy).lineTo(x0 + tableW, cy).lineWidth(0.35).strokeColor(C.border).stroke();

    row.forEach((cell, idx) => {
      const isAmt = idx === row.length - 1;
      const txt = isAmt && typeof cell === 'number' ? formatInr(cell) : safeStr(cell);
      const wrap = idx === 1;
      const textH = this.measure(txt, colWidths[idx] - CELL_PAD * 2, 8, isAmt, wrap);
      const ty = cy + Math.max(4, (rowH - textH) / 2);
      this.paint(ty, txt, {
        x: colX[idx] + CELL_PAD,
        size: 8,
        bold: isAmt,
        width: colWidths[idx] - CELL_PAD * 2,
        align: isAmt ? 'right' : idx === 0 ? 'center' : 'left',
        lineBreak: wrap,
      });
    });
  }

  strokeTableFrame(y0, blockH) {
    const { colX } = this;
    const x0 = colX[0];
    const tableW = this.tableW;

    this.doc.rect(x0, y0, tableW, blockH).lineWidth(0.6).strokeColor(C.border).stroke();
    colX.slice(1, -1).forEach((lx) => {
      this.doc.moveTo(lx, y0).lineTo(lx, y0 + blockH).lineWidth(0.35).strokeColor(C.border).stroke();
    });
  }

  formTable(rows, { continued = false } = {}) {
    let rowIdx = 0;

    while (rowIdx < rows.length) {
      let maxRows = this.countRowsThatFit(true, rowIdx, rows);
      if (maxRows < 1) {
        this.addPage();
        maxRows = this.countRowsThatFit(true, rowIdx, rows);
      }
      if (maxRows < 1) {
        maxRows = 1;
      }

      const rowsHere = rows.slice(rowIdx, rowIdx + maxRows);
      const isLastChunk = rowIdx + rowsHere.length >= rows.length;

      const y0 = this.y;
      if (rowIdx > 0 || continued) {
        this.paint(y0, '(continued)', {
          size: 7,
          width: this.w,
          align: 'right',
          lineBreak: false,
        });
        this.y = y0 + 10;
      }

      const headerY = this.y;
      this.drawTableHeader(headerY);

      let cy = headerY + HDR_H;
      let bodyH = 0;
      rowsHere.forEach((row) => {
        const rh = this.rowHeight(row);
        this.drawTableRow(cy, row, rh);
        cy += rh;
        bodyH += rh;
      });

      const blockH = HDR_H + bodyH;
      this.strokeTableFrame(headerY, blockH);

      this.y = headerY + blockH + (isLastChunk ? GAP_BLOCK : 2);
      this.syncCursor();
      rowIdx += rowsHere.length;
    }
  }

  sectionTable(num, title, rows) {
    const label = num ? `${num}. ${title}` : title;
    const titleGap = 4;
    const titleH = this.measure(label, this.w, 9, true, true);
    const firstRowH = rows[0] ? this.rowHeight(rows[0]) : ROW_H;
    const minStart = titleH + titleGap + HDR_H + firstRowH;

    if (this.spaceLeft() < minStart) {
      this.addPage();
    }

    const titleY = this.y;
    const drawnTitleH = this.paint(titleY, label, { size: 9, bold: true, lineBreak: true });
    this.y = titleY + drawnTitleH + titleGap;
    this.syncCursor();

    this.formTable(rows);

    const tailGap = rows.length <= 2 ? GAP_BLOCK : GAP_SECTION;
    if (this.spaceLeft() > tailGap + 8) {
      this.sectionBreak(tailGap);
    } else {
      this.y += 2;
      this.syncCursor();
    }
  }
}

function buildForm16PdfContext(form16) {
  const b = form16.partB || {};
  const c = form16.partC || b.chapter6A || {};
  const d = form16.partD || b.taxComputation || {};
  const partA = form16.partA || {};
  const emp = form16.employeeDetails || partA.employee || partA;
  const isNew = String(d.taxRegime || 'new').toLowerCase() === 'new';
  const fy = safeStr(form16.financialYear);
  const ay = safeStr(form16.assessmentYear).replace(/^AY\s*/i, '');

  const salaryRows = [
    ['1', 'Salary as per section 17(1) (Gross)', b.grossSalary || 0],
    ['2', 'Basic', b.basic || 0],
    ['3', 'House Rent Allowance (HRA)', b.hra || 0],
    ['4', 'Other Allowances', Math.abs(Number(b.allowances) || 0)],
    ['5', 'Other Income reported', b.otherIncome || 0],
    ['6', 'Less: Exempt allowance u/s 10 (HRA etc.)', b.lessAllowances?.hraExemption || 0],
    ['7', 'Less: Standard deduction u/s 16(ia)', b.lessAllowances?.standardDeduction || 0],
    ['8', 'Less: Professional tax u/s 16(iii)', b.lessAllowances?.professionalTax || 0],
    ['9', 'Income chargeable under the head Salaries', b.incomeChargeableUnderSalaryHead || 0],
  ];

  const viaRows = [
    ['1', 'Deduction u/s 80C', c.section80C || 0],
    ['2', 'Deduction u/s 80D', c.section80D || 0],
    ['3', 'Deduction u/s 80E', c.section80E || 0],
    ['4', 'Deduction u/s 80G', c.section80G || 0],
    ['5', 'Deduction u/s 24(b) (Home loan interest)', c.section24 || 0],
    ['6', 'Total Chapter VI-A (declared)', c.total || 0],
  ];

  const taxRows = [[`1`, `Tax regime (${String(d.taxRegime || 'new').toUpperCase()})`, '—']];
  if (isNew) {
    taxRows.push(['', 'Note: New regime — Chapter VI-A not reduced from taxable income', '—']);
  }
  taxRows.push(
    ['2', 'Taxable income', d.taxableIncome || 0],
    ['3', 'Tax on total income', d.incomeTax || 0],
    ['4', 'Surcharge', d.surcharge || 0],
    ['5', 'Health & education cess', d.cess || 0],
    ['6', 'Rebate u/s 87A', d.rebate || 0],
    ['7', 'Net tax payable', d.netTax || 0],
    ['8', 'Monthly TDS (calculated)', d.monthlyTDS || 0]
  );

  const partEList = form16.partE || b.tdsMonthWise || [];
  const partERows = partEList.map((row, i) => [String(i + 1), `${row.month} ${row.year}`, row.tdsDeducted]);
  if (partERows.length === 0) partERows.push(['1', 'No TDS deducted in payroll', 0]);

  const quarterly = partA.quarterlyTds || [];
  const quarterRows = quarterly.map((q, i) => [
    String(i + 1),
    `${q.quarter} (${q.period})`,
    q.tdsDeducted || 0,
  ]);
  quarterRows.push(['', 'Total tax deducted (Financial Year)', form16.totalTDSDeducted || 0]);

  const periodFrom =
    partA.periodFrom || (form16.periodDescription ? form16.periodDescription.split(' to ')[0] : '—');
  const periodTo = partA.periodTo || (form16.periodDescription ? form16.periodDescription.split(' to ')[1] : '—');

  return {
    partA,
    emp,
    fy,
    ay,
    salaryRows,
    viaRows,
    taxRows,
    partERows,
    quarterRows,
    periodFrom,
    periodTo,
  };
}

function writeForm16CoverHeader(L, ctx) {
  L.centered(['FORM NO. 16'], { size: 14, bold: true, gap: 6 });
  L.centered(['[See rule 31(1)(a) of the Income-tax Rules, 1962]'], { size: 7.5, gap: 6 });
  L.centered([`Financial Year: ${ctx.fy}    |    Assessment Year: ${ctx.ay}`], {
    size: 9,
    bold: true,
    gap: 8,
  });
  L.sectionBreak(6);
}

function writeForm16PartA(L, form16, ctx) {
  L.partHeader('PART A', 'TDS Certificate — tax deducted at source (Section 203)');
  L.line('Certificate for tax deducted at source from income chargeable under the head "Salaries"', {
    size: 8,
    gapAfter: GAP_BLOCK,
  });

  L.drawDetailGrid([
    ['Name of Employer', form16.employerDetails?.name, 'Name of Employee', ctx.emp.employeeName],
    ['Address', form16.employerDetails?.address, 'PAN of Employee', ctx.emp.pan],
    ['TAN of Employer', form16.employerDetails?.tan, 'Employee Code', ctx.emp.employeeCode],
    ['PAN of Employer', form16.employerDetails?.pan, 'Designation', ctx.emp.designation],
    ['Period (with employer)', `${ctx.periodFrom} to ${ctx.periodTo}`, 'Assessment Year', ctx.ay],
  ]);

  L.sectionTable('', 'Summary of tax deducted (quarter-wise from payroll)', ctx.quarterRows);

  L.line(
    ctx.partA.tracesNote ||
      'For challan-wise Part A (BSR code, date of deposit), download from TRACES portal by the employer.',
    { size: 7, gapAfter: GAP_BLOCK }
  );
}

function writeForm16PartB(L, form16, ctx) {
  L.partHeader('PART B', 'Annexure — details of salary paid and tax computation');
  L.line('To be furnished to the employee by the employer under section 203 of the Income-tax Act, 1961', {
    size: 8,
    gapAfter: GAP_BLOCK,
  });

  L.sectionTable('1', 'Details of salary paid and any other income', ctx.salaryRows);
  L.sectionTable('2', 'Deductions under Chapter VI-A (as declared by employee)', ctx.viaRows);
  L.sectionTable('3', 'Computation of tax on income', ctx.taxRows);
  L.sectionTable('4', 'Details of tax deducted during the year (month-wise)', ctx.partERows);

  L.sectionBreak(6);
  L.line(`Total TDS deducted (must match Part A): Rs. ${formatInr(form16.totalTDSDeducted)}`, {
    size: 9,
    bold: true,
    gapAfter: GAP_BLOCK,
  });
}

function writeForm16GeneratedFooter(L, form16) {
  L.line(`Generated: ${new Date(form16.generatedOn).toLocaleString('en-IN')}`, {
    size: 7,
    align: 'right',
    lineBreak: false,
    gapAfter: 0,
  });
}

function buildForm16PdfPromise(title, render) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: title,
          Author: 'HRMS',
        },
      });

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const L = new Form16Layout(doc);
      render(L, doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function buildForm16PdfBuffer(form16) {
  const author = form16.employerDetails?.name || 'HRMS';
  return buildForm16PdfPromise(`Form 16 - ${form16.financialYear}`, (L, doc) => {
    doc.info.Author = author;
    const ctx = buildForm16PdfContext(form16);
    writeForm16CoverHeader(L, ctx);
    writeForm16PartA(L, form16, ctx);
    L.startPartB();
    writeForm16PartB(L, form16, ctx);
    L.line(
      'Part A (TRACES challan certificate) + Part B (this annexure) together form Form 16 for employee records.',
      { size: 7, gapAfter: GAP_LINE }
    );
    writeForm16GeneratedFooter(L, form16);
  });
}

function buildForm16PartAPdfBuffer(form16) {
  const author = form16.employerDetails?.name || 'HRMS';
  return buildForm16PdfPromise(`Form 16 Part A - ${form16.financialYear}`, (L, doc) => {
    doc.info.Author = author;
    const ctx = buildForm16PdfContext(form16);
    writeForm16CoverHeader(L, ctx);
    writeForm16PartA(L, form16, ctx);
    writeForm16GeneratedFooter(L, form16);
  });
}

function buildForm16PartBPdfBuffer(form16) {
  const author = form16.employerDetails?.name || 'HRMS';
  return buildForm16PdfPromise(`Form 16 Part B - ${form16.financialYear}`, (L, doc) => {
    doc.info.Author = author;
    const ctx = buildForm16PdfContext(form16);
    L.centered(['FORM NO. 16 — PART B'], { size: 14, bold: true, gap: 6 });
    L.centered([`Financial Year: ${ctx.fy}    |    Assessment Year: ${ctx.ay}`], {
      size: 9,
      bold: true,
      gap: 8,
    });
    L.sectionBreak(6);
    writeForm16PartB(L, form16, ctx);
    L.line('This annexure is Part B of Form 16. Download Part A separately for the TDS certificate.', {
      size: 7,
      gapAfter: GAP_LINE,
    });
    writeForm16GeneratedFooter(L, form16);
  });
}

module.exports = {
  buildForm16PdfBuffer,
  buildForm16PartAPdfBuffer,
  buildForm16PartBPdfBuffer,
  Form16Layout,
  formatInr,
  safeStr,
};
