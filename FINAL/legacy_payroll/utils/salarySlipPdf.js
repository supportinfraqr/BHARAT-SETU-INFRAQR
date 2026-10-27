const PDFDocument = require('pdfkit');
const axios = require('axios');

const COLORS = {
  title: '#0f172a',
  muted: '#475569',
  orgName: '#0b1324',
  pageBg: '#ffffff',
  tableHeaderBg: '#dbeafe',
  borderStrong: '#2563eb',
  rowLine: '#bfdbfe',
  grossBg: '#eff6ff',
  netBg: '#dbeafe',
};

function formatInr(amount) {
  const n = Number(amount) || 0;

  return `Rs. ${n.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
}

function safeStr(v, fallback = 'N/A') {
  if (v === undefined || v === null || v === '') {
    return fallback;
  }

  return String(v);
}

function normalizePayslipLine(item, defaultName = 'Component') {
  const amount = Number(item?.amount) || 0;
  return {
    componentName: item?.componentName || item?.name || defaultName,
    fixedAmount: Number.isFinite(Number(item?.fixedAmount))
      ? Number(item.fixedAmount)
      : amount,
    amount,
    calculationType: item?.calculationType || '',
  };
}

/** Earnings column: basic earnings + benefits + reimbursements (payslip display order). */
function mergePayslipEarningsColumn(earnings = [], benefits = [], reimbursements = []) {
  return [
    ...(earnings || []).map((e) => normalizePayslipLine(e, 'Earning')),
    ...(benefits || []).map((b) => normalizePayslipLine(b, 'Benefit')),
    ...(reimbursements || []).map((r) => normalizePayslipLine(r, 'Reimbursement')),
  ];
}

function formatOrganizationAddress(address) {
  if (!address) return '';

  if (typeof address === 'string') {
    return address.trim();
  }

  if (typeof address === 'object') {
    const parts = [
      address.address1,
      address.address2,
      address.city,
      address.state,
      address.country,
      address.zip,
    ]
      .filter(
        (v) =>
          v !== undefined &&
          v !== null &&
          String(v).trim() !== ''
      )
      .map((v) => String(v).trim());

    const seen = new Set();

    return parts
      .filter((v) => {
        const key = v.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .join(', ');
  }

  return '';
}

async function getImageBuffer(url) {
  try {
    if (!url) return null;

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data, 'binary');
  } catch (err) {
    console.log('IMAGE ERROR =>', err.message);
    return null;
  }
}

async function buildSalarySlipPdfBuffer(opts) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        info: {
          Title: 'Salary Slip',
          Author: opts.organizationName || 'HRMS',
        },
      });

      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', reject);

      const pageLeft = doc.page.margins.left;
      const pageRight =
        doc.page.width - doc.page.margins.right;

      const contentW = pageRight - pageLeft;

      let y = doc.page.margins.top;

      // Background
      doc
        .rect(
          0,
          0,
          doc.page.width,
          doc.page.height
        )
        .fill(COLORS.pageBg);

      // LOGO (loaded first so the header card can be sized around it)
      let logoBuffer = null;

      if (opts.organizationLogo) {
        logoBuffer = await getImageBuffer(
          opts.organizationLogo
        );
      }

      const logoSize = 50;

      const headerTextX = logoBuffer
        ? pageLeft + 90
        : pageLeft + 20;

      const headerTextW =
        contentW -
        (headerTextX - pageLeft) -
        20;

      const orgName = safeStr(opts.organizationName);

      const orgAddressLine =
        formatOrganizationAddress(
          opts.organizationAddress
        );

      // Header Card (height grows with the org name / address)
      const headerPadY = 14;
      const headerTextGap = 6;

      const orgNameMaxLines = 2;
      const orgAddressMaxLines = 8;

      doc.font('Helvetica-Bold').fontSize(18);

      const orgNameH = Math.min(
        doc.heightOfString(orgName, {
          width: headerTextW,
        }),
        doc.currentLineHeight(true) * orgNameMaxLines
      );

      let orgAddressH = 0;

      if (orgAddressLine) {
        doc.font('Helvetica').fontSize(9.5);

        orgAddressH = Math.min(
          doc.heightOfString(orgAddressLine, {
            width: headerTextW,
          }),
          doc.currentLineHeight(true) * orgAddressMaxLines
        );
      }

      const headerCardH = Math.max(
        80,
        headerPadY * 2 + logoSize,
        headerPadY * 2 +
          orgNameH +
          (orgAddressH
            ? headerTextGap + orgAddressH
            : 0)
      );

      doc
        .roundedRect(
          pageLeft,
          y,
          contentW,
          headerCardH,
          10
        )
        .fillAndStroke('#f8fafc', '#d1d5db');

      if (logoBuffer) {
        try {
          doc.image(
            logoBuffer,
            pageLeft + 15,
            y + (headerCardH - logoSize) / 2,
            {
              fit: [logoSize, logoSize],
              align: 'center',
              valign: 'center',
            }
          );
        } catch (err) {
          console.log(
            'Logo render failed:',
            err.message
          );
        }
      }

      const headerTextY =
        y +
        (headerCardH -
          (orgNameH +
            (orgAddressH
              ? headerTextGap + orgAddressH
              : 0))) /
          2;

      // Organization Name
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(COLORS.orgName)
        .text(orgName, headerTextX, headerTextY, {
          width: headerTextW,
          height: orgNameH,
          ellipsis: true,
        });

      // Organization Address
      if (orgAddressLine) {
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor(COLORS.muted)
          .text(
            orgAddressLine,
            headerTextX,
            headerTextY + orgNameH + headerTextGap,
            {
              width: headerTextW,
              height: orgAddressH,
              ellipsis: true,
            }
          );
      }

      // Divider
      doc
        .moveTo(pageLeft, y + headerCardH + 15)
        .lineTo(pageRight, y + headerCardH + 15)
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .stroke();

      y += headerCardH + 35;

      // Employee Info
      const infoLabelW = 105;
      const infoGap = 24;

      const infoValW =
        (contentW -
          infoGap -
          infoLabelW * 2) /
        2;

      const infoLeftX = pageLeft;

      const infoRightX =
        pageLeft +
        infoLabelW +
        infoValW +
        infoGap;

      const paidDays = Number(opts.paidDays);
      const hasAttendanceDays = Number.isFinite(paidDays);

      const infoRows = [
        {
          left: ['Period', opts.payPeriodLabel],
          right: [
            'Generated',
            new Date().toLocaleDateString('en-GB'),
          ],
        },
        {
          left: ['Employee Name', opts.employeeName],
          right: ['PAN', opts.pan],
        },
        {
          left: ['Employee ID', opts.employeeCode],
          right: ['Bank Name', opts.bankName],
        },
        {
          left: ['Department', opts.department],
          right: null,
        },
        {
          left: [
            'Bank A/C No.',
            opts.bankAccountNumber,
          ],
          right: null,
        },
      ];

      if (hasAttendanceDays) {
        infoRows.push({
          left: [
            'Paid Days',
            Number.isFinite(paidDays) ? String(paidDays) : 'N/A',
          ],
          right: null,
        });
      }

      infoRows.forEach((row, idx) => {
        const rowY = y + idx * 18;

        if (row.left) {
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor(COLORS.muted)
            .text(
              `${row.left[0]} :`,
              infoLeftX,
              rowY,
              {
                width: infoLabelW,
              }
            );

          doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor(COLORS.title)
            .text(
              safeStr(row.left[1]),
              infoLeftX + infoLabelW,
              rowY,
              {
                width: infoValW - 6,
              }
            );
        }

        if (row.right) {
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor(COLORS.muted)
            .text(
              `${row.right[0]} :`,
              infoRightX,
              rowY,
              {
                width: infoLabelW - 8,
              }
            );

          doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor(COLORS.title)
            .text(
              safeStr(row.right[1]),
              infoRightX + infoLabelW,
              rowY,
              {
                width: infoValW - 6,
              }
            );
        }
      });

      y += infoRows.length * 18 + 20;

      // Earnings & Deductions (benefits shown under Earning column)
      const earningsItems = mergePayslipEarningsColumn(
        opts.earnings,
        opts.benefits,
        opts.reimbursements
      );

      const deductionsItems = (opts.deductions || [])
        .map((item) => normalizePayslipLine(item, 'Deduction'))
        .filter(
          (item) =>
            !/^(loss\s*of\s*pay|lop)$/i.test(String(item.componentName).trim())
        );
      const fixedSalaryTotal = earningsItems.reduce(
        (sum, item) => sum + (Number(item.fixedAmount) || 0),
        0
      );
      const displayTotalDeductions = deductionsItems.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
      );
      const displayNetPay =
        (Number(opts.grossEarnings) || 0) - displayTotalDeductions;

      const tableX = pageLeft;
      const tableY = y;
      const tableW = contentW;

      const earningsSectionW = tableW * 0.58;
      const deductionsSectionW = tableW - earningsSectionW;
      const earningNameW = earningsSectionW * 0.46;
      const fixedSalaryW = earningsSectionW * 0.27;
      const earnedSalaryW = earningsSectionW - earningNameW - fixedSalaryW;
      const deductionNameW = deductionsSectionW * 0.62;
      const deductionAmountW = deductionsSectionW - deductionNameW;

      const rowH = 28;
      const tableHeaderH = 34;

      const dataRows = Math.max(
        earningsItems.length,
        deductionsItems.length,
        4
      );

      const totalH = 30;

      const tableH =
        tableHeaderH +
        dataRows * rowH +
        totalH;

      // Outer Border
      doc
        .lineWidth(1.2)
        .strokeColor(COLORS.borderStrong)
        .rect(
          tableX,
          tableY,
          tableW,
          tableH
        )
        .stroke();

      // Header BG
      doc
        .rect(
          tableX,
          tableY,
          tableW,
          tableHeaderH
        )
        .fill(COLORS.tableHeaderBg);

      const v1 = tableX + earningNameW;
      const v2 = v1 + fixedSalaryW;
      const v3 = tableX + earningsSectionW;
      const v4 = v3 + deductionNameW;

      [v1, v2, v3, v4].forEach((xPos) => {
        doc
          .moveTo(xPos, tableY)
          .lineTo(xPos, tableY + tableH)
          .strokeColor(COLORS.borderStrong)
          .lineWidth(1)
          .stroke();
      });

      // Horizontal Lines
      for (let i = 0; i <= dataRows; i++) {
        const ry =
          tableY +
          tableHeaderH +
          i * rowH;

        doc
          .moveTo(tableX, ry)
          .lineTo(tableX + tableW, ry)
          .strokeColor(COLORS.rowLine)
          .lineWidth(0.8)
          .stroke();
      }

      // Headers
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.title)
        .text(
          'Earning',
          tableX,
          tableY + 10,
          {
            width: earningNameW,
            align: 'center',
          }
        );

      doc.text(
        'Fixed Salary',
        v1,
        tableY + 10,
        {
          width: fixedSalaryW,
          align: 'center',
        }
      );

      doc.text(
        'Earned Salary',
        v2,
        tableY + 10,
        {
          width: earnedSalaryW,
          align: 'center',
        }
      );

      doc.text(
        'Deductions',
        v3,
        tableY + 10,
        {
          width: deductionNameW,
          align: 'center',
        }
      );

      doc.text(
        'Amount (INR)',
        v4,
        tableY + 10,
        {
          width: deductionAmountW,
          align: 'center',
        }
      );

      // Table Rows
      for (let i = 0; i < dataRows; i++) {
        const rowY =
          tableY +
          tableHeaderH +
          i * rowH +
          9;

        const eRow = earningsItems[i];
        const dRow = deductionsItems[i];

        const eName = eRow
          ? eRow.componentName ||
            eRow.name ||
            'Component'
          : '';

        const dName = dRow
          ? dRow.componentName ||
            dRow.name ||
            'Component'
          : '';

        const eFixedAmt = eRow
          ? formatInr(eRow.fixedAmount)
          : '';

        const eEarnedAmt = eRow
          ? formatInr(eRow.amount)
          : '';

        const dAmt = dRow
          ? formatInr(dRow.amount)
          : '';

        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor(COLORS.title)
          .text(
            eName,
            tableX + 6,
            rowY,
            {
              width: earningNameW - 12,
            }
          );

        doc.text(
          eFixedAmt,
          v1 + 6,
          rowY,
          {
            width: fixedSalaryW - 12,
            align: 'right',
          }
        );

        doc.text(
          eEarnedAmt,
          v2 + 6,
          rowY,
          {
            width: earnedSalaryW - 12,
            align: 'right',
          }
        );

        doc.text(
          dName,
          v3 + 6,
          rowY,
          {
            width: deductionNameW - 12,
          }
        );

        doc.text(
          dAmt,
          v4 + 6,
          rowY,
          {
            width: deductionAmountW - 12,
            align: 'right',
          }
        );
      }

      // Totals
      const totalY =
        tableY +
        tableHeaderH +
        dataRows * rowH;

      doc
        .rect(
          tableX,
          totalY,
          earningsSectionW,
          totalH
        )
        .fill(COLORS.grossBg);

      doc
        .rect(
          v3,
          totalY,
          deductionsSectionW,
          totalH
        )
        .fill(COLORS.grossBg);

      doc
        .rect(
          tableX,
          totalY,
          tableW,
          totalH
        )
        .strokeColor(COLORS.borderStrong)
        .lineWidth(1)
        .stroke();

      doc
        .moveTo(v1, totalY)
        .lineTo(v1, totalY + totalH)
        .moveTo(v2, totalY)
        .lineTo(v2, totalY + totalH)
        .moveTo(v3, totalY)
        .lineTo(v3, totalY + totalH)
        .moveTo(v4, totalY)
        .lineTo(v4, totalY + totalH)
        .strokeColor(COLORS.borderStrong)
        .lineWidth(1)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor(COLORS.title)
        .text(
          'Gross Total',
          tableX + 6,
          totalY + 10,
          {
            width: earningNameW - 12,
          }
        );

      doc.text(
        formatInr(fixedSalaryTotal),
        v1 + 6,
        totalY + 10,
        {
          width: fixedSalaryW - 12,
          align: 'right',
        }
      );

      doc.text(
        formatInr(opts.grossEarnings),
        v2 + 6,
        totalY + 10,
        {
          width: earnedSalaryW - 12,
          align: 'right',
        }
      );

      doc.text(
        'Total Deductions',
        v3 + 6,
        totalY + 10,
        {
          width: deductionNameW - 12,
        }
      );

      doc.text(
        formatInr(displayTotalDeductions),
        v4 + 6,
        totalY + 10,
        {
          width: deductionAmountW - 12,
          align: 'right',
        }
      );

      y = totalY + totalH + 12;

      // Net Salary
      const netX = pageLeft + earningsSectionW;
      const netW = deductionsSectionW;
      const netH = 34;

      doc
        .rect(netX, y, netW, netH)
        .fill(COLORS.netBg)
        .strokeColor(COLORS.borderStrong)
        .lineWidth(1)
        .stroke();

      doc
        .moveTo(netX + deductionNameW, y)
        .lineTo(
          netX + deductionNameW,
          y + netH
        )
        .strokeColor(COLORS.borderStrong)
        .lineWidth(1)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(COLORS.title)
        .text(
          'Net Salary',
          netX + 6,
          y + 10,
          {
            width: deductionNameW - 12,
          }
        );

      doc.text(
        formatInr(displayNetPay),
        netX + deductionNameW + 6,
        y + 10,
        {
          width: deductionAmountW - 12,
          align: 'right',
        }
      );

      y += netH + 14;

      // Footer
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(
          'Computer generated salary slip',
          pageLeft,
          y,
          {
            width: contentW,
            align: 'right',
          }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  buildSalarySlipPdfBuffer,
  formatInr,
  mergePayslipEarningsColumn,
};