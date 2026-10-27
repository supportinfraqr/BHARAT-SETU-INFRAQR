const COMPONENT_CATEGORIES = ['earnings', 'deductions', 'benefits', 'reimbursements'];

const PAYROLL_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PAYMENT_MONTH_TO_SHORT = {
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

function normalizeComponentKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isBasicSalaryComponent(component = {}) {
  const code = normalizeComponentKey(component.code);
  const name = normalizeComponentKey(component.name);
  return (
    code === 'basic' ||
    code === 'basesalary' ||
    code === 'base salary' ||
    code === 'bs' ||
    name === 'basic' ||
    name === 'basic salary' ||
    name === 'base salary' ||
    name.startsWith('basic ')
  );
}

function isDaComponent(component = {}) {
  const code = normalizeComponentKey(component.code);
  const name = normalizeComponentKey(component.name);
  return (
    code === 'da' ||
    code === 'dearnessallowance' ||
    code === 'dearness allowance' ||
    name === 'da' ||
    name === 'dearness allowance' ||
    name === 'dearnessallowance'
  );
}

function isBasicPlusDaComponent(component = {}) {
  return isBasicSalaryComponent(component) || isDaComponent(component);
}

function sumBasicPlusDA(earningsBreakdown = []) {
  if (!Array.isArray(earningsBreakdown)) return 0;
  return earningsBreakdown.reduce((sum, line) => {
    if (isBasicPlusDaComponent({ name: line.name, code: line.code })) {
      return sum + (Number(line.calculatedAmount ?? line.amount ?? 0) || 0);
    }
    return sum;
  }, 0);
}

/** When gross is the input, Basic must come from org rule — drop stored Basic overrides. */
function stripBasicFromOverrides(overrides = []) {
  return normalizeOverrides(overrides).filter(
    (o) =>
      !(
        o.category === 'earnings' &&
        isBasicSalaryComponent({ name: o.name, code: o.code })
      )
  );
}

function getActiveEarningsComponents(salaryComponents = []) {
  const earningsDoc = salaryComponents.find((c) => c.category === 'earnings');
  const active = (earningsDoc?.components || []).filter((c) => c.status === 'active');
  return {
    basicComponent: active.find(isBasicSalaryComponent) || null,
    otherComponents: active.filter((c) => !isBasicSalaryComponent(c)),
    allActive: active,
  };
}

/** Build a one-shot Basic override so calculator honors Excel / Create Revision Basic. */
function buildBasicSalaryOverride(amount, salaryComponents = []) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) return null;
  const { basicComponent } = getActiveEarningsComponents(salaryComponents);
  return {
    category: 'earnings',
    code: basicComponent?.code || 'BASIC',
    name: basicComponent?.name || 'Basic Salary',
    overrideAmount: Math.round(num),
  };
}

/**
 * For this calculation only: drop stale saved Basic, then apply the user's Basic if provided.
 * Stored payroll still uses payrollInfo.baseSalary; sticky Basic override is not kept.
 */
function withExplicitBasicOverride(overrides = [], basicAmount, salaryComponents = []) {
  const withoutBasic = stripBasicFromOverrides(overrides);
  const basicOverride = buildBasicSalaryOverride(basicAmount, salaryComponents);
  if (!basicOverride) return withoutBasic;
  return mergeComponentOverrides(withoutBasic, [basicOverride]);
}

function normalizeComponentFrequency(frequency) {
  const raw = String(frequency || 'monthly').trim().toLowerCase();
  if (raw === 'one-time' || raw === 'onetime' || raw === 'one_time') return 'one-time';
  if (raw === 'yearly' || raw === 'annual') return 'yearly';
  if (raw === 'recurring' || raw === 'monthly') return 'monthly';
  return raw;
}

function normalizeComponentPaymentMonth(monthValue) {
  if (!monthValue) return null;
  const raw = String(monthValue).trim().toLowerCase();
  return PAYMENT_MONTH_TO_SHORT[raw] || null;
}

function resolveComponentPaymentMonth(component = {}) {
  const saved = normalizeComponentPaymentMonth(component.paymentMonth);
  if (saved) return saved;

  const frequency = normalizeComponentFrequency(component.frequency);
  if (frequency === 'yearly' || frequency === 'one-time') {
    return 'Apr';
  }

  return null;
}

function isComponentPaymentMonthDue(component = {}, payrollMonth) {
  const frequency = normalizeComponentFrequency(component.frequency);
  if (frequency === 'monthly') return true;

  const paymentMonth = resolveComponentPaymentMonth(component);
  const currentMonth = normalizeComponentPaymentMonth(payrollMonth) || payrollMonth;
  if (!currentMonth || !paymentMonth) return false;
  return currentMonth === paymentMonth;
}

function isYearlyComponentDue(component = {}, payrollMonth) {
  return isComponentPaymentMonthDue(component, payrollMonth);
}

function getComponentTrackingKey(category, component = {}) {
  if (component._id) {
    return `${category}:id:${String(component._id)}`;
  }
  const nameKey = normalizeComponentKey(component.name);
  return nameKey ? `${category}:name:${nameKey}` : '';
}

function hasComponentBeenPaid(category, component = {}, paidComponentKeys = new Set()) {
  if (!paidComponentKeys || paidComponentKeys.size === 0) return false;

  const idKey = component._id ? `${category}:id:${String(component._id)}` : '';
  if (idKey && paidComponentKeys.has(idKey)) return true;

  const nameKey = normalizeComponentKey(component.name);
  if (nameKey && paidComponentKeys.has(`${category}:name:${nameKey}`)) return true;

  const legacyKey = getComponentTrackingKey(category, component);
  return legacyKey ? paidComponentKeys.has(legacyKey) : false;
}

function shouldIncludeSalaryComponent(component = {}, category, payrollMonth, paidComponentKeys = new Set()) {
  const frequency = normalizeComponentFrequency(component.frequency);

  if (frequency === 'monthly') return true;

  if (frequency === 'yearly') {
    return isYearlyComponentDue(component, payrollMonth);
  }

  if (frequency === 'one-time') {
    if (!isComponentPaymentMonthDue(component, payrollMonth)) return false;
    return !hasComponentBeenPaid(category, component, paidComponentKeys);
  }

  return true;
}

function getFrequencyDisplayAmounts(component = {}, amount = 0, payrollMonth = null) {
  const frequency = normalizeComponentFrequency(component.frequency);
  const rounded = Math.round(Math.max(0, amount));

  if (frequency === 'monthly') {
    return { monthlyAmount: rounded, annualAmount: rounded * 12 };
  }

  if (frequency === 'yearly') {
    if (!payrollMonth) {
      return { monthlyAmount: rounded, annualAmount: rounded };
    }
    const due = isYearlyComponentDue(component, payrollMonth);
    return { monthlyAmount: due ? rounded : 0, annualAmount: rounded };
  }

  if (frequency === 'one-time') {
    if (!payrollMonth) {
      return { monthlyAmount: rounded, annualAmount: rounded };
    }
    const due = isComponentPaymentMonthDue(component, payrollMonth);
    return { monthlyAmount: due ? rounded : 0, annualAmount: rounded };
  }

  return { monthlyAmount: rounded, annualAmount: rounded * 12 };
}

function shouldCountTowardMonthlyTotals(component = {}) {
  return normalizeComponentFrequency(component.frequency) === 'monthly';
}

function collectPaidComponentKeysFromPayrollRuns(payrollRuns = []) {
  const keys = new Set();

  for (const run of payrollRuns) {
    for (const category of ['earnings', 'deductions', 'benefits']) {
      for (const line of run?.[category] || []) {
        if (line?.componentId) {
          keys.add(`${category}:id:${String(line.componentId)}`);
        }
        const nameKey = normalizeComponentKey(line?.componentName);
        if (nameKey) {
          keys.add(`${category}:name:${nameKey}`);
        }
      }
    }
  }

  return keys;
}

async function loadPaidComponentKeysForEmployee(
  organizationId,
  employeeId,
  PayrollRunModel,
  excludePayrollId = null
) {
  if (!PayrollRunModel || !organizationId || !employeeId) {
    return new Set();
  }

  const filter = {
    organizationId,
    employeeId,
  };
  if (excludePayrollId) {
    filter._id = { $ne: excludePayrollId };
  }

  const payrollRuns = await PayrollRunModel.find(filter)
    .select('earnings deductions benefits')
    .lean();

  return collectPaidComponentKeysFromPayrollRuns(payrollRuns);
}

const OVERRIDE_AMOUNT_KEYS = ['overrideAmount', 'amount', 'value', 'input'];

function readOverrideAmountFromItem(item = {}) {
  // Mongoose subdocs expose fields via getters — hasOwnProperty on the doc itself fails.
  // Prefer plain object so override amounts survive payroll reload from DB.
  const plain =
    item && typeof item.toObject === 'function'
      ? item.toObject({ depopulate: true })
      : item && item._doc
        ? { ...item._doc }
        : item || {};

  for (const key of OVERRIDE_AMOUNT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(plain, key)) continue;
    const raw = plain[key];
    if (raw === undefined || raw === null) continue;
    if (String(raw).trim() === '') continue;
    const num = Number(raw);
    return {
      hasExplicitOverride: true,
      overrideAmount: Number.isFinite(num) ? num : null,
    };
  }
  return { hasExplicitOverride: false, overrideAmount: null };
}

function hasExplicitOverrideAmount(override) {
  if (!override || override.disabled) return false;
  const explicit =
    override.hasExplicitOverride ??
    (override.overrideAmount !== null && override.overrideAmount !== undefined);
  if (!explicit) return false;
  return Number.isFinite(override.overrideAmount);
}

function shouldIncludeComponentInBreakdown(amount, override) {
  if (override?.disabled) return false;
  // Active org components always appear in breakdown (including ₹0 default or explicit zero override).
  return true;
}

function normalizeOverrides(rawOverrides = []) {
  if (!Array.isArray(rawOverrides)) return [];

  return rawOverrides
    .map((item) => {
      const category = String(item?.category || '').trim().toLowerCase();
      if (!COMPONENT_CATEGORIES.includes(category)) return null;

      const code = normalizeComponentKey(item?.code || item?.componentCode || '');
      const name = String(item?.name || item?.componentName || '').trim();
      const { hasExplicitOverride, overrideAmount } = readOverrideAmountFromItem(item);

      return {
        category,
        code: code || normalizeComponentKey(name),
        name,
        overrideAmount,
        hasExplicitOverride,
        disabled: Boolean(item?.disabled),
      };
    })
    .filter((override) => {
      if (!override) return false;
      const isAutoBalancingAllowance =
        override.category === 'earnings' &&
        (override.code === 'special' ||
          override.code === 'special allowance' ||
          normalizeComponentKey(override.name) === 'special allowance');
      return !isAutoBalancingAllowance;
    });
}

function findComponentOverride(overrides = [], category, component = {}) {
  const list = normalizeOverrides(overrides);
  const codeKey = normalizeComponentKey(component.code);
  const nameKey = normalizeComponentKey(component.name);

  return (
    list.find(
      (o) =>
        o.category === category &&
        ((codeKey && o.code === codeKey) ||
          (nameKey && normalizeComponentKey(o.name) === nameKey) ||
          (nameKey && o.code === nameKey) ||
          (codeKey && normalizeComponentKey(o.name) === codeKey))
    ) || null
  );
}

function calculateComponentAmount(component = {}, salaryBases = {}, override = null) {
  if (override?.disabled) {
    return 0;
  }

  const baseSalary = Number(salaryBases.baseSalary) || 0;
  const gross = Number(salaryBases.grossSalary) || 0;
  const ctc = Number(salaryBases.ctc) || 0;

  if (hasExplicitOverrideAmount(override)) {
    return Math.max(0, override.overrideAmount);
  }

  let amount = 0;
  const calculationType = component.calculationType || 'fixed';
  const componentValue = Number(component.value) || 0;

  switch (calculationType) {
    case 'fixed':
    case 'variable':
      amount = componentValue;
      break;
    case 'percentage':
      if (component.basedOn === 'basic') {
        amount = (baseSalary * componentValue) / 100;
      } else if (component.basedOn === 'gross') {
        amount = (gross * componentValue) / 100;
      } else if (component.basedOn === 'ctc') {
        amount = (ctc * componentValue) / 100;
      }
      break;
    default:
      amount = 0;
  }

  const maxLimit = Number(component.maxLimit) || 0;
  if (maxLimit > 0 && amount > maxLimit) {
    amount = maxLimit;
  }

  return Math.max(0, amount);
}

function buildComponentLine(category, component, salaryBases, overrides = [], payrollMonth = null) {
  const override = findComponentOverride(overrides, category, component);
  const defaultAmount = calculateComponentAmount(component, salaryBases, null);
  const finalAmount = calculateComponentAmount(component, salaryBases, override);
  const isOverridden = hasExplicitOverrideAmount(override);
  const { monthlyAmount, annualAmount } = getFrequencyDisplayAmounts(
    component,
    finalAmount,
    payrollMonth
  );
  const frequency = normalizeComponentFrequency(component.frequency);

  return {
    category,
    name: component.name || '',
    code: component.code || '',
    calculationType: component.calculationType || 'fixed',
    basedOn: component.basedOn || 'none',
    orgValue: Number(component.value) || 0,
    frequency,
    paymentMonth: component.paymentMonth || '',
    defaultMonthlyAmount: Math.round(defaultAmount),
    overrideAmount: isOverridden ? Math.round(finalAmount) : null,
    monthlyAmount,
    annualAmount,
    isOverridden,
    disabled: Boolean(override?.disabled),
    taxable: component.taxable !== false,
    considerForEPF: isBasicSalaryComponent(component) || Boolean(component.considerForEPF),
    considerForESI: isBasicSalaryComponent(component) || Boolean(component.considerForESI),
    status: component.status || 'active',
  };
}

function buildBasicEarningsLine(
  basicComponent,
  resolvedBase,
  salaryBases = {},
  overrides = [],
  payrollMonth = null
) {
  const baseSalary = Math.round(Math.max(0, Number(resolvedBase) || 0));
  const override = basicComponent
    ? findComponentOverride(overrides, 'earnings', basicComponent)
    : null;
  const isOverridden = hasExplicitOverrideAmount(override);
  const grossAnchor = Number(salaryBases.grossSalary) || baseSalary;
  const bases = { baseSalary, grossSalary: grossAnchor, ctc: grossAnchor * 12 };

  if (basicComponent) {
    const defaultAmount = calculateComponentAmount(basicComponent, bases, null);
    const finalAmount = isOverridden ? override.overrideAmount : baseSalary;
    const { monthlyAmount, annualAmount } = getFrequencyDisplayAmounts(
      basicComponent,
      finalAmount,
      payrollMonth
    );

    return {
      category: 'earnings',
      name: basicComponent.name || 'Basic',
      code: basicComponent.code || 'basic',
      calculationType: basicComponent.calculationType || 'fixed',
      basedOn: basicComponent.basedOn || 'none',
      orgValue: Number(basicComponent.value) || 0,
      frequency: normalizeComponentFrequency(basicComponent.frequency),
      paymentMonth: basicComponent.paymentMonth || '',
      defaultMonthlyAmount: Math.round(defaultAmount),
      overrideAmount: isOverridden ? Math.round(finalAmount) : null,
      monthlyAmount,
      annualAmount,
      isOverridden,
      disabled: Boolean(override?.disabled),
      taxable: basicComponent.taxable !== false,
      considerForEPF: true,
      considerForESI: true,
      isBasic: true,
    };
  }

  return {
    category: 'earnings',
    name: 'Basic Salary',
    code: 'BASIC',
    calculationType: 'fixed',
    basedOn: 'none',
    orgValue: baseSalary,
    defaultMonthlyAmount: baseSalary,
    overrideAmount: null,
    monthlyAmount: baseSalary,
    annualAmount: baseSalary * 12,
    isOverridden: false,
    disabled: false,
    taxable: true,
    considerForEPF: true,
    considerForESI: true,
    isBasic: true,
  };
}

function buildPayrollEarningsBreakdown({
  salaryComponents = [],
  resolvedBase,
  overrides = [],
  payrollMonth = null,
  inputMode = 'basic',
  targetGross = null,
}) {
  // Caller (resolveSalaryBasesFromInput) already decided whether Basic override applies
  const effectiveOverrides = normalizeOverrides(overrides);

  const { basicComponent, otherComponents } = getActiveEarningsComponents(salaryComponents);
  const grossAnchor = targetGross ?? resolvedBase;
  const basicLine = buildBasicEarningsLine(
    basicComponent,
    resolvedBase,
    { baseSalary: resolvedBase, grossSalary: grossAnchor, ctc: grossAnchor * 12 },
    effectiveOverrides,
    payrollMonth
  );

  const earningsBreakdown = [];
  if (!basicLine.disabled) {
    earningsBreakdown.push({
      name: basicLine.name,
      code: basicLine.code || '',
      type: basicLine.calculationType,
      value: basicLine.orgValue,
      basedOn: basicLine.basedOn || 'none',
      frequency: basicLine.frequency || 'monthly',
      paymentMonth: basicLine.paymentMonth || '',
      defaultAmount: basicLine.defaultMonthlyAmount,
      calculatedAmount: basicLine.monthlyAmount,
      annualAmount: basicLine.annualAmount,
      isOverridden: basicLine.isOverridden,
      disabled: basicLine.disabled,
      taxable: basicLine.taxable !== false,
      considerForEPF: Boolean(basicLine.considerForEPF) || !!basicLine.isBasic,
      considerForESI: Boolean(basicLine.considerForESI) || !!basicLine.isBasic,
      isBasic: true,
    });
  }

  let runningGross = basicLine.disabled ? 0 : basicLine.monthlyAmount;
  let totalEarnings = runningGross;

  otherComponents.forEach((component) => {
    const salaryBases = {
      baseSalary: resolvedBase,
      grossSalary: inputMode === 'gross' && targetGross ? targetGross : runningGross,
      ctc: (targetGross || runningGross) * 12,
    };
    const override = findComponentOverride(effectiveOverrides, 'earnings', component);
    const defaultAmount = calculateComponentAmount(component, salaryBases, null);
    const amount = resolvePayrollComponentAmount('earnings', component, salaryBases, effectiveOverrides);
    const { monthlyAmount, annualAmount } = getFrequencyDisplayAmounts(
      component,
      amount,
      payrollMonth
    );
    const isOverridden = hasExplicitOverrideAmount(override);

    if (shouldIncludeComponentInBreakdown(amount, override)) {
      if (amount > 0) {
        runningGross += monthlyAmount;
        totalEarnings += monthlyAmount;
      }
      earningsBreakdown.push({
        name: component.name,
        code: component.code || '',
        type: component.calculationType,
        value: component.value,
        basedOn: component.basedOn || 'none',
        frequency: normalizeComponentFrequency(component.frequency),
        paymentMonth: component.paymentMonth || '',
        defaultAmount: Math.round(defaultAmount),
        calculatedAmount: Math.round(monthlyAmount),
        annualAmount: Math.round(annualAmount),
        isOverridden,
        disabled: Boolean(override?.disabled),
        taxable: component.taxable !== false,
        considerForEPF: Boolean(component.considerForEPF),
        considerForESI: Boolean(component.considerForESI),
      });
    }
  });

  let grossSalary = runningGross;
  if (inputMode === 'gross' && targetGross !== null) {
    const balancingLine = buildBalancingAllowanceLine(targetGross - grossSalary);
    if (balancingLine) {
      earningsBreakdown.push(balancingLine);
      totalEarnings += balancingLine.calculatedAmount;
    }
    grossSalary = targetGross;
  }

  return {
    earningsBreakdown,
    basicLine,
    grossSalary,
    totalEarnings,
    resolvedBase: basicLine.disabled ? 0 : basicLine.monthlyAmount,
  };
}

function buildSalaryStructurePreview(
  salaryComponents = [],
  salaryBases = {},
  overrides = [],
  payrollMonth = null
) {
  const result = {
    earnings: [],
    deductions: [],
    benefits: [],
    reimbursements: [],
    totals: {
      earningsMonthly: 0,
      earningsAnnual: 0,
      deductionsMonthly: 0,
      benefitsMonthly: 0,
      benefitsAnnual: 0,
    },
  };

  const baseSalary = Number(salaryBases.baseSalary) || 0;
  const inputGross = Number(salaryBases.grossSalary) || 0;
  const { basicComponent, otherComponents } = getActiveEarningsComponents(salaryComponents);
  const basicLine = buildBasicEarningsLine(
    basicComponent,
    baseSalary,
    { baseSalary, grossSalary: inputGross || baseSalary, ctc: salaryBases.ctc },
    overrides,
    payrollMonth
  );

  if (!basicLine.disabled) {
    result.earnings.push(basicLine);
    if (shouldCountTowardMonthlyTotals(basicComponent || { frequency: 'monthly' })) {
      result.totals.earningsMonthly += basicLine.monthlyAmount;
    }
  }

  let runningGross = basicLine.disabled ? 0 : basicLine.monthlyAmount;

  otherComponents.forEach((component) => {
    const line = buildComponentLine(
      'earnings',
      component,
      { ...salaryBases, baseSalary, grossSalary: inputGross || runningGross },
      overrides,
      payrollMonth
    );
    if (!line.disabled) {
      if (shouldCountTowardMonthlyTotals(component)) {
        runningGross += line.monthlyAmount;
        result.totals.earningsMonthly += line.monthlyAmount;
      }
      result.earnings.push(line);
    }
  });

  const resolvedGross = inputGross || runningGross;
  const basesWithGross = { ...salaryBases, baseSalary, grossSalary: resolvedGross };

  ['deductions', 'benefits', 'reimbursements'].forEach((category) => {
    const doc = salaryComponents.find((c) => c.category === category);
    if (!doc?.components) return;

    doc.components
      .filter((c) => c.status === 'active')
      .forEach((component) => {
        const line = buildComponentLine(category, component, basesWithGross, overrides, payrollMonth);
        if (!line.disabled) {
          result[category].push(line);
          if (shouldCountTowardMonthlyTotals(component)) {
            if (category === 'deductions') {
              result.totals.deductionsMonthly += line.monthlyAmount;
            }
            if (category === 'benefits') {
              result.totals.benefitsMonthly += line.monthlyAmount;
            }
          }
        }
      });
  });

  result.totals.earningsAnnual = result.earnings.reduce(
    (sum, line) => sum + (Number(line.annualAmount) || 0),
    0
  );
  result.totals.benefitsAnnual = result.benefits.reduce(
    (sum, line) => sum + (Number(line.annualAmount) || 0),
    0
  );
  result.totals.grossSalaryMonthly = Math.round(resolvedGross);
  result.totals.ctcAnnual = Math.round(Number(salaryBases.ctc) || result.totals.earningsAnnual);

  return result;
}

function resolvePayrollComponentAmount(category, component, salaryBases, overrides = []) {
  const override = findComponentOverride(overrides, category, component);
  if (override?.disabled) return 0;
  return calculateComponentAmount(component, salaryBases, override);
}

/**
 * Forward monthly gross from basic — mirrors calculatePayrollInfo earnings loop.
 */
function computeMonthlyGrossFromBasic(
  baseSalary,
  salaryComponents = [],
  overrides = [],
  payrollMonth = null
) {
  const basic = Math.max(0, Number(baseSalary) || 0);
  let runningGross = basic;

  const { otherComponents } = getActiveEarningsComponents(salaryComponents);
  if (otherComponents.length === 0) {
    return { grossSalary: basic, additionalMonthly: 0 };
  }

  otherComponents.forEach((component) => {
    const salaryBases = {
      baseSalary: basic,
      grossSalary: runningGross,
      ctc: runningGross * 12,
    };
    const override = findComponentOverride(overrides, 'earnings', component);
    const amount = resolvePayrollComponentAmount('earnings', component, salaryBases, overrides);
    const { monthlyAmount } = getFrequencyDisplayAmounts(component, amount, payrollMonth);

    if (shouldIncludeComponentInBreakdown(amount, override) && amount > 0) {
      runningGross += monthlyAmount;
    }
  });

  return { grossSalary: runningGross, additionalMonthly: runningGross - basic };
}

/**
 * Fallback: derive basic when admin rule is % of basic (binary search).
 */
function deriveBasicFromTargetGross(
  targetGross,
  salaryComponents = [],
  overrides = [],
  payrollMonth = null
) {
  const target = Math.round(Math.max(0, Number(targetGross) || 0));
  if (target <= 0) {
    return { baseSalary: 0, computedGross: 0 };
  }

  const forward = (basic) =>
    computeMonthlyGrossFromBasic(basic, salaryComponents, overrides, payrollMonth).grossSalary;

  const { otherComponents } = getActiveEarningsComponents(salaryComponents);
  if (otherComponents.length === 0) {
    return { baseSalary: target, computedGross: target };
  }

  let low = 0;
  let high = target;
  while (forward(high) < target && high < target * 20) {
    high = Math.min(target * 20, Math.max(high + 1, high * 2));
  }

  let bestBasic = target;
  let bestGross = forward(target);
  let bestDiff = Math.abs(bestGross - target);

  for (let i = 0; i < 64; i++) {
    const mid = Math.round((low + high) / 2);
    const gross = forward(mid);
    const diff = Math.abs(gross - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestBasic = mid;
      bestGross = gross;
    }
    if (gross < target) {
      low = mid + 1;
    } else if (gross > target) {
      high = mid - 1;
    } else {
      return { baseSalary: mid, computedGross: gross };
    }
    if (low > high) break;
  }

  return { baseSalary: bestBasic, computedGross: bestGross };
}

/**
 * Resolve Basic from gross using admin Basic component rule.
 * e.g. 30% of gross → baseSalary = gross * 30 / 100
 */
function resolveBasicAmountFromGross({
  targetGross,
  basicComponent,
  salaryComponents = [],
  overrides = [],
  payrollMonth = null,
}) {
  const target = Math.round(Math.max(0, Number(targetGross) || 0));
  if (target <= 0) {
    return { baseSalary: 0, computedGross: 0 };
  }

  // Gross is the input anchor: always derive Basic from org rule (% of gross / fixed / etc.).
  // Org Basic fixed 0 is valid — remainder goes to Other Extra Allowance.
  // Do NOT reuse a stored Basic override here. Explicit Basic (Excel / UI) is applied by the caller.

  const withAmount = (amount) => {
    const basic = Math.round(Math.max(0, Number(amount) || 0));
    return {
      baseSalary: basic,
      computedGross: computeMonthlyGrossFromBasic(
        basic,
        salaryComponents,
        overrides,
        payrollMonth
      ).grossSalary,
    };
  };

  if (basicComponent) {
    const calcType = basicComponent.calculationType || 'fixed';
    const basedOn = basicComponent.basedOn || 'none';
    const value = Number(basicComponent.value) || 0;

    if (calcType === 'percentage' && basedOn === 'gross') {
      return withAmount((target * value) / 100);
    }

    if (calcType === 'fixed' || calcType === 'variable') {
      return withAmount(value);
    }

    if (calcType === 'percentage' && basedOn === 'ctc') {
      return withAmount((target * 12 * value) / 100 / 12);
    }
  }

  return deriveBasicFromTargetGross(target, salaryComponents, overrides, payrollMonth);
}

function resolveSalaryBasesFromInput({
  baseSalary,
  grossSalary,
  salaryComponents = [],
  overrides = [],
  payrollMonth = null,
}) {
  const baseInput = Math.round(Math.max(0, Number(baseSalary) || 0));
  const grossInput = Math.round(Math.max(0, Number(grossSalary) || 0));

  if (grossInput > 0) {
    const { basicComponent } = getActiveEarningsComponents(salaryComponents);
    const normalized = normalizeOverrides(overrides);
    const basicOverride = basicComponent
      ? findComponentOverride(normalized, 'earnings', basicComponent)
      : findComponentOverride(normalized, 'earnings', {
          name: 'Basic Salary',
          code: 'BASIC',
        });
    const hasExplicitBasic =
      hasExplicitOverrideAmount(basicOverride) && !basicOverride?.disabled;

    // Explicit Basic override (revision UI) is honored.
    // Otherwise derive from org rule and ignore stale saved Basic overrides.
    if (hasExplicitBasic) {
      const baseSalary = Math.round(Math.max(0, Number(basicOverride.overrideAmount) || 0));
      return {
        inputMode: 'gross',
        baseSalary,
        targetGross: grossInput,
        computedGrossBeforeBalancing: computeMonthlyGrossFromBasic(
          baseSalary,
          salaryComponents,
          normalized,
          payrollMonth
        ).grossSalary,
        overridesForCalc: normalized,
      };
    }

    const overridesForGross = stripBasicFromOverrides(normalized);
    const derived = resolveBasicAmountFromGross({
      targetGross: grossInput,
      basicComponent,
      salaryComponents,
      overrides: overridesForGross,
      payrollMonth,
    });
    return {
      inputMode: 'gross',
      baseSalary: derived.baseSalary,
      targetGross: grossInput,
      computedGrossBeforeBalancing: derived.computedGross,
      overridesForCalc: overridesForGross,
    };
  }

  if (baseInput > 0) {
    return {
      inputMode: 'basic',
      baseSalary: baseInput,
      targetGross: null,
      computedGrossBeforeBalancing: null,
      overridesForCalc: normalizeOverrides(overrides),
    };
  }

  return null;
}

function buildBalancingAllowanceLine(balancingAmount) {
  const amount = Math.round(balancingAmount);
  if (amount === 0) return null;

  return {
    name: 'Other Extra Allowance',
    code: 'OTHER_EXTRA',
    type: 'fixed',
    value: amount,
    basedOn: 'none',
    frequency: 'monthly',
    paymentMonth: '',
    defaultAmount: amount,
    calculatedAmount: amount,
    annualAmount: amount * 12,
    isOverridden: false,
    disabled: false,
    taxable: true,
    considerForEPF: false,
    considerForESI: false,
    isBalancing: true,
  };
}

function findOverrideIndex(list = [], item = {}) {
  const codeKey = normalizeComponentKey(item.code);
  const nameKey = normalizeComponentKey(item.name);

  return list.findIndex(
    (o) =>
      o.category === item.category &&
      ((codeKey && o.code === codeKey) ||
        (nameKey && normalizeComponentKey(o.name) === nameKey) ||
        (codeKey && normalizeComponentKey(o.name) === codeKey))
  );
}

function mergeComponentOverrides(saved = [], incoming = []) {
  const merged = [...normalizeOverrides(saved)];
  for (const item of normalizeOverrides(incoming)) {
    const idx = findOverrideIndex(merged, item);
    if (idx >= 0) {
      if (item.hasExplicitOverride) {
        merged[idx].overrideAmount = item.overrideAmount;
        merged[idx].hasExplicitOverride = true;
      }
      if (Object.prototype.hasOwnProperty.call(item, 'disabled')) {
        merged[idx].disabled = item.disabled;
      }
      if (item.name) merged[idx].name = item.name;
      if (item.code) merged[idx].code = item.code;
    } else if (item.hasExplicitOverride || item.disabled) {
      merged.push(item);
    }
  }
  return merged;
}

function resolveRevisionComponentOverrides({
  bodyOverrides,
  newSalaryOverrides,
  employeeOverrides,
} = {}) {
  const employee = normalizeOverrides(employeeOverrides || []);
  const incomingRaw = [];
  if (Array.isArray(bodyOverrides) && bodyOverrides.length > 0) {
    incomingRaw.push(...bodyOverrides);
  } else if (Array.isArray(newSalaryOverrides) && newSalaryOverrides.length > 0) {
    incomingRaw.push(...newSalaryOverrides);
  }

  if (!incomingRaw.length) {
    return employee;
  }

  const incoming = normalizeOverrides(incomingRaw);
  const incomingEarningsExplicit = incoming.some(
    (o) => o.category === 'earnings' && o.hasExplicitOverride
  );
  const employeeEarningsExplicit = employee.some(
    (o) => o.category === 'earnings' && o.hasExplicitOverride
  );

  // Revision UI sends earnings rows with null amounts but deductions/benefits with 0.
  if (!incomingEarningsExplicit && employeeEarningsExplicit) {
    const incomingNonEarnings = incoming.filter((o) => o.category !== 'earnings');
    return mergeComponentOverrides(employee, incomingNonEarnings);
  }

  const hasIncomingExplicit = incoming.some((o) => o.hasExplicitOverride);
  if (!hasIncomingExplicit) {
    return employee;
  }

  return mergeComponentOverrides(employee, incoming);
}

function toStoredOverrides(overrides = []) {
  return normalizeOverrides(overrides).map(({ category, code, name, overrideAmount, disabled }) => ({
    category,
    code,
    name,
    overrideAmount,
    disabled,
  }));
}

function sanitizeSalaryComponent(component = {}) {
  const sanitized = { ...component };
  const frequency = normalizeComponentFrequency(sanitized.frequency);

  if (frequency === 'monthly') {
    sanitized.paymentMonth = '';
  } else if (!sanitized.paymentMonth) {
    sanitized.paymentMonth = '';
  }

  if (isBasicSalaryComponent(sanitized)) {
    sanitized.considerForEPF = true;
    sanitized.considerForESI = true;
  }

  return sanitized;
}

/** Copy Taxable / EPF / ESI ticks onto payroll earning lines. */
function getComplianceFlags(component = {}) {
  const isBasic = isBasicSalaryComponent({
    name: component.name || component.componentName,
    code: component.code,
  });
  return {
    taxable: component.taxable !== false,
    considerForEPF: isBasic || Boolean(component.considerForEPF),
    considerForESI: isBasic || Boolean(component.considerForESI),
  };
}

function addPayrollComponentLine(
  targetArray,
  category,
  component,
  salaryBases,
  overrides,
  payrollMonth,
  paidComponentKeys
) {
  if (component.status !== 'active') return 0;

  if (!shouldIncludeSalaryComponent(component, category, payrollMonth, paidComponentKeys)) {
    return 0;
  }

  const amount = resolvePayrollComponentAmount(category, component, salaryBases, overrides);
  if (amount <= 0) return 0;

  const line = {
    componentName: component.name,
    amount,
    calculationType: component.calculationType,
    componentId: component._id,
    ...getComplianceFlags(component),
  };

  // Benefits may opt into calendar-day proration via master component flag.
  if (category === 'benefits') {
    line.calculateOnProRata = !!component.calculateOnProRata;
  }

  targetArray.push(line);

  return amount;
}

module.exports = {
  COMPONENT_CATEGORIES,
  PAYROLL_MONTHS_SHORT,
  normalizeComponentKey,
  isBasicSalaryComponent,
  isDaComponent,
  isBasicPlusDaComponent,
  sumBasicPlusDA,
  stripBasicFromOverrides,
  buildBasicSalaryOverride,
  withExplicitBasicOverride,
  getActiveEarningsComponents,
  normalizeComponentFrequency,
  normalizeComponentPaymentMonth,
  resolveComponentPaymentMonth,
  isComponentPaymentMonthDue,
  isYearlyComponentDue,
  sanitizeSalaryComponent,
  getComponentTrackingKey,
  hasComponentBeenPaid,
  shouldIncludeSalaryComponent,
  getFrequencyDisplayAmounts,
  shouldCountTowardMonthlyTotals,
  collectPaidComponentKeysFromPayrollRuns,
  loadPaidComponentKeysForEmployee,
  readOverrideAmountFromItem,
  hasExplicitOverrideAmount,
  shouldIncludeComponentInBreakdown,
  normalizeOverrides,
  mergeComponentOverrides,
  toStoredOverrides,
  resolveRevisionComponentOverrides,
  findComponentOverride,
  calculateComponentAmount,
  buildComponentLine,
  buildBasicEarningsLine,
  buildPayrollEarningsBreakdown,
  buildSalaryStructurePreview,
  resolvePayrollComponentAmount,
  computeMonthlyGrossFromBasic,
  deriveBasicFromTargetGross,
  resolveBasicAmountFromGross,
  resolveSalaryBasesFromInput,
  buildBalancingAllowanceLine,
  getComplianceFlags,
  addPayrollComponentLine,
};
