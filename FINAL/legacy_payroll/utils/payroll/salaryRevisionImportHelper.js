const {
  normalizeOverrides,
  mergeComponentOverrides,
  toStoredOverrides,
  normalizeComponentKey,
  calculateComponentAmount,
  stripBasicFromOverrides,
  withExplicitBasicOverride,
  isBasicSalaryComponent,
} = require('../salaryComponentHelper');
const { resolveEmployeeImportError } = require('./oneTimeImportHelper');
const { computePayrollInfoFromSalaryInput } = require('./salaryStructureImportHelper');

const REVISION_TYPES = ['increment', 'promotion', 'adjustment', 'new_joiner', 'annual_hike'];

/** Match Excel headers like diwali_bonus / "Diwali Bonus" to org component name/code. */
function normalizeExcelMatchKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isBalancingAllowanceComponent(comp = {}) {
  const code = normalizeExcelMatchKey(comp.code);
  const name = normalizeExcelMatchKey(comp.name);
  return (
    code === 'special' ||
    code === 'specialallowance' ||
    code === 'other' ||
    code === 'otherallowance' ||
    code === 'otherextra' ||
    code === 'otherextraallowance' ||
    name === 'specialallowance' ||
    name === 'otherallowance' ||
    name === 'otherextraallowance'
  );
}

function buildOrgComponentCatalog(salaryComponents = []) {
  const catalog = [];

  (salaryComponents || []).forEach((doc) => {
    const category = String(doc?.category || '').trim().toLowerCase();
    if (!category) return;

    (doc.components || []).forEach((comp) => {
      if (comp?.status && comp.status !== 'active') return;
      if (isBalancingAllowanceComponent(comp)) return;

      const name = String(comp.name || '').trim();
      const code = String(comp.code || '').trim();
      const matchKeys = [normalizeExcelMatchKey(name), normalizeExcelMatchKey(code)].filter(Boolean);
      if (!matchKeys.length) return;

      catalog.push({
        category,
        code,
        name,
        matchKeys,
        component: comp,
      });
    });
  });

  return catalog;
}

function componentDedupeKey(comp = {}) {
  return `${String(comp.category || '').toLowerCase()}:${normalizeComponentKey(comp.code || comp.name)}`;
}

/**
 * Classify Excel component columns:
 * - filled → excelOverrides
 * - blank → blankComponents (will materialize org default into overrides)
 * - column missing → missingComponents (defaultComponents + overrides)
 */
function resolveExcelComponentOverrides(
  componentAmounts = {},
  salaryComponents = [],
  blankComponentHeaders = []
) {
  const catalog = buildOrgComponentCatalog(salaryComponents);
  const findInCatalog = (header) => {
    const headerKey = normalizeExcelMatchKey(header);
    if (!headerKey) return null;
    return catalog.find((c) => c.matchKeys.includes(headerKey)) || null;
  };

  const excelOverrides = [];
  const blankComponents = [];
  const unmatched = [];
  const presentKeys = new Set();

  Object.entries(componentAmounts || {}).forEach(([header, amount]) => {
    if (!Number.isFinite(Number(amount))) return;

    const found = findInCatalog(header);
    if (!found) {
      unmatched.push(header);
      return;
    }

    const key = componentDedupeKey(found);
    if (presentKeys.has(key)) return;
    presentKeys.add(key);

    excelOverrides.push({
      category: found.category,
      code: found.code,
      name: found.name,
      overrideAmount: Number(amount),
    });
  });

  (blankComponentHeaders || []).forEach((header) => {
    const found = findInCatalog(header);
    if (!found) {
      unmatched.push(header);
      return;
    }

    const key = componentDedupeKey(found);
    if (presentKeys.has(key)) return; // filled wins
    presentKeys.add(key);
    blankComponents.push(found);
  });

  const missingComponents = catalog.filter((c) => !presentKeys.has(componentDedupeKey(c)));

  return {
    overrides: normalizeOverrides(excelOverrides),
    blankComponents,
    missingComponents,
    unmatched,
    // backward-compatible alias used by older call sites
    cleared: blankComponents.map((c) => ({
      category: c.category,
      code: c.code,
      name: c.name,
    })),
  };
}

function isSameComponentOverride(a = {}, b = {}) {
  const aCode = normalizeComponentKey(a.code || a.name);
  const bCode = normalizeComponentKey(b.code || b.name);
  const aName = normalizeComponentKey(a.name);
  const bName = normalizeComponentKey(b.name);

  if (String(a.category || '').toLowerCase() !== String(b.category || '').toLowerCase()) {
    return false;
  }

  return (
    (aCode && bCode && aCode === bCode) ||
    (aName && bName && aName === bName) ||
    (aCode && bName && aCode === bName) ||
    (aName && bCode && aName === bCode)
  );
}

function removeClearedComponentOverrides(overrides = [], cleared = []) {
  if (!cleared.length) return normalizeOverrides(overrides);
  return normalizeOverrides(overrides).filter(
    (item) => !cleared.some((c) => isSameComponentOverride(item, c))
  );
}

/** Build override rows from org components using calculated default amounts. */
function materializeDefaultAmountOverrides(components = [], salaryBases = {}) {
  return normalizeOverrides(
    (components || []).map((item) => {
      const amount = Math.round(
        calculateComponentAmount(item.component || item, salaryBases, null)
      );
      return {
        category: item.category,
        code: item.code,
        name: item.name,
        overrideAmount: amount,
      };
    })
  );
}

function toDefaultComponentsArray(overrides = []) {
  return normalizeOverrides(overrides).map((o) => ({
    category: o.category,
    code: o.code,
    name: o.name,
    amount: o.overrideAmount,
    componentName: o.name,
  }));
}

const REVISION_TYPE_ALIASES = {
  increment: 'increment',
  hike: 'increment',
  annual_hike: 'annual_hike',
  annualhike: 'annual_hike',
  annual: 'annual_hike',
  promotion: 'promotion',
  adjust: 'adjustment',
  adjustment: 'adjustment',
  new_joiner: 'new_joiner',
  newjoiner: 'new_joiner',
  joiner: 'new_joiner',
  new: 'new_joiner',
};

function parseOptionalNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

function parseEffectiveDate(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value).trim();
  const asNumber = Number(raw);

  if (Number.isFinite(asNumber) && asNumber >= 25000 && asNumber <= 60000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + asNumber * 86400000);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || String(value).trim() === '') return defaultValue;
  const raw = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(raw)) return true;
  if (['false', 'no', 'n', '0'].includes(raw)) return false;
  return defaultValue;
}

/** Keep only defined boolean statutory flags from Excel / revision. */
function sanitizeStatutoryFlags(flags = {}) {
  const out = {};
  if (!flags || typeof flags !== 'object') return out;
  const plain = typeof flags.toObject === 'function' ? flags.toObject() : flags;
  for (const key of ['epfApplicable', 'pfOnActuals', 'esiApplicable', 'lwfApplicable', 'ptApplicable']) {
    const value = plain[key];
    if (typeof value === 'boolean') {
      out[key] = value;
      continue;
    }
    if (value === undefined || value === null || value === '') continue;
    const raw = String(value).trim().toLowerCase();
    if (['true', 'yes', 'y', '1'].includes(raw)) out[key] = true;
    else if (['false', 'no', 'n', '0'].includes(raw)) out[key] = false;
  }
  if (typeof out.esiApplicable === 'boolean') {
    out.esiOptedOut = out.esiApplicable === false;
  }
  return out;
}

function cloneStatutoryInfo(source) {
  if (!source) return {};
  if (typeof source.toObject === 'function') return source.toObject();
  return { ...source };
}

function applyPfOnActualsToStatutoryInfo(statutoryInfo = {}, pfOnActuals) {
  if (typeof pfOnActuals !== 'boolean') return statutoryInfo;
  const currentOverride =
    statutoryInfo.epfOverride?.toObject?.() || statutoryInfo.epfOverride || {};
  return {
    ...statutoryInfo,
    epfOverride: {
      ...currentOverride,
      enabled: pfOnActuals,
      applyCeiling: !pfOnActuals,
    },
  };
}

function mergeEmployeeStatutoryForCalc(employee, statutoryFlags = {}) {
  const flags = sanitizeStatutoryFlags(statutoryFlags);
  const { pfOnActuals, ...applicability } = flags;
  const base = cloneStatutoryInfo(employee?.statutoryInfo);
  return applyPfOnActualsToStatutoryInfo({ ...base, ...applicability }, pfOnActuals);
}

function applyStatutoryFlagsToEmployee(employee, statutoryFlags = {}) {
  const flags = sanitizeStatutoryFlags(statutoryFlags);
  if (!Object.keys(flags).length) return false;

  const { pfOnActuals, ...applicability } = flags;
  const current = cloneStatutoryInfo(employee.statutoryInfo);
  employee.statutoryInfo = applyPfOnActualsToStatutoryInfo(
    { ...current, ...applicability },
    pfOnActuals
  );
  employee.markModified('statutoryInfo');
  return true;
}

function applyStateToEmployee(employee, state) {
  const nextState = String(state || '').trim();
  if (!employee || !nextState) return false;

  const current =
    employee.statutoryInfo?.toObject?.() ||
    (employee.statutoryInfo ? { ...employee.statutoryInfo } : {}) ||
    {};

  employee.statutoryInfo = {
    ...current,
    ptState: nextState,
    lwfState: nextState,
  };
  employee.markModified('statutoryInfo');
  return true;
}

function normalizeRevisionType(value) {
  if (!value) return '';
  const key = String(value).trim().toLowerCase().replace(/\s+/g, '_');
  return REVISION_TYPE_ALIASES[key] || key;
}

function formatRevisionTypeLabel(revisionType) {
  const labels = {
    annual_hike: 'Annual Hike',
    new_joiner: 'New Joiner',
    promotion: 'Promotion',
    increment: 'Increment',
    adjustment: 'Adjustment',
  };
  return labels[revisionType] || revisionType;
}

function summarizeRows(rows = []) {
  const validRows = rows.filter((r) => r.valid).length;
  return {
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
  };
}

function calculateArrears({ arrearsApplicable, arrearsFromDate, effectiveFrom, incrementAmount }) {
  if (!arrearsApplicable || !arrearsFromDate || !effectiveFrom || incrementAmount <= 0) {
    return { arrearsAmount: 0, arrearsToDate: null };
  }

  const fromDate = new Date(arrearsFromDate);
  const toDate = new Date(effectiveFrom);
  const monthsDiff =
    (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth());
  const normalizedMonthsDiff = Math.max(0, monthsDiff);
  const monthlyIncrement = incrementAmount / 12;
  const arrearsAmount = Math.round(monthlyIncrement * normalizedMonthsDiff);

  return { arrearsAmount, arrearsToDate: toDate };
}

function resolvePlannedStatus(autoApprove, autoImplement) {
  if (autoImplement) return 'implemented';
  if (autoApprove) return 'approved';
  return 'pending';
}

function validateSalaryRevisionRows(
  rawRows = [],
  employees = [],
  salaryComponents = [],
  statutoryCompliance,
  inactiveEmployees = []
) {
  const validated = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = raw.rowNumber || index + 1;
    const base = {
      rowNumber,
      employeeCode: raw.employeeCode || '',
      employeeName: '',
      revisionType: normalizeRevisionType(raw.revisionType),
      effectiveFrom: raw.effectiveFrom,
      baseSalary: 0,
      excelBasicSalary: raw.baseSalary ?? null,
      grossSalary: raw.grossSalary,
      ctcInput: raw.ctcInput,
      state: raw.state || '',
      taxRegime: raw.taxRegime || '',
      paymentFrequency: raw.paymentFrequency || '',
      arrearsApplicable: parseBoolean(raw.arrearsApplicable, false),
      arrearsFromDate: raw.arrearsFromDate,
      autoApprove: parseBoolean(raw.autoApprove, false),
      autoImplement: parseBoolean(raw.autoImplement, false),
      remarks: raw.remarks || '',
      oldSalary: { ctc: 0, grossSalary: 0, basicSalary: 0 },
      newSalary: { ctc: 0, grossSalary: 0, basicSalary: 0 },
      incrementAmount: 0,
      incrementPercentage: 0,
      arrearsAmount: 0,
      plannedStatus: 'pending',
      warnings: [],
      valid: false,
      error: '',
      employeeId: null,
      statutoryFlags: sanitizeStatutoryFlags(raw.statutoryFlags),
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
    if (!base.state) {
      base.state = String(
        emp.statutoryInfo?.ptState || emp.statutoryInfo?.lwfState || ''
      ).trim();
    }

    if (!base.revisionType || !REVISION_TYPES.includes(base.revisionType)) {
      validated.push({
        ...base,
        error: `revisionType must be one of: ${REVISION_TYPES.join(', ')}`,
      });
      return;
    }

    const effectiveDate = parseEffectiveDate(base.effectiveFrom);
    if (!effectiveDate) {
      validated.push({ ...base, error: 'effectiveFrom is required and must be a valid date' });
      return;
    }
    base.effectiveFrom = effectiveDate;

    if (!Number.isFinite(base.grossSalary) || base.grossSalary <= 0) {
      validated.push({ ...base, error: 'grossSalary must be a number greater than 0' });
      return;
    }

    if (base.ctcInput !== null && (!Number.isFinite(base.ctcInput) || base.ctcInput < 0)) {
      validated.push({ ...base, error: 'ctc must be a valid number >= 0 when provided' });
      return;
    }

    if (base.arrearsApplicable) {
      const arrearsFrom = parseEffectiveDate(base.arrearsFromDate);
      if (!arrearsFrom) {
        validated.push({
          ...base,
          error: 'arrearsFrom is required when arrearsApplicable is true',
        });
        return;
      }
      if (arrearsFrom > effectiveDate) {
        validated.push({
          ...base,
          error: 'arrearsFrom cannot be after effectiveFrom',
        });
        return;
      }
      base.arrearsFromDate = arrearsFrom;
    } else {
      base.arrearsFromDate = null;
    }

    if (base.autoImplement && !base.autoApprove) {
      validated.push({
        ...base,
        error:
          'auto_approve cannot be false when auto_implement is true',
      });
      return;
    }

    const employeeOverrides = normalizeOverrides(emp.payrollInfo?.componentOverrides || []);
    const {
      overrides: excelOverrides,
      blankComponents,
      missingComponents,
      unmatched,
    } = resolveExcelComponentOverrides(
      raw.componentAmounts || {},
      salaryComponents,
      raw.blankComponentHeaders || []
    );

    if (unmatched.length > 0) {
      base.warnings.push(
        `Unknown component column(s) ignored: ${unmatched.join(', ')}`
      );
    }

    const excelBasicFromColumn = Number(raw.baseSalary);
    const excelBasicFromComponent = Number(
      excelOverrides.find((item) => isBasicSalaryComponent(item))?.overrideAmount
    );
    const excelBasicSalary =
      Number.isFinite(excelBasicFromColumn) && excelBasicFromColumn > 0
        ? excelBasicFromColumn
        : Number.isFinite(excelBasicFromComponent) && excelBasicFromComponent > 0
          ? excelBasicFromComponent
          : 0;
    const hasExcelBasic = excelBasicSalary > 0;

    // During salary calc: use Excel values; blank + missing fall back to org default
    // (clear any old employee overrides for those components).
    const componentsUsingDefault = [...blankComponents, ...missingComponents].map((c) => ({
      category: c.category,
      code: c.code,
      name: c.name,
    }));

    const computeOverrides = withExplicitBasicOverride(
      removeClearedComponentOverrides(
        mergeComponentOverrides(employeeOverrides, excelOverrides),
        componentsUsingDefault
      ),
      hasExcelBasic ? excelBasicSalary : 0,
      salaryComponents
    );

    const { payrollInfo, warnings: computeWarnings, components: computedComponents } =
      computePayrollInfoFromSalaryInput({
        baseSalary: hasExcelBasic ? excelBasicSalary : 0,
        grossSalary: base.grossSalary,
        state: base.state,
        employee: (() => {
          // Keep employee shape stable for calculator; overlay statutory flags + Excel state
          const plain = emp.toObject ? emp.toObject({ depopulate: true }) : emp;
          const statutoryInfo = mergeEmployeeStatutoryForCalc(emp, base.statutoryFlags);
          if (base.state) {
            statutoryInfo.ptState = base.state;
            statutoryInfo.lwfState = base.state;
          }
          return {
            ...plain,
            statutoryInfo,
          };
        })(),
        salaryComponents,
        statutoryCompliance,
        taxRegime: base.taxRegime,
        paymentFrequency: base.paymentFrequency,
        salaryEffectiveFrom: effectiveDate,
        grossSalaryInput: base.grossSalary,
        ctcInput: base.ctcInput,
        overrides: computeOverrides,
      });

    if (!payrollInfo) {
      validated.push({
        ...base,
        error: 'Unable to compute salary structure from gross salary',
      });
      return;
    }

    const newBasicSalary = payrollInfo.baseSalary;
    const newGrossSalary = payrollInfo.grossSalary;
    const newCTC = payrollInfo.ctc;
    base.baseSalary = newBasicSalary;

    if (newBasicSalary > newGrossSalary || newGrossSalary > newCTC) {
      validated.push({
        ...base,
        error: 'Invalid salary structure. Please keep Basic ≤ Gross ≤ CTC',
      });
      return;
    }

    const salaryBases = {
      baseSalary: newBasicSalary,
      grossSalary: newGrossSalary,
      ctc: newCTC,
    };

    // Blank + missing → write org default amounts into componentOverrides
    // Option B: never materialize / sticky-store Basic from blank/missing columns
    const nonBasicBlank = blankComponents.filter(
      (c) => !normalizeExcelMatchKey(c.name).includes('basic') &&
        !normalizeExcelMatchKey(c.code).includes('basic')
    );
    const nonBasicMissing = missingComponents.filter(
      (c) => !normalizeExcelMatchKey(c.name).includes('basic') &&
        !normalizeExcelMatchKey(c.code).includes('basic')
    );

    const blankDefaultOverrides = materializeDefaultAmountOverrides(nonBasicBlank, salaryBases);
    const missingDefaultOverrides = materializeDefaultAmountOverrides(nonBasicMissing, salaryBases);

    // Column missing → also stored in defaultComponents array
    const defaultComponents = toDefaultComponentsArray(missingDefaultOverrides);

    const revisionOverrides = stripBasicFromOverrides(
      mergeComponentOverrides(
        mergeComponentOverrides(excelOverrides, blankDefaultOverrides),
        missingDefaultOverrides
      )
    );

    const oldCTC = emp.payrollInfo?.ctc || 0;
    const oldGross = emp.payrollInfo?.grossSalary || 0;
    const oldBasic = emp.payrollInfo?.baseSalary || 0;

    const incrementAmount = newCTC - oldCTC;
    const incrementPercentage =
      oldCTC > 0 ? Number(((incrementAmount / oldCTC) * 100).toFixed(2)) : 0;

    const { arrearsAmount } = calculateArrears({
      arrearsApplicable: base.arrearsApplicable,
      arrearsFromDate: base.arrearsFromDate,
      effectiveFrom: effectiveDate,
      incrementAmount,
    });

    validated.push({
      ...base,
      employeeComponentOverrides: toStoredOverrides(employeeOverrides),
      excelComponentOverrides: toStoredOverrides(excelOverrides),
      defaultComponents,
      oldSalary: {
        ctc: oldCTC,
        grossSalary: oldGross,
        basicSalary: oldBasic,
        components: [],
        componentOverrides: toStoredOverrides(employeeOverrides),
      },
      newSalary: {
        ctc: newCTC,
        grossSalary: newGrossSalary,
        basicSalary: newBasicSalary,
        components: computedComponents || [],
        componentOverrides: toStoredOverrides(revisionOverrides),
        defaultComponents,
      },
      incrementAmount,
      incrementPercentage,
      arrearsAmount,
      plannedStatus: resolvePlannedStatus(base.autoApprove, base.autoImplement),
      warnings: [...base.warnings, ...computeWarnings],
      revisionTypeLabel: formatRevisionTypeLabel(base.revisionType),
      statutoryFlags: base.statutoryFlags,
      valid: true,
      error: '',
    });
  });

  return validated;
}

async function createRevisionFromRow({
  SalaryRevisionModel,
  row,
  org_uuid,
  requestedBy,
}) {
  const { arrearsAmount, arrearsToDate } = calculateArrears({
    arrearsApplicable: row.arrearsApplicable,
    arrearsFromDate: row.arrearsFromDate,
    effectiveFrom: row.effectiveFrom,
    incrementAmount: row.incrementAmount,
  });

  const employeeOverrides = normalizeOverrides(
    row.employeeComponentOverrides || row.oldSalary?.componentOverrides || []
  );

  const revisionOverrides = Array.isArray(row.newSalary?.componentOverrides)
    ? normalizeOverrides(row.newSalary.componentOverrides)
    : normalizeOverrides(row.excelComponentOverrides || []);

  const defaultComponents =
    row.newSalary?.defaultComponents || row.defaultComponents || [];

  const statutoryFlags = sanitizeStatutoryFlags(row.statutoryFlags);

  const revision = new SalaryRevisionModel({
    organizationId: org_uuid,
    employeeId: row.employeeId,
    revisionType: row.revisionType,
    effectiveFrom: row.effectiveFrom,
    oldSalary: {
      ctc: row.oldSalary.ctc,
      grossSalary: row.oldSalary.grossSalary,
      basicSalary: row.oldSalary.basicSalary,
      components: row.oldSalary.components || [],
      componentOverrides: toStoredOverrides(employeeOverrides),
    },
    newSalary: {
      ctc: row.newSalary.ctc,
      grossSalary: row.newSalary.grossSalary,
      basicSalary: row.newSalary.basicSalary,
      components: row.newSalary.components || [],
      componentOverrides: toStoredOverrides(revisionOverrides),
      defaultComponents,
    },
    incrementAmount: row.incrementAmount,
    incrementPercentage: row.incrementPercentage,
    arrearsApplicable: row.arrearsApplicable,
    arrearsFromDate: row.arrearsApplicable ? row.arrearsFromDate : null,
    arrearsToDate,
    arrearsAmount,
    arrearsPaid: false,
    status: 'pending',
    requestedBy,
    remarks: row.remarks || '',
    state: row.state || '',
    ...(Object.keys(statutoryFlags).length
      ? { statutoryApplicability: statutoryFlags }
      : {}),
  });

  await revision.save();
  return revision;
}

async function approveRevision(revision, userId, EmployeeModel, empId) {
  let approverName = `User ${userId || ''}`.trim();
  let approverRole = 'Importer';

  if (empId) {
    const approverEmployee = await EmployeeModel.findById(empId).select(
      'firstName lastName jobTitle categoryName'
    );
    if (approverEmployee) {
      const fullName = `${approverEmployee.firstName || ''} ${approverEmployee.lastName || ''}`.trim();
      approverName = fullName || approverName;
      approverRole = approverEmployee.jobTitle || approverEmployee.categoryName || approverRole;
    }
  }

  revision.approvals.push({
    employeeId: empId || null,
    approverName,
    approverRole,
    approvedDate: new Date(),
    status: 'approved',
    comments: 'Auto-approved via bulk import',
  });
  revision.status = 'approved';
  await revision.save();
}

async function implementRevision({
  revision,
  EmployeeModel,
  ArrearsModel,
  org_uuid,
}) {
  const employee = await EmployeeModel.findById(revision.employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  if (!employee.payrollInfo) {
    employee.payrollInfo = {};
  }

  employee.payrollInfo.ctc = revision.newSalary.ctc;
  employee.payrollInfo.grossSalary = revision.newSalary.grossSalary;
  employee.payrollInfo.baseSalary = revision.newSalary.basicSalary;
  employee.payrollInfo.salaryEffectiveFrom = revision.effectiveFrom;

  const storedOverrides = toStoredOverrides(revision.newSalary.componentOverrides || []);
  if (storedOverrides.length > 0) {
    employee.payrollInfo.componentOverrides = storedOverrides;
  }

  const defaultComponents = revision.newSalary.defaultComponents || [];
  employee.payrollInfo.defaultComponents = Array.isArray(defaultComponents)
    ? defaultComponents
    : [];

  // Excel statutory columns (epf / pf_on_actuals / esic / lwf / professionalTax) → employee.statutoryInfo
  applyStatutoryFlagsToEmployee(
    employee,
    revision.statutoryApplicability?.toObject?.() || revision.statutoryApplicability || {}
  );
  applyStateToEmployee(employee, revision.state);

  await employee.save();

  let arrearsRecord = null;
  if (revision.arrearsApplicable && revision.arrearsAmount > 0) {
    const monthlyIncrement = revision.incrementAmount / 12;
    const calculatedMonths =
      monthlyIncrement > 0 ? Math.round(revision.arrearsAmount / monthlyIncrement) : 0;

    arrearsRecord = new ArrearsModel({
      organizationId: org_uuid,
      employeeId: revision.employeeId,
      arrearsType: 'salary_revision',
      periodFrom: {
        month: new Date(revision.arrearsFromDate).toLocaleString('en-IN', { month: 'short' }),
        year: new Date(revision.arrearsFromDate).getFullYear(),
      },
      periodTo: {
        month: new Date(revision.arrearsToDate).toLocaleString('en-IN', { month: 'short' }),
        year: new Date(revision.arrearsToDate).getFullYear(),
      },
      components: [
        {
          componentName: 'Salary Revision Arrears',
          oldAmount: revision.oldSalary.ctc,
          newAmount: revision.newSalary.ctc,
          difference: revision.incrementAmount,
          months: calculatedMonths,
          totalArrears: revision.arrearsAmount,
        },
      ],
      totalArrearsAmount: revision.arrearsAmount,
      tdsOnArrears: 0,
      netArrearsPayable: revision.arrearsAmount,
      status: 'calculated',
      salaryRevisionId: revision._id,
      remarks: 'Auto-created from bulk salary revision import',
    });

    await arrearsRecord.save();
  }

  revision.status = 'implemented';
  revision.implementedDate = new Date();
  await revision.save();

  return { arrearsRecord };
}

async function applySalaryRevisionImport({
  SalaryRevisionModel,
  EmployeeModel,
  ArrearsModel,
  validRows = [],
  org_uuid,
  requestedBy,
  empId,
}) {
  const results = [];
  const errors = [];

  for (const row of validRows) {
    try {
      const revision = await createRevisionFromRow({
        SalaryRevisionModel,
        row,
        org_uuid,
        requestedBy,
      });

      let finalStatus = 'pending';

      if (row.autoApprove) {
        await approveRevision(revision, requestedBy, EmployeeModel, empId);
        finalStatus = 'approved';
      }

      if (row.autoImplement) {
        if (revision.status !== 'approved') {
          throw new Error('Revision must be approved before implement');
        }
        await implementRevision({
          revision,
          EmployeeModel,
          ArrearsModel,
          org_uuid,
        });
        finalStatus = 'implemented';
      }

      results.push({
        rowNumber: row.rowNumber,
        employeeId: row.employeeId,
        employeeCode: row.employeeCode,
        employeeName: row.employeeName,
        revisionId: revision._id,
        revisionType: row.revisionType,
        revisionTypeLabel: formatRevisionTypeLabel(row.revisionType),
        status: finalStatus,
        oldSalary: row.oldSalary,
        newSalary: row.newSalary,
        incrementAmount: row.incrementAmount,
        incrementPercentage: row.incrementPercentage,
      });
    } catch (err) {
      errors.push({
        rowNumber: row.rowNumber,
        employeeCode: row.employeeCode,
        error: err.message,
      });
    }
  }

  return { results, errors };
}

module.exports = {
  REVISION_TYPES,
  validateSalaryRevisionRows,
  summarizeRows,
  applySalaryRevisionImport,
  formatRevisionTypeLabel,
  resolveExcelComponentOverrides,
  removeClearedComponentOverrides,
  materializeDefaultAmountOverrides,
  sanitizeStatutoryFlags,
  applyStatutoryFlagsToEmployee,
  applyStateToEmployee,
};
