const csv = require('csv-parser');
const xlsx = require('xlsx');
const { Readable } = require('stream');

async function parsePayrollImportFile(file) {
  if (!file?.buffer) {
    throw new Error('No file uploaded');
  }

  if (file.mimetype === 'text/csv') {
    const rows = await new Promise((resolve, reject) => {
      const results = [];
      Readable.from(file.buffer)
        .pipe(csv())
        .on('data', (row) => results.push(row))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
    return rows;
  }

  if (
    file.mimetype.includes('excel') ||
    file.mimetype.includes('spreadsheet') ||
    file.originalname?.endsWith('.xlsx') ||
    file.originalname?.endsWith('.xls')
  ) {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    // defval: '' keeps blank cells as keys so we can treat blank component columns intentionally
    return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  }

  throw new Error('Invalid file type. Upload CSV or Excel (.xlsx)');
}

function normalizeImportRowKeys(row = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    const k = String(key || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    normalized[k] = value;
  }
  return normalized;
}

function pickRowValue(row, keys = []) {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

/** Keep original Excel type (boolean/number/string) for TRUE/FALSE cells. */
function pickRawRowValue(row, keys = []) {
  for (const key of keys) {
    if (!(key in row)) continue;
    const val = row[key];
    if (val === undefined || val === null) continue;
    if (typeof val === 'string' && val.trim() === '') continue;
    return val;
  }
  return undefined;
}

function mapImportRow(rawRow, rowNumber) {
  const row = normalizeImportRowKeys(rawRow);

  const employeeCode = pickRowValue(row, [
    'employee_code',
    'employeecode',
    'unique_id',
    'uniqueid',
    'employee_id',
    'employeeid',
  ]);

  const categoryRaw = pickRowValue(row, [
    'component_category',
    'componentcategory',
    'category',
  ]).toLowerCase();

  const componentCode = pickRowValue(row, [
    'component_code',
    'componentcode',
    'code',
  ]);

  const componentName = pickRowValue(row, [
    'component_name',
    'componentname',
    'name',
  ]);

  const amountRaw = pickRowValue(row, ['amount', 'overrideamount', 'value']);
  const amount = Number(amountRaw);
  const remarks = pickRowValue(row, ['remarks', 'remark', 'notes']);

  let category = categoryRaw;
  if (category === 'earning') category = 'earnings';
  if (category === 'deduction') category = 'deductions';
  if (category === 'benefit') category = 'benefits';

  return {
    rowNumber,
    employeeCode,
    category,
    componentCode,
    componentName,
    amount: Number.isFinite(amount) ? amount : NaN,
    remarks,
  };
}

function parseOptionalImportNumber(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const raw = String(value).trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[₹$€,\s]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : NaN;
}

/** Template / org headers like "Basic Salary", "BASIC", "Basic Pay". */
function isBasicImportHeader(key = '') {
  const k = String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!k) return false;
  return (
    k === 'basic' ||
    k === 'base' ||
    k === 'basesalary' ||
    k === 'basicsalary' ||
    k === 'basicpay' ||
    k === 'newbasic' ||
    k === 'newbasicsalary' ||
    k === 'newbasicpay'
  );
}

function pickBasicSalaryFromRow(row = {}) {
  const fromKnown = parseOptionalImportNumber(
    pickRawRowValue(row, [
      'basic_salary',
      'basicsalary',
      'basic',
      'base_salary',
      'basesalary',
      'base',
      'basic_pay',
      'basicpay',
      'new_basic',
      'newbasic',
    ])
  );
  if (fromKnown !== null && Number.isFinite(fromKnown)) return fromKnown;

  for (const [key, value] of Object.entries(row)) {
    if (!isBasicImportHeader(key)) continue;
    const num = parseOptionalImportNumber(value);
    if (num !== null && Number.isFinite(num)) return num;
  }
  return null;
}

/** Fixed salary-revision columns — anything else with a number is treated as a component amount. */
const KNOWN_SALARY_REVISION_COLUMNS = new Set([
  'employee_code',
  'employeecode',
  'unique_id',
  'uniqueid',
  'employee_id',
  'employeeid',
  'revision_type',
  'revisiontype',
  'type',
  'gross_salary',
  'grosssalary',
  'gross',
  'ctc',
  'annual_ctc',
  'annualctc',
  'state',
  'pt_state',
  'ptstate',
  'tax_regime',
  'taxregime',
  'payment_frequency',
  'paymentfrequency',
  'frequency',
  'effective_from',
  'effectivefrom',
  'salary_effective_from',
  'salaryeffectivefrom',
  'arrears_applicable',
  'arrearsapplicable',
  'arrears_from',
  'arrearsfrom',
  'arrears_from_date',
  'arrearsfromdate',
  'auto_approve',
  'autoapprove',
  'auto_implement',
  'autoimplement',
  'remarks',
  'remark',
  'notes',
  // Legacy salary input / Basic (Option B — not treated as sticky component override)
  'base_salary',
  'basesalary',
  'basic_salary',
  'basicsalary',
  'basic',
  'basic_pay',
  'basicpay',
  'new_basic',
  'newbasic',
  // Statutory enable/disable (true/false) — not component amounts
  'epf',
  'epf_applicable',
  'epfapplicable',
  'pf',
  'pf_on_actuals',
  'pfonactuals',
  'contribute_pf_on_actuals',
  'contributepfonactuals',
  'epf_on_actuals',
  'epfonactuals',
  'pf_actuals',
  'pfactuals',
  'esi',
  'esic',
  'esi_applicable',
  'esicapplicable',
  'esiapplicable',
  'esic_applicable',
  'lwf',
  'lwf_applicable',
  'lwfapplicable',
  'pt',
  'professional_tax',
  'professionaltax',
  'pt_applicable',
  'ptapplicable',
]);

/**
 * Collect dynamic component columns from the Excel/CSV row.
 * - number present → amount override
 * - column present but blank → intentional blank (reset to org default)
 */
function extractComponentInputsFromRow(normalizedRow = {}) {
  const componentAmounts = {};
  const blankComponentHeaders = [];

  for (const [key, value] of Object.entries(normalizedRow)) {
    if (KNOWN_SALARY_REVISION_COLUMNS.has(key) || isBasicImportHeader(key)) continue;

    // Never treat Excel booleans / non-numeric as component amounts
    if (typeof value === 'boolean') continue;

    if (value === undefined || value === null || String(value).trim() === '') {
      blankComponentHeaders.push(key);
      continue;
    }

    const num = Number(value);
    if (!Number.isFinite(num)) continue;

    componentAmounts[key] = num;
  }

  return { componentAmounts, blankComponentHeaders };
}

/** @deprecated use extractComponentInputsFromRow */
function extractComponentAmountsFromRow(normalizedRow = {}) {
  return extractComponentInputsFromRow(normalizedRow).componentAmounts;
}

function parseOptionalImportBoolean(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  if (['true', 'yes', 'y', '1'].includes(raw)) return true;
  if (['false', 'no', 'n', '0'].includes(raw)) return false;
  return null;
}

function mapSalaryRevisionRow(rawRow, rowNumber) {
  const row = normalizeImportRowKeys(rawRow);

  const employeeCode = pickRowValue(row, [
    'employee_code',
    'employeecode',
    'unique_id',
    'uniqueid',
    'employee_id',
    'employeeid',
  ]);

  const revisionTypeRaw = pickRowValue(row, [
    'revision_type',
    'revisiontype',
    'type',
  ]);

  const grossSalaryRaw = pickRowValue(row, ['gross_salary', 'grosssalary', 'gross']);
  const basicSalaryRaw = pickBasicSalaryFromRow(row);
  const ctcRaw = pickRowValue(row, ['ctc', 'annual_ctc', 'annualctc']);
  const state = pickRowValue(row, ['state', 'pt_state', 'ptstate']);
  const taxRegimeRaw = pickRowValue(row, ['tax_regime', 'taxregime']);
  const paymentFrequencyRaw = pickRowValue(row, [
    'payment_frequency',
    'paymentfrequency',
    'frequency',
  ]);
  const effectiveFrom = pickRowValue(row, [
    'effective_from',
    'effectivefrom',
    'salary_effective_from',
    'salaryeffectivefrom',
  ]);
  const autoApproveRaw = pickRawRowValue(row, ['auto_approve', 'autoapprove']);
  const autoImplementRaw = pickRawRowValue(row, ['auto_implement', 'autoimplement']);
  const remarks = pickRowValue(row, ['remarks', 'remark', 'notes']);

  const epfRaw = pickRawRowValue(row, ['epf', 'epf_applicable', 'epfapplicable', 'pf']);
  const pfOnActualsRaw = pickRawRowValue(row, [
    'pf_on_actuals',
    'pfonactuals',
    'contribute_pf_on_actuals',
    'contributepfonactuals',
    'epf_on_actuals',
    'epfonactuals',
    'pf_actuals',
    'pfactuals',
  ]);
  const esiRaw = pickRawRowValue(row, [
    'esic',
    'esi',
    'esi_applicable',
    'esic_applicable',
    'esiapplicable',
    'esicapplicable',
  ]);
  const lwfRaw = pickRawRowValue(row, ['lwf', 'lwf_applicable', 'lwfapplicable']);
  const ptRaw = pickRawRowValue(row, [
    'professionaltax',
    'professional_tax',
    'pt',
    'pt_applicable',
    'ptapplicable',
  ]);

  const arrearsApplicableRaw = pickRawRowValue(row, [
    'arrears_applicable',
    'arrearsapplicable',
  ]);
  const arrearsFrom = pickRowValue(row, [
    'arrears_from',
    'arrearsfrom',
    'arrears_from_date',
    'arrearsfromdate',
  ]);

  const grossSalary = Number(grossSalaryRaw);
  const baseSalary = parseOptionalImportNumber(basicSalaryRaw);
  const ctcInput = parseOptionalImportNumber(ctcRaw);

  let taxRegime = taxRegimeRaw;
  if (taxRegime) {
    const normalized = taxRegime.toLowerCase();
    if (normalized === 'old') taxRegime = 'Old';
    else if (normalized === 'new') taxRegime = 'New';
  }

  let paymentFrequency = paymentFrequencyRaw;
  if (paymentFrequency) {
    const normalized = paymentFrequency.toLowerCase();
    if (normalized === 'monthly') paymentFrequency = 'Monthly';
    else if (normalized === 'bi-weekly' || normalized === 'biweekly') paymentFrequency = 'Bi-Weekly';
    else if (normalized === 'weekly') paymentFrequency = 'Weekly';
  }

  const { componentAmounts, blankComponentHeaders } = extractComponentInputsFromRow(row);

  const statutoryFlags = {};
  const epfFlag = parseOptionalImportBoolean(epfRaw);
  const pfOnActualsFlag = parseOptionalImportBoolean(pfOnActualsRaw);
  const esiFlag = parseOptionalImportBoolean(esiRaw);
  const lwfFlag = parseOptionalImportBoolean(lwfRaw);
  const ptFlag = parseOptionalImportBoolean(ptRaw);
  if (epfFlag !== null) statutoryFlags.epfApplicable = epfFlag;
  if (pfOnActualsFlag !== null) statutoryFlags.pfOnActuals = pfOnActualsFlag;
  if (esiFlag !== null) statutoryFlags.esiApplicable = esiFlag;
  if (lwfFlag !== null) statutoryFlags.lwfApplicable = lwfFlag;
  if (ptFlag !== null) statutoryFlags.ptApplicable = ptFlag;

  // Keep true/false/'' so existing parseBoolean() in validate keeps working
  const toBoolCell = (raw) => {
    const flag = parseOptionalImportBoolean(raw);
    if (flag === null) return '';
    return flag ? 'true' : 'false';
  };

  return {
    rowNumber,
    employeeCode,
    revisionType: revisionTypeRaw,
    grossSalary: Number.isFinite(grossSalary) ? grossSalary : NaN,
    baseSalary,
    ctcInput,
    state,
    taxRegime,
    paymentFrequency,
    effectiveFrom,
    arrearsApplicable: toBoolCell(arrearsApplicableRaw),
    arrearsFromDate: arrearsFrom,
    autoApprove: toBoolCell(autoApproveRaw),
    autoImplement: toBoolCell(autoImplementRaw),
    remarks,
    componentAmounts,
    blankComponentHeaders,
    statutoryFlags,
  };
}

module.exports = {
  parsePayrollImportFile,
  mapImportRow,
  mapSalaryRevisionRow,
  extractComponentAmountsFromRow,
  extractComponentInputsFromRow,
  KNOWN_SALARY_REVISION_COLUMNS,
};
