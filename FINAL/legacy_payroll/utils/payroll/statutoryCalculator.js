/**
 * Centralized EPF (Employees' Provident Fund) Calculator
 * --------------------------------------------------------
 * Single source of truth for all EPF / EDLI / Admin-charges / ABRY logic.
 *
 * Drives every option exposed in the Statutory Compliance > EPF UI:
 *   • Enable EPF                          -> isEnabled
 *   • Employee / Employer Contribution    -> employeeContributionRate / employerContributionRate
 *   • Restricted PF Wage (ceiling)        -> restrictedPfWage
 *   • Contribution Preferences:
 *       - Employer PF Contribution        -> contributionPreferences.employerPfContribution
 *       - EDLI Contribution               -> contributionPreferences.edliContribution
 *       - Admin Charges                   -> contributionPreferences.adminCharges
 *   • Additional Settings:
 *       - Allow Employee Level Override   -> allowEmployeeLevelOverride (UI hidden; calculator block commented)
 *       - Pro-rate Restricted PF Wage     -> proRateRestrictedPfWage
 *           When true (default), ₹15,000 ceiling is reduced on LOP:
 *           effectiveCeiling = restrictedPfWage × (paidDays / workingDays)
 *       - Eligible for ABRY Scheme        -> eligibleForAbryScheme
 *       - Consider all PF components when PF wage after LOP is below ceiling
 *                                         -> considerAllPfComponentsAfterLopBelowCeiling
 *
 * LOP / PF wage:
 *   When paid days < working days, PF wage can be pro-rated by paidDays/workingDays.
 *   If considerAllPfComponentsAfterLopBelowCeiling is true (default) and the
 *   LOP-adjusted PF wage is below restrictedPfWage, the full-month PF component
 *   total is used instead (employee PF is not reduced solely due to LOP).
 *   When false, the LOP-adjusted PF wage is always used.
 *
 * Also honors per-component `considerForEPF` when an `epfApplicableWage`
 * is provided by the caller (otherwise we fall back to baseSalary).
 *
 * Statutory references (EPFO):
 *   - EDLI:          0.5% of EPF wages, capped at the EDLI ceiling (15,000) => max 75/employee/month
 *   - Admin (A/c 2): 0.5% of EPF wages, statutory minimum 75/month
 *   - ABRY waiver:   when eligible, the employer's 12% (and EDLI/Admin in some cases) share is
 *                    paid by Govt; the employee deduction is unchanged.
 *
 * The calculator is a PURE FUNCTION — no DB calls, no side effects.
 */

const DEFAULTS = {
    EMPLOYEE_RATE: 12,
    EMPLOYER_RATE: 12,
    CEILING: 15000,
    EDLI_RATE: 0.5,
    EDLI_CEILING: 15000,
    EDLI_MAX_PER_EMPLOYEE: 75,
    ADMIN_RATE: 0.5,
    ADMIN_MIN_PER_EMPLOYEE: 75,
};

const ESI_DEFAULTS = {
    EMPLOYEE_RATE: 0.75,
    EMPLOYER_RATE: 3.25,
    WAGE_LIMIT: 21000,
};

function round(n) {
    return Math.round(Number(n) || 0);
}

function safeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function resolveEffectivePfCeiling(ceiling, epfConfig, epfWageResolution) {
    const baseCeiling = safeNumber(ceiling, DEFAULTS.CEILING);
    const proRateEnabled = epfConfig?.proRateRestrictedPfWage !== false;

    if (!proRateEnabled || !epfWageResolution) {
        return baseCeiling;
    }

    const workingDays = Math.max(0, safeNumber(epfWageResolution.workingDays, 0));
    const paidDays = Math.max(0, safeNumber(epfWageResolution.paidDays, workingDays));

    if (workingDays <= 0 || paidDays >= workingDays) {
        return baseCeiling;
    }

    return round((baseCeiling * paidDays) / workingDays);
}

/**
 * @param {Object} params
 * @param {Object} params.epfConfig                Org-level EPF config (statutoryCompliance.epf)
 * @param {Number} params.baseSalary               Basic (or Basic+DA) salary for the month
 * @param {Number} [params.epfApplicableWage]      Pre-summed wage of all earning components flagged
 *                                                 considerForEPF=true (incl. basic). If omitted,
 *                                                 we use baseSalary.
 * @param {Object} [params.employeeStatutoryInfo]  Employee.statutoryInfo  (for per-employee override)
 * @param {Object} [params.epfWageResolution]      Output from resolveEpfApplicableWage (audit)
 * @returns {Object} breakdown of EPF, EDLI, Admin charges and totals
 */
function calculateEpf({
    epfConfig,
    baseSalary = 0,
    epfApplicableWage,
    employeeStatutoryInfo = null,
    epfWageResolution = null,
} = {}) {
    const empty = {
        applicable: false,
        epfWage: 0,
        employeeContribution: 0,
        employerContribution: 0,
        edliContribution: 0,
        adminCharges: 0,
        totalEmployerCost: 0,
        abryApplied: false,
        details: {},
    };

    if (!epfConfig || !epfConfig.isEnabled) {
        return empty;
    }

    // Per-employee opt-out
    if (employeeStatutoryInfo && employeeStatutoryInfo.epfApplicable === false) {
        return empty;
    }

    // --- Resolve effective rates / ceiling ---
    let employeeRate = safeNumber(epfConfig.employeeContributionRate, DEFAULTS.EMPLOYEE_RATE);
    let employerRate = safeNumber(epfConfig.employerContributionRate, DEFAULTS.EMPLOYER_RATE);
    let ceiling = safeNumber(epfConfig.restrictedPfWage, DEFAULTS.CEILING);
    let applyCeiling = true;
    let overrideUsed = false;

    const override = employeeStatutoryInfo?.epfOverride;
    if (override && (override.enabled === true || override.applyCeiling === false)) {
        if (typeof override.applyCeiling === 'boolean') {
            applyCeiling = override.applyCeiling;
        }
        overrideUsed = true;
    }

    // --- Determine the wage base for EPF ---
    // Prefer the explicitly-summed considerForEPF wage; fallback to basic.
    const wage = safeNumber(epfApplicableWage, safeNumber(baseSalary, 0));

    // --- Apply ceiling (optionally pro-rated on LOP) ---
    const effectiveCeiling = resolveEffectivePfCeiling(ceiling, epfConfig, epfWageResolution);
    const epfWage = applyCeiling ? Math.min(wage, effectiveCeiling) : wage;

    // --- Employee contribution (always due if EPF enabled) ---
    const employeeContribution = (epfWage * employeeRate) / 100;

    // --- Employer contribution ---
    // Toggled off via UI checkbox OR waived under ABRY scheme.
    const prefs = epfConfig.contributionPreferences || {};
    const employerEnabled = prefs.employerPfContribution !== false; // default true
    const abryApplied = !!epfConfig.eligibleForAbryScheme;
    const employerContribution = (!employerEnabled || abryApplied)
        ? 0
        : (epfWage * employerRate) / 100;

    // --- EDLI (employer side, 0.5% capped at 75) ---
    let edliContribution = 0;
    if (prefs.edliContribution && !abryApplied) {
        const edliBase = Math.min(epfWage, DEFAULTS.EDLI_CEILING);
        edliContribution = Math.min(
            (edliBase * DEFAULTS.EDLI_RATE) / 100,
            DEFAULTS.EDLI_MAX_PER_EMPLOYEE
        );
    }

    // --- Admin charges (employer side, 0.5% with statutory minimum) ---
    let adminCharges = 0;
    if (prefs.adminCharges && !abryApplied) {
        const calc = (epfWage * DEFAULTS.ADMIN_RATE) / 100;
        // EPFO mandates a minimum of ₹75 per employee per month when EPF is applicable
        adminCharges = epfWage > 0 ? Math.max(calc, DEFAULTS.ADMIN_MIN_PER_EMPLOYEE) : 0;
    }

    return {
        applicable: true,
        epfWage: round(epfWage),
        employeeContribution: round(employeeContribution),
        employerContribution: round(employerContribution),
        edliContribution: round(edliContribution),
        adminCharges: round(adminCharges),
        totalEmployerCost: round(employerContribution + edliContribution + adminCharges),
        abryApplied,
        details: {
            employeeRate,
            employerRate,
            ceilingApplied: applyCeiling,
            effectiveCeiling: round(effectiveCeiling),
            configuredCeiling: round(ceiling),
            proRateRestrictedPfWage: epfConfig?.proRateRestrictedPfWage !== false,
            wageBeforeCeiling: round(wage),
            overrideUsed,
            employerEnabled,
            edliEnabled: !!prefs.edliContribution,
            adminEnabled: !!prefs.adminCharges,
            ...(epfWageResolution
                ? {
                    fullMonthPfWage: epfWageResolution.fullMonthPfWage,
                    lopAdjustedPfWage: epfWageResolution.lopAdjustedPfWage,
                    usedFullMonthPfComponents: epfWageResolution.usedFullMonthPfComponents,
                    paidDays: epfWageResolution.paidDays,
                    workingDays: epfWageResolution.workingDays,
                }
                : {}),
        },
    };
}

function resolveEpfApplicableWage({
    epfConfig,
    fullMonthEpfWage = 0,
    workingDays = 0,
    paidDays = 0,
} = {}) {
    const fullWage = safeNumber(fullMonthEpfWage, 0);
    const ceiling = safeNumber(epfConfig?.restrictedPfWage, DEFAULTS.CEILING);
    const wd = Math.max(0, safeNumber(workingDays, 0));
    const pd = Math.max(0, safeNumber(paidDays, wd));
    const considerAll = epfConfig?.considerAllPfComponentsAfterLopBelowCeiling !== false;

    const baseResult = {
        wage: fullWage,
        fullMonthPfWage: fullWage,
        lopAdjustedPfWage: fullWage,
        usedFullMonthPfComponents: true,
        paidDays: pd,
        workingDays: wd,
    };

    if (wd <= 0 || pd >= wd) {
        return baseResult;
    }

    const lopAdjustedWage = round((fullWage * pd) / wd);

    if (considerAll && lopAdjustedWage < ceiling) {
        return {
            ...baseResult,
            wage: fullWage,
            lopAdjustedPfWage: lopAdjustedWage,
            usedFullMonthPfComponents: true,
        };
    }

    return {
        wage: lopAdjustedWage,
        fullMonthPfWage: fullWage,
        lopAdjustedPfWage: lopAdjustedWage,
        usedFullMonthPfComponents: false,
        paidDays: pd,
        workingDays: wd,
    };
}

/**
 * Helper: sum the value of all "considerForEPF" earnings in an earnings list.
 * Designed to work with the earnings array shapes used across the payroll
 * controllers (objects of shape { name|componentName, amount, considerForEPF }).
 *
 * @param {Array} earnings
 * @param {Number} baseSalary fallback when nothing is flagged
 * @returns {Number}
 */
function sumConsiderForEpf(earnings, baseSalary = 0) {
    if (!Array.isArray(earnings) || earnings.length === 0) {
        return baseSalary;
    }
    const total = earnings.reduce((sum, e) => {
        if (!e) return sum;
        const isBasic = (e.name || e.componentName || '').toLowerCase().includes('basic');
        const flag = e.considerForEPF === true || isBasic;
        const amt = Number(e.calculatedAmount ?? e.amount ?? 0) || 0;
        return flag ? sum + amt : sum;
    }, 0);
    return total > 0 ? total : baseSalary;
}

/* =====================================================================
 * ESI (Employees' State Insurance) Calculator
 * =====================================================================
 *
 * Drives every option exposed in the Statutory Compliance > ESI UI:
 *   • Enable ESI                            -> isEnabled
 *   • Employee / Employer Contribution      -> employeeContributionRate / employerContributionRate
 *   • Wage Limit                            -> wageLimit (default ₹21,000)
 *   • Include Employer Contribution in
 *     Salary Structure                      -> includeEmployerInSalaryStructure
 *
 * Also honors:
 *   • Per-employee opt-out via statutoryInfo.esiOptedOut === true
 *     (legacy esiApplicable: false on employee docs is ignored — it skipped everyone)
 *   • Compact calculator payload esiApplicable === false still opts out
 *   • Per-component considerForESI flag (when esiApplicableWage is supplied)
 *
 * ESI Rule of Thumb:
 *   - Apply only when monthly gross <= wageLimit
 *   - Employee : 0.75% of gross
 *   - Employer : 3.25% of gross
 */
function calculateEsi({
    esiConfig,
    grossSalary = 0,
    esiApplicableWage,
    employeeStatutoryInfo = null,
} = {}) {
    const empty = {
        applicable: false,
        wageUsed: 0,
        employeeContribution: 0,
        employerContribution: 0,
        includeEmployerInCtc: true,
        details: {},
    };

    if (!esiConfig || !esiConfig.isEnabled) {
        return empty;
    }

    if (isEmployeeEsiOptedOut(employeeStatutoryInfo)) {
        return empty;
    }

    const employeeRate = safeNumber(esiConfig.employeeContributionRate, ESI_DEFAULTS.EMPLOYEE_RATE);
    const employerRate = safeNumber(esiConfig.employerContributionRate, ESI_DEFAULTS.EMPLOYER_RATE);
    const wageLimit = safeNumber(esiConfig.wageLimit, ESI_DEFAULTS.WAGE_LIMIT);

    // Wage threshold check is always against GROSS (statutory rule), not the
    // considerForESI-trimmed wage. We trim only when computing the contribution.
    if (grossSalary > wageLimit) {
        return { ...empty, details: { reason: 'gross exceeds wage limit', wageLimit, grossSalary } };
    }

    const wageForContribution = safeNumber(esiApplicableWage, grossSalary);
    const employeeContribution = (wageForContribution * employeeRate) / 100;
    const employerContribution = (wageForContribution * employerRate) / 100;

    // UI toggle: "Include Employer Contribution in Salary Structure"
    // — when false, employer share is still due statutorily but should NOT
    // be added into the CTC shown to the employee. Default = true.
    const includeEmployerInCtc = esiConfig.includeEmployerInSalaryStructure !== false;

    return {
        applicable: true,
        wageUsed: round(wageForContribution),
        employeeContribution: round(employeeContribution),
        employerContribution: round(employerContribution),
        includeEmployerInCtc,
        details: {
            employeeRate,
            employerRate,
            wageLimit,
            grossSalary,
        },
    };
}

/**
 * Employee ESI opt-out.
 * Employee records used to default esiApplicable=false, which skipped ESI for
 * every staff member even when org ESI was on. That legacy false is ignored.
 * Opt-out is esiOptedOut=true, or esiApplicable=false on a compact calculator payload.
 */
function isEmployeeEsiOptedOut(employeeStatutoryInfo) {
    if (!employeeStatutoryInfo) return false;
    if (employeeStatutoryInfo.esiOptedOut === true) return true;
    if (employeeStatutoryInfo.esiApplicable !== false) return false;

    const looksLikeEmployeeDoc =
        'esiNumber' in employeeStatutoryInfo ||
        'uan' in employeeStatutoryInfo ||
        'pfAccountNumber' in employeeStatutoryInfo ||
        'epfOverride' in employeeStatutoryInfo;
    if (looksLikeEmployeeDoc) return false;

    return true;
}

/**
 * Helper: sum the value of all "considerForESI" earnings (incl. basic).
 */
function sumConsiderForEsi(earnings, grossSalary = 0) {
    if (!Array.isArray(earnings) || earnings.length === 0) {
        return grossSalary;
    }
    const total = earnings.reduce((sum, e) => {
        if (!e) return sum;
        const isBasic = (e.name || e.componentName || '').toLowerCase().includes('basic');
        const flag = e.considerForESI === true || isBasic;
        const amt = Number(e.calculatedAmount ?? e.amount ?? 0) || 0;
        return flag ? sum + amt : sum;
    }, 0);
    return total > 0 ? total : grossSalary;
}

/* =====================================================================
 * Professional Tax Calculator
 * =====================================================================
 *
 * Drives every option exposed in the Statutory Compliance > Professional Tax UI:
 *   • Enable Professional Tax                       -> isEnabled
 *   • Deduction Cycle (monthly | half-yearly)
 *   • State-wise configuration:
 *       - State (PT) name              -> states[].stateName
 *       - PT Number                    -> states[].ptNumber
 *       - Applicable for this state    -> states[].isApplicable
 *       - PT Slabs                     -> states[].ptSlabs[ { salaryRangeFrom, salaryRangeTo, taxAmount } ]
 *
 * Also honors:
 *   • Per-employee opt-out  via statutoryInfo.ptApplicable === false
 *   • Per-employee state    via statutoryInfo.ptState (drives which state's slab to use)
 *
 * Deduction Cycle behavior:
 *   - 'monthly'      -> charge slab amount every month
 *   - 'half-yearly'  -> charge only when target month is Sep or Mar
 *   (Most Indian states are monthly; Tamil Nadu / Karnataka have half-yearly cycles.)
 */
const QUARTERLY_MONTHS = new Set(['Jan', 'Apr', 'Jul', 'Oct']);
const HALF_YEARLY_MONTHS = new Set(['Sep', 'Mar']);
const YEARLY_MONTHS = new Set(['Mar']);

function pickPtSlab(slabs, grossSalary) {
    if (!Array.isArray(slabs)) return null;
    for (const slab of slabs) {
        const from = safeNumber(slab.salaryRangeFrom, 0);
        const to = safeNumber(slab.salaryRangeTo, Infinity);
        if (grossSalary >= from && grossSalary <= to) {
            return slab;
        }
    }
    return null;
}

function pickPtStateConfig(ptConfig, employeeState) {
    if (!ptConfig || !Array.isArray(ptConfig.states) || ptConfig.states.length === 0) {
        return null;
    }
    const wanted = (employeeState || '').trim().toLowerCase();
    if (wanted) {
        const match = ptConfig.states.find(
            (s) => (s.stateName || '').trim().toLowerCase() === wanted && s.isApplicable !== false
        );
        // Employee has a state — never borrow another state's slabs.
        return match || null;
    }
    // No employee state: first applicable row (legacy single-state orgs)
    return ptConfig.states.find((s) => s.isApplicable !== false) || null;
}

function shouldDeductPtThisMonth(cycle, month) {
    const raw = String(cycle || 'monthly').trim().toLowerCase().replace(/[\s_]+/g, '-');
    const normalized =
        raw === 'halfyearly' || raw === 'semi-annual' || raw === 'semiannual'
            ? 'half-yearly'
            : raw;

    if (normalized === 'quarterly' || normalized === 'quarter-yearly') {
        return month ? QUARTERLY_MONTHS.has(month) : true;
    }
    if (normalized === 'half-yearly') {
        return month ? HALF_YEARLY_MONTHS.has(month) : true;
    }
    if (normalized === 'yearly' || normalized === 'annual') {
        return month ? YEARLY_MONTHS.has(month) : true;
    }
    return true; // monthly (default)
}

/**
 * @param {Object} params
 * @param {Object} params.ptConfig                  Org-level PT config (statutoryCompliance.professionalTax)
 * @param {Number} params.grossSalary               Gross salary for the month
 * @param {String} [params.employeeState]           Employee's PT state (employee.statutoryInfo.ptState)
 * @param {String} [params.month]                   Short month name (Jan..Dec) — drives deduction cycle
 * @param {Object} [params.employeeStatutoryInfo]   Employee.statutoryInfo (for per-employee opt-out)
 * @returns {Object}
 */
function calculateProfessionalTax({
    ptConfig,
    grossSalary = 0,
    employeeState = null,
    month = null,
    employeeStatutoryInfo = null,
} = {}) {
    const empty = {
        applicable: false,
        amount: 0,
        details: {},
    };

    if (!ptConfig || !ptConfig.isEnabled) {
        return empty;
    }

    // Per-employee opt-out
    if (employeeStatutoryInfo && employeeStatutoryInfo.ptApplicable === false) {
        return { ...empty, details: { reason: 'employee ptApplicable=false' } };
    }

    // Prefer employee.statutoryInfo.ptState; fall back to explicit param
    const resolvedState =
        (employeeStatutoryInfo && employeeStatutoryInfo.ptState) || employeeState || null;

    const stateConfig = pickPtStateConfig(ptConfig, resolvedState);
    if (!stateConfig) {
        return { ...empty, details: { reason: 'no applicable state config', employeeState: resolvedState } };
    }

    // Deduction cycle gate (e.g. half-yearly only deducts in Sep/Mar)
    if (!shouldDeductPtThisMonth(ptConfig.deductionCycle, month)) {
        return {
            ...empty,
            details: {
                reason: 'not a deduction month for cycle',
                cycle: ptConfig.deductionCycle,
                month,
            },
        };
    }

    const slab = pickPtSlab(stateConfig.ptSlabs, grossSalary);
    const amount = slab ? safeNumber(slab.taxAmount, 0) : 0;

    return {
        applicable: amount > 0,
        amount: round(amount),
        details: {
            stateUsed: stateConfig.stateName || resolvedState || '',
            ptNumber: stateConfig.ptNumber || '',
            cycle: ptConfig.deductionCycle || 'monthly',
            slabMatched: slab
                ? { from: slab.salaryRangeFrom, to: slab.salaryRangeTo, tax: slab.taxAmount }
                : null,
        },
    };
}

/* =====================================================================
 * Labour Welfare Fund (LWF) Calculator
 * =====================================================================
 *
 * Drives every option in the Statutory Compliance > Labour Welfare Fund UI:
 *   • Enable LWF                              -> isEnabled
 *   • Deduction Cycle (monthly | half-yearly | yearly)
 *   • Optional org-level months                -> months[] (fallback)
 *   • State-wise configuration:
 *       - State name                          -> states[].stateName
 *       - Min / Max wage range                -> states[].minAmount, states[].maxAmount
 *       - Share calculation type              -> states[].calculationType
 *           "fixed"       : employeeShare / employerShare are absolute ₹
 *           "percentage"  : employeeShare / employerShare are % of gross
 *       - Employee share                      -> states[].employeeShare
 *       - Employer share                      -> states[].employerShare
 *       - Haryana is statutory, not the saved shares:
 *           employee 0.2% of gross, maximum ₹35
 *           employer 0.4% of gross (2× employee), maximum ₹70
 *           total maximum ₹105. Other states are unchanged.
 *       - Deduction months                    -> states[].months[] (e.g. ["Jun","Dec"])
 *       - Applicable for this state           -> states[].isApplicable
 *       - Active / Inactive                   -> states[].status ("active" | "inactive")
 *
 * Honors per-employee:
 *   • statutoryInfo.lwfApplicable === false   -> opt-out
 *   • statutoryInfo.lwfState                  -> employee's state for LWF
 *
 * Deduction month priority:
 *   1. states[].months (if non-empty)
 *   2. labourWelfareFund.months (if non-empty)
 *   3. Cycle defaults: monthly=all, half-yearly=Jun+Dec, yearly=Dec
 */
const LWF_MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LWF_HALF_YEARLY_MONTHS = ['Jun', 'Dec'];
const LWF_YEARLY_MONTHS = ['Dec'];

const LWF_MONTH_ALIASES = {
    january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr',
    may: 'May', june: 'Jun', july: 'Jul', august: 'Aug',
    september: 'Sep', october: 'Oct', november: 'Nov', december: 'Dec',
    jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
    jun: 'Jun', jul: 'Jul', aug: 'Aug', sep: 'Sep',
    oct: 'Oct', nov: 'Nov', dec: 'Dec',
};

function normalizeLwfMonth(value) {
    if (value == null || value === '') return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const alias = LWF_MONTH_ALIASES[raw.toLowerCase()];
    if (alias) return alias;
    const titled = raw.charAt(0).toUpperCase() + raw.slice(1, 3).toLowerCase();
    return LWF_MONTH_SHORT.includes(titled) ? titled : null;
}

function normalizeLwfMonths(months) {
    if (!Array.isArray(months)) return [];
    const unique = [];
    months.forEach((m) => {
        const short = normalizeLwfMonth(m);
        if (short && !unique.includes(short)) unique.push(short);
    });
    return unique;
}

function getDefaultLwfMonthsForCycle(cycle) {
    const normalized = (cycle || 'half-yearly').toLowerCase();
    if (normalized === 'half-yearly' || normalized === 'half_yearly' || normalized === 'halfyearly') {
        return [...LWF_HALF_YEARLY_MONTHS];
    }
    if (normalized === 'yearly' || normalized === 'annual') {
        return [...LWF_YEARLY_MONTHS];
    }
    return [...LWF_MONTH_SHORT]; // monthly
}

function resolveLwfDeductionMonths(lwfConfig = {}, stateCfg = null) {
    const stateMonths = normalizeLwfMonths(stateCfg?.months);
    if (stateMonths.length > 0) return stateMonths;

    if (stateCfg?.deductionCycle) {
        const cycle = String(stateCfg.deductionCycle).toLowerCase().replace(/[\s_]+/g, '-');
        const periodFrom = normalizeLwfMonth(stateCfg.periodFrom);
        const periodTo = normalizeLwfMonth(stateCfg.periodTo);
        if (cycle === 'yearly' || cycle === 'annual') {
            return periodFrom ? [periodFrom] : [...LWF_YEARLY_MONTHS];
        }
        if (cycle === 'half-yearly' || cycle === 'halfyearly') {
            const selected = normalizeLwfMonths([periodFrom, periodTo]);
            return selected.length > 0 ? selected : [...LWF_HALF_YEARLY_MONTHS];
        }
        return getDefaultLwfMonthsForCycle(stateCfg.deductionCycle);
    }

    const orgMonths = normalizeLwfMonths(lwfConfig?.months);
    if (orgMonths.length > 0) return orgMonths;

    return getDefaultLwfMonthsForCycle(lwfConfig?.deductionCycle);
}

/**
 * How many times LWF is actually deducted in a year.
 * Needed because LWF runs on its own cycle — a yearly ₹6,000 employer share must be
 * added to CTC once, not twelve times.
 *
 * @param {Object} [lwfBreakdown] Output of calculateLwf (details.months / details.cycle)
 * @param {Object} [lwfConfig]    Org-level LWF config, used when breakdown has no details
 * @returns {Number} 12 (monthly) | 2 (half-yearly) | 1 (yearly) | configured months count
 */
function resolveLwfDeductionsPerYear(lwfBreakdown = null, lwfConfig = null) {
    const monthsFromBreakdown = Array.isArray(lwfBreakdown?.details?.months)
        ? lwfBreakdown.details.months.length
        : 0;
    if (monthsFromBreakdown > 0) return monthsFromBreakdown;

    const cycle = String(
        lwfBreakdown?.details?.cycle || lwfConfig?.deductionCycle || 'half-yearly'
    )
        .toLowerCase()
        .replace(/[\s_]+/g, '-');

    if (cycle.startsWith('half')) return 2;
    if (cycle === 'yearly' || cycle === 'annual') return 1;
    return 12;
}

function isLwfStateActive(stateCfg = {}) {
    if (stateCfg.status === 'inactive') return false;
    if (stateCfg.isApplicable === false) return false;
    return true;
}

function pickLwfStateConfig(lwfConfig, employeeState, grossSalary) {
    if (!lwfConfig || !Array.isArray(lwfConfig.states) || lwfConfig.states.length === 0) {
        return null;
    }
    const wanted = (employeeState || '').trim().toLowerCase();
    if (wanted) {
        const stateSlabs = lwfConfig.states.filter(
            (state) =>
                (state.stateName || '').trim().toLowerCase() === wanted
                && isLwfStateActive(state)
        );
        // Employee has a state — never borrow another state's slabs.
        if (stateSlabs.length === 0) return null;
        const matchingSlab = stateSlabs.find((state) => isWithinLwfWageRange(state, grossSalary));
        // Return a state slab so caller can report "gross outside wage range".
        return matchingSlab || stateSlabs[0];
    }
    // No employee state: first applicable row (legacy single-state orgs)
    return lwfConfig.states.find(
        (state) => isLwfStateActive(state) && isWithinLwfWageRange(state, grossSalary)
    ) || lwfConfig.states.find((state) => isLwfStateActive(state)) || null;
}

function resolveLwfShareAmount(shareValue, calculationType, grossSalary) {
    const value = safeNumber(shareValue, 0);
    if (value <= 0) return 0;
    if ((calculationType || 'fixed').toLowerCase() === 'percentage') {
        return (safeNumber(grossSalary, 0) * value) / 100;
    }
    return value;
}

/** Haryana LWF: 0.2% employee (max ₹35), 0.4% employer (max ₹70). */
const HARYANA_LWF_EMPLOYEE_RATE = 0.2;
const HARYANA_LWF_EMPLOYER_RATE = 0.4;
const HARYANA_LWF_EMPLOYEE_MAX = 35;
const HARYANA_LWF_EMPLOYER_MAX = 70;

function isHaryanaLwfState(stateName) {
    return String(stateName || '').trim().toLowerCase() === 'haryana';
}

function resolveHaryanaLwfShares(grossSalary) {
    const gross = safeNumber(grossSalary, 0);
    const employeeRaw = (gross * HARYANA_LWF_EMPLOYEE_RATE) / 100;
    const employerRaw = (gross * HARYANA_LWF_EMPLOYER_RATE) / 100;
    if (employeeRaw > HARYANA_LWF_EMPLOYEE_MAX) {
        return {
            employeeShare: HARYANA_LWF_EMPLOYEE_MAX,
            employerShare: HARYANA_LWF_EMPLOYER_MAX,
            capped: true,
        };
    }
    return {
        employeeShare: employeeRaw,
        employerShare: employerRaw > HARYANA_LWF_EMPLOYER_MAX
            ? HARYANA_LWF_EMPLOYER_MAX
            : employerRaw,
        capped: employerRaw > HARYANA_LWF_EMPLOYER_MAX,
    };
}

function shouldDeductLwfThisMonth(deductionMonths, month) {
    if (!month) return true; // preview / no month context — treat as due
    const short = normalizeLwfMonth(month);
    if (!short) return true;
    const allowed = normalizeLwfMonths(deductionMonths);
    if (allowed.length === 0) return true;
    return allowed.includes(short);
}

function isWithinLwfWageRange(stateCfg, wage) {
    const min = safeNumber(stateCfg.minAmount, 0);
    const maxRaw = stateCfg.maxAmount;
    const max = maxRaw === undefined || maxRaw === null || maxRaw === ''
        ? Infinity
        : safeNumber(maxRaw, Infinity);
    if (min === 0 && !isFinite(max)) return true; // no range → always applies
    return wage >= min && wage <= max;
}

/**
 * @param {Object} params
 * @param {Object} params.lwfConfig                Org-level LWF config (statutoryCompliance.labourWelfareFund)
 * @param {Number} params.grossSalary              Gross salary for the month
 * @param {String} [params.employeeState]          Fallback state name
 * @param {String} [params.month]                  Short month name (Jan..Dec)
 * @param {Object} [params.employeeStatutoryInfo]
 * @returns {Object}
 */
function calculateLwf({
    lwfConfig,
    grossSalary = 0,
    employeeState = null,
    month = null,
    employeeStatutoryInfo = null,
} = {}) {
    const empty = {
        applicable: false,
        employeeShare: 0,
        employerShare: 0,
        totalEmployerCost: 0,
        details: {},
    };

    if (!lwfConfig || !lwfConfig.isEnabled) {
        return empty;
    }

    if (employeeStatutoryInfo && employeeStatutoryInfo.lwfApplicable === false) {
        return { ...empty, details: { reason: 'employee lwfApplicable=false' } };
    }

    const resolvedState =
        (employeeStatutoryInfo && employeeStatutoryInfo.lwfState) ||
        (employeeStatutoryInfo && employeeStatutoryInfo.ptState) ||
        employeeState ||
        null;

    const stateCfg = pickLwfStateConfig(lwfConfig, resolvedState, grossSalary);
    if (!stateCfg) {
        return { ...empty, details: { reason: 'no applicable state config', employeeState: resolvedState } };
    }

    const deductionMonths = resolveLwfDeductionMonths(lwfConfig, stateCfg);
    if (!shouldDeductLwfThisMonth(deductionMonths, month)) {
        return {
            ...empty,
            details: {
                reason: 'not a deduction month',
                cycle: stateCfg.deductionCycle || lwfConfig.deductionCycle,
                month,
                months: deductionMonths,
                stateUsed: stateCfg.stateName || resolvedState || '',
            },
        };
    }

    if (!isWithinLwfWageRange(stateCfg, grossSalary)) {
        return {
            ...empty,
            details: {
                reason: 'gross outside wage range',
                gross: grossSalary,
                min: stateCfg.minAmount,
                max: stateCfg.maxAmount,
            },
        };
    }

    const haryanaLwf = isHaryanaLwfState(stateCfg.stateName || resolvedState);
    const configuredPercentage = (stateCfg.calculationType || 'fixed').toLowerCase() === 'percentage';
    const calculationType = haryanaLwf || configuredPercentage ? 'percentage' : 'fixed';
    const haryanaShares = haryanaLwf ? resolveHaryanaLwfShares(grossSalary) : null;
    const employeeShare = haryanaShares
        ? haryanaShares.employeeShare
        : resolveLwfShareAmount(stateCfg.employeeShare, calculationType, grossSalary);
    const employerShare = haryanaShares
        ? haryanaShares.employerShare
        : resolveLwfShareAmount(stateCfg.employerShare, calculationType, grossSalary);

    return {
        applicable: employeeShare > 0 || employerShare > 0,
        employeeShare: round(employeeShare),
        employerShare: round(employerShare),
        totalEmployerCost: round(employerShare),
        details: {
            stateUsed: stateCfg.stateName || resolvedState || '',
            cycle: stateCfg.deductionCycle || lwfConfig.deductionCycle || 'half-yearly',
            months: deductionMonths,
            calculationType,
            calculationBasis: calculationType === 'percentage' ? 'grossSalary' : 'fixed',
            grossSalary: safeNumber(grossSalary, 0),
            configuredEmployeeShare: haryanaLwf
                ? HARYANA_LWF_EMPLOYEE_RATE
                : safeNumber(stateCfg.employeeShare, 0),
            configuredEmployerShare: haryanaLwf
                ? HARYANA_LWF_EMPLOYER_RATE
                : safeNumber(stateCfg.employerShare, 0),
            ...(haryanaLwf
                ? {
                    employeeMax: HARYANA_LWF_EMPLOYEE_MAX,
                    employerMax: HARYANA_LWF_EMPLOYER_MAX,
                    capped: haryanaShares.capped,
                }
                : {}),
            status: stateCfg.status || (stateCfg.isApplicable === false ? 'inactive' : 'active'),
        },
    };
}

/**
 * Take-home for every month of the year.
 *
 * PT and LWF can run on non-monthly cycles (quarterly / half-yearly / yearly), so
 * take-home is not identical in all 12 months. A salary structure preview has no
 * month context, so without this it would present the heaviest month's figure as
 * if it were the norm.
 *
 * @param {Number} params.grossSalary
 * @param {Number} params.baseDeductions  Deductions charged every month (EPF, ESI, components)
 * @returns {Object} { regular, regularDeductions, regularMonthCount, varies,
 *                     exceptions: [{ month, netPay, reason }], byMonth, ptMonths, lwfMonths }
 */
function buildNetPaySchedule({
    grossSalary = 0,
    baseDeductions = 0,
    ptConfig = null,
    lwfConfig = null,
    employeeState = null,
    employeeStatutoryInfo = null,
} = {}) {
    const byMonth = LWF_MONTH_SHORT.map((month) => {
        const pt = calculateProfessionalTax({
            ptConfig,
            grossSalary,
            month,
            employeeState,
            employeeStatutoryInfo,
        });
        const lwf = calculateLwf({
            lwfConfig,
            grossSalary,
            month,
            employeeState,
            employeeStatutoryInfo,
        });

        const ptAmount = pt.applicable ? round(pt.amount || 0) : 0;
        const lwfAmount = lwf.applicable ? round(lwf.employeeShare || 0) : 0;
        const extras = [];
        if (ptAmount > 0) extras.push({ name: 'Professional Tax', amount: ptAmount });
        if (lwfAmount > 0) extras.push({ name: 'Labour Welfare Fund', amount: lwfAmount });

        return {
            month,
            professionalTax: ptAmount,
            lwf: lwfAmount,
            totalDeductions: round(baseDeductions + ptAmount + lwfAmount),
            netPay: round(grossSalary - baseDeductions - ptAmount - lwfAmount),
            extras,
        };
    });

    // "Regular" = the take-home seen in most months. On a tie the lighter-deduction
    // month wins, so the headline figure stays the common case.
    const occurrences = new Map();
    byMonth.forEach(({ netPay }) => occurrences.set(netPay, (occurrences.get(netPay) || 0) + 1));

    let regular = byMonth[0].netPay;
    let regularMonthCount = 0;
    occurrences.forEach((count, netPay) => {
        if (count > regularMonthCount || (count === regularMonthCount && netPay > regular)) {
            regular = netPay;
            regularMonthCount = count;
        }
    });

    const exceptions = byMonth
        .filter((entry) => entry.netPay !== regular)
        .map((entry) => ({
            month: entry.month,
            netPay: entry.netPay,
            extras: entry.extras,
            reason: entry.extras
                .map((e) => `${e.name} ₹${e.amount.toLocaleString('en-IN')}`)
                .join(' + '),
        }));

    return {
        regular,
        regularDeductions: round(grossSalary - regular),
        regularMonthCount,
        varies: exceptions.length > 0,
        exceptions,
        byMonth,
        ptMonths: byMonth.filter((m) => m.professionalTax > 0).map((m) => m.month),
        lwfMonths: byMonth.filter((m) => m.lwf > 0).map((m) => m.month),
    };
}

/* =====================================================================
 * Statutory Bonus Calculator (Payment of Bonus Act, 1965)
 * =====================================================================
 *
 * Drives every option in the Statutory Compliance > Statutory Bonus UI:
 *   • Enable Statutory Bonus                  -> isEnabled
 *   • Payment Cycle (monthly | yearly) -> paymentCycle
 *   • Payment Month (e.g. October)            -> paymentMonth
 *   • Bonus Percentage (default 8.33%)        -> percentage
 *   • State-wise configuration:
 *       - State name                          -> states[].stateName
 *       - State minimum wage                  -> states[].minWage (legacy fallback)
 *       - Skill-wise minimum wage             -> states[].wageCategories[]
 *           employmentCategory: skilled | semiSkilled | unskilled
 *           minWage, effectiveFrom (YYYY-MM)
 *       - Formula base                        -> states[].formulaBase
 *           "minimumWage"   : use state minWage as the base
 *           "basicAndDA"    : use min(actual Basic+DA, ₹7,000) per Bonus Act ceiling
 *
 * Statutory limits (Payment of Bonus Act):
 *   - Eligibility: Basic+DA ≤ ₹21,000/month
 *   - Bonus Act ceiling on calculation base: ₹7,000 (or state min wage if higher)
 *   - Rate: 8.33% (minimum) to 20% (maximum)
 *
 * Output is treated as an EARNING, not a deduction. Returned amount is the
 * monthly slice (cycle == monthly) or the full annual bonus to be paid in the
 * configured paymentMonth (cycle == yearly).
 *
 * Statutory bonus is never LOP-prorated — once eligible (incl. 30 working days
 * in the accounting year), the full monthly/annual amount is paid.
 */
const PAYMENT_MONTH_TO_SHORT = {
    january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr',
    may: 'May', june: 'Jun', july: 'Jul', august: 'Aug',
    september: 'Sep', october: 'Oct', november: 'Nov', december: 'Dec',
    jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
    jun: 'Jun', jul: 'Jul', aug: 'Aug', sep: 'Sep',
    oct: 'Oct', nov: 'Nov', dec: 'Dec',
};

const BONUS_ELIGIBILITY_CEILING = 21000; // Basic+DA above this → not eligible
const DEFAULT_BONUS_MINIMUM_WAGE = 7000; // minimum bonus base floor
const BONUS_MIN_WORKING_DAYS = 30; // Payment of Bonus Act — min working days in accounting year
const BONUS_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function normalizeBonusPaymentCycle(cycleValue) {
    const raw = String(cycleValue || 'yearly').trim().toLowerCase().replace(/[\s_]+/g, '-');
    if (raw === 'monthly') return 'monthly';
    // Legacy half-yearly / annual aliases → treat as yearly for payment-month gate
    return 'yearly';
}

function isBonusPaymentMonth(month, paymentMonthShort, cycle) {
    if (!month || !paymentMonthShort) return true;

    const currentIdx = BONUS_MONTHS_SHORT.indexOf(month);
    const paymentIdx = BONUS_MONTHS_SHORT.indexOf(paymentMonthShort);
    if (currentIdx === -1 || paymentIdx === -1) return false;

    if (cycle === 'half-yearly') {
        const secondIdx = (paymentIdx + 6) % 12;
        return currentIdx === paymentIdx || currentIdx === secondIdx;
    }

    return currentIdx === paymentIdx;
}

function pickBonusStateConfig(bonusConfig, employeeState) {
    if (!bonusConfig || !Array.isArray(bonusConfig.states) || bonusConfig.states.length === 0) {
        return null;
    }
    const wanted = (employeeState || '').trim().toLowerCase();
    if (wanted) {
        const match = bonusConfig.states.find(
            (s) => (s.stateName || '').trim().toLowerCase() === wanted
        );
        if (match) return match;
    }
    return bonusConfig.states[0];
}

const BONUS_EMPLOYMENT_CATEGORIES = ['skilled', 'semiSkilled', 'unskilled'];

function normalizeEmploymentCategory(value) {
    const raw = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (raw === 'skilled') return 'skilled';
    if (raw === 'semiskilled') return 'semiSkilled';
    if (raw === 'unskilled') return 'unskilled';
    return null;
}

function parseEffectiveFromKey(value) {
    if (!value) return null;
    const raw = String(value).trim();

    const yearMonthMatch = raw.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
    if (yearMonthMatch) {
        return `${yearMonthMatch[1]}-${String(yearMonthMatch[2]).padStart(2, '0')}`;
    }

    const monthYearMatch = raw.match(/^(\d{4})[-/](\d{1,2})$/);
    if (monthYearMatch) {
        return `${monthYearMatch[1]}-${String(monthYearMatch[2]).padStart(2, '0')}`;
    }

    return null;
}

function toPayrollYearMonthKey(year, month) {
    const monthIdx = BONUS_MONTHS_SHORT.indexOf(month);
    if (!Number.isInteger(Number(year)) || monthIdx === -1) return null;
    return `${Number(year)}-${String(monthIdx + 1).padStart(2, '0')}`;
}

function resolveBonusMinWage(stateCfg, employmentCategory, year = null, month = null) {
    if (!stateCfg) return 0;

    const categories = Array.isArray(stateCfg.wageCategories) && stateCfg.wageCategories.length
        ? stateCfg.wageCategories
        : (Array.isArray(stateCfg.employmentCategories) ? stateCfg.employmentCategories : []);
    const normalizedCategory = normalizeEmploymentCategory(employmentCategory);
    const payrollKey = toPayrollYearMonthKey(year, month);

    if (categories.length > 0 && normalizedCategory) {
        const matching = categories.filter(
            (item) => normalizeEmploymentCategory(item?.employmentCategory) === normalizedCategory
        );

        if (matching.length > 0) {
            const applicable = matching
                .map((item) => ({
                    item,
                    effectiveKey: parseEffectiveFromKey(item?.effectiveFrom),
                }))
                .filter((entry) => !payrollKey || !entry.effectiveKey || entry.effectiveKey <= payrollKey)
                .sort((a, b) => String(b.effectiveKey || '').localeCompare(String(a.effectiveKey || '')));

            const selected = applicable[0]?.item || matching[matching.length - 1];
            const categoryWage = safeNumber(selected?.minWage, 0);
            if (categoryWage > 0) return categoryWage;
        }
    }

    return safeNumber(stateCfg.minWage, 0);
}

function normalizePaymentMonth(name) {
    if (!name) return null;
    return PAYMENT_MONTH_TO_SHORT[String(name).trim().toLowerCase()] || null;
}

/**
 * @param {Object} params
 * @param {Object} params.bonusConfig              Org-level config (statutoryCompliance.statutoryBonus)
 * @param {Number} params.basicPlusDA              Employee's Basic + DA for the month
 * @param {String} [params.employeeState]          Employee's state (for state min wage lookup)
 * @param {String} [params.employeeEmploymentCategory] skilled | semiSkilled | unskilled
 * @param {String} [params.month]                  Short month name (Jan..Dec)
 * @param {Number} [params.year]                  Payroll year for effectiveFrom filtering
 * @param {Number} [params.paidDays]               Paid days in the payroll month
 * @param {Number} [params.totalDays]              Total days in the payroll month
 * @param {Number} [params.accountingYearWorkedDays] Present + paid-leave days in the
 *                                                 accounting year (Apr–Mar) up to this month
 * @returns {Object}
 */
function calculateStatutoryBonus({
    bonusConfig,
    basicPlusDA = 0,
    employeeState = null,
    employeeEmploymentCategory = null,
    month = null,
    year = null,
    paidDays = null,
    totalDays = null,
    accountingYearWorkedDays = null,
} = {}) {
    const empty = {
        applicable: false,
        amount: 0,
        cycle: 'yearly',
        details: {},
    };

    if (!bonusConfig || !bonusConfig.isEnabled) {
        return empty;
    }

    // Eligibility check — over configured eligibility ceiling basic+DA is not entitled
    const eligibilityCeiling = safeNumber(bonusConfig.eligibilityCeiling, BONUS_ELIGIBILITY_CEILING);
    if (basicPlusDA > eligibilityCeiling) {
        return { ...empty, details: { reason: 'over eligibility ceiling', basicPlusDA, eligibilityCeiling } };
    }

    const minWorkingDaysRequired = safeNumber(bonusConfig.minWorkingDays, BONUS_MIN_WORKING_DAYS);
    if (accountingYearWorkedDays !== null && accountingYearWorkedDays !== undefined) {
        const workedDays = safeNumber(accountingYearWorkedDays, 0);
        if (workedDays < minWorkingDaysRequired) {
            return {
                ...empty,
                details: {
                    reason: 'under minimum working days in accounting year',
                    accountingYearWorkedDays: round(workedDays),
                    minWorkingDaysRequired: round(minWorkingDaysRequired),
                },
            };
        }
    }

    const cycle = normalizeBonusPaymentCycle(bonusConfig.paymentCycle);
    const paymentMonthShort = normalizePaymentMonth(bonusConfig.paymentMonth);

    // For yearly — pay only in configured payment month
    if (cycle === 'yearly') {
        if (month && paymentMonthShort && !isBonusPaymentMonth(month, paymentMonthShort, cycle)) {
            return {
                ...empty,
                cycle,
                details: {
                    reason: 'not payment month',
                    paymentMonth: paymentMonthShort,
                    currentMonth: month,
                    paymentCycle: cycle,
                },
            };
        }
    }

    const percentage = safeNumber(bonusConfig.percentage, 8.33);
    const minimumBonusWage = safeNumber(bonusConfig.minimumBonusWage, DEFAULT_BONUS_MINIMUM_WAGE);
    const stateCfg = pickBonusStateConfig(bonusConfig, employeeState);
    const resolvedMinWage = resolveBonusMinWage(
        stateCfg,
        employeeEmploymentCategory,
        year,
        month
    );
    const normalizedEmploymentCategory = normalizeEmploymentCategory(employeeEmploymentCategory);

    // Determine calculation base per Bonus Act
    let calcBase = 0;
    let zeroReason = '';
    if (stateCfg) {
        const formula = (stateCfg.formulaBase || 'minimumWage').toLowerCase();
        if (formula === 'minimumwage') {
            // Min-wage formula: require category + configured wage. No Basic+DA fallback.
            if (!normalizedEmploymentCategory) {
                calcBase = 0;
                zeroReason = 'employment category missing';
            } else if (resolvedMinWage > 0) {
                calcBase = Math.max(resolvedMinWage, minimumBonusWage);
            } else {
                calcBase = 0;
                zeroReason = 'min wage zero for category';
            }
        } else if (formula === 'basicanddastorage' || formula === 'basicandda') {
            calcBase = Math.max(basicPlusDA, minimumBonusWage);
        }
    } else {
        // No matching state config — use actual Basic+DA and minimum wage floor
        calcBase = Math.max(basicPlusDA, minimumBonusWage);
    }

    if (calcBase <= 0) {
        return {
            ...empty,
            cycle,
            details: {
                reason: zeroReason || 'calc base zero',
                employmentCategory: normalizedEmploymentCategory || '',
                minWageUsed: round(resolvedMinWage),
                paymentMonth: paymentMonthShort,
                paymentCycle: cycle,
            },
        };
    }

    // Full amount — statutory bonus is not LOP-prorated
    const monthlyAmount = (calcBase * percentage) / 100;
    const annualAmount = monthlyAmount * 12;

    let amount = annualAmount;
    if (cycle === 'monthly') {
        amount = monthlyAmount;
    }

    return {
        applicable: amount > 0,
        amount: round(amount),
        cycle,
        details: {
            stateUsed: stateCfg ? stateCfg.stateName : '',
            employmentCategory: normalizedEmploymentCategory || '',
            minWageUsed: round(resolvedMinWage),
            calcBase: round(calcBase),
            percentage,
            paymentMonth: paymentMonthShort,
            monthlyEquivalent: round(monthlyAmount),
            annualEquivalent: round(annualAmount),
            ...(accountingYearWorkedDays !== null && accountingYearWorkedDays !== undefined
                ? {
                    accountingYearWorkedDays: round(safeNumber(accountingYearWorkedDays, 0)),
                    minWorkingDaysRequired: round(minWorkingDaysRequired),
                }
                : {}),
        },
    };
}

module.exports = {
    calculateEpf,
    resolveEpfApplicableWage,
    sumConsiderForEpf,
    calculateEsi,
    isEmployeeEsiOptedOut,
    sumConsiderForEsi,
    calculateProfessionalTax,
    calculateLwf,
    resolveLwfDeductionMonths,
    resolveLwfDeductionsPerYear,
    buildNetPaySchedule,
    calculateStatutoryBonus,
    normalizeEmploymentCategory,
    resolveBonusMinWage,
    BONUS_EMPLOYMENT_CATEGORIES,
    BONUS_MIN_WORKING_DAYS,
    EPF_DEFAULTS: DEFAULTS,
    ESI_DEFAULTS,
};
