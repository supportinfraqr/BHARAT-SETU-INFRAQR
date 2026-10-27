const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');
const { sendResponse, handleError } = require('../utils/responce');

exports.createAttendancePolicy = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { AttendancePolicyModel } = await initModels(org_uuid);

        const {
            name,
            displayName,
            organizationId,

            // ========== LATE / EARLY ==========
            lateMarkRuleEnabled,
            lateMarkMinutes,
            earlyExitRuleEnabled,
            earlyExitMinutes,

            autoHalfDayFromLate,
            autoHalfDayLateMinutesThreshold,
            autoHalfDayFromEarlyExit,
            earlyExitToHalfDayMinutesThreshold,

            // ========== PUNCH WINDOW ==========
            punchRelaxation,

            // ========== OVERTIME ==========
            overtimeAllowed,
            overtimeStartAfterMinutes,
            overtimeMaxHoursPerDay,
            overtimeApprovalRequired,
            overtimeCalculationType,

            // ========== ABSENT / MISSING ==========
            missingCheckoutAction,
            autoAbsentEnabled,
            allowSinglePunchPresent,

            // ========== WORK TYPES ==========
            wfhAllowed,
            wfhRequiresApproval,
            maxWfhDaysPerMonth,
            odAllowed,
            odRequiresApproval,

            // ========== HOLIDAY / WEEK OFF ==========
            holidayWorkingPolicy,
            weeklyOffWorkingPolicy,
            sandwichRule,

            // ========== SECURITY ==========
            gpsValidationRequired,
            autoAbsentIfOutsideGeo,
            blockMockLocation,

            employees = []
        } = req.body;

        if (!name) {
            return sendResponse(res, 400, false, "Attendance policy name is required");
        }

        const policy = new AttendancePolicyModel({
            name,
            displayName,
            organizationId,

            // ========== LATE / EARLY ==========
            lateMarkRuleEnabled: lateMarkRuleEnabled ?? false,
            lateMarkMinutes: lateMarkMinutes ?? 0,
            earlyExitRuleEnabled: earlyExitRuleEnabled ?? false,
            earlyExitMinutes: earlyExitMinutes ?? 0,

            autoHalfDayFromLate: autoHalfDayFromLate ?? false,
            autoHalfDayLateMinutesThreshold: autoHalfDayLateMinutesThreshold ?? 0,
            autoHalfDayFromEarlyExit: autoHalfDayFromEarlyExit ?? false,
            earlyExitToHalfDayMinutesThreshold: earlyExitToHalfDayMinutesThreshold ?? 0,

            // ========== PUNCH WINDOW ==========
            punchRelaxation: punchRelaxation ?? { beforeShiftMinutes: 0, afterShiftMinutes: 0 },

            // ========== OVERTIME ==========
            overtimeAllowed: overtimeAllowed ?? false,
            overtimeStartAfterMinutes: overtimeStartAfterMinutes ?? 0,
            overtimeMaxHoursPerDay: overtimeMaxHoursPerDay ?? 4,
            overtimeApprovalRequired: overtimeApprovalRequired ?? false,
            overtimeCalculationType: overtimeCalculationType ?? "daily",

            // ========== ABSENT / MISSING ==========
            missingCheckoutAction: missingCheckoutAction ?? "autoCheckout",
            autoAbsentEnabled: autoAbsentEnabled ?? false,
            allowSinglePunchPresent: allowSinglePunchPresent ?? false,

            // ========== WORK TYPES ==========
            wfhAllowed: wfhAllowed ?? false,
            wfhRequiresApproval: wfhRequiresApproval ?? false,
            maxWfhDaysPerMonth,
            odAllowed: odAllowed ?? false,
            odRequiresApproval: odRequiresApproval ?? false,

            // ========== HOLIDAY / WEEK OFF ==========
            holidayWorkingPolicy: holidayWorkingPolicy ?? "normal",
            weeklyOffWorkingPolicy: weeklyOffWorkingPolicy ?? "ignore",
            sandwichRule,

            // ========== SECURITY ==========
            gpsValidationRequired: gpsValidationRequired ?? false,
            autoAbsentIfOutsideGeo: autoAbsentIfOutsideGeo ?? false,
            blockMockLocation: blockMockLocation ?? false,

            isActive: req.body.isActive !== false,
            employees
        });

        const saved = await policy.save();

        return sendResponse(res, 201, true, "Attendance policy created", saved);

    } catch (error) {
        return handleError(res, error);
    }
};

exports.updateAttendancePolicy = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { AttendancePolicyModel } = await initModels(org_uuid);
        const { policyId } = req.params;

        const allowedFields = [
            // ========== BASIC ==========
            "name",
            "displayName",

            // ========== LATE / EARLY ==========
            "lateMarkRuleEnabled",
            "lateMarkMinutes",
            "earlyExitRuleEnabled",
            "earlyExitMinutes",

            // ========== AUTO HALF DAY ==========
            "autoHalfDayFromLate",
            "autoHalfDayLateMinutesThreshold",
            "autoHalfDayFromEarlyExit",
            "earlyExitToHalfDayMinutesThreshold",

            // ========== PUNCH WINDOW ==========
            "punchRelaxation",

            // ========== OVERTIME ==========
            "overtimeAllowed",
            "overtimeStartAfterMinutes",
            "overtimeMaxHoursPerDay",
            "overtimeApprovalRequired",
            "overtimeCalculationType",

            // ========== ABSENT / MISSING ==========
            "missingCheckoutAction",
            "autoAbsentEnabled",
            "allowSinglePunchPresent",

            // ========== WORK TYPES ==========
            "wfhAllowed",
            "wfhRequiresApproval",
            "maxWfhDaysPerMonth",
            "odAllowed",
            "odRequiresApproval",

            // ========== HOLIDAY / WEEK OFF ==========
            "holidayWorkingPolicy",
            "weeklyOffWorkingPolicy",
            "sandwichRule",

            // ========== SECURITY ==========
            "gpsValidationRequired",
            "autoAbsentIfOutsideGeo",
            "blockMockLocation",
            "isActive"
        ];

        const updateData = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        const updated = await AttendancePolicyModel.findByIdAndUpdate(
            policyId,
            updateData,
            { new: true }
        );

        if (!updated) {
            return sendResponse(res, 404, false, "Attendance policy not found");
        }

        return sendResponse(res, 200, true, "Attendance policy updated", updated);

    } catch (error) {
        return handleError(res, error);
    }
};

exports.getAttendancePolicies = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { AttendancePolicyModel } = await initModels(org_uuid);

        const page = Math.max(1, parseInt(req.query.page || 1));
        const limit = Math.min(100, parseInt(req.query.limit || 10));
        const skip = (page - 1) * limit;
        const search = (req.query.search || "").trim();

        const filter = {};
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        const [data, total] = await Promise.all([
            AttendancePolicyModel.find(filter)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            AttendancePolicyModel.countDocuments(filter)
        ]);

        const policies = data.map((policy) => {
            const obj = policy.toObject();
            if (obj.isActive == null) obj.isActive = true;
            return obj;
        });

        return sendResponse(res, 200, true, "Attendance policies fetched", {
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totalCount: total,
            data: policies
        });

    } catch (error) {
        return handleError(res, error);
    }
};

exports.getAttendancePolicyById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { AttendancePolicyModel } = await initModels(org_uuid);
        const { policyId } = req.params;

        const policy = await AttendancePolicyModel
            .findById(policyId)
            .populate("employees", "name email");

        if (!policy) {
            return sendResponse(res, 404, false, "Attendance policy not found");
        }

        const policyData = policy.toObject();
        if (policyData.isActive == null) policyData.isActive = true;

        return sendResponse(res, 200, true, "Attendance policy fetched", policyData);

    } catch (error) {
        return handleError(res, error);
    }
};

exports.assignEmployeesToAttendancePolicy = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 404, false, "org_uuid not found");
        }

        const { AttendancePolicyModel, EmployeeModel } = await initModels(org_uuid);
        const { policyId } = req.params;
        const { employeeIds } = req.body;

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return sendResponse(res, 400, false, "employeeIds must be a non-empty array");
        }

        const policy = await AttendancePolicyModel.findById(policyId);
        if (!policy) {
            return sendResponse(res, 404, false, "Attendance policy not found");
        }

        const successfullyAssigned = [];
        const alreadyAssigned = [];
        const errors = [];

        for (const employeeId of employeeIds) {
            try {
                const employee = await EmployeeModel.findById(employeeId);

                if (!employee) {
                    errors.push({ employeeId, message: "Employee not found" });
                    continue;
                }

                if (employee.attendancePolicyId) {
                    alreadyAssigned.push({
                        employeeId,
                        employeeName: employee.firstName,
                        attendancePolicyId: employee.attendancePolicyId,
                        message: "Employee is already assigned to an attendance policy"
                    });
                    continue;
                }

                // Update policy & employee
                // Handle case where employees might be null by initializing to array first
                const updateOperation = policy.employees === null || policy.employees === undefined
                    ? { $set: { employees: [employee._id] } }
                    : { $addToSet: { employees: employee._id } };

                await AttendancePolicyModel.findByIdAndUpdate(policyId, updateOperation);

                await EmployeeModel.findByIdAndUpdate(
                    employeeId,
                    { attendancePolicyId: policyId }
                );

                successfullyAssigned.push({
                    employeeId,
                    employeeName: employee.firstName
                });

            } catch (err) {
                errors.push({ employeeId, message: err.message });
            }
        }

        const updatedPolicy = await AttendancePolicyModel.findById(policyId);

        return sendResponse(res, 200, true, "Employees processed successfully", {
            successfullyAssigned,
            alreadyAssigned,
            errors,
            updatedPolicy
        });

    } catch (err) {
        return handleError(res, err);
    }
};

exports.removeEmployeesFromAttendancePolicy = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 404, false, "org_uuid not found");
        }

        const { AttendancePolicyModel, EmployeeModel } = await initModels(org_uuid);
        const { policyId } = req.params;
        const { employeeIds } = req.body;

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return sendResponse(res, 400, false, "employeeIds must be a non-empty array");
        }

        const policy = await AttendancePolicyModel.findById(policyId);
        if (!policy) {
            return sendResponse(res, 404, false, "Attendance policy not found");
        }

        const removed = [];
        const notAssigned = [];
        const errors = [];

        for (const employeeId of employeeIds) {
            try {
                const employee = await EmployeeModel.findById(employeeId);

                if (!employee) {
                    errors.push({ employeeId, message: "Employee not found" });
                    continue;
                }

                if (!employee.attendancePolicyId || employee.attendancePolicyId.toString() !== policyId) {
                    notAssigned.push({
                        employeeId,
                        employeeName: employee.firstName,
                        message: "Employee is not assigned to this attendance policy"
                    });
                    continue;
                }

                // Remove from policy
                await AttendancePolicyModel.findByIdAndUpdate(
                    policyId,
                    { $pull: { employees: employee._id } }
                );

                await EmployeeModel.findByIdAndUpdate(
                    employeeId,
                    { attendancePolicyId: null }
                );

                removed.push({
                    employeeId,
                    employeeName: employee.firstName
                });

            } catch (err) {
                errors.push({ employeeId, message: err.message });
            }
        }

        const updatedPolicy = await AttendancePolicyModel.findById(policyId);

        return sendResponse(res, 200, true, "Employees removed successfully", {
            removed,
            notAssigned,
            errors,
            updatedPolicy
        });

    } catch (err) {
        return handleError(res, err);
    }
};

exports.deleteAttendancePolicy = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { AttendancePolicyModel } = await initModels(org_uuid);
        const { policyId } = req.params;

        const policy = await AttendancePolicyModel.findById(policyId);
        if (!policy) {
            return sendResponse(res, 404, false, "Attendance policy not found");
        }

        if (policy.employees && policy.employees.length > 0) {
            return sendResponse(
                res,
                400,
                false,
                "Policy is assigned to employees. Remove them first."
            );
        }

        await AttendancePolicyModel.findByIdAndDelete(policyId);

        return sendResponse(res, 200, true, "Attendance policy deleted");

    } catch (error) {
        return handleError(res, error);
    }
};

exports.getEmployeesByAttendancePolicy = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { AttendancePolicyModel, EmployeeModel } = await initModels(org_uuid);
        const { policyId } = req.params;

        // ---------- CHECK POLICY ----------
        const policy = await AttendancePolicyModel.findById(policyId)
            .select("name displayName");

        if (!policy) {
            return sendResponse(res, 404, false, "Attendance policy not found");
        }

        // ---------- PAGINATION ----------
        const page = Math.max(1, parseInt(req.query.page || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "10")));
        const skip = (page - 1) * limit;

        const search = (req.query.search || "").trim();
        const department = req.query.department;
        const status = req.query.status;

        // ---------- FILTERS ----------
        const filters = {
            attendancePolicyId: policyId
        };

        if (search) {
            filters.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { uniqueId: { $regex: search, $options: "i" } }
            ];
        }

        if (department) {
            filters.department = department;
        }

        if (status) {
            filters.status = status;
        }

        // ---------- QUERY ----------
        const [employees, totalCount] = await Promise.all([
            EmployeeModel.find(filters)
                .select("firstName lastName email uniqueId status")
                .sort({ firstName: 1 })
                .skip(skip)
                .limit(limit),
            EmployeeModel.countDocuments(filters)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        return sendResponse(res, 200, true, "Employees fetched successfully", {
            policy: {
                _id: policy._id,
                name: policy.name,
                displayName: policy.displayName
            },
            pagination: {
                page,
                limit,
                totalPages,
                totalCount
            },
            employees
        });

    } catch (error) {
        return handleError(res, error);
    }
};

exports.getEmployeesNotInAttendancePolicy = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { EmployeeModel, AttendancePolicyModel } = await initModels(org_uuid);

        // ---------- PAGINATION ----------
        const page = Math.max(1, parseInt(req.query.page || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "10")));
        const skip = (page - 1) * limit;

        const search = (req.query.search || "").trim();
        const department = req.query.department;
        const status = req.query.status;
        const organizationId = req.query.organizationId;

        // ---------- FILTER ----------
        // Use aggregation to find employees not assigned to any existing attendance policy
        const pipeline = [
            {
                $lookup: {
                    from: 'attendancepolicies',
                    localField: 'attendancePolicyId',
                    foreignField: '_id',
                    as: 'attendancePolicy'
                }
            },
            {
                $match: {
                    $or: [
                        { attendancePolicyId: { $exists: false } },
                        { attendancePolicyId: null },
                        { attendancePolicy: { $size: 0 } } // attendancePolicyId exists but attendance policy not found
                    ],
                    status: { $ne: 'Inactive' }
                }
            }
        ];

        if (organizationId) {
            pipeline[1].$match.organizationId = organizationId;
        }

        if (search) {
            pipeline[1].$match.$and = [{
                $or: [
                    { firstName: { $regex: search, $options: "i" } },
                    { lastName: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { uniqueId: { $regex: search, $options: "i" } }
                ]
            }];
        }

        if (department) {
            pipeline[1].$match.department = department;
        }

        if (status) {
            pipeline[1].$match.status = status;
        }

        // Add projection and pagination
        pipeline.push(
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    email: 1,
                    uniqueId: 1,
                    status: 1,
                    department: 1,
                    designation: 1
                }
            },
            { $sort: { firstName: 1 } },
            { $skip: skip },
            { $limit: limit }
        );

        const employees = await EmployeeModel.aggregate(pipeline);
        const totalCount = await EmployeeModel.aggregate([
            ...pipeline.slice(0, -3), // Remove project, sort, skip, limit
            { $count: "total" }
        ]).then(result => result[0]?.total || 0);

        const totalPages = Math.ceil(totalCount / limit);

        return sendResponse(res, 200, true, "Unassigned employees fetched successfully", {
            pagination: {
                page,
                limit,
                totalPages,
                totalCount
            },
            employees
        });

    } catch (error) {
        return handleError(res, error);
    }
};

/**
 * Calculate sandwich dates for an employee
 */
exports.calculateEmployeeSandwichDates = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { employeeId } = req.params;
        const { startDate, endDate } = req.body;

        if (!employeeId) {
            return sendResponse(res, 400, false, "employeeId is required");
        }

        if (!startDate || !endDate) {
            return sendResponse(res, 400, false, "startDate and endDate are required");
        }

        const {
            EmployeeModel,
            AttendancePolicyModel,
            HolidayModel,
            LeaveRequestModel,
            ShiftModel
        } = await initModels(org_uuid);

        // Step 1: Get employee and their attendance policy
        const employee = await EmployeeModel.findById(employeeId)
            .select('attendancePolicyId shiftId')
            .lean();

        if (!employee) {
            return sendResponse(res, 404, false, "Employee not found");
        }

        if (!employee.attendancePolicyId) {
            return sendResponse(res, 200, true, "No attendance policy assigned to employee", {
                sandwichRuleEnabled: false,
                message: 'No attendance policy assigned to employee',
                sandwichDates: []
            });
        }

        // Step 2: Check if sandwich rule is enabled in policy
        const policy = await AttendancePolicyModel.findById(employee.attendancePolicyId).lean();

        if (!policy) {
            return sendResponse(res, 404, false, "Attendance policy not found");
        }

        if (!policy.sandwichRule) {
            return sendResponse(res, 200, true, "Sandwich rule is not enabled", {
                sandwichRuleEnabled: false,
                message: 'Sandwich rule is not enabled in attendance policy',
                sandwichDates: []
            });
        }

        // Step 3: Get employee's shift to determine working days
        let weeklyOffDays = [];
        if (employee.shiftId) {
            const shift = await ShiftModel.findById(employee.shiftId).lean();
            if (shift && shift.weeklyOffDays) {
                weeklyOffDays = shift.weeklyOffDays;
            }
        }

        // Step 4: Get holidays in date range
        const holidays = await HolidayModel.find({
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            status: 'active'
        }).lean();

        const holidayDates = holidays.map(h => {
            const date = new Date(h.date);
            return date.toISOString().split('T')[0];
        });

        // Step 5: Get approved leaves in date range
        const leaves = await LeaveRequestModel.find({
            employeeId: new mongoose.Types.ObjectId(employeeId),
            status: 'Approved',
            startDate: { $lte: new Date(endDate) },
            endDate: { $gte: new Date(startDate) }
        }).lean();

        // Step 6: Identify sandwich dates (working days between holidays/leaves/weekoffs)
        const sandwichDates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        let currentDate = new Date(start);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

            // Check if it's a weekly off
            const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);

            // Check if it's a holiday
            const isHoliday = holidayDates.includes(dateStr);

            // Check if it's a leave day
            const isLeave = leaves.some(leave => {
                const leaveStart = new Date(leave.startDate);
                const leaveEnd = new Date(leave.endDate);
                return currentDate >= leaveStart && currentDate <= leaveEnd;
            });

            // It's a sandwich date if:
            // 1. It's a working day (not weekly off)
            // 2. It's NOT a holiday
            // 3. It's NOT a leave day
            // 4. It's surrounded by non-working days (holiday/leave/weekoff)

            if (!isWeeklyOff && !isHoliday && !isLeave) {
                // Check previous and next day
                const prevDate = new Date(currentDate);
                prevDate.setDate(prevDate.getDate() - 1);
                const prevDateStr = prevDate.toISOString().split('T')[0];
                const prevDayOfWeek = prevDate.getDay();

                const nextDate = new Date(currentDate);
                nextDate.setDate(nextDate.getDate() + 1);
                const nextDateStr = nextDate.toISOString().split('T')[0];
                const nextDayOfWeek = nextDate.getDay();

                // Check if previous day is non-working
                const prevIsNonWorking =
                    weeklyOffDays.includes(prevDayOfWeek) ||
                    holidayDates.includes(prevDateStr) ||
                    leaves.some(leave => {
                        const leaveStart = new Date(leave.startDate);
                        const leaveEnd = new Date(leave.endDate);
                        return prevDate >= leaveStart && prevDate <= leaveEnd;
                    });

                // Check if next day is non-working
                const nextIsNonWorking =
                    weeklyOffDays.includes(nextDayOfWeek) ||
                    holidayDates.includes(nextDateStr) ||
                    leaves.some(leave => {
                        const leaveStart = new Date(leave.startDate);
                        const leaveEnd = new Date(leave.endDate);
                        return nextDate >= leaveStart && nextDate <= leaveEnd;
                    });

                // If sandwiched between non-working days
                if (prevIsNonWorking && nextIsNonWorking) {
                    sandwichDates.push({
                        date: dateStr,
                        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
                        reason: 'Working day sandwiched between non-working days'
                    });
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        const result = {
            sandwichRuleEnabled: true,
            employeeId,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            totalSandwichDays: sandwichDates.length,
            sandwichDates,
            holidays: holidayDates,
            weeklyOffDays: weeklyOffDays.map(day =>
                ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
            )
        };

        return sendResponse(
            res,
            200,
            true,
            "Sandwich dates calculated successfully",
            result
        );

    } catch (error) {
        return handleError(res, error);
    }
};
