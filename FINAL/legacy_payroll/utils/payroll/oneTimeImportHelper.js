const {
  normalizeOverrides,
  normalizeComponentKey,
} = require('../salaryComponentHelper');

const ALLOWED_CATEGORIES = ['earnings', 'deductions', 'benefits'];

function findOrgComponent(salaryComponents = [], category, code = '', name = '') {
  const doc = salaryComponents.find((c) => c.category === category);
  if (!doc?.components) return null;

  const codeKey = normalizeComponentKey(code);
  const nameKey = normalizeComponentKey(name);

  return (
    doc.components.find((component) => {
      const compCode = normalizeComponentKey(component.code);
      const compName = normalizeComponentKey(component.name);
      return (
        (codeKey && compCode === codeKey) ||
        (nameKey && compName === nameKey)
      );
    }) || null
  );
}

function findEmployeeForImport(employees = [], rawCode = '') {
  const key = normalizeComponentKey(rawCode);
  if (!key) return null;

  const byCustomId = employees.find(
    (emp) => normalizeComponentKey(emp.customId) === key
  );
  if (byCustomId) return byCustomId;

  return employees.find((emp) => normalizeComponentKey(emp.uniqueId) === key) || null;
}

function resolveEmployeeImportError(rawCode, activeEmployees = [], inactiveEmployees = []) {
  const emp = findEmployeeForImport(activeEmployees, rawCode);
  if (emp) return { employee: emp, error: null };

  const inactiveMatch = findEmployeeForImport(inactiveEmployees, rawCode);
  if (inactiveMatch) {
    return {
      employee: null,
      error: `Employee is ${inactiveMatch.status}. Sirf Active employees import ho sakte hain.`,
    };
  }

  return {
    employee: null,
    error:
      'Employee not found.',
  };
}

function validateOneTimeImportRows(
  rawRows = [],
  employees = [],
  salaryComponents = [],
  inactiveEmployees = []
) {

  const validated = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = raw.rowNumber || index + 1;
    const base = {
      rowNumber,
      employeeCode: raw.employeeCode || '',
      employeeName: '',
      category: raw.category || '',
      componentCode: raw.componentCode || '',
      componentName: raw.componentName || '',
      amount: raw.amount,
      remarks: raw.remarks || '',
      valid: false,
      error: '',
      isAdHoc: false,
      matchedOrgComponent: false,
      employeeId: null,
    };

    if (!base.employeeCode) {
      validated.push({
        ...base,
        error: 'employeeCode is required (customId e.g. NSS02, ya uniqueId e.g. NAG00003)',
      });
      return;
    }

    const { employee: emp, error: employeeError } = resolveEmployeeImportError(
      base.employeeCode,
      employees,
      inactiveEmployees
    );
    if (!emp) {
      validated.push({ ...base, error: employeeError });
      return;
    }

    base.employeeId = emp._id;
    base.employeeName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();

    if (!ALLOWED_CATEGORIES.includes(base.category)) {
      validated.push({
        ...base,
        error: 'category must be earnings, deductions, or benefits',
      });
      return;
    }

    if (!Number.isFinite(base.amount) || base.amount < 0) {
      validated.push({ ...base, error: 'amount must be a valid number >= 0' });
      return;
    }

    if (!base.componentCode && !base.componentName) {
      validated.push({
        ...base,
        error: 'componentCode or componentName is required',
      });
      return;
    }

    const orgComponent = findOrgComponent(
      salaryComponents,
      base.category,
      base.componentCode,
      base.componentName
    );

    if (orgComponent) {
      base.componentCode = orgComponent.code || base.componentCode;
      base.componentName = orgComponent.name || base.componentName;
      base.matchedOrgComponent = true;
      base.isAdHoc = false;
    } else {
      base.matchedOrgComponent = false;
      base.isAdHoc = true;
      if (!base.componentName) {
        base.componentName = base.componentCode;
      }
    }

    base.valid = true;
    validated.push(base);
  });

  return validated;
}

function mergeOneTimeIntoOverrides(permanentOverrides = [], oneTimeRows = []) {
  const merged = [...normalizeOverrides(permanentOverrides)];

  for (const row of oneTimeRows) {
    if (!row.valid || row.isAdHoc) continue;

    const item = normalizeOverrides([
      {
        category: row.category,
        code: row.componentCode,
        name: row.componentName,
        overrideAmount: row.amount,
      },
    ])[0];

    if (!item) continue;

    const idx = merged.findIndex(
      (o) => o.category === item.category && o.code === item.code
    );
    if (idx >= 0) merged[idx] = item;
    else merged.push(item);
  }

  return merged;
}

function applyAdHocOneTimeLines(oneTimeRows = [], earnings, deductions, benefits) {
  for (const row of oneTimeRows) {
    if (!row.valid || !row.isAdHoc) continue;

    const line = {
      componentName: row.componentName || row.componentCode || 'One Time Component',
      amount: Math.round(Number(row.amount) || 0),
      calculationType: 'one-time-import',
    };

    if (line.amount <= 0) continue;

    if (row.category === 'earnings') earnings.push(line);
    else if (row.category === 'deductions') deductions.push(line);
    else if (row.category === 'benefits') benefits.push(line);
  }
}

function groupOneTimeRowsByEmployee(rows = []) {
  const map = new Map();
  for (const row of rows) {
    if (!row.valid || !row.employeeId) continue;
    const key = String(row.employeeId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function summarizeRows(rows = []) {
  const validRows = rows.filter((r) => r.valid).length;
  return {
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
  };
}

async function loadConfirmedOneTimeImportRows(org_uuid, month, year, PayrollOneTimeImportModel) {
  const batch = await PayrollOneTimeImportModel.findOne({
    organizationId: org_uuid,
    month,
    year,
    status: 'confirmed',
  })
    .sort({ confirmedAt: -1, updatedAt: -1 })
    .lean();

  if (!batch?.rows?.length) return [];

  return batch.rows.filter((row) => row.valid);
}

module.exports = {
  ALLOWED_CATEGORIES,
  findEmployeeForImport,
  resolveEmployeeImportError,
  validateOneTimeImportRows,
  mergeOneTimeIntoOverrides,
  applyAdHocOneTimeLines,
  groupOneTimeRowsByEmployee,
  summarizeRows,
  findOrgComponent,
  loadConfirmedOneTimeImportRows,
};
