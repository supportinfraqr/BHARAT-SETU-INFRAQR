/**
 * Standalone EPF calculator test harness
 * Run: `node scripts/test-epf-calculator.js`
 *
 * No DB, no server, no Postman — directly exercises every UI flag of the
 * Statutory Compliance > EPF page against the centralized calculator.
 */

const {
    calculateEpf,
    resolveEpfApplicableWage,
    sumConsiderForEpf,
    calculateEsi,
    sumConsiderForEsi,
    calculateProfessionalTax,
    calculateLwf,
    resolveLwfDeductionsPerYear,
    buildNetPaySchedule,
    calculateStatutoryBonus,
} = require('../utils/payroll/statutoryCalculator');

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

// --- Scenario 1 : Plain vanilla EPF, no flags enabled ---
section('1. Vanilla EPF (basic 25000, ceiling 15000, 12%/12%)');
{
    const r = calculateEpf({
        epfConfig: {
            isEnabled: true,
            employeeContributionRate: 12,
            employerContributionRate: 12,
            restrictedPfWage: 15000,
            contributionPreferences: {},
        },
        baseSalary: 25000,
    });
    check('epfWage capped at 15000', r.epfWage, 15000);
    check('employee contribution = 1800', r.employeeContribution, 1800);
    check('employer contribution = 1800', r.employerContribution, 1800);
    check('edli = 0 (disabled)', r.edliContribution, 0);
    check('admin = 0 (disabled)', r.adminCharges, 0);
}

// --- Scenario 2 : EDLI + Admin Charges enabled ---
section('2. EDLI + Admin Charges enabled');
{
    const r = calculateEpf({
        epfConfig: {
            isEnabled: true,
            employeeContributionRate: 12,
            employerContributionRate: 12,
            restrictedPfWage: 15000,
            contributionPreferences: {
                edliContribution: true,
                adminCharges: true,
            },
        },
        baseSalary: 25000,
    });
    check('edli = 75 (0.5% of 15000)', r.edliContribution, 75);
    check('admin = 75 (0.5% of 15000, min applied)', r.adminCharges, 75);
    check('totalEmployerCost = 1800+75+75', r.totalEmployerCost, 1950);
}

// --- Scenario 3 : Admin minimum kicks in for low wage ---
section('3. Admin Charges minimum (basic 8000)');
{
    const r = calculateEpf({
        epfConfig: {
            isEnabled: true,
            employeeContributionRate: 12,
            employerContributionRate: 12,
            restrictedPfWage: 15000,
            contributionPreferences: { adminCharges: true },
        },
        baseSalary: 8000,
    });
    check('admin enforces ₹75 min (raw would be 40)', r.adminCharges, 75);
}

// --- Scenario 4 : Employer PF Contribution toggle OFF ---
section('4. Employer PF Contribution checkbox = OFF');
{
    const r = calculateEpf({
        epfConfig: {
            isEnabled: true,
            employeeContributionRate: 12,
            employerContributionRate: 12,
            restrictedPfWage: 15000,
            contributionPreferences: {
                employerPfContribution: false,
                edliContribution: true,
                adminCharges: true,
            },
        },
        baseSalary: 20000,
    });
    check('employee still pays 1800', r.employeeContribution, 1800);
    check('employer contribution = 0', r.employerContribution, 0);
    check('edli still 75 (independent)', r.edliContribution, 75);
}

// --- Scenario 5 : ABRY scheme — employer share waived ---
section('5. ABRY Scheme eligible');
{
    const r = calculateEpf({
        epfConfig: {
            isEnabled: true,
            employeeContributionRate: 12,
            employerContributionRate: 12,
            restrictedPfWage: 15000,
            eligibleForAbryScheme: true,
            contributionPreferences: {
                edliContribution: true,
                adminCharges: true,
            },
        },
        baseSalary: 14000,
    });
    check('employee still pays (1680)', r.employeeContribution, 1680);
    check('employer = 0 (ABRY waiver)', r.employerContribution, 0);
    check('edli = 0 (waived under ABRY)', r.edliContribution, 0);
    check('admin = 0 (waived under ABRY)', r.adminCharges, 0);
    check('abryApplied flag true', r.abryApplied, true);
}

// --- Scenario 6 : Setting ON — full PF components when LOP wage below ceiling ---
section('6. LOP below ceiling + considerAllPfComponentsAfterLopBelowCeiling=true');
{
    const epfConfig = {
        isEnabled: true,
        employeeContributionRate: 12,
        employerContributionRate: 12,
        restrictedPfWage: 15000,
        proRateRestrictedPfWage: false,
        considerAllPfComponentsAfterLopBelowCeiling: true,
        contributionPreferences: {},
    };
    const resolution = resolveEpfApplicableWage({
        epfConfig,
        fullMonthEpfWage: 14000,
        workingDays: 26,
        paidDays: 16,
    });
    check('uses full month PF wage', resolution.wage, 14000);
    check('lop adjusted tracked', resolution.lopAdjustedPfWage, 8615);

    const r = calculateEpf({
        epfConfig,
        baseSalary: 10000,
        epfApplicableWage: resolution.wage,
        epfWageResolution: resolution,
    });
    check('epfWage = 14000', r.epfWage, 14000);
    check('employee = 1680', r.employeeContribution, 1680);
}

// --- Scenario 6b : Setting OFF — pro-rate PF on LOP ---
section('6b. LOP below ceiling + considerAllPfComponentsAfterLopBelowCeiling=false');
{
    const epfConfig = {
        isEnabled: true,
        employeeContributionRate: 12,
        employerContributionRate: 12,
        restrictedPfWage: 15000,
        proRateRestrictedPfWage: false,
        considerAllPfComponentsAfterLopBelowCeiling: false,
        contributionPreferences: {},
    };
    const resolution = resolveEpfApplicableWage({
        epfConfig,
        fullMonthEpfWage: 14000,
        workingDays: 26,
        paidDays: 16,
    });
    check('uses LOP-adjusted wage', resolution.wage, 8615);

    const r = calculateEpf({
        epfConfig,
        baseSalary: 10000,
        epfApplicableWage: resolution.wage,
        epfWageResolution: resolution,
    });
    check('epfWage = 8615', r.epfWage, 8615);
    check('employee = 1034', r.employeeContribution, 1034);
}

// --- Scenario 6c : Pro-rate Restricted PF Wage ON — ceiling reduced on LOP ---
section('6c. proRateRestrictedPfWage=true — ceiling pro-rated on LOP');
{
    const epfConfig = {
        isEnabled: true,
        employeeContributionRate: 12,
        employerContributionRate: 12,
        restrictedPfWage: 15000,
        proRateRestrictedPfWage: true,
        considerAllPfComponentsAfterLopBelowCeiling: true,
        contributionPreferences: {},
    };
    const resolution = resolveEpfApplicableWage({
        epfConfig,
        fullMonthEpfWage: 14000,
        workingDays: 26,
        paidDays: 16,
    });
    const r = calculateEpf({
        epfConfig,
        baseSalary: 10000,
        epfApplicableWage: resolution.wage,
        epfWageResolution: resolution,
    });
    // ceiling = 15000 × 16/26 ≈ 9231; wage = 14000 → epfWage ≈ 9231
    check('pro-rated ceiling applied', r.details?.proRateRestrictedPfWage, true);
    check('epfWage ≈ 9231', r.epfWage, 9231);
    check('employee ≈ 1108', r.employeeContribution, 1108);
}

// --- Scenario 6d : Pro-rate Restricted PF Wage OFF — full ₹15,000 ceiling on LOP ---
section('6d. proRateRestrictedPfWage=false — full ceiling on LOP');
{
    const epfConfig = {
        isEnabled: true,
        employeeContributionRate: 12,
        employerContributionRate: 12,
        restrictedPfWage: 15000,
        proRateRestrictedPfWage: false,
        considerAllPfComponentsAfterLopBelowCeiling: true,
        contributionPreferences: {},
    };
    const resolution = resolveEpfApplicableWage({
        epfConfig,
        fullMonthEpfWage: 14000,
        workingDays: 26,
        paidDays: 16,
    });
    const r = calculateEpf({
        epfConfig,
        baseSalary: 10000,
        epfApplicableWage: resolution.wage,
        epfWageResolution: resolution,
    });
    check('full ceiling kept', r.details?.effectiveCeiling, 15000);
    check('epfWage = 14000', r.epfWage, 14000);
    check('employee = 1680', r.employeeContribution, 1680);
}

// --- Scenario 7 : High basic — still capped at ceiling when full month used ---
section('7. Suresh-style scenario (basic 25k) → still 1800 when no LOP');
{
    const r = calculateEpf({
        epfConfig: {
            isEnabled: true,
            employeeContributionRate: 12,
            employerContributionRate: 12,
            restrictedPfWage: 15000,
            contributionPreferences: {},
        },
        baseSalary: 25000,
    });
    check('epfWage capped at ceiling', r.epfWage, 15000);
    check('employee = 1800', r.employeeContribution, 1800);
    check('employer = 1800', r.employerContribution, 1800);
}

// --- Scenario 8 : Per-employee override (disabled — UI + calculator override commented) ---
// section('8. Allow Employee Level Override (custom 10% rate, no ceiling)');
// {
//     const r = calculateEpf({
//         epfConfig: {
//             isEnabled: true,
//             employeeContributionRate: 12,
//             employerContributionRate: 12,
//             restrictedPfWage: 15000,
//             allowEmployeeLevelOverride: true,
//             contributionPreferences: {},
//         },
//         baseSalary: 40000,
//         employeeStatutoryInfo: {
//             epfOverride: {
//                 enabled: true,
//                 employeeContributionRate: 10,
//                 employerContributionRate: 10,
//                 applyCeiling: false,
//             },
//         },
//     });
//     check('no ceiling — wage = 40000', r.epfWage, 40000);
//     check('employee = 4000 (10% override)', r.employeeContribution, 4000);
//     check('employer = 4000 (10% override)', r.employerContribution, 4000);
//     check('overrideUsed flag set', r.details.overrideUsed, true);
// }

// --- Scenario 9 : Per-employee opt-out ---
section('9. Per-employee epfApplicable = false');
{
    const r = calculateEpf({
        epfConfig: { isEnabled: true, employeeContributionRate: 12 },
        baseSalary: 50000,
        employeeStatutoryInfo: { epfApplicable: false },
    });
    check('completely skipped', r.applicable, false);
    check('employee contribution = 0', r.employeeContribution, 0);
}

// --- Scenario 10 : EPF globally disabled ---
section('10. EPF master switch OFF');
{
    const r = calculateEpf({
        epfConfig: { isEnabled: false },
        baseSalary: 50000,
    });
    check('returns empty / not applicable', r.applicable, false);
    check('all zero', r.totalEmployerCost, 0);
}

// --- Scenario 11 : considerForEPF based wage ---
section('11. considerForEPF sum > basic (basic+DA flagged)');
{
    const r = calculateEpf({
        epfConfig: {
            isEnabled: true,
            employeeContributionRate: 12,
            employerContributionRate: 12,
            restrictedPfWage: 25000,
            contributionPreferences: {},
        },
        baseSalary: 12000,
        epfApplicableWage: 18000, // basic 12k + DA 6k flagged considerForEPF
    });
    check('wage used = 18000 (not capped, ceiling=25000)', r.epfWage, 18000);
    check('employee = 2160 (12% of 18000)', r.employeeContribution, 2160);
}

// --- Scenario 12 : payroll-run line shape honors Consider for EPF tick ---
section('12. payroll lines — DA tagged EPF, HRA not tagged');
{
    const wage = sumConsiderForEpf([
        { componentName: 'Basic Salary', amount: 10000, considerForEPF: false },
        { componentName: 'DA', amount: 5000, considerForEPF: true },
        { componentName: 'HRA', amount: 4000, considerForEPF: false },
    ], 10000);
    check('EPF wage = Basic + DA (tag), not HRA', wage, 15000);
}

section('ESI-12. payroll lines — Special Allowance tagged ESI');
{
    const wage = sumConsiderForEsi([
        { componentName: 'Basic Salary', amount: 10000, considerForESI: false },
        { componentName: 'HRA', amount: 4000, considerForESI: false },
        { componentName: 'Special Allowance', amount: 3000, considerForESI: true },
    ], 17000);
    check('ESI wage = Basic + Special Allowance', wage, 13000);
}

// =====================================================================
// ESI scenarios
// =====================================================================

// --- ESI 1 : Below wage limit ---
section('ESI-1. Gross 18000, below 21000 limit');
{
    const r = calculateEsi({
        esiConfig: {
            isEnabled: true,
            employeeContributionRate: 0.75,
            employerContributionRate: 3.25,
            wageLimit: 21000,
        },
        grossSalary: 18000,
    });
    check('applicable', r.applicable, true);
    check('employee = 135 (0.75% of 18000)', r.employeeContribution, 135);
    check('employer = 585 (3.25% of 18000)', r.employerContribution, 585);
    check('includeEmployerInCtc default true', r.includeEmployerInCtc, true);
}

// --- ESI 2 : Above wage limit (exempt) ---
section('ESI-2. Gross 25000 above limit — exempt');
{
    const r = calculateEsi({
        esiConfig: {
            isEnabled: true,
            employeeContributionRate: 0.75,
            employerContributionRate: 3.25,
            wageLimit: 21000,
        },
        grossSalary: 25000,
    });
    check('not applicable', r.applicable, false);
    check('employee = 0', r.employeeContribution, 0);
    check('employer = 0', r.employerContribution, 0);
}

// --- ESI 3 : Include Employer in Salary Structure = OFF ---
section('ESI-3. includeEmployerInSalaryStructure = false');
{
    const r = calculateEsi({
        esiConfig: {
            isEnabled: true,
            employeeContributionRate: 0.75,
            employerContributionRate: 3.25,
            wageLimit: 21000,
            includeEmployerInSalaryStructure: false,
        },
        grossSalary: 20000,
    });
    check('employer still computed (statutory due)', r.employerContribution, 650);
    check('includeEmployerInCtc = false', r.includeEmployerInCtc, false);
}

// --- ESI 4 : Per-employee opt-out (compact calculator payload) ---
section('ESI-4. Employee statutoryInfo.esiApplicable = false');
{
    const r = calculateEsi({
        esiConfig: {
            isEnabled: true,
            employeeContributionRate: 0.75,
            employerContributionRate: 3.25,
            wageLimit: 21000,
        },
        grossSalary: 18000,
        employeeStatutoryInfo: { esiApplicable: false },
    });
    check('skipped — not applicable', r.applicable, false);
    check('employee = 0', r.employeeContribution, 0);
}

section('ESI-4b. Legacy employee doc esiApplicable=false still applies');
{
    const r = calculateEsi({
        esiConfig: {
            isEnabled: true,
            employeeContributionRate: 0.75,
            employerContributionRate: 3.25,
            wageLimit: 21000,
        },
        grossSalary: 18000,
        employeeStatutoryInfo: { esiApplicable: false, esiNumber: '', uan: '', pfAccountNumber: '' },
    });
    check('applicable despite legacy false', r.applicable, true);
    check('employee = 135', r.employeeContribution, 135);
}

section('ESI-4c. esiOptedOut = true skips');
{
    const r = calculateEsi({
        esiConfig: {
            isEnabled: true,
            employeeContributionRate: 0.75,
            employerContributionRate: 3.25,
            wageLimit: 21000,
        },
        grossSalary: 18000,
        employeeStatutoryInfo: { esiApplicable: false, esiOptedOut: true, esiNumber: '', uan: '' },
    });
    check('skipped via esiOptedOut', r.applicable, false);
}

// --- ESI 5 : ESI master switch OFF ---
section('ESI-5. ESI master switch OFF');
{
    const r = calculateEsi({
        esiConfig: { isEnabled: false },
        grossSalary: 18000,
    });
    check('not applicable', r.applicable, false);
    check('employee = 0', r.employeeContribution, 0);
}

// --- ESI 6 : considerForESI based wage ---
section('ESI-6. considerForESI wage smaller than gross');
{
    const r = calculateEsi({
        esiConfig: {
            isEnabled: true,
            employeeContributionRate: 0.75,
            employerContributionRate: 3.25,
            wageLimit: 21000,
        },
        grossSalary: 20000,
        esiApplicableWage: 17000, // some component not flagged considerForESI
    });
    check('uses considerForESI wage = 17000', r.wageUsed, 17000);
    check('employee = 128 (0.75% of 17000, rounded)', r.employeeContribution, 128);
}

// --- ESI 7 : Boundary — exactly at wage limit ---
section('ESI-7. Gross exactly 21000 (boundary)');
{
    const r = calculateEsi({
        esiConfig: {
            isEnabled: true,
            employeeContributionRate: 0.75,
            employerContributionRate: 3.25,
            wageLimit: 21000,
        },
        grossSalary: 21000,
    });
    check('applicable at boundary', r.applicable, true);
    check('employee = 158 (rounded)', r.employeeContribution, 158);
}

// =====================================================================
// Professional Tax scenarios
// =====================================================================

const sampleMultiStatePtConfig = {
    isEnabled: true,
    deductionCycle: 'monthly',
    states: [
        {
            stateName: 'Maharashtra',
            ptNumber: 'MH-PT-001',
            isApplicable: true,
            ptSlabs: [
                { salaryRangeFrom: 0,     salaryRangeTo: 7500,    taxAmount: 0 },
                { salaryRangeFrom: 7501,  salaryRangeTo: 10000,   taxAmount: 175 },
                { salaryRangeFrom: 10001, salaryRangeTo: 9999999, taxAmount: 200 },
            ],
        },
        {
            stateName: 'Karnataka',
            ptNumber: 'KA-PT-001',
            isApplicable: true,
            ptSlabs: [
                { salaryRangeFrom: 0,     salaryRangeTo: 14999,  taxAmount: 0 },
                { salaryRangeFrom: 15000, salaryRangeTo: 9999999, taxAmount: 200 },
            ],
        },
    ],
};

// --- PT 1 : Employee in Karnataka picks Karnataka slab (not first state) ---
section('PT-1. Multi-state — employee in Karnataka picks Karnataka slab');
{
    const r = calculateProfessionalTax({
        ptConfig: sampleMultiStatePtConfig,
        grossSalary: 30000,
        employeeStatutoryInfo: { ptState: 'Karnataka', ptApplicable: true },
    });
    check('state used = Karnataka', r.details.stateUsed, 'Karnataka');
    check('amount = 200 (Karnataka slab)', r.amount, 200);
}

// --- PT 2 : Employee in Maharashtra below ₹7500 → no PT ---
section('PT-2. Maharashtra, gross 5000 — zero slab');
{
    const r = calculateProfessionalTax({
        ptConfig: sampleMultiStatePtConfig,
        grossSalary: 5000,
        employeeState: 'Maharashtra',
    });
    check('applicable = false (zero slab)', r.applicable, false);
    check('amount = 0', r.amount, 0);
}

// --- PT 3 : Maharashtra mid slab ---
section('PT-3. Maharashtra, gross 9000 — ₹175 slab');
{
    const r = calculateProfessionalTax({
        ptConfig: sampleMultiStatePtConfig,
        grossSalary: 9000,
        employeeState: 'Maharashtra',
    });
    check('amount = 175', r.amount, 175);
}

// --- PT 4 : Per-employee opt-out ---
section('PT-4. Employee ptApplicable=false skips PT');
{
    const r = calculateProfessionalTax({
        ptConfig: sampleMultiStatePtConfig,
        grossSalary: 30000,
        employeeStatutoryInfo: { ptApplicable: false, ptState: 'Karnataka' },
    });
    check('applicable = false', r.applicable, false);
    check('amount = 0', r.amount, 0);
}

// --- PT 5 : PT master switch OFF ---
section('PT-5. PT master switch OFF');
{
    const r = calculateProfessionalTax({
        ptConfig: { isEnabled: false, states: [] },
        grossSalary: 30000,
    });
    check('applicable = false', r.applicable, false);
    check('amount = 0', r.amount, 0);
}

// --- PT 6 : Half-yearly cycle — deducts only in Sep / Mar ---
section('PT-6. Half-yearly cycle — Tamil Nadu style');
{
    const cfg = { ...sampleMultiStatePtConfig, deductionCycle: 'half-yearly' };

    const rJan = calculateProfessionalTax({
        ptConfig: cfg,
        grossSalary: 30000,
        employeeState: 'Karnataka',
        month: 'Jan',
    });
    check('Jan — skipped (not Sep/Mar)', rJan.amount, 0);

    const rSep = calculateProfessionalTax({
        ptConfig: cfg,
        grossSalary: 30000,
        employeeState: 'Karnataka',
        month: 'Sep',
    });
    check('Sep — deducted', rSep.amount, 200);
}

// --- PT 7 : Yearly cycle — only Mar ---
section('PT-7. Yearly cycle — only March');
{
    const cfg = { ...sampleMultiStatePtConfig, deductionCycle: 'yearly' };
    const rFeb = calculateProfessionalTax({
        ptConfig: cfg,
        grossSalary: 30000,
        employeeState: 'Karnataka',
        month: 'Feb',
    });
    check('Feb — skipped', rFeb.amount, 0);

    const rMar = calculateProfessionalTax({
        ptConfig: cfg,
        grossSalary: 30000,
        employeeState: 'Karnataka',
        month: 'Mar',
    });
    check('Mar — deducted', rMar.amount, 200);
}

// --- PT 7b : Quarterly cycle — Jan / Apr / Jul / Oct ---
section('PT-7b. Quarterly cycle — Jan, Apr, Jul, Oct');
{
    const cfg = { ...sampleMultiStatePtConfig, deductionCycle: 'quarterly' };
    const rFeb = calculateProfessionalTax({
        ptConfig: cfg,
        grossSalary: 30000,
        employeeState: 'Karnataka',
        month: 'Feb',
    });
    check('Feb — skipped', rFeb.amount, 0);

    const rApr = calculateProfessionalTax({
        ptConfig: cfg,
        grossSalary: 30000,
        employeeState: 'Karnataka',
        month: 'Apr',
    });
    check('Apr — deducted', rApr.amount, 200);

    const rJul = calculateProfessionalTax({
        ptConfig: cfg,
        grossSalary: 30000,
        employeeState: 'Karnataka',
        month: 'Jul',
    });
    check('Jul — deducted', rJul.amount, 200);
}

// --- PT 8 : Employee state not configured → no PT ---
section('PT-8. Unknown state — no PT when that state has no slabs');
{
    const r = calculateProfessionalTax({
        ptConfig: sampleMultiStatePtConfig,
        grossSalary: 30000,
        employeeState: 'Goa', // not configured
    });
    check('PT not applicable', r.applicable, false);
    check('PT amount = 0', r.amount, 0);
    check('reason is missing state config', r.details.reason, 'no applicable state config');
}

// --- PT 9 : isApplicable=false at state level is skipped ---
section('PT-9. State row marked isApplicable=false is ignored');
{
    const cfg = {
        isEnabled: true,
        deductionCycle: 'monthly',
        states: [
            {
                stateName: 'Maharashtra',
                isApplicable: false,
                ptSlabs: [{ salaryRangeFrom: 0, salaryRangeTo: 9999999, taxAmount: 999 }],
            },
            {
                stateName: 'Karnataka',
                isApplicable: true,
                ptSlabs: [{ salaryRangeFrom: 0, salaryRangeTo: 9999999, taxAmount: 200 }],
            },
        ],
    };
    const r = calculateProfessionalTax({
        ptConfig: cfg,
        grossSalary: 30000,
        employeeState: 'Maharashtra', // explicitly asks for inactive state
    });
    check('no PT (Karnataka slab not borrowed)', r.applicable, false);
    check('amount = 0', r.amount, 0);
    check('reason is missing state config', r.details.reason, 'no applicable state config');
}

// =====================================================================
// Labour Welfare Fund scenarios
// =====================================================================

const sampleLwfConfig = {
    isEnabled: true,
    deductionCycle: 'half-yearly',
    states: [
        { stateName: 'Maharashtra', minAmount: 0, maxAmount: 9999999, employeeShare: 6, employerShare: 18, isApplicable: true },
        { stateName: 'Karnataka',   minAmount: 0, maxAmount: 9999999, employeeShare: 20, employerShare: 40, isApplicable: true },
    ],
};

// --- LWF 1 : Half-yearly cycle — only deducts in Jun / Dec ---
section('LWF-1. Half-yearly — Jan no deduction, Jun deducted');
{
    const rJan = calculateLwf({
        lwfConfig: sampleLwfConfig,
        grossSalary: 25000,
        employeeState: 'Maharashtra',
        month: 'Jan',
    });
    check('Jan — not deducted', rJan.applicable, false);

    const rJun = calculateLwf({
        lwfConfig: sampleLwfConfig,
        grossSalary: 25000,
        employeeState: 'Maharashtra',
        month: 'Jun',
    });
    check('Jun — deducted', rJun.applicable, true);
    check('Maharashtra employee share = 6', rJun.employeeShare, 6);
    check('Maharashtra employer share = 18', rJun.employerShare, 18);
}

// --- LWF 2 : Karnataka different rate ---
section('LWF-2. Karnataka employee picks Karnataka slab');
{
    const r = calculateLwf({
        lwfConfig: sampleLwfConfig,
        grossSalary: 25000,
        employeeStatutoryInfo: { lwfState: 'Karnataka', lwfApplicable: true },
        month: 'Dec',
    });
    check('state = Karnataka', r.details.stateUsed, 'Karnataka');
    check('employee share = 20', r.employeeShare, 20);
    check('employer share = 40', r.employerShare, 40);
}

// --- LWF 3 : Per-employee opt-out ---
section('LWF-3. Employee lwfApplicable=false skips LWF');
{
    const r = calculateLwf({
        lwfConfig: sampleLwfConfig,
        grossSalary: 25000,
        employeeState: 'Karnataka',
        month: 'Jun',
        employeeStatutoryInfo: { lwfApplicable: false },
    });
    check('applicable = false', r.applicable, false);
    check('employee share = 0', r.employeeShare, 0);
}

// --- LWF 4 : LWF master switch OFF ---
section('LWF-4. LWF master switch OFF');
{
    const r = calculateLwf({
        lwfConfig: { isEnabled: false, states: [] },
        grossSalary: 25000,
        month: 'Jun',
    });
    check('applicable = false', r.applicable, false);
}

// --- LWF 5 : Monthly cycle ---
section('LWF-5. Monthly cycle — deducts every month');
{
    const cfg = { ...sampleLwfConfig, deductionCycle: 'monthly' };
    const r = calculateLwf({
        lwfConfig: cfg,
        grossSalary: 25000,
        employeeState: 'Maharashtra',
        month: 'Mar',
    });
    check('Mar (monthly) — deducted', r.applicable, true);
    check('employee share = 6', r.employeeShare, 6);
}

// --- LWF 6 : Inactive status skips state, never borrows another state ---
section('LWF-6. Inactive status / isApplicable=false skips state');
{
    const cfg = {
        isEnabled: true,
        deductionCycle: 'monthly',
        states: [
            { stateName: 'Maharashtra', employeeShare: 6, employerShare: 18, status: 'inactive', isApplicable: true },
            { stateName: 'Karnataka', employeeShare: 20, employerShare: 40, status: 'active', isApplicable: true },
        ],
    };
    const r = calculateLwf({
        lwfConfig: cfg,
        grossSalary: 25000,
        employeeState: 'Maharashtra',
        month: 'Mar',
    });
    check('no LWF (Karnataka slab not borrowed)', r.applicable, false);
    check('employee share = 0', r.employeeShare, 0);
    check('reason is missing state config', r.details.reason, 'no applicable state config');
}

// --- LWF 6b : Employee state absent from config → no deduction ---
section('LWF-6b. State not configured — no LWF deducted');
{
    const cfg = {
        isEnabled: true,
        deductionCycle: 'monthly',
        states: [
            { stateName: 'Madhya Pradesh', minAmount: 1, maxAmount: 100000, calculationType: 'percentage', employeeShare: 10, employerShare: 10, isApplicable: true },
        ],
    };

    const delhi = calculateLwf({
        lwfConfig: cfg,
        grossSalary: 60000,
        employeeState: 'Delhi',
        month: 'Mar',
    });
    check('Delhi — not applicable', delhi.applicable, false);
    check('Delhi — employee share 0', delhi.employeeShare, 0);
    check('Delhi — employer share 0', delhi.employerShare, 0);

    const mp = calculateLwf({
        lwfConfig: cfg,
        grossSalary: 60000,
        employeeState: 'Madhya Pradesh',
        month: 'Mar',
    });
    check('Madhya Pradesh — deducted', mp.applicable, true);
    check('Madhya Pradesh — 10% of gross', mp.employeeShare, 6000);
}

// --- LWF 7 : Percentage-based shares ---
section('LWF-7. Percentage calculationType on gross');
{
    const cfg = {
        isEnabled: true,
        deductionCycle: 'monthly',
        states: [
            {
                stateName: 'Maharashtra',
                calculationType: 'percentage',
                employeeShare: 0.5,
                employerShare: 1,
                status: 'active',
                isApplicable: true,
            },
        ],
    };
    const r = calculateLwf({
        lwfConfig: cfg,
        grossSalary: 20000,
        employeeState: 'Maharashtra',
        month: 'Mar',
    });
    check('employee = 100 (0.5% of 20000)', r.employeeShare, 100);
    check('employer = 200 (1% of 20000)', r.employerShare, 200);
    check('calculationType = percentage', r.details.calculationType, 'percentage');
}

// --- LWF 8 : Custom months override cycle defaults ---
section('LWF-8. Custom months (Jan, Jul) instead of Jun/Dec');
{
    const cfg = {
        isEnabled: true,
        deductionCycle: 'half-yearly',
        states: [
            {
                stateName: 'Maharashtra',
                employeeShare: 6,
                employerShare: 18,
                months: ['Jan', 'Jul'],
                status: 'active',
                isApplicable: true,
            },
        ],
    };
    const rJan = calculateLwf({
        lwfConfig: cfg,
        grossSalary: 25000,
        employeeState: 'Maharashtra',
        month: 'Jan',
    });
    check('Jan — deducted (custom)', rJan.applicable, true);

    const rJun = calculateLwf({
        lwfConfig: cfg,
        grossSalary: 25000,
        employeeState: 'Maharashtra',
        month: 'Jun',
    });
    check('Jun — skipped (not in custom months)', rJun.applicable, false);

    const rJul = calculateLwf({
        lwfConfig: cfg,
        grossSalary: 25000,
        employeeState: 'Maharashtra',
        month: 'Jul',
    });
    check('Jul — deducted (custom)', rJul.applicable, true);
}

const ALL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Months in which LWF is actually deducted across a full financial year. */
function collectLwfDeductionMonths(cfg, employeeState, grossSalary) {
    return ALL_MONTHS.filter(
        (month) => calculateLwf({ lwfConfig: cfg, grossSalary, employeeState, month }).applicable
    );
}

// --- LWF 9 : Yearly cycle — exactly one deduction per year ---
section('LWF-9. Yearly cycle (Madhya Pradesh, Oct) deducts once a year');
{
    // Mirrors the UI: Yearly + Deduction Month = October, 10% of gross both sides
    const cfg = {
        isEnabled: true,
        deductionCycle: 'yearly',
        states: [
            {
                stateName: 'Madhya Pradesh',
                deductionCycle: 'yearly',
                periodFrom: 'Oct',
                periodTo: 'Oct',
                months: ['Oct'],
                minAmount: 1,
                maxAmount: 100000,
                calculationType: 'percentage',
                employeeShare: 10,
                employerShare: 10,
                status: 'active',
                isApplicable: true,
            },
        ],
    };

    const hits = collectLwfDeductionMonths(cfg, 'Madhya Pradesh', 60000);
    check('deducted in exactly 1 month', hits.length, 1);
    check('that month is Oct', hits[0], 'Oct');

    const oct = calculateLwf({ lwfConfig: cfg, grossSalary: 60000, employeeState: 'Madhya Pradesh', month: 'Oct' });
    check('Oct — employee share 6000', oct.employeeShare, 6000);
    check('Oct — employer share 6000', oct.employerShare, 6000);

    const nov = calculateLwf({ lwfConfig: cfg, grossSalary: 60000, employeeState: 'Madhya Pradesh', month: 'Nov' });
    check('Nov — employee share 0', nov.employeeShare, 0);
    check('Nov — reason is not a deduction month', nov.details.reason, 'not a deduction month');

    // Full month names must work too (payroll may pass "October")
    const october = calculateLwf({ lwfConfig: cfg, grossSalary: 60000, employeeState: 'Madhya Pradesh', month: 'October' });
    check('"October" alias — deducted', october.applicable, true);

    check('deductions per year = 1', resolveLwfDeductionsPerYear(oct, cfg), 1);
    check('annual employer LWF = 6000 (not 72000)', oct.employerShare * resolveLwfDeductionsPerYear(oct, cfg), 6000);
}

// --- LWF 10 : Yearly cycle without months[] falls back to periodFrom ---
section('LWF-10. Yearly cycle derives month from periodFrom when months[] empty');
{
    const cfg = {
        isEnabled: true,
        states: [
            {
                stateName: 'Maharashtra',
                deductionCycle: 'yearly',
                periodFrom: 'Apr',
                employeeShare: 12,
                employerShare: 36,
                status: 'active',
                isApplicable: true,
            },
        ],
    };
    const hits = collectLwfDeductionMonths(cfg, 'Maharashtra', 25000);
    check('deducted once a year', hits.length, 1);
    check('month follows periodFrom (Apr)', hits[0], 'Apr');
}

// --- LWF 11 : Half-yearly cycle — exactly two deductions per year ---
section('LWF-11. Half-yearly cycle deducts twice a year');
{
    const cfg = {
        isEnabled: true,
        states: [
            {
                stateName: 'Maharashtra',
                deductionCycle: 'half-yearly',
                periodFrom: 'Jun',
                periodTo: 'Dec',
                months: ['Jun', 'Dec'],
                employeeShare: 6,
                employerShare: 18,
                status: 'active',
                isApplicable: true,
            },
        ],
    };
    const hits = collectLwfDeductionMonths(cfg, 'Maharashtra', 25000);
    check('deducted in exactly 2 months', hits.length, 2);
    check('months are Jun and Dec', hits.join(','), 'Jun,Dec');

    const jun = calculateLwf({ lwfConfig: cfg, grossSalary: 25000, employeeState: 'Maharashtra', month: 'Jun' });
    check('deductions per year = 2', resolveLwfDeductionsPerYear(jun, cfg), 2);
    check('annual employer LWF = 36', jun.employerShare * resolveLwfDeductionsPerYear(jun, cfg), 36);
}

// --- LWF 12 : Monthly cycle — deducted in all 12 months ---
section('LWF-12. Monthly cycle deducts in all 12 months');
{
    const cfg = {
        isEnabled: true,
        states: [
            {
                stateName: 'Gujarat',
                deductionCycle: 'monthly',
                employeeShare: 6,
                employerShare: 12,
                status: 'active',
                isApplicable: true,
            },
        ],
    };
    const hits = collectLwfDeductionMonths(cfg, 'Gujarat', 25000);
    check('deducted in all 12 months', hits.length, 12);

    const jan = calculateLwf({ lwfConfig: cfg, grossSalary: 25000, employeeState: 'Gujarat', month: 'Jan' });
    check('deductions per year = 12', resolveLwfDeductionsPerYear(jan, cfg), 12);
    check('annual employer LWF = 144', jan.employerShare * resolveLwfDeductionsPerYear(jan, cfg), 144);
}

// --- LWF 13 : Preview (no month) is treated as due but still annualizes correctly ---
section('LWF-13. Preview without month keeps yearly annualization');
{
    const cfg = {
        isEnabled: true,
        states: [
            {
                stateName: 'Madhya Pradesh',
                deductionCycle: 'yearly',
                periodFrom: 'Oct',
                months: ['Oct'],
                calculationType: 'percentage',
                employeeShare: 10,
                employerShare: 10,
                status: 'active',
                isApplicable: true,
            },
        ],
    };
    const preview = calculateLwf({ lwfConfig: cfg, grossSalary: 60000, employeeState: 'Madhya Pradesh' });
    check('preview shows the due amount', preview.employeeShare, 6000);
    check('preview cycle = yearly', preview.details.cycle, 'yearly');
    check('preview annualizes employer once', preview.employerShare * resolveLwfDeductionsPerYear(preview, cfg), 6000);
}

// --- LWF 14 : Haryana — 0.2% / 0.4%, caps at ₹35 / ₹70 ---
section('LWF-14. Haryana percentage with ₹35 / ₹70 cap');
{
    const cfg = {
        isEnabled: true,
        deductionCycle: 'monthly',
        states: [
            {
                stateName: 'Haryana',
                calculationType: 'fixed',
                employeeShare: 10,
                employerShare: 20,
                status: 'active',
                isApplicable: true,
            },
            {
                stateName: 'Maharashtra',
                calculationType: 'percentage',
                employeeShare: 0.2,
                employerShare: 0.4,
                status: 'active',
                isApplicable: true,
            },
        ],
    };

    const low = calculateLwf({
        lwfConfig: cfg,
        grossSalary: 10000,
        employeeState: 'Haryana',
        month: 'Mar',
    });
    check('₹10,000 — employee 0.2% = 20', low.employeeShare, 20);
    check('₹10,000 — employer 0.4% = 40', low.employerShare, 40);
    check('₹10,000 — cap not applied', low.details.capped, false);

    const atCap = calculateLwf({
        lwfConfig: cfg,
        grossSalary: 17500,
        employeeState: 'Haryana',
        month: 'Mar',
    });
    check('₹17,500 — employee = 35', atCap.employeeShare, 35);
    check('₹17,500 — employer = 70', atCap.employerShare, 70);

    const high = calculateLwf({
        lwfConfig: cfg,
        grossSalary: 50000,
        employeeState: 'Haryana',
        month: 'Mar',
    });
    check('₹50,000 — employee capped at 35', high.employeeShare, 35);
    check('₹50,000 — employer capped at 70', high.employerShare, 70);
    check('₹50,000 — total 105', high.employeeShare + high.employerShare, 105);
    check('₹50,000 — cap applied', high.details.capped, true);

    const other = calculateLwf({
        lwfConfig: cfg,
        grossSalary: 50000,
        employeeState: 'Maharashtra',
        month: 'Mar',
    });
    check('Maharashtra — no Haryana cap (0.2% of 50000)', other.employeeShare, 100);
    check('Maharashtra — employer stays 0.4%', other.employerShare, 200);
}

// =====================================================================
// Net pay schedule (take-home per month when PT / LWF are cyclical)
// =====================================================================

// --- NETPAY 1 : Yearly LWF — 11 regular months + Oct exception ---
section('NetPay-1. Yearly LWF in Oct — 11 months same, Oct lower');
{
    // Gross 60,000; every-month deductions: EPF 4,800 + union 200 + transport 500 = 5,500
    const ptConfig = {
        isEnabled: true,
        deductionCycle: 'monthly',
        states: [
            {
                stateName: 'Madhya Pradesh',
                isApplicable: true,
                ptSlabs: [{ salaryRangeFrom: 0, salaryRangeTo: 1000000, taxAmount: 700 }],
            },
        ],
    };
    const lwfConfig = {
        isEnabled: true,
        states: [
            {
                stateName: 'Madhya Pradesh',
                deductionCycle: 'yearly',
                periodFrom: 'Oct',
                months: ['Oct'],
                minAmount: 1,
                maxAmount: 100000,
                calculationType: 'percentage',
                employeeShare: 10,
                employerShare: 10,
                status: 'active',
                isApplicable: true,
            },
        ],
    };

    const s = buildNetPaySchedule({
        grossSalary: 60000,
        baseDeductions: 5500,
        ptConfig,
        lwfConfig,
        employeeState: 'Madhya Pradesh',
    });

    check('12 months returned', s.byMonth.length, 12);
    check('regular net pay = 53800', s.regular, 53800);
    check('regular deductions = 6200', s.regularDeductions, 6200);
    check('11 regular months', s.regularMonthCount, 11);
    check('varies = true', s.varies, true);
    check('1 exception', s.exceptions.length, 1);
    check('exception month = Oct', s.exceptions[0].month, 'Oct');
    check('Oct net pay = 47800', s.exceptions[0].netPay, 47800);
    check('PT charged all 12 months', s.ptMonths.length, 12);
    check('LWF charged once', s.lwfMonths.join(','), 'Oct');
}

// --- NETPAY 2 : Yearly PT + yearly LWF — three different take-homes ---
section('NetPay-2. Yearly PT (Mar) + yearly LWF (Oct) — 3 different net pays');
{
    const ptConfig = {
        isEnabled: true,
        deductionCycle: 'yearly',
        states: [
            {
                stateName: 'Madhya Pradesh',
                isApplicable: true,
                ptSlabs: [{ salaryRangeFrom: 0, salaryRangeTo: 1000000, taxAmount: 700 }],
            },
        ],
    };
    const lwfConfig = {
        isEnabled: true,
        states: [
            {
                stateName: 'Madhya Pradesh',
                deductionCycle: 'yearly',
                months: ['Oct'],
                calculationType: 'percentage',
                employeeShare: 10,
                employerShare: 10,
                status: 'active',
                isApplicable: true,
            },
        ],
    };

    const s = buildNetPaySchedule({
        grossSalary: 60000,
        baseDeductions: 5500,
        ptConfig,
        lwfConfig,
        employeeState: 'Madhya Pradesh',
    });

    check('regular net pay = 54500', s.regular, 54500);
    check('10 regular months', s.regularMonthCount, 10);
    check('2 exceptions', s.exceptions.length, 2);

    const mar = s.exceptions.find((e) => e.month === 'Mar');
    const oct = s.exceptions.find((e) => e.month === 'Oct');
    check('Mar net pay = 53800', mar.netPay, 53800);
    check('Mar reason mentions PT', /Professional Tax/.test(mar.reason), true);
    check('Oct net pay = 48500', oct.netPay, 48500);
    check('Oct reason mentions LWF', /Labour Welfare Fund/.test(oct.reason), true);
    check('PT charged once (Mar)', s.ptMonths.join(','), 'Mar');
}

// --- NETPAY 3 : Everything monthly — net pay never varies ---
section('NetPay-3. All-monthly cycles — net pay same every month');
{
    const s = buildNetPaySchedule({
        grossSalary: 60000,
        baseDeductions: 5500,
        ptConfig: {
            isEnabled: true,
            deductionCycle: 'monthly',
            states: [
                {
                    stateName: 'Gujarat',
                    isApplicable: true,
                    ptSlabs: [{ salaryRangeFrom: 0, salaryRangeTo: 1000000, taxAmount: 200 }],
                },
            ],
        },
        lwfConfig: {
            isEnabled: true,
            states: [
                {
                    stateName: 'Gujarat',
                    deductionCycle: 'monthly',
                    employeeShare: 6,
                    employerShare: 12,
                    status: 'active',
                    isApplicable: true,
                },
            ],
        },
        employeeState: 'Gujarat',
    });

    check('varies = false', s.varies, false);
    check('no exceptions', s.exceptions.length, 0);
    check('all 12 months regular', s.regularMonthCount, 12);
    check('regular net pay = 54094', s.regular, 60000 - 5500 - 200 - 6);
}

// --- NETPAY 4 : No PT / LWF configured — base deductions only ---
section('NetPay-4. No PT / LWF — net pay is gross minus base deductions');
{
    const s = buildNetPaySchedule({ grossSalary: 60000, baseDeductions: 5500 });
    check('regular net pay = 54500', s.regular, 54500);
    check('varies = false', s.varies, false);
    check('no LWF months', s.lwfMonths.length, 0);
    check('no PT months', s.ptMonths.length, 0);
}

// =====================================================================
// Statutory Bonus scenarios
// =====================================================================

const sampleBonusConfig = {
    isEnabled: true,
    paymentCycle: 'yearly',
    paymentMonth: 'October',
    percentage: 8.33,
    states: [
        { stateName: 'Maharashtra', minWage: 8000, formulaBase: 'basicAndDA' },
        { stateName: 'Karnataka',   minWage: 7000, formulaBase: 'basicAndDA' },
    ],
};

// --- BONUS 1 : Yearly — paid in October only ---
section('Bonus-1. Yearly cycle paid only in October');
{
    const rSep = calculateStatutoryBonus({
        bonusConfig: sampleBonusConfig,
        basicPlusDA: 15000,
        paidDays: null,
        totalDays: null,
        month: 'Sep',
    });
    check('Sep — not paid', rSep.applicable, false);

    const rOct = calculateStatutoryBonus({
        bonusConfig: sampleBonusConfig,
        basicPlusDA: 15000,
        paidDays: null,
        totalDays: null,
        month: 'Oct',
    });
    check('Oct — paid', rOct.applicable, true);
    // basicPlusDA 15000 capped at 7000 for bonus; 7000 × 8.33% × 12 ≈ 6997
    check('amount ≈ 6997 (₹7000 cap × 8.33% × 12)', rOct.amount, 6997);
}

// --- BONUS 2 : Over eligibility ceiling (Basic > 21000) ---
section('Bonus-2. Basic over ₹21,000 — not eligible');
{
    const r = calculateStatutoryBonus({
        bonusConfig: sampleBonusConfig,
        basicPlusDA: 25000,
        paidDays: null,
        totalDays: null,
        month: 'Oct',
    });
    check('not applicable', r.applicable, false);
    check('amount = 0', r.amount, 0);
}

// --- BONUS 3 : Bonus disabled ---
section('Bonus-3. Bonus master switch OFF');
{
    const r = calculateStatutoryBonus({
        bonusConfig: { isEnabled: false },
        basicPlusDA: 15000,
        paidDays: null,
        totalDays: null,
        month: 'Oct',
    });
    check('not applicable', r.applicable, false);
}

// --- BONUS 4 : Monthly cycle ---
section('Bonus-4. Monthly cycle — pays every month');
{
    const cfg = { ...sampleBonusConfig, paymentCycle: 'monthly' };
    const r = calculateStatutoryBonus({
        bonusConfig: cfg,
        basicPlusDA: 15000,
        paidDays: null,
        totalDays: null,
        month: 'Jan',
    });
    check('Jan — paid (monthly)', r.applicable, true);
    // 7000 × 8.33% = 583.1 ≈ 583
    check('monthly amount ≈ 583', r.amount, 583);
}

// --- BONUS 5 : Custom percentage 20% ---
section('Bonus-5. 20% custom rate');
{
    const cfg = { ...sampleBonusConfig, percentage: 20 };
    const r = calculateStatutoryBonus({
        bonusConfig: cfg,
        basicPlusDA: 15000,
        month: 'Oct',
    });
    // 7000 × 20% × 12 = 16800
    check('amount = 16800', r.amount, 16800);
}

// --- BONUS 6 : Half-yearly cycle — paid in paymentMonth and +6 months ---
section('Bonus-6. Half-yearly cycle paid in Oct and Apr');
{
    const cfg = { ...sampleBonusConfig, paymentCycle: 'half-yearly', paymentMonth: 'October' };
    const rSep = calculateStatutoryBonus({
        bonusConfig: cfg,
        basicPlusDA: 15000,
        paidDays: null,
        totalDays: null,
        month: 'Sep',
    });
    check('Sep — not paid', rSep.applicable, false);

    const rOct = calculateStatutoryBonus({
        bonusConfig: cfg,
        basicPlusDA: 15000,
        paidDays: null,
        totalDays: null,
        month: 'Oct',
    });
    check('Oct — paid', rOct.applicable, true);
    // 7000 × 8.33% × 6 ≈ 3499
    check('half-yearly amount ≈ 3499', rOct.amount, 3499);

    const rApr = calculateStatutoryBonus({
        bonusConfig: cfg,
        basicPlusDA: 15000,
        paidDays: null,
        totalDays: null,
        month: 'Apr',
    });
    check('Apr — paid (second cycle month)', rApr.applicable, true);
    check('Apr amount ≈ 3499', rApr.amount, 3499);
}

// --- BONUS 7 : Skill-wise minimum wage per state ---
section('Bonus-7. Skill-wise minimum wage — Gujarat');
{
    const cfg = {
        isEnabled: true,
        paymentCycle: 'yearly',
        paymentMonth: 'October',
        percentage: 8.33,
        states: [
            {
                stateName: 'Gujarat',
                formulaBase: 'minimumWage',
                wageCategories: [
                    { employmentCategory: 'skilled', minWage: 13195, effectiveFrom: '2025-04' },
                    { employmentCategory: 'semiSkilled', minWage: 12935, effectiveFrom: '2025-04' },
                    { employmentCategory: 'unskilled', minWage: 12640, effectiveFrom: '2025-04' },
                ],
            },
        ],
    };

    const skilled = calculateStatutoryBonus({
        bonusConfig: cfg,
        basicPlusDA: 15000,
        employeeState: 'Gujarat',
        employeeEmploymentCategory: 'Skilled',
        paidDays: null,
        totalDays: null,
        month: 'Oct',
        year: 2026,
    });
    check('skilled min wage used', skilled.details?.minWageUsed, 13195);
    check('skilled bonus paid', skilled.applicable, true);

    const semiSkilled = calculateStatutoryBonus({
        bonusConfig: cfg,
        basicPlusDA: 15000,
        employeeState: 'Gujarat',
        employeeEmploymentCategory: 'Semi Skilled',
        paidDays: null,
        totalDays: null,
        month: 'Oct',
        year: 2026,
    });
    check('semi skilled min wage used', semiSkilled.details?.minWageUsed, 12935);

    const unskilled = calculateStatutoryBonus({
        bonusConfig: cfg,
        basicPlusDA: 15000,
        employeeState: 'Gujarat',
        employeeEmploymentCategory: 'unskilled',
        paidDays: null,
        totalDays: null,
        month: 'Oct',
        year: 2026,
    });
    check('unskilled min wage used', unskilled.details?.minWageUsed, 12640);
}

// --- BONUS 8 : Under 30 working days in accounting year ---
section('Bonus-8. Fewer than 30 working days in accounting year');
{
    const r = calculateStatutoryBonus({
        bonusConfig: sampleBonusConfig,
        basicPlusDA: 15000,
        paidDays: null,
        totalDays: null,
        month: 'Oct',
        accountingYearWorkedDays: 29,
    });
    check('29 days — not eligible', r.applicable, false);
    check('reason is min working days', r.details?.reason, 'under minimum working days in accounting year');

    const rOk = calculateStatutoryBonus({
        bonusConfig: sampleBonusConfig,
        basicPlusDA: 15000,
        paidDays: null,
        totalDays: null,
        month: 'Oct',
        accountingYearWorkedDays: 30,
    });
    check('30 days — eligible', rOk.applicable, true);
}

console.log(`\n=========================`);
console.log(`Total: ${pass + fail}  PASS: ${pass}  FAIL: ${fail}`);
console.log(`=========================`);
process.exit(fail === 0 ? 0 : 1);
