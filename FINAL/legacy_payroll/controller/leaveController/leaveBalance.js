const mongoose = require('mongoose');
const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');
const { getLeavePeriod, checkLeaveBalance, getEmployeeJoiningDate, getEmployeeJoiningDateMeta, calculateProratedYearlyCredit } = require("./leaveService");


exports.getAllLeaveBalancesByEmployee = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { employeeId } = req.params;
        const { leaveTypeId } = req.query;

        const {
            LeaveTypeModel,
            LeaveRequestModel,
            EmployeeModel
        } = await initModels(org_uuid);

        const employee = await EmployeeModel.findById(employeeId).lean();
        if (!employee) {
            return sendResponse(res, 404, false, "Employee not found");
        }

        const today = new Date();

        /* ===============================
           1️⃣ FETCH ACTIVE LEAVE TYPES (INCLUDING LOP)
        =============================== */
        const leaveTypeFilter = {
            status: "active",
            $or: [
                { "customFilters.employees": employeeId },
                { applicableTo: "All" },
                { isUnlimited: true }
            ],
            $and: [
                {
                    $or: [
                        { validityStart: null },
                        { validityStart: { $lte: today } }
                    ]
                },
                {
                    $or: [
                        { validityEnd: null },
                        { validityEnd: { $gte: today } }
                    ]
                }
            ]
        };

        if (leaveTypeId) {
            leaveTypeFilter._id = new mongoose.Types.ObjectId(leaveTypeId);
        }

        const leaveTypes = await LeaveTypeModel.find(leaveTypeFilter)
            .populate('leaveNameId', 'name code shortName description')
            .lean();

        if (!leaveTypes.length) {
            return sendResponse(res, 200, true, "No leave types found", []);
        }

        /* ===============================
           2️⃣ USED LEAVES (SINGLE QUERY)
        =============================== */
        const usage = await LeaveRequestModel.aggregate([
            {
                $match: {
                    employeeId: new mongoose.Types.ObjectId(employeeId),
                    status: "Approved",
                    leaveTypeId: { $in: leaveTypes.map(l => l._id) }
                }
            },
            {
                $group: {
                    _id: "$leaveTypeId",
                    usedDays: { $sum: "$leaveDays" },
                    advanceDays: { $sum: "$advanceDays" }
                }
            }
        ]);

        const usageMap = {};
        usage.forEach(u => {
            usageMap[u._id.toString()] = u;
        });

        /* ===============================
           3️⃣ FINAL BALANCE CALCULATION
        =============================== */
        const result = [];

        for (const lt of leaveTypes) {
            const usage = usageMap[lt._id.toString()] || {};
            const usedDays = usage.usedDays || 0;
            const advanceUsed = usage.advanceDays || 0;

            /* ---------- UNLIMITED LEAVE TYPES (LOP) ---------- */
            if (lt.isUnlimited) {
                result.push({
                    leaveTypeId: lt._id,
                    leaveNameId: lt.leaveNameId,
                    typeOfLeave: lt.typeOfLeave,
                    leaveType: lt.leaveType,
                    validityStart: lt.validityStart || null,
                    validityEnd: lt.validityEnd || null,
                    isUnlimited: true,
                    totalCredit: 'Unlimited',
                    usedDays,
                    remaining: 'Unlimited',
                    advanceUsed: 0,
                    allowAdvance: false,
                    advanceLimit: 0
                });
                continue;
            }

            /* ---------- YEARLY / SPECIAL ---------- */
            if (lt.typeOfLeave !== "Monthly") {
                const joinMeta = getEmployeeJoiningDateMeta(employee);
                const joiningDate = joinMeta.date;
                const proration = calculateProratedYearlyCredit(lt, joiningDate);
                const totalCredit = proration.totalCredit;
                result.push({
                    leaveTypeId: lt._id,
                    leaveNameId: lt.leaveNameId,
                    typeOfLeave: lt.typeOfLeave,
                    leaveType: lt.leaveType,
                    validityStart: lt.validityStart || null,
                    validityEnd: lt.validityEnd || null,
                    fullYearCredit: lt.creditDays,
                    totalCredit,
                    eligibleMonths: proration.eligibleMonths,
                    periodMonths: proration.periodMonths,
                    accrualStart: proration.effectiveStart,
                    monthlyAllowed: lt.monthlyAllowed || 0,
                    usedDays,
                    remaining: totalCredit - usedDays,
                    advanceUsed,
                    allowAdvance: lt.advancedLeave,
                    advanceLimit: lt.advancedDayLimit,
                    joiningDate: joiningDate || null,
                    joiningDateSource: joinMeta.source
                });
                continue;
            }

            /* ---------- MONTHLY (FIXED LOGIC) ---------- */

            // Accrue from later of validityStart and joining date (skip months before join)
            const joiningDate = getEmployeeJoiningDate(employee);
            const effectiveCandidates = [lt.validityStart, joiningDate]
                .filter(Boolean)
                .map((d) => new Date(d));
            const effectiveStartDate = effectiveCandidates.length
                ? new Date(Math.max(...effectiveCandidates.map((d) => d.getTime())))
                : today;

            // 🔑 Previous month end
            const prevMonthEnd = new Date(
                today.getFullYear(),
                today.getMonth(),
                0,
                23, 59, 59
            );

            // 🔑 Months earned till PREVIOUS month
            let monthsEarnedTillPrev = 0;
            let tmp = new Date(effectiveStartDate);
            tmp.setDate(1);

            while (tmp <= prevMonthEnd) {
                monthsEarnedTillPrev++;
                tmp.setMonth(tmp.getMonth() + 1);
            }

            const earnedTillPrev =
                monthsEarnedTillPrev * lt.monthlyAllowed;

            // 🔑 Carry forward (ONLY previous months)
            let carryForward = 0;
            const unusedPrev = earnedTillPrev - usedDays;

            if (lt.carryForward && unusedPrev > 0) {
                carryForward = Math.min(
                    unusedPrev,
                    lt.carryForwardLimit
                );
            }

            // 🔑 Available balance for CURRENT month
            const availableBalance =
                carryForward + lt.monthlyAllowed;

            result.push({
                leaveTypeId: lt._id,
                leaveNameId: lt.leaveNameId,
                typeOfLeave: lt.typeOfLeave,
                leaveType: lt.leaveType,
                validityStart: lt.validityStart || null,
                validityEnd: lt.validityEnd || null,
                monthlyAllowed: lt.monthlyAllowed,
                totalCredit: lt.monthlyAllowed,
                earnedTillPrev,
                usedDays,
                carryForward,
                availableBalance,
                advanceUsed,
                allowAdvance: lt.advancedLeave,
                advanceLimit: lt.advancedDayLimit,
                joiningDate: joiningDate || null
            });
        }

        return sendResponse(
            res,
            200,
            true,
            "Leave balance fetched successfully",
            result
        );

    } catch (error) {
        console.error("getAllLeaveBalancesByEmployee error:", error);
        return sendResponse(res, 400, false, error.message);
    }
};

exports.getYearlyLeaveBalanceReport = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { employeeId } = req.params;
        const { year, yearType = "calendar" } = req.query;

        if (!year) {
            return sendResponse(res, 400, false, "year is required");
        }

        const {
            LeaveTypeModel,
            LeaveRequestModel,
            EmployeeModel
        } = await initModels(org_uuid);

        const employee = await EmployeeModel.findById(employeeId).lean();
        if (!employee) {
            return sendResponse(res, 404, false, "Employee not found");
        }

        /* ===============================
           1️⃣ YEAR RANGE
        =============================== */
        let yearStart, yearEnd;

        if (yearType === "financial") {
            yearStart = new Date(year, 3, 1);       // 1 Apr
            yearEnd = new Date(year + 1, 2, 31);   // 31 Mar
        } else {
            yearStart = new Date(year, 0, 1);      // 1 Jan
            yearEnd = new Date(year, 11, 31);      // 31 Dec
        }

        /* ===============================
           2️⃣ FETCH LEAVE TYPES (INCLUDING LOP)
        =============================== */
        const leaveTypes = await LeaveTypeModel.find({
            status: "active",
            $or: [
                { "customFilters.employees": employeeId },
                { applicableTo: "All" },
                { isUnlimited: true }
            ]
        })
            .populate('leaveNameId', 'name code shortName')
            .lean();

        /* ===============================
           3️⃣ FETCH ALL APPROVED LEAVES
        =============================== */
        const approvedLeaves = await LeaveRequestModel.find({
            employeeId,
            status: "Approved",
            startDate: { $lte: yearEnd },
            endDate: { $gte: yearStart }
        }).lean();

        /* ===============================
           4️⃣ MONTH LOOP
        =============================== */
        const months = [];
        let cursor = new Date(yearStart);

        while (cursor <= yearEnd) {
            const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
            const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);

            const monthLabel = monthStart.toLocaleString("default", {
                month: "short",
                year: "numeric"
            });

            const monthData = [];

            for (const lt of leaveTypes) {

                /* ---------- UNLIMITED LEAVE TYPES (LOP) ---------- */
                if (lt.isUnlimited) {
                    // Count only used days for this month
                    let usedThisMonth = 0;

                    for (const lr of approvedLeaves) {
                        if (lr.leaveTypeId.toString() !== lt._id.toString()) continue;

                        const overlapStart = new Date(Math.max(lr.startDate, monthStart));
                        const overlapEnd = new Date(Math.min(lr.endDate, monthEnd));

                        if (overlapStart <= overlapEnd) {
                            usedThisMonth += Math.floor((overlapEnd - overlapStart) / 86400000) + 1;
                        }
                    }

                    monthData.push({
                        leaveTypeId: lt._id,
                        leaveNameId: lt.leaveNameId,
                        leaveTypeName: lt.leaveNameId?.name || lt.leaveNameId?.shortName || lt.leaveNameId?.code || null,
                        typeOfLeave: lt.typeOfLeave,
                        validityStart: lt.validityStart || null,
                        validityEnd: lt.validityEnd || null,
                        isUnlimited: true,
                        opening: 'Unlimited',
                        earned: 'N/A',
                        used: usedThisMonth,
                        closing: 'Unlimited'
                    });
                    continue;
                }

                /* ---------- MONTHLY LEAVE ---------- */
                if (lt.typeOfLeave === "Monthly") {

                    // 🔑 Effective start
                    const joiningDate = getEmployeeJoiningDate(employee);
                    const effectiveCandidates = [lt.validityStart, joiningDate]
                        .filter(Boolean)
                        .map((d) => new Date(d));
                    const effectiveStart = effectiveCandidates.length
                        ? new Date(Math.max(...effectiveCandidates.map((d) => d.getTime())))
                        : yearStart;

                    // Months earned till previous month
                    let monthsEarnedTillPrev = 0;
                    let tmp = new Date(effectiveStart);
                    tmp.setDate(1);

                    while (tmp < monthStart) {
                        monthsEarnedTillPrev++;
                        tmp.setMonth(tmp.getMonth() + 1);
                    }

                    const earnedTillPrev =
                        monthsEarnedTillPrev * lt.monthlyAllowed;

                    // Used till previous month
                    let usedTillPrev = 0;

                    for (const lr of approvedLeaves) {
                        if (lr.leaveTypeId.toString() !== lt._id.toString()) continue;

                        const overlapStart = new Date(
                            Math.max(lr.startDate, effectiveStart)
                        );
                        const overlapEnd = new Date(
                            Math.min(lr.endDate, new Date(monthStart - 1))
                        );

                        if (overlapStart <= overlapEnd) {
                            usedTillPrev +=
                                Math.floor((overlapEnd - overlapStart) / 86400000) + 1;
                        }
                    }

                    const unusedPrev = earnedTillPrev - usedTillPrev;

                    let carryForward = 0;
                    if (lt.carryForward && unusedPrev > 0) {
                        carryForward = Math.min(unusedPrev, lt.carryForwardLimit);
                    }

                    const available =
                        carryForward + lt.monthlyAllowed;

                    // Used in current month
                    let usedThisMonth = 0;

                    for (const lr of approvedLeaves) {
                        if (lr.leaveTypeId.toString() !== lt._id.toString()) continue;

                        const overlapStart = new Date(
                            Math.max(lr.startDate, monthStart)
                        );
                        const overlapEnd = new Date(
                            Math.min(lr.endDate, monthEnd)
                        );

                        if (overlapStart <= overlapEnd) {
                            usedThisMonth +=
                                Math.floor((overlapEnd - overlapStart) / 86400000) + 1;
                        }
                    }

                    monthData.push({
                        leaveTypeId: lt._id,
                        leaveNameId: lt.leaveNameId,
                        leaveTypeName: lt.leaveNameId?.name || lt.leaveNameId?.shortName || lt.leaveNameId?.code || null,
                        typeOfLeave: "Monthly",
                        validityStart: lt.validityStart || null,
                        validityEnd: lt.validityEnd || null,
                        carryForward,
                        monthlyAllowed: lt.monthlyAllowed,
                        usedThisMonth,
                        closingBalance:
                            available - usedThisMonth
                    });
                }

                /* ---------- YEARLY LEAVE ---------- */
                else {
                    let used = 0;
                    for (const lr of approvedLeaves) {
                        if (lr.leaveTypeId.toString() !== lt._id.toString()) continue;

                        const overlapStart = new Date(
                            Math.max(lr.startDate, monthStart)
                        );
                        const overlapEnd = new Date(
                            Math.min(lr.endDate, monthEnd)
                        );

                        if (overlapStart <= overlapEnd) {
                            used +=
                                Math.floor((overlapEnd - overlapStart) / 86400000) + 1;
                        }
                    }

                    const joiningDate = getEmployeeJoiningDate(employee);
                    const proratedCredit = calculateProratedYearlyCredit(lt, joiningDate, yearStart).totalCredit;

                    monthData.push({
                        leaveTypeId: lt._id,
                        leaveNameId: lt.leaveNameId,
                        leaveTypeName: lt.leaveNameId?.name || lt.leaveNameId?.shortName || lt.leaveNameId?.code || null,
                        typeOfLeave: lt.typeOfLeave,
                        validityStart: lt.validityStart || null,
                        validityEnd: lt.validityEnd || null,
                        creditDays: lt.creditDays,
                        proratedCredit,
                        usedThisMonth: used
                    });
                }
            }

            months.push({
                month: monthLabel,
                from: monthStart,
                to: monthEnd,
                leaveSummary: monthData
            });

            cursor.setMonth(cursor.getMonth() + 1);
        }

        return sendResponse(
            res,
            200,
            true,
            "Yearly leave balance report generated",
            {
                employeeId,
                year,
                yearType,
                period: { from: yearStart, to: yearEnd },
                months
            }
        );

    } catch (error) {
        console.error("Yearly Leave Report Error:", error);
        return sendResponse(res, 400, false, error.message);
    }
};

