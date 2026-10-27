const mongoose = require("mongoose");

/**
 * Get leave period based on leave type
 */
function getLeavePeriod(leaveType, refDate = new Date()) {
    let startDate, endDate;

    if (leaveType.typeOfLeave === "Monthly") {
        startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
        endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59);
    } else {
        if (leaveType.yearFormat === "financial") {
            const year = refDate.getMonth() >= 3 ? refDate.getFullYear() : refDate.getFullYear() - 1;
            startDate = new Date(year, 3, 1); // 1 April
            endDate = new Date(year + 1, 2, 31, 23, 59, 59); // 31 March
        } else {
            startDate = new Date(refDate.getFullYear(), 0, 1);
            endDate = new Date(refDate.getFullYear(), 11, 31, 23, 59, 59);
        }
    }

    return { startDate, endDate };
}

function toValidDate(value) {
    if (value === undefined || value === null || value === '') return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    // Date-only strings (from <input type="date">) — parse as local calendar date
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed || trimmed.toUpperCase() === 'NA' || trimmed.toUpperCase() === 'N/A') {
            return null;
        }
        const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
        if (dateOnly) {
            const y = Number(dateOnly[1]);
            const m = Number(dateOnly[2]);
            const d = Number(dateOnly[3]);
            return new Date(y, m - 1, d);
        }
    }

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;

    // Mongo date-only often stored as UTC midnight — treat as calendar date (UTC Y/M/D)
    if (
        d.getUTCHours() === 0 &&
        d.getUTCMinutes() === 0 &&
        d.getUTCSeconds() === 0 &&
        d.getUTCMilliseconds() === 0
    ) {
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }

    return d;
}

/** Compare leave validity on calendar-day boundaries (avoids endOf('day') timezone false fails). */
function startOfDayUtc(value) {
    if (value === undefined || value === null || value === '') return null;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        // Prefer UTC Y/M/D for UTC-midnight excel/ISO dates
        if (
            value.getUTCHours() === 0 &&
            value.getUTCMinutes() === 0 &&
            value.getUTCSeconds() === 0
        ) {
            return new Date(Date.UTC(
                value.getUTCFullYear(),
                value.getUTCMonth(),
                value.getUTCDate(),
                0, 0, 0, 0
            ));
        }
        return new Date(Date.UTC(
            value.getFullYear(),
            value.getMonth(),
            value.getDate(),
            0, 0, 0, 0
        ));
    }
    const d = toValidDate(value);
    if (!d) return null;
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
}

function formatDateYmd(value) {
    const d = value instanceof Date ? value : toValidDate(value);
    if (!d) return 'N/A';
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Joining date for leave accrual:
 * 1) dateOfJoining if present
 * 2) else createdAt
 */
function getEmployeeJoiningDate(employee = {}) {
    return toValidDate(employee.dateOfJoining) || toValidDate(employee.createdAt) || null;
}

function getEmployeeJoiningDateMeta(employee = {}) {
    const doj = toValidDate(employee.dateOfJoining);
    if (doj) return { date: doj, source: 'dateOfJoining' };
    const created = toValidDate(employee.createdAt);
    if (created) return { date: created, source: 'createdAt' };
    return { date: null, source: null };
}

function startOfMonth(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getLaterDate(...dates) {
    const valid = dates.map(toValidDate).filter(Boolean);
    if (!valid.length) return null;
    return new Date(Math.max(...valid.map((d) => d.getTime())));
}

function countInclusiveMonths(fromDate, toDate) {
    const from = toValidDate(fromDate);
    const to = toValidDate(toDate);
    if (!from || !to || from > to) return 0;
    const fromM = startOfMonth(from);
    const toM = startOfMonth(to);
    return (toM.getFullYear() - fromM.getFullYear()) * 12 + (toM.getMonth() - fromM.getMonth()) + 1;
}

/**
 * Accrual starts from the later of leave-year start, leave validity, and joining date.
 * Mid-year joiners do not get credit for months before they joined.
 */
function getEffectiveAccrualStart(leaveType, joiningDate, period) {
    return getLaterDate(period?.startDate, leaveType?.validityStart, joiningDate);
}

/**
 * Yearly creditDays prorated by eligible months in the leave year.
 * Example: calendar year, join Aug, creditDays=12 → Aug–Dec (5/12) → 5
 */
function calculateProratedYearlyCredit(leaveType, joiningDate, refDate = new Date()) {
    const creditDays = Math.max(0, Number(leaveType.creditDays) || 0);
    if (creditDays <= 0) {
        return { totalCredit: 0, eligibleMonths: 0, periodMonths: 0, effectiveStart: null };
    }

    const period = getLeavePeriod(leaveType, refDate);
    const periodMonths = countInclusiveMonths(period.startDate, period.endDate) || 12;
    const effectiveStart = getEffectiveAccrualStart(leaveType, joiningDate, period);

    if (!effectiveStart || effectiveStart > period.endDate) {
        return { totalCredit: 0, eligibleMonths: 0, periodMonths, effectiveStart: effectiveStart || null };
    }

    const eligibleMonths = countInclusiveMonths(effectiveStart, period.endDate);
    if (eligibleMonths <= 0) {
        return { totalCredit: 0, eligibleMonths: 0, periodMonths, effectiveStart };
    }
    if (eligibleMonths >= periodMonths) {
        return { totalCredit: creditDays, eligibleMonths, periodMonths, effectiveStart };
    }

    const totalCredit = Math.round((creditDays * eligibleMonths) / periodMonths * 100) / 100;
    return { totalCredit, eligibleMonths, periodMonths, effectiveStart };
}

/** Back-compat helper: returns numeric credit only. */
function getProratedYearlyCreditDays(leaveType, joiningDate, refDate = new Date()) {
    return calculateProratedYearlyCredit(leaveType, joiningDate, refDate).totalCredit;
}

function splitLeaveByMonth(startDate, endDate) {
    const result = {};
    let current = new Date(startDate);

    while (current <= new Date(endDate)) {
        const monthKey = `${current.getFullYear()}-${current.getMonth() + 1}`;

        if (!result[monthKey]) result[monthKey] = 0;
        result[monthKey]++;

        current.setDate(current.getDate() + 1);
    }

    return result;
}

/**
 * Validate & calculate leave balance
 */
async function checkLeaveBalance({
    LeaveRequestModel,
    leaveType,
    employeeId,
    leaveTypeId,
    requestedDays,
    excludeRequestId = null,
    requestedStartDate = null,
    requestedEndDate = null,
    joiningDate = null
}) {
    // ---------- SKIP FOR UNLIMITED LEAVE TYPES (LOP) ----------
    if (leaveType.isUnlimited) {
        return {
            totalCredit: 999999,
            usedDays: 0,
            remaining: 999999,
            advanceDays: 0,
            isUnlimited: true
        };
    }

    // ---------- VALIDITY (requested window) ----------
    // Use leave-date as period reference (not "today") so future-dated bulk leaves
    // are checked against the correct leave year.
    const reqStartRaw = requestedStartDate ? new Date(requestedStartDate) : null;
    const reqEndRaw = requestedEndDate ? new Date(requestedEndDate) : null;
    const periodRef = reqStartRaw && !Number.isNaN(reqStartRaw.getTime()) ? reqStartRaw : new Date();
    const period = getLeavePeriod(leaveType, periodRef);

    const reqStart = startOfDayUtc(reqStartRaw || period.startDate);
    const reqEnd = startOfDayUtc(reqEndRaw || period.endDate);
    const joinDate = toValidDate(joiningDate);

    if (joinDate && reqStart < startOfDayUtc(joinDate)) {
        throw new Error("Leave cannot start before employee joining date");
    }

    const validityStart = toValidDate(leaveType.validityStart);
    const validityEnd = toValidDate(leaveType.validityEnd);
    let effectiveStart = startOfDayUtc(period.startDate);
    let effectiveEnd = startOfDayUtc(period.endDate);

    // Narrow by configured validity when it still overlaps this leave year.
    // If validity is entirely in a past leave year (stale after year rollover) but
    // leave type is still active, fall back to the leave-year period.
    if (validityStart || validityEnd) {
        const vStart = validityStart ? startOfDayUtc(validityStart) : null;
        const vEnd = validityEnd ? startOfDayUtc(validityEnd) : null;
        const periodStart = startOfDayUtc(period.startDate);
        const periodEnd = startOfDayUtc(period.endDate);
        const stalePastYear = vEnd && vEnd < periodStart;

        if (!stalePastYear) {
            if (vStart && vStart > effectiveStart) effectiveStart = vStart;
            if (vEnd && vEnd < effectiveEnd) effectiveEnd = vEnd;
        }
    }

    if (reqStart < effectiveStart || reqEnd > effectiveEnd) {
        const from = formatDateYmd(effectiveStart);
        const to = formatDateYmd(effectiveEnd);
        throw new Error(
            `Leave type not valid for requested period (allowed: ${from} to ${to})`
        );
    }

    // ---------- USED LEAVES (count overlap within period window) ----------
    const match = {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        leaveTypeId: new mongoose.Types.ObjectId(leaveTypeId),
        status: "Approved",
        // only leaves that intersect the current period
        startDate: { $lte: period.endDate },
        endDate: { $gte: period.startDate }
    };

    if (excludeRequestId) {
        match._id = { $ne: new mongoose.Types.ObjectId(excludeRequestId) };
    }

    const usage = await LeaveRequestModel.aggregate([
        { $match: match },
        {
            $project: {
                overlapDays: {
                    $add: [
                        1,
                        {
                            $dateDiff: {
                                startDate: {
                                    $cond: [
                                        { $gt: ["$startDate", period.startDate] },
                                        "$startDate",
                                        period.startDate
                                    ]
                                },
                                endDate: {
                                    $cond: [
                                        { $lt: ["$endDate", period.endDate] },
                                        "$endDate",
                                        period.endDate
                                    ]
                                },
                                unit: "day"
                            }
                        }
                    ]
                }
            }
        },
        {
            $group: {
                _id: null,
                usedDays: { $sum: "$overlapDays" }
            }
        }
    ]);

    const usedDays = usage[0]?.usedDays || 0;

    // ---------- TOTAL CREDIT (Yearly prorated from joining month) ----------
    const totalCredit =
        leaveType.typeOfLeave === "Monthly"
            ? leaveType.monthlyAllowed
            : getProratedYearlyCreditDays(leaveType, joinDate);

    const remaining = totalCredit - usedDays;

    // ---------- BALANCE CHECK ----------
    if (remaining < requestedDays) {
        if (
            !leaveType.advancedLeave ||
            Math.abs(remaining - requestedDays) > leaveType.advancedDayLimit
        ) {
            throw new Error(
                `Insufficient leave balance. Remaining: ${remaining}`
            );
        }
    }

    // ---------- YEARLY MONTHLY CAP (optional) ----------
    // Yearly/Special: creditDays = annual stock; monthlyAllowed > 0 = max days per calendar month
    // IMPORTANT: only check the actual requested leave dates — never the full leave-year period
    // (falling back to period made "requested: 31" for a 1-day leave).
    if (leaveType.typeOfLeave !== "Monthly" && Number(leaveType.monthlyAllowed) > 0) {
        if (reqStartRaw && reqEndRaw && !Number.isNaN(reqStartRaw.getTime()) && !Number.isNaN(reqEndRaw.getTime())) {
            await checkYearlyMonthlyCap({
                LeaveRequestModel,
                leaveType,
                employeeId,
                leaveTypeId,
                startDate: startOfDayUtc(reqStartRaw),
                endDate: startOfDayUtc(reqEndRaw),
                requestedDays,
                excludeRequestId
            });
        }
    }

    return {
        totalCredit,
        usedDays,
        remaining,
        advanceDays: remaining < 0 ? Math.abs(remaining) : 0,
        periodStart: period.startDate,
        periodEnd: period.endDate
    };
}

/**
 * For Yearly leave: enforce monthlyAllowed as a per-month ceiling.
 * Example: creditDays=12, monthlyAllowed=2 → max 2 days in any single month.
 */
async function checkYearlyMonthlyCap({
    LeaveRequestModel,
    leaveType,
    employeeId,
    leaveTypeId,
    startDate,
    endDate,
    requestedDays,
    excludeRequestId = null
}) {
    const monthlyCap = Number(leaveType.monthlyAllowed) || 0;
    if (monthlyCap <= 0) return;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Build requested days per month
    const monthMap = {};
    let calendarDays = 0;
    let cursor = new Date(start);
    while (cursor <= end) {
        calendarDays++;
        cursor.setDate(cursor.getDate() + 1);
    }

    if (calendarDays <= 0) return;

    // Half-day (single date with 0.5) vs full calendar days
    cursor = new Date(start);
    while (cursor <= end) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth() + 1}`;
        const dayWeight =
            calendarDays === 1 && Number(requestedDays) > 0 && Number(requestedDays) < 1
                ? Number(requestedDays)
                : 1;
        monthMap[key] = (monthMap[key] || 0) + dayWeight;
        cursor.setDate(cursor.getDate() + 1);
    }

    for (const key of Object.keys(monthMap)) {
        const [year, month] = key.split("-").map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59);
        const requestedInMonth = monthMap[key];

        const match = {
            employeeId: new mongoose.Types.ObjectId(employeeId),
            leaveTypeId: new mongoose.Types.ObjectId(leaveTypeId),
            status: "Approved",
            startDate: { $lte: monthEnd },
            endDate: { $gte: monthStart }
        };

        if (excludeRequestId) {
            match._id = { $ne: new mongoose.Types.ObjectId(excludeRequestId) };
        }

        const existing = await LeaveRequestModel.find(match)
            .select("startDate endDate leaveDays leaveDurationType")
            .lean();

        let usedInMonth = 0;
        for (const req of existing) {
            if (req.leaveDurationType === "Half-Day") {
                const reqStart = new Date(req.startDate);
                if (
                    reqStart.getFullYear() === year &&
                    reqStart.getMonth() + 1 === month
                ) {
                    usedInMonth += Number(req.leaveDays) || 0.5;
                }
                continue;
            }

            const overlapStart = new Date(Math.max(new Date(req.startDate), monthStart));
            const overlapEnd = new Date(Math.min(new Date(req.endDate), monthEnd));
            if (overlapStart > overlapEnd) continue;

            let d = new Date(overlapStart);
            while (d <= overlapEnd) {
                usedInMonth += 1;
                d.setDate(d.getDate() + 1);
            }
        }

        if (usedInMonth + requestedInMonth > monthlyCap) {
            throw new Error(
                `Monthly leave limit exceeded for ${month}/${year}. Allowed: ${monthlyCap}, already used: ${usedInMonth}, requested: ${requestedInMonth}`
            );
        }
    }
}

async function checkLeaveOverlap({
    LeaveRequestModel,
    employeeId,
    startDate,
    endDate,
    leaveDurationType,
    halfDaySession,
    clusterDates = [],
    excludeRequestId = null
}) {
    const baseMatch = {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        status: { $in: ["Pending", "Approved"] }
    };

    if (excludeRequestId) {
        baseMatch._id = { $ne: new mongoose.Types.ObjectId(excludeRequestId) };
    }

    // ---------- CLUSTER ----------
    if (leaveDurationType === "Cluster" && clusterDates.length) {
        const existing = await LeaveRequestModel.findOne({
            ...baseMatch,
            $or: [
                { clusterDates: { $in: clusterDates.map(d => new Date(d)) } },
                {
                    startDate: { $lte: new Date(clusterDates.at(-1)) },
                    endDate: { $gte: new Date(clusterDates[0]) }
                }
            ]
        });

        if (existing) {
            throw new Error("Leave already applied for one or more selected dates");
        }
        return;
    }

    // ---------- FULL / HALF ----------
    const overlappingLeave = await LeaveRequestModel.findOne({
        ...baseMatch,
        startDate: { $lte: new Date(endDate) },
        endDate: { $gte: new Date(startDate) }
    });

    if (!overlappingLeave) return;

    // ---------- HALF DAY SPECIAL ----------
    if (
        leaveDurationType === "Half-Day" &&
        overlappingLeave.leaveDurationType === "Half-Day"
    ) {
        if (overlappingLeave.halfDaySession === halfDaySession) {
            throw new Error("Half-day leave already applied for same session");
        }
        return; // different session allowed
    }

    throw new Error("Leave already applied for selected date range");
}

async function checkMonthlyLeaveBalance({
    LeaveRequestModel,
    leaveType,
    employeeId,
    leaveTypeId,
    startDate,
    endDate,
    excludeRequestId = null,
    joiningDate = null
}) {
    // ---------- SKIP FOR UNLIMITED LEAVE TYPES (LOP) ----------
    if (leaveType.isUnlimited) {
        return { isUnlimited: true };
    }

    startDate = new Date(startDate);
    endDate = new Date(endDate);
    const joinDate = toValidDate(joiningDate);

    if (joinDate && startDate < joinDate) {
        throw new Error("Leave cannot start before employee joining date");
    }

    /* ===============================
       1️⃣ VALIDITY CHECK
    =============================== */
    if (leaveType.validityStart && startDate < leaveType.validityStart) {
        throw new Error("Leave cannot start before validity start date");
    }

    if (leaveType.validityEnd && endDate > leaveType.validityEnd) {
        throw new Error("Leave cannot exceed validity end date");
    }

    // Accrue only from joining month onward (not months before join)
    const effectiveStartDate =
        getLaterDate(leaveType.validityStart, joinDate) || startOfMonth(startDate);

    /* ===============================
       2️⃣ SPLIT REQUEST INTO MONTHS
    =============================== */
    const monthMap = {};
    let cursor = new Date(startDate);

    while (cursor <= endDate) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth() + 1}`;
        monthMap[key] = (monthMap[key] || 0) + 1;
        cursor.setDate(cursor.getDate() + 1);
    }

    /* ===============================
       3️⃣ MONTH-WISE CHECK
    =============================== */
    for (const key of Object.keys(monthMap)) {
        const [year, month] = key.split("-").map(Number);

        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59);
        const prevMonthEnd = new Date(year, month - 1, 0, 23, 59, 59);

        /* ===============================
           4️⃣ EARNED TILL PREVIOUS MONTH
        =============================== */
        let monthsEarnedTillPrev = 0;
        let tmp = new Date(effectiveStartDate);
        tmp.setDate(1);

        while (tmp <= prevMonthEnd) {
            monthsEarnedTillPrev++;
            tmp.setMonth(tmp.getMonth() + 1);
        }

        const earnedTillPrev =
            monthsEarnedTillPrev * leaveType.monthlyAllowed;

        /* ===============================
           5️⃣ USED TILL PREVIOUS MONTH
        =============================== */
        const match = {
            employeeId: new mongoose.Types.ObjectId(employeeId),
            leaveTypeId: new mongoose.Types.ObjectId(leaveTypeId),
            status: "Approved",
            startDate: { $lte: prevMonthEnd }
        };

        if (leaveType.validityStart) {
            match.endDate = { $gte: leaveType.validityStart };
        }

        if (excludeRequestId) {
            match._id = { $ne: new mongoose.Types.ObjectId(excludeRequestId) };
        }

        const usage = await LeaveRequestModel.aggregate([
            { $match: match },
            {
                $project: {
                    overlapDays: {
                        $add: [
                            1,
                            {
                                $dateDiff: {
                                    startDate: {
                                        $cond: [
                                            { $lt: ["$startDate", effectiveStartDate] },
                                            effectiveStartDate,
                                            "$startDate"
                                        ]
                                    },
                                    endDate: {
                                        $cond: [
                                            { $gt: ["$endDate", prevMonthEnd] },
                                            prevMonthEnd,
                                            "$endDate"
                                        ]
                                    },
                                    unit: "day"
                                }
                            }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    usedDays: { $sum: "$overlapDays" }
                }
            }
        ]);

        const usedTillPrev = usage[0]?.usedDays || 0;

        /* ===============================
           6️⃣ CARRY FORWARD (FIXED)
        =============================== */
        let carryForward = 0;

        if (leaveType.carryForward) {
            const unusedPrev = earnedTillPrev - usedTillPrev;

            if (unusedPrev > 0) {
                carryForward = Math.min(
                    unusedPrev,
                    leaveType.carryForwardLimit
                );
            }
        }

        /* ===============================
           7️⃣ AVAILABLE FOR CURRENT MONTH
        =============================== */
        const available =
            carryForward + leaveType.monthlyAllowed;

        const requestedDays = monthMap[key];

        console.log(
            `Month: ${month}/${year} | EarnedPrev: ${earnedTillPrev} | UsedPrev: ${usedTillPrev} | Carry: ${carryForward} | Available: ${available} | Requested: ${requestedDays}`
        );

        /* ===============================
           8️⃣ ADVANCE LEAVE CHECK
        =============================== */
        if (available < requestedDays) {
            if (
                !leaveType.advancedLeave ||
                requestedDays - available > leaveType.advancedDayLimit
            ) {
                throw new Error(
                    `Insufficient leave balance for ${month}/${year}. Available: ${available}`
                );
            }
        }
    }

    return true;
}


/**
 * Create default LOP (Loss of Pay) leave type with reason
 * @param {string} org_uuid - Organization UUID for database connection
 * @param {ObjectId} organizationId - Organization/Location ID
 * @returns {Object} Created LOP leave type and reason
 */
async function createDefaultLOPLeaveType(org_uuid, organizationId) {
    try {
        const { initModels } = require('../../models/indexModel');
        const { LeaveTypeModel, LeaveNameModel, LeaveReasonModel } = await initModels(org_uuid);

        // Step 1: Check/Create LOP Leave Name
        let lopLeaveName = await LeaveNameModel.findOne({
            name: 'LOP',
            organizationId: organizationId
        });

        if (!lopLeaveName) {
            lopLeaveName = await LeaveNameModel.create({
                name: 'LOP',
                organizationId: organizationId,
                code: 'LOP',
                shortName: 'LOP',
                isSystemGenerated: true,
                description: 'Loss of Pay Leave',                
                status: 'active'
            });
            console.log(`✅ LOP leave name created for: ${organizationId}`);
        }

        // Step 2: Check/Create LOP Leave Type
        let lopLeaveType = await LeaveTypeModel.findOne({
            leaveNameId: lopLeaveName._id,
            organizationId: organizationId,
            isSystemGenerated: true
        });

        if (!lopLeaveType) {
            lopLeaveType = await LeaveTypeModel.create({
                leaveNameId: lopLeaveName._id,
                organizationId: organizationId,
                leaveType: 'Unpaid',
                creditDays: 0,
                isUnlimited: true,
                isSystemGenerated: true,
                monthlyAllowed: 0,
                typeOfLeave: 'Yearly',
                yearFormat: 'financial',
                reassign: false,
                reassignFrequency: 'None',
                sandwich: true,
                carryForward: false,
                carryForwardLimit: 0,
                encashed: false,
                encashedDays: 0,
                advancedLeave: false,
                advancedDayLimit: 0,
                applicableTo: 'All',
                customFilters: { departments: [], employees: [], notAssignEmployee: [] },
                genderRestrictions: ['All'],
                restrictedDays: [],
                status: 'active'
            });
            console.log(`✅ LOP leave type created for: ${organizationId}`);
        }

        // Step 3: Check/Create LOP Leave Reason
        let lopReason = await LeaveReasonModel.findOne({
            reason: 'Loss of Pay',
            leaveNameId: lopLeaveType._id
        });

        if (!lopReason) {
            lopReason = await LeaveReasonModel.create({
                reason: 'Loss of Pay',
                description: 'Default reason for unpaid leave',
                leaveNameId: lopLeaveType._id,
                isSystemGenerated: true,
                status: 'active'
            });
            console.log(`✅ LOP leave reason created for: ${organizationId}`);
        }

        return { 
            leaveType: lopLeaveType, 
            reason: lopReason, 
            existed: false 
        };

    } catch (error) {
        console.error('Error creating default LOP leave type:', error);
        throw error;
    }
}

/**
 * Calculate sandwich days between leave dates
 * @param {Date} startDate - Leave start date
 * @param {Date} endDate - Leave end date
 * @param {Array} holidays - Array of holiday dates
 * @param {Object} weeklyOff - Employee's weekly off configuration from shift
 * @returns {Object} Sandwich calculation result
 */
function getWeekOfMonth(date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    const dayOfWeek = firstDay.getDay();
    return Math.ceil((dayOfMonth + dayOfWeek) / 7);
}

function getDayName(dayIndex) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
}

async function calculateSandwichDays(startDate, endDate, holidays = [], weeklyOff = null) {
    const sandwichDates = [];
    const holidaySet = new Set(holidays.map(h => new Date(h).toDateString()));
    
    let current = new Date(startDate);
    current.setDate(current.getDate() + 1); // Start from next day after leave start
    
    const end = new Date(endDate);
    
    while (current < end) {
        const dayOfWeek = current.getDay();
        const dateStr = current.toDateString();
        const dayName = getDayName(dayOfWeek);
        
        let isWeekOff = false;
        
        // Check week-off from shift configuration
        if (weeklyOff) {
            const weekOfMonth = getWeekOfMonth(current);
            let weekKey;
            
            switch(weekOfMonth) {
                case 1: weekKey = 'firstWeek'; break;
                case 2: weekKey = 'secondWeek'; break;
                case 3: weekKey = 'thirdWeek'; break;
                case 4: weekKey = 'fourthWeek'; break;
                case 5: weekKey = 'fifthWeek'; break;
                default: weekKey = 'firstWeek';
            }
            
            if (weeklyOff[weekKey] && weeklyOff[weekKey].days && weeklyOff[weekKey].days.includes(dayName)) {
                isWeekOff = true;
            }
        }
        
        // Check if it's week-off or holiday
        if (isWeekOff || holidaySet.has(dateStr)) {
            sandwichDates.push(new Date(current));
        }
        
        current.setDate(current.getDate() + 1);
    }
    
    return {
        sandwichDates,
        sandwichCount: sandwichDates.length,
        hasSandwich: sandwichDates.length > 0
    };
}

/**
 * Check sandwich leave policy and validate balance
 * @param {Object} params - Parameters for sandwich check
 */
async function checkSandwichLeave({
    org_uuid,
    employeeId,
    leaveTypeId,
    startDate,
    endDate,
    requestedDays,
    excludeRequestId = null
}) {
    try {
        const { initModels } = require('../../models/indexModel');
        const {
            EmployeeModel,
            AttendancePolicyModel,
            LeaveTypeModel,
            HolidayModel,
            LeaveRequestModel,
            ShiftModel
        } = await initModels(org_uuid);

        // Fetch employee with attendance policy
        const employee = await EmployeeModel.findById(employeeId)
            .populate('attendancePolicyId')
            .lean();

        if (!employee) {
            throw new Error('Employee not found');
        }

        // Check if sandwich rule is enabled in attendance policy
        const attendancePolicy = employee.attendancePolicyId;
        if (!attendancePolicy || !attendancePolicy.sandwichRule) {
            return {
                sandwichApplied: false,
                totalDaysWithSandwich: requestedDays,
                sandwichDays: 0
            };
        }

        // Fetch leave type to check sandwich setting
        const leaveType = await LeaveTypeModel.findById(leaveTypeId).lean();
        if (!leaveType || !leaveType.sandwich) {
            return {
                sandwichApplied: false,
                totalDaysWithSandwich: requestedDays,
                sandwichDays: 0
            };
        }

        // Fetch holidays for the date range
        const holidays = await HolidayModel.find({
            location: employee.organizationId,
            date: {
                $gte: startDate,
                $lte: endDate
            },
            status: 'Active'
        }).lean();

        // Fetch employee's shift for week-off configuration
        let weeklyOff = null;
        if (employee.shiftId) {
            const shift = await ShiftModel.findById(employee.shiftId).lean();
            if (shift && shift.weeklyOff) {
                weeklyOff = shift.weeklyOff;
            }
        }

        // Calculate sandwich days including week-offs
        const sandwichResult = await calculateSandwichDays(
            startDate,
            endDate,
            holidays.map(h => h.date),
            weeklyOff
        );

        const totalDaysWithSandwich = requestedDays + sandwichResult.sandwichCount;

        // Check if balance is sufficient for total days including sandwich
        if (sandwichResult.hasSandwich) {
            if (leaveType.typeOfLeave === 'Monthly') {
                await checkMonthlyLeaveBalance({
                    LeaveRequestModel,
                    leaveType,
                    employeeId,
                    leaveTypeId,
                    startDate,
                    endDate,
                    excludeRequestId,
                    joiningDate: getEmployeeJoiningDate(employee)
                });
            } else {
                await checkLeaveBalance({
                    LeaveRequestModel,
                    leaveType,
                    employeeId,
                    leaveTypeId,
                    requestedDays: totalDaysWithSandwich,
                    requestedStartDate: startDate,
                    requestedEndDate: endDate,
                    excludeRequestId,
                    joiningDate: getEmployeeJoiningDate(employee)
                });
            }
        }

        return {
            sandwichApplied: sandwichResult.hasSandwich,
            totalDaysWithSandwich,
            sandwichDays: sandwichResult.sandwichCount,
            sandwichDates: sandwichResult.sandwichDates
        };

    } catch (error) {
        throw error;
    }
}

module.exports = {
    getLeavePeriod,
    getEmployeeJoiningDate,
    getEmployeeJoiningDateMeta,
    calculateProratedYearlyCredit,
    getProratedYearlyCreditDays,
    getEffectiveAccrualStart,
    checkLeaveBalance,
    checkLeaveOverlap,
    checkMonthlyLeaveBalance,
    createDefaultLOPLeaveType,
    calculateSandwichDays,
    checkSandwichLeave
};
