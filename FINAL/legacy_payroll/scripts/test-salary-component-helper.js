/**
 * Salary component helper unit tests
 * Run: node scripts/test-salary-component-helper.js
 */

const {
  normalizeComponentFrequency,
  normalizeComponentPaymentMonth,
  isComponentPaymentMonthDue,
  calculateComponentAmount,
  buildSalaryStructurePreview,
  buildPayrollEarningsBreakdown,
  resolveBasicAmountFromGross,
  shouldIncludeSalaryComponent,
  sanitizeSalaryComponent,
  findComponentOverride,
  hasExplicitOverrideAmount,
  shouldIncludeComponentInBreakdown,
  normalizeOverrides,
  deriveBasicFromTargetGross,
  computeMonthlyGrossFromBasic,
  resolveSalaryBasesFromInput,
} = require('../utils/salaryComponentHelper');

let pass = 0;
let fail = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}`);
    console.log(`        expected: ${JSON.stringify(expected)}`);
    console.log(`        actual  : ${JSON.stringify(actual)}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

section('1. Frequency normalization');
check('monthly', normalizeComponentFrequency('monthly'), 'monthly');
check('recurring -> monthly', normalizeComponentFrequency('recurring'), 'monthly');
check('one-time', normalizeComponentFrequency('one-time'), 'one-time');
check('onetime alias', normalizeComponentFrequency('onetime'), 'one-time');
check('yearly', normalizeComponentFrequency('yearly'), 'yearly');
check('annual -> yearly', normalizeComponentFrequency('annual'), 'yearly');

section('2. Payment month normalization');
check('October -> Oct', normalizeComponentPaymentMonth('October'), 'Oct');
check('oct -> Oct', normalizeComponentPaymentMonth('oct'), 'Oct');
check('invalid -> null', normalizeComponentPaymentMonth('foo'), null);

section('3. Yearly component due in payment month only');
{
  const yearlyHra = { frequency: 'yearly', paymentMonth: 'April' };
  check('Apr due', isComponentPaymentMonthDue(yearlyHra, 'Apr'), true);
  check('Jun not due', isComponentPaymentMonthDue(yearlyHra, 'Jun'), false);
}

section('4. Fixed component amount');
{
  const comp = { calculationType: 'fixed', value: 5000 };
  check('fixed 5000', calculateComponentAmount(comp, { baseSalary: 20000 }), 5000);
}

section('5. Percentage of basic');
{
  const comp = { calculationType: 'percentage', value: 40, basedOn: 'basic' };
  check('40% of 25000', calculateComponentAmount(comp, { baseSalary: 25000 }), 10000);
}

section('6. Max limit cap');
{
  const comp = { calculationType: 'percentage', value: 50, basedOn: 'basic', maxLimit: 8000 };
  check('capped at 8000', calculateComponentAmount(comp, { baseSalary: 25000 }), 8000);
}

section('7. Override disabled returns 0');
{
  const comp = { calculationType: 'fixed', value: 3000 };
  check('disabled override', calculateComponentAmount(comp, { baseSalary: 20000 }, { disabled: true }), 0);
}

section('8. Override amount');
{
  const comp = { calculationType: 'fixed', value: 3000 };
  check('override 4500', calculateComponentAmount(comp, { baseSalary: 20000 }, { overrideAmount: 4500 }), 4500);
  check('override 0', calculateComponentAmount(comp, { baseSalary: 20000 }, { overrideAmount: 0, hasExplicitOverride: true }), 0);
}

section('8b. Zero override string parsing');
{
  const parsed = normalizeOverrides([{ category: 'earnings', name: 'Diwali', overrideAmount: '0' }]);
  check('string 0 parsed', parsed[0]?.overrideAmount, 0);
  check('string 0 explicit flag', parsed[0]?.hasExplicitOverride, true);
  check('explicit zero override', hasExplicitOverrideAmount(parsed[0]), true);
  check('zero override in breakdown', shouldIncludeComponentInBreakdown(0, parsed[0]), true);
  check('org zero value in breakdown', shouldIncludeComponentInBreakdown(0, null), true);
  check('disabled override excluded', shouldIncludeComponentInBreakdown(5000, { disabled: true }), false);
}

section('8b2. Mongoose-like subdoc override (payroll reload)');
{
  function fakeSubdoc(data) {
    return Object.create({
      get category() { return data.category; },
      get code() { return data.code; },
      get name() { return data.name; },
      get overrideAmount() { return data.overrideAmount; },
      get disabled() { return data.disabled; },
      toObject() { return { ...data }; },
    });
  }
  const raw = [
    fakeSubdoc({
      category: 'earnings',
      code: 'joining bonus',
      name: 'Joining Bonus',
      overrideAmount: 500,
      disabled: false,
    }),
  ];
  const parsed = normalizeOverrides(raw);
  check('subdoc override amount kept', parsed[0]?.overrideAmount, 500);
  check('subdoc hasExplicitOverride', parsed[0]?.hasExplicitOverride, true);
  const jb = { name: 'Joining Bonus', code: 'JB', calculationType: 'fixed', value: 200 };
  check(
    'subdoc override applied in calc',
    calculateComponentAmount(jb, {}, findComponentOverride(parsed, 'earnings', jb)),
    500
  );
}

section('8c. Zero override visible in structure preview');
{
  const salaryComponents = [
    {
      category: 'earnings',
      components: [
        {
          name: 'Diwali',
          code: 'diwali',
          calculationType: 'fixed',
          value: 5000,
          status: 'active',
          frequency: 'yearly',
          paymentMonth: 'October',
        },
      ],
    },
  ];
  const preview = buildSalaryStructurePreview(salaryComponents, { baseSalary: 25000, grossSalary: 25000 }, [
    { category: 'earnings', name: 'Diwali', overrideAmount: 0 },
  ]);
  const diwali = preview.earnings.find((e) => e.code === 'diwali');
  check('diwali present with zero override', Boolean(diwali), true);
  check('diwali amount is 0', diwali?.monthlyAmount, 0);
  check('diwali isOverridden', diwali?.isOverridden, true);
}

section('8d. Org zero-value component visible in structure preview');
{
  const salaryComponents = [
    {
      category: 'earnings',
      components: [
        {
          name: 'hekki',
          code: 'hhhas',
          calculationType: 'fixed',
          value: 0,
          status: 'active',
          frequency: 'monthly',
        },
      ],
    },
  ];
  const preview = buildSalaryStructurePreview(salaryComponents, { baseSalary: 25000, grossSalary: 25000 });
  const hekki = preview.earnings.find((e) => e.code === 'hhhas');
  check('org zero component present', Boolean(hekki), true);
  check('org zero component amount is 0', hekki?.monthlyAmount, 0);
  check('org zero component not overridden', hekki?.isOverridden, false);
}

section('9. Salary structure preview with HRA');
{
  const salaryComponents = [
    {
      category: 'earnings',
      components: [
        {
          name: 'HRA',
          code: 'HRA',
          type: 'earning',
          calculationType: 'percentage',
          value: 40,
          basedOn: 'basic',
          status: 'active',
          frequency: 'monthly',
        },
      ],
    },
  ];
  const preview = buildSalaryStructurePreview(salaryComponents, { baseSalary: 15000, grossSalary: 22000 });
  check('basic line present', preview.earnings[0].name, 'Basic Salary');
  check('HRA 40% of basic', preview.earnings.find((e) => e.code === 'HRA')?.monthlyAmount, 6000);
  check('total earnings monthly', preview.totals.earningsMonthly, 21000);
}

section('10. One-time component not due twice');
{
  const comp = { name: 'Joining Bonus', frequency: 'one-time', paymentMonth: 'Apr', status: 'active' };
  const paidKeys = new Set(['earnings:name:joining bonus']);
  check('Apr first time', shouldIncludeSalaryComponent(comp, 'earnings', 'Apr', new Set()), true);
  check('already paid', shouldIncludeSalaryComponent(comp, 'earnings', 'Apr', paidKeys), false);
}

section('11. sanitizeSalaryComponent clears paymentMonth for monthly');
{
  const sanitized = sanitizeSalaryComponent({ frequency: 'monthly', paymentMonth: 'Jan' });
  check('monthly clears paymentMonth', sanitized.paymentMonth, '');
}

section('12. findComponentOverride by code');
{
  const overrides = [{ category: 'earnings', code: 'HRA', overrideAmount: 7000 }];
  const found = findComponentOverride(overrides, 'earnings', { name: 'HRA', code: 'HRA' });
  check('found override', found?.overrideAmount, 7000);
}

section('13. Yearly component visible in structure preview without payroll month');
{
  const salaryComponents = [
    {
      category: 'earnings',
      components: [
        {
          name: 'diwali bonus',
          code: 'diwali_bonus',
          calculationType: 'fixed',
          value: 3000,
          status: 'active',
          frequency: 'yearly',
          paymentMonth: 'October',
        },
      ],
    },
  ];
  const preview = buildSalaryStructurePreview(salaryComponents, { baseSalary: 55000, grossSalary: 55500 });
  const diwali = preview.earnings.find((e) => e.code === 'diwali_bonus');
  check('yearly amount shown in preview', diwali?.monthlyAmount, 3000);
  check('yearly not added to monthly gross', preview.totals.earningsMonthly, 55000);
}

section('14. Derive basic from gross — no extra components');
{
  const salaryComponents = [{ category: 'earnings', components: [] }];
  const derived = deriveBasicFromTargetGross(40000, salaryComponents);
  check('basic equals gross when no components', derived.baseSalary, 40000);
  check('computed gross matches', derived.computedGross, 40000);
}

section('15. Derive basic from gross — HRA 40% of basic');
{
  const salaryComponents = [
    {
      category: 'earnings',
      components: [
        {
          name: 'HRA',
          code: 'HRA',
          calculationType: 'percentage',
          value: 40,
          basedOn: 'basic',
          status: 'active',
          frequency: 'monthly',
        },
      ],
    },
  ];
  const derived = deriveBasicFromTargetGross(28000, salaryComponents);
  check('derived basic', derived.baseSalary, 20000);
  const forward = computeMonthlyGrossFromBasic(derived.baseSalary, salaryComponents);
  check('forward gross', forward.grossSalary, 28000);
}

section('16. resolveSalaryBasesFromInput gross mode');
{
  const salaryComponents = [{ category: 'earnings', components: [] }];
  const resolved = resolveSalaryBasesFromInput({
    grossSalary: 40000,
    salaryComponents,
  });
  check('input mode gross', resolved?.inputMode, 'gross');
  check('resolved basic', resolved?.baseSalary, 40000);
  check('target gross', resolved?.targetGross, 40000);
}

section('17. Basic = 30% of gross (admin component rule)');
{
  const salaryComponents = [
    {
      category: 'earnings',
      components: [
        {
          name: 'Basic',
          code: 'basic',
          calculationType: 'percentage',
          value: 30,
          basedOn: 'gross',
          status: 'active',
          frequency: 'monthly',
        },
        {
          name: 'Joining Bonus',
          code: 'JB',
          calculationType: 'fixed',
          value: 200,
          status: 'active',
          frequency: 'monthly',
        },
        {
          name: 'compliment bonus',
          code: 'compliment',
          calculationType: 'fixed',
          value: 100,
          status: 'active',
          frequency: 'monthly',
        },
      ],
    },
  ];
  const resolved = resolveSalaryBasesFromInput({
    grossSalary: 100000,
    salaryComponents,
  });
  check('gross mode', resolved?.inputMode, 'gross');
  check('basic is 30% of 100000', resolved?.baseSalary, 30000);

  const result = buildPayrollEarningsBreakdown({
    salaryComponents,
    resolvedBase: resolved.baseSalary,
    inputMode: 'gross',
    targetGross: 100000,
  });
  const basic = result.earningsBreakdown.find((e) => e.isBasic);
  check('basic in components list', Boolean(basic), true);
  check('basic amount 30000', basic?.calculatedAmount, 30000);
  check('gross stays 100000', result.grossSalary, 100000);
  check('special allowance fills gap', result.earningsBreakdown.some((e) => e.isBalancing), true);
}

section('18. Org Basic fixed 0 — remainder goes to Special Allowance');
{
  const salaryComponents = [
    {
      category: 'earnings',
      components: [
        {
          name: 'Basic Salary',
          code: 'BASIC',
          calculationType: 'fixed',
          value: 0,
          basedOn: 'none',
          status: 'active',
          frequency: 'monthly',
        },
      ],
    },
  ];
  const resolved = resolveSalaryBasesFromInput({
    baseSalary: 0,
    grossSalary: 40000,
    salaryComponents,
  });
  check('gross mode', resolved?.inputMode, 'gross');
  check('basic stays 0 from org rule', resolved?.baseSalary, 0);

  const result = buildPayrollEarningsBreakdown({
    salaryComponents,
    resolvedBase: resolved.baseSalary,
    inputMode: 'gross',
    targetGross: 40000,
  });
  const special = result.earningsBreakdown.find((e) => e.isBalancing);
  check('special allowance fills 40000', special?.calculatedAmount, 40000);
}

section('18b. Typed/Excel Basic 20000 of 40000 gross → special 20000');
{
  const salaryComponents = [
    {
      category: 'earnings',
      components: [
        {
          name: 'Basic Salary',
          code: 'BASIC',
          calculationType: 'fixed',
          value: 0,
          basedOn: 'none',
          status: 'active',
          frequency: 'monthly',
        },
      ],
    },
  ];
  const resolved = resolveSalaryBasesFromInput({
    grossSalary: 40000,
    salaryComponents,
    overrides: [
      {
        category: 'earnings',
        code: 'BASIC',
        name: 'Basic Salary',
        overrideAmount: 20000,
        hasExplicitOverride: true,
      },
    ],
  });
  check('typed basic used', resolved?.baseSalary, 20000);
  const result = buildPayrollEarningsBreakdown({
    salaryComponents,
    resolvedBase: resolved.baseSalary,
    overrides: resolved.overridesForCalc,
    inputMode: 'gross',
    targetGross: 40000,
  });
  const special = result.earningsBreakdown.find((e) => e.isBalancing);
  check('special allowance remaining 20000', special?.calculatedAmount, 20000);
}

section('19. Excel Basic override still wins over org % of gross');
{
  const salaryComponents = [
    {
      category: 'earnings',
      components: [
        {
          name: 'Basic Salary',
          code: 'BASIC',
          calculationType: 'percentage',
          value: 50,
          basedOn: 'gross',
          status: 'active',
          frequency: 'monthly',
        },
      ],
    },
  ];
  const resolved = resolveSalaryBasesFromInput({
    grossSalary: 40000,
    salaryComponents,
    overrides: [
      {
        category: 'earnings',
        code: 'BASIC',
        name: 'Basic Salary',
        overrideAmount: 8000,
        hasExplicitOverride: true,
      },
    ],
  });
  check('explicit basic used', resolved?.baseSalary, 8000);
}

const { mapSalaryRevisionRow } = require('../utils/payroll/parsePayrollImportFile');

section('20. Excel Basic headers / formatted numbers');
{
  const fromName = mapSalaryRevisionRow(
    {
      employee_code: 'NSS13',
      revision_type: 'annual_hike',
      gross_salary: 40000,
      'Basic Salary': 12000,
    },
    1
  );
  check('Basic Salary header', fromName.baseSalary, 12000);

  const fromPay = mapSalaryRevisionRow(
    {
      employee_code: 'NSS13',
      revision_type: 'annual_hike',
      gross_salary: 40000,
      'Basic Pay': '8,000',
    },
    1
  );
  check('Basic Pay + comma', fromPay.baseSalary, 8000);

  const pfActuals = mapSalaryRevisionRow(
    {
      employee_code: 'NSS13',
      revision_type: 'annual_hike',
      gross_salary: 40000,
      'Basic Salary': 12000,
      epf: 'TRUE',
      pf_on_actuals: 'TRUE',
    },
    1
  );
  check('EPF applicable from Excel', pfActuals.statutoryFlags.epfApplicable, true);
  check('PF on actuals from Excel', pfActuals.statutoryFlags.pfOnActuals, true);

  const pfCeiling = mapSalaryRevisionRow(
    {
      employee_code: 'NSS13',
      revision_type: 'annual_hike',
      gross_salary: 40000,
      epf: false,
      pf_on_actuals: false,
    },
    1
  );
  check('EPF disable from Excel', pfCeiling.statutoryFlags.epfApplicable, false);
  check('PF on actuals false keeps ceiling', pfCeiling.statutoryFlags.pfOnActuals, false);
}

const {
  validateSalaryRevisionRows,
  applyStatutoryFlagsToEmployee,
} = require('../utils/payroll/salaryRevisionImportHelper');

section('20b. Excel pf_on_actuals writes employee epfOverride');
{
  const employee = {
    statutoryInfo: {
      epfApplicable: true,
      epfOverride: { enabled: false, applyCeiling: true },
    },
    markModified() {},
  };
  applyStatutoryFlagsToEmployee(employee, { pfOnActuals: true });
  check('override enabled', employee.statutoryInfo.epfOverride.enabled, true);
  check('ceiling off on actuals', employee.statutoryInfo.epfOverride.applyCeiling, false);
  check('pfOnActuals not stored on employee', employee.statutoryInfo.pfOnActuals, undefined);
}

section('21. Bulk preview blank Basic stays 0 (org rule) and is still valid');
{
  const salaryComponents = [
    {
      category: 'earnings',
      components: [
        {
          name: 'Basic Salary',
          code: 'BASIC',
          calculationType: 'fixed',
          value: 0,
          basedOn: 'none',
          status: 'active',
          frequency: 'monthly',
        },
      ],
    },
  ];
  const employees = [
    {
      _id: 'emp1',
      customId: 'NSS13',
      firstName: 'Ravi',
      lastName: 'Jaiswal',
      payrollInfo: { baseSalary: 6120, grossSalary: 50000, ctc: 629016, componentOverrides: [] },
    },
  ];
  const rows = validateSalaryRevisionRows(
    [
      {
        rowNumber: 1,
        employeeCode: 'NSS13',
        revisionType: 'annual_hike',
        grossSalary: 40000,
        baseSalary: null,
        ctcInput: null,
        effectiveFrom: '2026-04-01',
        componentAmounts: {},
        blankComponentHeaders: [],
      },
    ],
    employees,
    salaryComponents,
    null,
    []
  );
  check('row valid', rows[0]?.valid, true);
  check('new basic 0 from org rule', rows[0]?.newSalary?.basicSalary, 0);
  check('new gross 40000', rows[0]?.newSalary?.grossSalary, 40000);
}

console.log('\n=========================');
console.log(`Total: ${pass + fail}  PASS: ${pass}  FAIL: ${fail}`);
console.log('=========================');
process.exit(fail > 0 ? 1 : 0);
