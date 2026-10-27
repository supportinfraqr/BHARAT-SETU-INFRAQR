const PDFDocument = require('pdfkit');
const { Form16Layout, formatInr, safeStr } = require('./form16Pdf');

const GAP_BLOCK = 4;
const GAP_LINE = 6;

function buildTaxReportFilename(report) {
  const code = String(report?.employee?.employeeCode || 'employee').replace(/[^\w.-]+/g, '_');
  const fy = String(report?.financialYear || 'FY').replace(/[^\w.-]+/g, '_');
  return `TaxReport_${code}_${fy}.pdf`;
}

function buildTaxReportPdfBuffer(report) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: `Tax Report - ${report.financialYear || ''}`,
          Author: 'HRMS',
        },
      });

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const L = new Form16Layout(doc);
      const emp = report.employee || {};
      const fy = safeStr(report.financialYearLabel || report.financialYear);
      const ay = safeStr(report.assessmentYear);

      L.centered(['TAX REPORT'], { size: 14, bold: true, gap: 4 });
      L.centered(['Employee taxation summary'], { size: 8, gap: 4 });
      L.centered([`${fy}  |  ${ay}`], { size: 9, bold: true, gap: 6 });
      L.line(`Period: ${safeStr(report.periodDescription)}`, { size: 8, gapAfter: GAP_BLOCK });

      L.drawDetailGrid([
        ['Employee', emp.employeeName, 'Code', emp.employeeCode],
        ['PAN', emp.pan, 'Designation', emp.designation],
        ['Proof', safeStr(report.proofStatus?.proofStatus, 'pending'), 'TDS calculated', report.tdsCalculated ? 'Yes' : 'No'],
      ]);

      if (!report.tdsCalculated) {
        L.sectionBreak(8);
        L.line(safeStr(report.message, 'TDS not calculated for this financial year.'), {
          size: 9,
          bold: true,
          gapAfter: GAP_LINE,
        });
        L.line(`Generated: ${new Date(report.generatedOn).toLocaleString('en-IN')}`, {
          size: 7,
          align: 'right',
          lineBreak: false,
        });
        doc.end();
        return;
      }

      const s = report.summary || {};
      const inc = report.income || {};
      const tax = report.taxComputation || {};
      const ch6 = report.chapter6A;
      const isOld = String(s.taxRegime || '').toLowerCase() === 'old';

      L.sectionTable('', 'Summary', [
        ['1', 'Tax regime', s.taxRegimeLabel || s.taxRegime],
        ['2', 'Gross income (projected)', s.grossIncome || 0],
        ['3', 'Taxable income', s.taxableIncome || 0],
        ['4', 'Total tax payable', s.totalTax || 0],
        ['5', 'Monthly TDS', s.monthlyTDS || 0],
        ['6', 'TDS deducted (FY)', s.totalTDSDeducted || 0],
        ['7', 'Pending TDS', s.pendingTDS || 0],
      ]);

      L.sectionTable('1', 'Income (projected)', [
        ['1', 'Basic salary', inc.basic || 0],
        ['2', 'HRA', inc.hra || 0],
        ['3', 'Other allowances', Math.abs(Number(inc.allowances) || 0)],
        ['4', 'Other income', inc.otherIncome || 0],
        ['5', 'Gross salary', inc.grossSalary || 0],
        ['6', 'Standard deduction', inc.standardDeduction || 0],
        ['7', 'Professional tax', inc.professionalTax || 0],
        ['8', 'HRA exemption (old regime)', isOld ? inc.hraExemption || 0 : 0],
        ['9', 'Income from salary', inc.incomeFromSalary || 0],
      ]);

      if (isOld && ch6) {
        L.sectionTable('2', 'Chapter VI-A (declared)', [
          ['1', 'Section 80C', ch6.section80C || 0],
          ['2', 'Section 80D', ch6.section80D || 0],
          ['3', 'Section 80E', ch6.section80E || 0],
          ['4', 'Section 80G', ch6.section80G || 0],
          ['5', 'Section 24(b)', ch6.section24 || 0],
          ['6', 'Other deductions', ch6.otherDeductions || 0],
          ['7', 'Total Chapter VI-A', ch6.totalChapter6A || 0],
        ]);
      } else {
        L.sectionTable('2', 'Chapter VI-A', [
          ['1', 'Not applicable', 'New tax regime selected'],
        ]);
      }

      L.sectionTable('3', 'Tax computation', [
        ['1', 'Taxable income', tax.taxableIncome || 0],
        ['2', 'Income tax', tax.incomeTax || 0],
        ['3', 'Surcharge', tax.surcharge || 0],
        ['4', 'Health & education cess', tax.cess || 0],
        ['5', 'Rebate u/s 87A', tax.rebateAmount || 0],
        ['6', 'Net tax liability', tax.netTaxLiability || 0],
        ['7', 'Monthly TDS', tax.monthlyTDS || 0],
      ]);

      const monthWise = report.tdsDeductions?.monthWise || [];
      const tdsRows = monthWise.map((row, i) => [
        String(i + 1),
        `${row.month} ${row.year}`,
        row.tdsDeducted || 0,
      ]);
      if (tdsRows.length === 0) {
        tdsRows.push(['1', 'No TDS deducted in payroll yet', 0]);
      }

      L.sectionTable('4', 'TDS deducted (month-wise)', tdsRows);

      const quarterly = report.tdsDeductions?.quarterly || [];
      if (quarterly.length > 0) {
        const qRows = quarterly.map((q, i) => [
          String(i + 1),
          `${q.quarter} — ${q.period}`,
          q.tdsDeducted || 0,
        ]);
        L.sectionTable('5', 'TDS deducted (quarter-wise)', qRows);
      }

      const decl80C = report.declarations?.investments80C || [];
      if (decl80C.length > 0) {
        const rows80C = decl80C.map((line, i) => [
          String(i + 1),
          safeStr(line.investmentType, 'Investment'),
          line.amount || 0,
        ]);
        L.sectionTable('6', 'Investments — Section 80C', rows80C);
      }

      const decl80D = report.declarations?.investments80D || [];
      if (decl80D.length > 0) {
        const rows80D = decl80D.map((line, i) => [
          String(i + 1),
          safeStr(line.investmentType, 'Investment'),
          line.amount || 0,
        ]);
        L.sectionTable('7', 'Investments — Section 80D', rows80D);
      }

      L.sectionBreak(6);
      L.line(`Total TDS deducted: Rs. ${formatInr(report.tdsDeductions?.totalTDSDeducted)}`, {
        size: 9,
        bold: true,
        gapAfter: GAP_BLOCK,
      });
      L.line('For official certificate use Form 16 download.', { size: 7, gapAfter: GAP_LINE });
      L.line(`Generated: ${new Date(report.generatedOn).toLocaleString('en-IN')}`, {
        size: 7,
        align: 'right',
        lineBreak: false,
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  buildTaxReportPdfBuffer,
  buildTaxReportFilename,
};
