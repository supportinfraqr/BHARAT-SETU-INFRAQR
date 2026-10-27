const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');

const normalizeMonthValue = (month = '') => {
  const monthMap = {
    january: 'Jan',
    february: 'Feb',
    march: 'Mar',
    april: 'Apr',
    may: 'May',
    june: 'Jun',
    july: 'Jul',
    august: 'Aug',
    september: 'Sep',
    october: 'Oct',
    november: 'Nov',
    december: 'Dec',
    jan: 'Jan',
    feb: 'Feb',
    mar: 'Mar',
    apr: 'Apr',
    jun: 'Jun',
    jul: 'Jul',
    aug: 'Aug',
    sep: 'Sep',
    oct: 'Oct',
    nov: 'Nov',
    dec: 'Dec',
  };

  return monthMap[String(month).trim().toLowerCase()] || month;
};

const getBankAccountNumber = (employee = {}) => {
  return (
    employee?.bankInfo?.bankAccountNumber ||
    employee?.payrollInfo?.bankInfo?.bankAccountNumber ||
    employee?.payrollInfo?.bankDetails?.accountNumber ||
    ''
  );
};

const getBankIFSC = (employee = {}) => {
  return (
    employee?.bankInfo?.ifscCode ||
    employee?.payrollInfo?.bankInfo?.ifscCode ||
    employee?.payrollInfo?.bankDetails?.ifscCode ||
    ''
  );
};

/**
 * Generate Bank Transfer File (NEFT/RTGS Format)
 */
exports.generateBankFile = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { month, year, bankFormat, format } = req.body;
    const selectedFormat = String(bankFormat || format || 'NEFT').toUpperCase();
    const normalizedMonth = normalizeMonthValue(month);
    const { PayrollRunModel, OrganizationModel, BankFileRecordModel } = await initModels(org_uuid);

    if (!month || !year) {
      return sendResponse(res, 400, false, 'Month and year are required');
    }

    // Get all approved/processed payrolls
    const payrolls = await PayrollRunModel.find({
      organizationId: org_uuid,
      month: normalizedMonth,
      year: parseInt(year),
      payStatus: { $in: ['approved', 'paid'] },
    }).populate('employeeId', 'firstName lastName email payrollInfo.employeeCode payrollInfo.bankDetails bankInfo');

    if (payrolls.length === 0) {
      return sendResponse(res, 404, false, 'No approved payroll records found for this period');
    }

    const organization = await OrganizationModel?.findById(org_uuid);

    // Generate file based on format
    let fileContent = '';
    let fileName = '';

    switch (selectedFormat) {
      case 'NEFT':
        ({ fileContent, fileName } = generateNEFTFile(payrolls, organization, normalizedMonth, year));
        break;
      case 'RTGS':
        ({ fileContent, fileName } = generateRTGSFile(payrolls, organization, normalizedMonth, year));
        break;
      case 'CSV':
        ({ fileContent, fileName } = generateCSVFile(payrolls, normalizedMonth, year));
        break;
      default:
        return sendResponse(res, 400, false, 'Unsupported bank format');
    }

    const fileBuffer = Buffer.from(fileContent, 'utf-8');
    const bankFileRecord = await BankFileRecordModel.create({
      fileName,
      format: selectedFormat,
      month: normalizedMonth,
      year: parseInt(year),
      totalAmount: payrolls.reduce((sum, p) => sum + (p.netPay || 0), 0),
      employeeCount: payrolls.length,
      status: 'generated',
      mimeType: fileName.endsWith('.csv') ? 'text/csv' : 'text/plain',
      size: fileBuffer.length,
      content: fileBuffer,
    });

    return sendResponse(res, 200, true, 'Bank file generated successfully', {
      fileId: bankFileRecord._id,
      fileName,
      format: selectedFormat,
      month: normalizedMonth,
      year: parseInt(year),
      totalRecords: payrolls.length,
      employeeCount: payrolls.length,
      totalAmount: bankFileRecord.totalAmount,
      status: 'generated',
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Generate CSV Format
 */
function generateCSVFile(payrolls, month, year) {
  const fileName = `Salary_${month}_${year}_${Date.now()}.csv`;

  let csv = 'Employee Name,Employee Code,Bank Account,IFSC Code,Net Pay,Email\n';

  payrolls.forEach((payroll) => {
    const emp = payroll.employeeId;
    const name = `${emp.firstName} ${emp.lastName}`;
    const code = emp.payrollInfo?.employeeCode || '';
    const account = getBankAccountNumber(emp);
    const ifsc = getBankIFSC(emp);
    const netPay = payroll.netPay || 0;
    const email = emp.email || '';

    csv += `"${name}","${code}","${account}","${ifsc}",${netPay},"${email}"\n`;
  });

  return { fileContent: csv, fileName };
}

/**
 * Generate NEFT Format (Standard Format)
 */
function generateNEFTFile(payrolls, organization, month, year) {
  const fileName = `NEFT_${month}_${year}_${Date.now()}.txt`;

  let content = '';
  
  // Header
  content += '====== NEFT SALARY PAYMENT FILE ======\n';
  content += `Organization: ${organization?.name || 'N/A'}\n`;
  content += `Period: ${month} ${year}\n`;
  content += `Generated: ${new Date().toLocaleDateString()}\n`;
  content += '=====================================\n\n';

  let totalAmount = 0;
  let recordCount = 0;

  payrolls.forEach((payroll, index) => {
    const emp = payroll.employeeId;
    const beneficiaryName = `${emp.firstName} ${emp.lastName}`.toUpperCase();
    const accountNumber = getBankAccountNumber(emp);
    const ifscCode = getBankIFSC(emp);
    const amount = payroll.netPay || 0;

    if (accountNumber && ifscCode && amount > 0) {
      recordCount++;
      totalAmount += amount;

      content += `Record ${recordCount}:\n`;
      content += `  Beneficiary Name: ${beneficiaryName}\n`;
      content += `  Account Number: ${accountNumber}\n`;
      content += `  IFSC Code: ${ifscCode}\n`;
      content += `  Amount: ${amount.toFixed(2)}\n`;
      content += `  Remarks: Salary for ${month} ${year}\n`;
      content += `  ---\n`;
    }
  });

  content += '\n=====================================\n';
  content += `Total Records: ${recordCount}\n`;
  content += `Total Amount: ${totalAmount.toFixed(2)}\n`;
  content += '=====================================\n';

  return { fileContent: content, fileName };
}

/**
 * Generate RTGS Format
 */
function generateRTGSFile(payrolls, organization, month, year) {
  const fileName = `RTGS_${month}_${year}_${Date.now()}.txt`;

  let content = '';
  
  // Header
  content += '====== RTGS SALARY PAYMENT FILE ======\n';
  content += `Organization: ${organization?.name || 'N/A'}\n`;
  content += `Period: ${month} ${year}\n`;
  content += `Generated: ${new Date().toLocaleDateString()}\n`;
  content += '======================================\n\n';

  let totalAmount = 0;
  let recordCount = 0;

  // RTGS is for amounts > 2 lakhs
  const rtgsPayrolls = payrolls.filter(p => (p.netPay || 0) >= 200000);

  rtgsPayrolls.forEach((payroll, index) => {
    const emp = payroll.employeeId;
    const beneficiaryName = `${emp.firstName} ${emp.lastName}`.toUpperCase();
    const accountNumber = getBankAccountNumber(emp);
    const ifscCode = getBankIFSC(emp);
    const amount = payroll.netPay || 0;

    if (accountNumber && ifscCode && amount > 0) {
      recordCount++;
      totalAmount += amount;

      content += `Record ${recordCount}:\n`;
      content += `  Beneficiary Name: ${beneficiaryName}\n`;
      content += `  Account Number: ${accountNumber}\n`;
      content += `  IFSC Code: ${ifscCode}\n`;
      content += `  Amount: ${amount.toFixed(2)}\n`;
      content += `  Payment Mode: RTGS\n`;
      content += `  Remarks: Salary for ${month} ${year}\n`;
      content += `  ---\n`;
    }
  });

  content += '\n======================================\n';
  content += `Total Records: ${recordCount}\n`;
  content += `Total Amount: ${totalAmount.toFixed(2)}\n`;
  content += '======================================\n';

  return { fileContent: content, fileName };
}

/**
 * Get Bank File History
 */
exports.getBankFileHistory = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { BankFileRecordModel } = await initModels(org_uuid);
    const files = await BankFileRecordModel.find({})
      .select('-content')
      .sort({ createdAt: -1 })
      .lean();

    if (files.length === 0) {
      return sendResponse(res, 200, true, 'No bank files found', []);
    }

    const fileList = files.map((file) => ({
      fileId: file._id,
      fileName: file.fileName,
      createdAt: file.createdAt,
      size: file.size || 0,
      month: file.month || '',
      year: file.year || '',
      format: file.format || 'UNKNOWN',
      totalAmount: file.totalAmount || 0,
      employeeCount: file.employeeCount || 0,
      status: file.status || 'generated',
    }));

    return sendResponse(res, 200, true, 'Bank files fetched successfully', fileList);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Download Bank File
 */
exports.downloadBankFile = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { fileId } = req.params;
    const { BankFileRecordModel } = await initModels(org_uuid);
    const fileRecord = await BankFileRecordModel.findById(fileId);

    if (!fileRecord) {
      return sendResponse(res, 404, false, 'File not found');
    }

    res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.fileName}"`);
    return res.send(fileRecord.content);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Delete Bank File
 */
exports.deleteBankFile = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { fileId } = req.params;
    const { BankFileRecordModel } = await initModels(org_uuid);
    const deleted = await BankFileRecordModel.findByIdAndDelete(fileId);

    if (!deleted) {
      return sendResponse(res, 404, false, 'File not found');
    }

    return sendResponse(res, 200, true, 'Bank file deleted successfully');
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Validate Bank Details Before File Generation
 */
exports.validateBankDetails = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { month, year } = req.query;
    const { PayrollRunModel } = await initModels(org_uuid);

    if (!month || !year) {
      return sendResponse(res, 400, false, 'Month and year are required');
    }

    const normalizedMonth = normalizeMonthValue(month);

    const payrolls = await PayrollRunModel.find({
      organizationId: org_uuid,
      month: normalizedMonth,
      year: parseInt(year),
      payStatus: { $in: ['approved', 'paid'] },
    }).populate('employeeId', 'firstName lastName email payrollInfo.bankDetails bankInfo');

    const validation = {
      total: payrolls.length,
      valid: 0,
      invalid: 0,
      issues: [],
    };

    payrolls.forEach((payroll) => {
      const emp = payroll.employeeId;
      const accountNumber = getBankAccountNumber(emp);
      const ifscCode = getBankIFSC(emp);

      if (!accountNumber || !ifscCode) {
        validation.invalid++;
        validation.issues.push({
          employeeId: emp._id,
          name: `${emp.firstName} ${emp.lastName}`,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          email: emp.email,
          type: 'bank_details',
          message: 'Missing or incomplete bank details',
          issue: 'Missing or incomplete bank details',
        });
      } else {
        validation.valid++;
      }
    });

    return sendResponse(res, 200, true, 'Bank details validation completed', {
      ...validation,
      totalEmployees: validation.total,
      validRecords: validation.valid,
      invalidRecords: validation.invalid,
      month: normalizedMonth,
      year: parseInt(year),
    });
  } catch (err) {
    return handleError(res, err);
  }
};
