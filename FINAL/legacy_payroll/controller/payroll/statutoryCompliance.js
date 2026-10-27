const { initModels } = require("../../models/indexModel");
const { sendResponse, handleError } = require('../../utils/responce');

function normalizeLwfCalculationType(value) {
    const raw = String(value || 'fixed').trim().toLowerCase();
    return raw === 'percentage' || raw === 'percent' || raw === '%' ? 'percentage' : 'fixed';
}

function normalizeLwfStateStatus(state = {}) {
    if (state.status === 'inactive' || state.status === 'active') {
        return state.status;
    }
    if (state.isApplicable === false) return 'inactive';
    return 'active';
}

function normalizeLwfMonthsList(months) {
    if (!Array.isArray(months)) return [];
    const aliases = {
        january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr',
        may: 'May', june: 'Jun', july: 'Jul', august: 'Aug',
        september: 'Sep', october: 'Oct', november: 'Nov', december: 'Dec',
        jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
        jun: 'Jun', jul: 'Jul', aug: 'Aug', sep: 'Sep',
        oct: 'Oct', nov: 'Nov', dec: 'Dec',
    };
    const allowed = new Set(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    const unique = [];
    months.forEach((m) => {
        if (m == null || m === '') return;
        const raw = String(m).trim();
        const short = aliases[raw.toLowerCase()] || (raw.charAt(0).toUpperCase() + raw.slice(1, 3).toLowerCase());
        if (allowed.has(short) && !unique.includes(short)) unique.push(short);
    });
    return unique;
}

/** PT deduction cycle: only monthly | half-yearly (normalize UI aliases). */
function normalizePtDeductionCycle(value) {
    const raw = String(value || 'monthly').trim().toLowerCase().replace(/[\s_]+/g, '-');
    if (
        raw === 'half-yearly' ||
        raw === 'halfyearly' ||
        raw === 'semi-annual' ||
        raw === 'semiannual'
    ) {
        return 'half-yearly';
    }
    return 'monthly';
}

function sanitizeProfessionalTax(pt = {}) {
    if (!pt || typeof pt !== 'object') return pt;
    return {
        ...pt,
        deductionCycle: normalizePtDeductionCycle(pt.deductionCycle),
    };
}

function sanitizeEpf(epf = {}) {
    if (!epf || typeof epf !== 'object') return epf;
    return {
        ...epf,
        restrictedPfWage: Number(epf.restrictedPfWage) || 15000,
        employeeContributionRate: Number(epf.employeeContributionRate) || 12,
        employerContributionRate: Number(epf.employerContributionRate) || 12,
        proRateRestrictedPfWage: epf.proRateRestrictedPfWage !== false,
        considerSalaryBasedOnLOP: epf.considerSalaryBasedOnLOP !== false,
        considerAllPfComponentsAfterLopBelowCeiling:
            epf.considerAllPfComponentsAfterLopBelowCeiling !== false,
    };
}

/** Statutory Bonus payment cycle: monthly | yearly. */
function normalizeBonusPaymentCycle(value) {
    const raw = String(value || 'yearly').trim().toLowerCase().replace(/[\s_]+/g, '-');
    if (raw === 'monthly') return 'monthly';
    return 'yearly';
}

function sanitizeBonusWageCategory(category = {}) {
    const allowed = new Set(['skilled', 'semiSkilled', 'unskilled']);
    const rawCategory = String(category.employmentCategory || '').trim();
    return {
        employmentCategory: allowed.has(rawCategory) ? rawCategory : undefined,
        minWage: Number(category.minWage) || 0,
        effectiveFrom: String(category.effectiveFrom || '').trim(),
    };
}

function sanitizeStatutoryBonus(bonus = {}) {
    if (!bonus || typeof bonus !== 'object') return bonus;

    const sanitized = {
        ...bonus,
        paymentCycle: normalizeBonusPaymentCycle(bonus.paymentCycle),
        percentage: Number(bonus.percentage) || 0,
        minimumBonusWage: Number(bonus.minimumBonusWage) || 7000,
        eligibilityCeiling: Number(bonus.eligibilityCeiling) || 21000,
    };

    if (!Array.isArray(bonus.states)) {
        return sanitized;
    }

    sanitized.states = bonus.states.map((state = {}) => {
        // Frontend historically sent employmentCategories; model/calculator use wageCategories
        const rawCategories = Array.isArray(state.wageCategories) && state.wageCategories.length
            ? state.wageCategories
            : (Array.isArray(state.employmentCategories) ? state.employmentCategories : []);

        const wageCategories = rawCategories
            .map(sanitizeBonusWageCategory)
            .filter((item) => item.employmentCategory);

        const nextState = {
            stateName: state.stateName || '',
            minWage: Number(state.minWage) || 0,
            formulaBase:
                String(state.formulaBase || 'minimumWage').trim() === 'basicAndDA'
                    ? 'basicAndDA'
                    : 'minimumWage',
            wageCategories,
        };

        // Do not persist the legacy key
        return nextState;
    });

    return sanitized;
}

function sanitizeLabourWelfareFund(lwf = {}) {
    if (!lwf || typeof lwf !== 'object') return lwf;

    const sanitized = { ...lwf };
    sanitized.months = normalizeLwfMonthsList(sanitized.months);

    if (!Array.isArray(sanitized.states)) {
        return sanitized;
    }

    sanitized.states = sanitized.states.map((state = {}) => {
        const status = normalizeLwfStateStatus(state);
        const cycleRaw = String(state.deductionCycle || sanitized.deductionCycle || 'half-yearly')
            .toLowerCase()
            .replace(/[\s_]+/g, '-');
        const deductionCycle =
            cycleRaw === 'monthly'
                ? 'monthly'
                : cycleRaw === 'yearly' || cycleRaw === 'annual'
                    ? 'yearly'
                    : 'half-yearly';
        const ALL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const savedMonths = normalizeLwfMonthsList(state.months);
        const normalizeMonth = (value, fallback) =>
            normalizeLwfMonthsList([value])[0] || fallback;

        let periodFrom;
        let periodTo;
        let months;
        if (deductionCycle === 'monthly') {
            periodFrom = 'Jan';
            periodTo = 'Dec';
            months = [...ALL_MONTHS];
        } else if (deductionCycle === 'yearly') {
            // One dropdown: selected value is the yearly deduction month.
            periodFrom = normalizeMonth(state.periodFrom || savedMonths[0], 'Dec');
            periodTo = periodFrom;
            months = [periodFrom];
        } else {
            // Two dropdowns: selected values are the two half-yearly deduction months.
            periodFrom = normalizeMonth(state.periodFrom || savedMonths[0], 'Jun');
            periodTo = normalizeMonth(state.periodTo || savedMonths[1], 'Dec');
            months = ALL_MONTHS.filter((month) => month === periodFrom || month === periodTo);
        }

        const calculationType = normalizeLwfCalculationType(state.calculationType);
        const normalizeShare = (value) => {
            const amount = Math.max(0, Number(value) || 0);
            return calculationType === 'percentage' ? Math.min(amount, 100) : amount;
        };
        return {
            ...state,
            deductionCycle,
            periodFrom,
            periodTo,
            calculationType,
            status,
            // keep checkbox in sync with status for older frontends
            isApplicable: status === 'active',
            months,
            minAmount: Number(state.minAmount) || 0,
            maxAmount:
                state.maxAmount === '' || state.maxAmount === null || state.maxAmount === undefined
                    ? ''
                    : state.maxAmount,
            employeeShare: normalizeShare(state.employeeShare),
            employerShare: normalizeShare(state.employerShare),
        };
    });

    return sanitized;
}

// ✅ Create or Update Statutory Compliance (Safe Partial Update)
exports.createOrUpdateCompliance = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found in headers");
        }

        const { StatutoryComplianceModel } = await initModels(org_uuid);
        const organizationId = org_uuid;
        const {
            epf,
            esi,
            professionalTax,
            labourWelfareFund,
            statutoryBonus,
        } = req.body;

        if (!organizationId) {
            return sendResponse(res, 400, false, "organizationId is required");
        }

        // 🧩 Step 1: Find existing record
        let compliance = await StatutoryComplianceModel.findOne({ organizationId });

        // 🧩 Step 2: If not found → create new blank object
        if (!compliance) {
            compliance = new StatutoryComplianceModel({
                organizationId,
                epf: {},
                esi: {},
                professionalTax: {},
                labourWelfareFund: {},
                statutoryBonus: {},
            });
        }

        // 🧠 Step 3: Merge new data section-wise (only what user sent)
        const updateSections = {
            epf: epf ? sanitizeEpf(epf) : epf,
            esi,
            professionalTax: professionalTax
                ? sanitizeProfessionalTax(professionalTax)
                : professionalTax,
            labourWelfareFund: labourWelfareFund
                ? sanitizeLabourWelfareFund(labourWelfareFund)
                : labourWelfareFund,
            statutoryBonus: statutoryBonus
                ? sanitizeStatutoryBonus(statutoryBonus)
                : statutoryBonus,
        };

        for (const [section, data] of Object.entries(updateSections)) {
            if (data && typeof data === "object") {
                const existing = compliance[section]?.toObject
                    ? compliance[section].toObject()
                    : (compliance[section]?._doc || compliance[section] || {});
                compliance[section] = {
                    ...existing,
                    ...data,
                };
                // Ensure arrays (e.g. LWF states: []) fully replace, not merge with old subdocs
                if (Array.isArray(data.states)) {
                    compliance[section].states = data.states;
                }
                compliance.markModified(section);
            }
        }

        // 🧩 Step 4: Save merged document
        const updatedCompliance = await compliance.save();

        return sendResponse(res, 200, true, "Statutory compliance saved successfully", updatedCompliance);
    } catch (error) {
        console.error("Error in createOrUpdateCompliance:", error);
        return handleError(res, error);
    }
};

// ✅ Get Statutory Compliance (by organization)
exports.getCompliance = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found in headers");
        }

        const { StatutoryComplianceModel } = await initModels(org_uuid);
        // const { organizationId } = req.query;

        const organizationId = org_uuid;

        const compliance = await StatutoryComplianceModel.findOne({ organizationId });

        if (!compliance) {
            return sendResponse(res, 404, false, "No statutory compliance found for this organization");
        }

        return sendResponse(res, 200, true, "Statutory compliance fetched successfully", compliance);
    } catch (error) {
        console.error("Error in getCompliance:", error);
        return handleError(res, error);
    }
};
