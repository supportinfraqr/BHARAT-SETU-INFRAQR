const mongoose = require('mongoose');
const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');
const { getLeavePeriod, checkLeaveBalance, checkMonthlyLeaveBalance, checkLeaveOverlap, checkSandwichLeave } = require("./leaveService");


exports.applyLeaveRequest = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        const { LeaveRequestModel, LeaveTypeModel, EmployeeModel } = await initModels(org_uuid);

        const {
            employeeId,
            leaveTypeId,
            leaveReasonId,
            startDate,
            endDate,
            leaveDays,
            leaveDurationType,
            halfDaySession,
            clusterDates,
            comments
        } = req.body;

        if (!employeeId || !leaveTypeId || !startDate || !endDate) {
            return sendResponse(res, 400, false, "Required fields missing");
        }

        if (new Date(startDate) > new Date(endDate)) {
            return sendResponse(res, 400, false, "startDate cannot be after endDate");
        }

        const employee = await EmployeeModel.findById(employeeId).lean();
        if (!employee) {
            return sendResponse(res, 404, false, "Employee not found");
        }

        const leaveType = await LeaveTypeModel.findOne({
            _id: leaveTypeId,
            status: "active"
        }).lean();

        if (!leaveType) {
            return sendResponse(res, 400, false, "Leave type not found or inactive");
        }

        // Auto-assign default LOP reason if not provided and leave type is LOP
        let finalLeaveReasonId = leaveReasonId;
        if (!finalLeaveReasonId && leaveType.isUnlimited) {
            const { LeaveReasonModel } = await initModels(org_uuid);
            const defaultLOPReason = await LeaveReasonModel.findOne({
                reason: 'Loss of Pay',
                leaveNameId: leaveType.leaveNameId
            }).lean();
            
            if (defaultLOPReason) {
                finalLeaveReasonId = defaultLOPReason._id;
            }
        }

        if (!finalLeaveReasonId) {
            return sendResponse(res, 400, false, "leaveReasonId is required");
        }

        // ---------- APPLICABILITY CHECK ----------
        const filters = leaveType.customFilters || {};
        const notAllowed = Array.isArray(filters.notAssignEmployee) && filters.notAssignEmployee.includes(employeeId);
        if (notAllowed) {
            return sendResponse(res, 400, false, "Employee not eligible for this leave type");
        }

        let applicable = false;
        switch (leaveType.applicableTo) {
            case "All":
                applicable = true;
                break;
            case "Department":
                if (filters.departments?.length && filters.departments.some(dep => dep.toString() === (employee.departmentId || "").toString())) {
                    applicable = true;
                }
                break;
            case "Employee":
                if (filters.employees?.length && filters.employees.some(e => e.toString() === employeeId)) {
                    applicable = true;
                }
                break;
            default:
                if (filters.employees?.some(e => e.toString() === employeeId)) applicable = true;
                if (filters.departments?.some(dep => dep.toString() === (employee.departmentId || "").toString())) applicable = true;
        }

        if (!applicable) {
            return sendResponse(res, 400, false, "Leave type not applicable for this employee");
        }
        // 🔥 OVERLAP CHECK
        await checkLeaveOverlap({
            LeaveRequestModel,
            employeeId,
            startDate,
            endDate,
            leaveDurationType,
            halfDaySession,
            clusterDates
        });
        
        // 🔥 SANDWICH LEAVE CHECK
        const sandwichResult = await checkSandwichLeave({
            org_uuid,
            employeeId,
            leaveTypeId,
            startDate,
            endDate,
            requestedDays: leaveDays
        });
        
        if (leaveType.typeOfLeave === "Monthly") {
            await checkMonthlyLeaveBalance({
                LeaveRequestModel,
                leaveType,
                employeeId,
                leaveTypeId,
                startDate,
                endDate,
                joiningDate: employee.dateOfJoining || employee.createdAt
            });
        } else {
            await checkLeaveBalance({
                LeaveRequestModel,
                leaveType,
                employeeId,
                leaveTypeId,
                requestedDays: sandwichResult.sandwichApplied ? sandwichResult.totalDaysWithSandwich : leaveDays,
                requestedStartDate: startDate,
                requestedEndDate: endDate,
                joiningDate: employee.dateOfJoining || employee.createdAt
            });
        }


        const leaveRequest = await LeaveRequestModel.create({
            employeeId,
            leaveTypeId,
            leaveReasonId: finalLeaveReasonId,
            startDate,
            endDate,
            leaveDays,
            leaveDurationType,
            halfDaySession,
            clusterDates,
            comments,
            sandwichApplied: sandwichResult.sandwichApplied,
            sandwichDays: sandwichResult.sandwichDays || 0,
            totalDaysWithSandwich: sandwichResult.totalDaysWithSandwich || leaveDays
            // advanceDays: balance.advanceDays
        });

        return sendResponse(res, 201, true, "Leave applied successfully", leaveRequest);

    } catch (error) {
        return sendResponse(res, 400, false, error.message);
    }
};

exports.updateLeaveRequest = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { LeaveRequestModel, LeaveTypeModel, EmployeeModel } = await initModels(org_uuid);
        const { leaveRequestId } = req.params;

        const {
            startDate,
            endDate,
            leaveDays,
            leaveDurationType,
            halfDaySession,
            clusterDates,
            leaveReasonId,
            comments
        } = req.body;

        // ---------- FETCH REQUEST ----------
        const leaveRequest = await LeaveRequestModel.findById(leaveRequestId);
        if (!leaveRequest) {
            return sendResponse(res, 404, false, "Leave request not found");
        }

        // ---------- ONLY PENDING ----------
        const updateStatus = String(leaveRequest.status || '').trim().toLowerCase();
        if (updateStatus !== "pending") {
            return sendResponse(
                res,
                400,
                false,
                "Only pending leave request can be updated"
            );
        }

        const leaveType = await LeaveTypeModel.findById(leaveRequest.leaveTypeId);
        if (!leaveType) {
            return sendResponse(res, 404, false, "Leave type not found");
        }

        // ---------- OVERLAP CHECK ----------
        await checkLeaveOverlap({
            LeaveRequestModel,
            employeeId: leaveRequest.employeeId,
            startDate: startDate ?? leaveRequest.startDate,
            endDate: endDate ?? leaveRequest.endDate,
            leaveDurationType: leaveDurationType ?? leaveRequest.leaveDurationType,
            halfDaySession: halfDaySession ?? leaveRequest.halfDaySession,
            clusterDates: clusterDates ?? leaveRequest.clusterDates,
            excludeRequestId: leaveRequestId
        });

        // 🔥 SANDWICH LEAVE CHECK
        const sandwichResult = await checkSandwichLeave({
            org_uuid,
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
            startDate: startDate ?? leaveRequest.startDate,
            endDate: endDate ?? leaveRequest.endDate,
            requestedDays: leaveDays ?? leaveRequest.leaveDays,
            excludeRequestId: leaveRequestId
        });

        // ---------- BALANCE CHECK ----------
        const employeeForUpdate = await EmployeeModel.findById(leaveRequest.employeeId)
            .select("dateOfJoining createdAt")
            .lean();
        const joiningDateForUpdate = employeeForUpdate?.dateOfJoining || employeeForUpdate?.createdAt;

        if (leaveType.typeOfLeave === "Monthly") {
            await checkMonthlyLeaveBalance({
                LeaveRequestModel,
                leaveType,
                employeeId: leaveRequest.employeeId,
                leaveTypeId: leaveRequest.leaveTypeId,
                startDate: startDate ?? leaveRequest.startDate,
                endDate: endDate ?? leaveRequest.endDate,
                excludeRequestId: leaveRequestId,   // 🔥 IMPORTANT
                joiningDate: joiningDateForUpdate
            });
        } else {
            await checkLeaveBalance({
                LeaveRequestModel,
                leaveType,
                employeeId: leaveRequest.employeeId,
                leaveTypeId: leaveRequest.leaveTypeId,
                requestedDays: sandwichResult.sandwichApplied ? sandwichResult.totalDaysWithSandwich : (leaveDays ?? leaveRequest.leaveDays),
                requestedStartDate: startDate ?? leaveRequest.startDate,
                requestedEndDate: endDate ?? leaveRequest.endDate,
                excludeRequestId: leaveRequestId,
                joiningDate: joiningDateForUpdate
            });
        }


        // ---------- UPDATE ----------
        leaveRequest.startDate = startDate ?? leaveRequest.startDate;
        leaveRequest.endDate = endDate ?? leaveRequest.endDate;
        leaveRequest.leaveDays = leaveDays ?? leaveRequest.leaveDays;
        leaveRequest.leaveDurationType =
            leaveDurationType ?? leaveRequest.leaveDurationType;
        leaveRequest.halfDaySession =
            halfDaySession ?? leaveRequest.halfDaySession;
        leaveRequest.clusterDates =
            clusterDates ?? leaveRequest.clusterDates;
        leaveRequest.leaveReasonId =
            leaveReasonId ?? leaveRequest.leaveReasonId;
        leaveRequest.comments = comments ?? leaveRequest.comments;
        leaveRequest.sandwichApplied = sandwichResult.sandwichApplied;
        leaveRequest.sandwichDays = sandwichResult.sandwichDays || 0;
        leaveRequest.totalDaysWithSandwich = sandwichResult.totalDaysWithSandwich || leaveRequest.leaveDays;

        await leaveRequest.save();

        return sendResponse(
            res,
            200,
            true,
            "Leave request updated successfully",
            leaveRequest
        );

    } catch (error) {
        return sendResponse(res, 400, false, error.message);
    }
};

exports.deleteLeaveRequest = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { LeaveRequestModel } = await initModels(org_uuid);
        const { leaveRequestId } = req.params;

        if (!leaveRequestId) {
            return sendResponse(res, 400, false, "leaveRequestId is required");
        }

        const leaveRequest = await LeaveRequestModel.findById(leaveRequestId);
        if (!leaveRequest) {
            return sendResponse(res, 404, false, "Leave request not found");
        }

        // ---------- STATUS CHECK ----------
        const deleteStatus = String(leaveRequest.status || '').trim().toLowerCase();
        const canDelete = deleteStatus === 'pending' || deleteStatus === 'cancelled' || deleteStatus === 'canceled';
        if (!canDelete) {
            return sendResponse(
                res,
                400,
                false,
                "Only pending or cancelled leave request can be deleted"
            );
        }

        await LeaveRequestModel.findByIdAndDelete(leaveRequestId);

        return sendResponse(
            res,
            200,
            true,
            "Leave request deleted successfully"
        );

    } catch (error) {
        console.error("deleteLeaveRequest error:", error);
        return handleError(res, error);
    }
};

exports.approveLeaveRequest = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        const { LeaveRequestModel, LeaveTypeModel, EmployeeModel } = await initModels(org_uuid);
        const { leaveRequestId } = req.params;
        const { approverId } = req.body;

        const leaveRequest = await LeaveRequestModel.findById(leaveRequestId);
        if (!leaveRequest) {
            return sendResponse(res, 404, false, "Leave request not found");
        }

        if (leaveRequest.status !== "Pending") {
            return sendResponse(res, 400, false, "Only pending leave can be approved");
        }

        const leaveType = await LeaveTypeModel.findById(leaveRequest.leaveTypeId);
        const employeeForApprove = await EmployeeModel.findById(leaveRequest.employeeId)
            .select("dateOfJoining createdAt")
            .lean();

        // 🔥 SANDWICH LEAVE CHECK FOR APPROVAL
        const sandwichResult = await checkSandwichLeave({
            org_uuid,
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
            startDate: leaveRequest.startDate,
            endDate: leaveRequest.endDate,
            requestedDays: leaveRequest.leaveDays
        });

        await checkLeaveBalance({
            LeaveRequestModel,
            leaveType,
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
            requestedDays: sandwichResult.sandwichApplied ? sandwichResult.totalDaysWithSandwich : leaveRequest.leaveDays,
            requestedStartDate: leaveRequest.startDate,
            requestedEndDate: leaveRequest.endDate,
            joiningDate: employeeForApprove?.dateOfJoining || employeeForApprove?.createdAt
        });

        // Update sandwich fields if applied
        if (sandwichResult.sandwichApplied) {
            leaveRequest.sandwichApplied = true;
            leaveRequest.sandwichDays = sandwichResult.sandwichDays;
            leaveRequest.totalDaysWithSandwich = sandwichResult.totalDaysWithSandwich;
        }

        leaveRequest.status = "Approved";
        leaveRequest.approvedDate = new Date();
        leaveRequest.approvedBy = approverId;

        await leaveRequest.save();

        return sendResponse(res, 200, true, "Leave approved successfully", leaveRequest);

    } catch (error) {
        return sendResponse(res, 400, false, error.message);
    }
};

exports.rejectLeaveRequest = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { LeaveRequestModel } = await initModels(org_uuid);
        const { leaveRequestId } = req.params;
        const { rejectionReason, rejectedBy } = req.body;

        const leave = await LeaveRequestModel.findById(leaveRequestId);
        if (!leave) {
            return sendResponse(res, 404, false, "Leave request not found");
        }

        if (leave.status !== "Pending") {
            return sendResponse(res, 400, false, "Only pending leave request can be rejected");
        }

        leave.status = "Rejected";
        leave.rejectedDate = new Date();
        leave.rejectedBy = rejectedBy;
        leave.rejectionReason = rejectionReason || "";

        await leave.save();

        return sendResponse(res, 200, true, "Leave rejected successfully", leave);

    } catch (error) {
        return handleError(res, error);
    }
};

exports.cancelLeaveRequest = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { LeaveRequestModel } = await initModels(org_uuid);
        const { leaveRequestId } = req.params;

        const leave = await LeaveRequestModel.findById(leaveRequestId);
        if (!leave) {
            return sendResponse(res, 404, false, "Leave request not found");
        }

        const cancelStatus = String(leave.status || '').trim().toLowerCase();
        if (cancelStatus !== "pending") {
            return sendResponse(res, 400, false, "Only pending leave request can be cancelled");
        }

        leave.status = "Cancelled";
        leave.canceledDate = new Date();
        await leave.save();

        return sendResponse(res, 200, true, "Leave cancelled successfully", leave);

    } catch (error) {
        return handleError(res, error);
    }
};

exports.getLeaveRequestById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { LeaveRequestModel } = await initModels(org_uuid);
        const { leaveRequestId } = req.params;

        if (!leaveRequestId) {
            return sendResponse(res, 400, false, "leaveRequestId is required");
        }

        const leaveRequest = await LeaveRequestModel
            .findById(leaveRequestId)
            .populate({
                path: "employeeId",
                select: "firstName lastName email uniqueId"
            })
            .populate({
                path: "leaveTypeId",
                select: "leaveType typeOfLeave leaveNameId",
                populate: {
                    path: "leaveNameId",
                    select: "name code shortName description"
                }
            })
            .populate({
                path: "leaveReasonId",
                select: "reason description"
            })
            .populate({
                path: "approvedBy",
                select: "firstName lastName email"
            })
            .populate({
                path: "rejectedBy",
                select: "firstName lastName email"
            })
            .lean();

        if (!leaveRequest) {
            return sendResponse(res, 404, false, "Leave request not found");
        }

        return sendResponse(
            res,
            200,
            true,
            "Leave request fetched successfully",
            leaveRequest
        );

    } catch (error) {
        console.error("getLeaveRequestById error:", error);
        return handleError(res, error);
    }
};

exports.getMyLeaveRequests = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { LeaveRequestModel } = await initModels(org_uuid);
        const { employeeId } = req.params;

        const {
            status,
            from,
            to,
            page: pageQuery,
            limit: limitQuery
        } = req.query;

        // ---------- PAGINATION ----------
        const page = Math.max(1, parseInt(pageQuery || 1));
        const limit = Math.min(100, parseInt(limitQuery || 10));
        const skip = (page - 1) * limit;

        // ---------- FILTER ----------
        const filter = { employeeId };

        if (status) filter.status = status;

        // ✅ DATE OVERLAP FILTER
        if (from || to) {
            filter.$and = [];
            if (from) filter.$and.push({ endDate: { $gte: new Date(from) } });
            if (to) filter.$and.push({ startDate: { $lte: new Date(to) } });
        }

        const [data, total] = await Promise.all([
            LeaveRequestModel.find(filter)
                .populate({
                    path: "leaveTypeId",
                    select: "leaveType typeOfLeave leaveNameId",
                    populate: {
                        path: "leaveNameId",
                        select: "name code shortName"
                    }
                })
                .populate({
                    path: "leaveReasonId",
                    select: "reason"
                })
                .populate({
                    path: "approvedBy",
                    select: "firstName lastName email"
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            LeaveRequestModel.countDocuments(filter)
        ]);

        return sendResponse(res, 200, true, "My leave requests fetched", {
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            total,
            data
        });

    } catch (error) {
        return handleError(res, error);
    }
};

exports.getAllLeaveRequests = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { LeaveRequestModel, EmployeeModel } = await initModels(org_uuid);

        const {
            status,
            employeeId,
            organizationId,
            from,
            to,
            search,
            teamOnly,
            page: pageQuery,
            limit: limitQuery
        } = req.query;

        // ---------- PAGINATION ----------
        const page = Math.max(1, parseInt(pageQuery || 1));
        const limit = Math.min(100, parseInt(limitQuery || 10));
        const skip = (page - 1) * limit;

        const isTeamOnly = String(teamOnly).toLowerCase() === 'true';
        if (isTeamOnly && !req.empId) {
            return sendResponse(res, 400, false, "Logged-in employee not found for team view");
        }

        // ---------- FILTER ----------
        const filter = {};

        if (status) filter.status = status;
        if (organizationId) filter.organizationId = organizationId;

        // Resolve employee scope (teamOnly / search / employeeId)
        const needsEmployeeScope = isTeamOnly || Boolean(search);
        if (needsEmployeeScope) {
            const empQuery = {
                status: { $ne: "Inactive" },
                ...(isTeamOnly && { reportingManagerId: req.empId }),
                ...(organizationId && { organizationId }),
                ...(search && {
                    $or: [
                        { firstName: { $regex: search, $options: "i" } },
                        { lastName: { $regex: search, $options: "i" } },
                        { email: { $regex: search, $options: "i" } },
                        { uniqueId: { $regex: search, $options: "i" } },
                        { customId: { $regex: search, $options: "i" } }
                    ]
                })
            };
            const scopedEmployees = await EmployeeModel.find(empQuery).select("_id").lean();
            let scopedIds = scopedEmployees.map((e) => e._id);

            if (employeeId) {
                scopedIds = scopedIds.filter((id) => String(id) === String(employeeId));
            }

            filter.employeeId = { $in: scopedIds };
        } else if (employeeId) {
            filter.employeeId = employeeId;
        }

        // ✅ DATE OVERLAP FILTER
        if (from || to) {
            filter.$and = [];
            if (from) filter.$and.push({ endDate: { $gte: new Date(from) } });
            if (to) filter.$and.push({ startDate: { $lte: new Date(to) } });
        }

        const query = LeaveRequestModel.find(filter)
            .populate({
                path: "employeeId",
                select: "firstName lastName email uniqueId"
            })
            .populate({
                path: "leaveTypeId",
                select: "leaveType typeOfLeave leaveNameId",
                populate: {
                    path: "leaveNameId",
                    select: "name code shortName"
                }
            })
            .populate({
                path: "leaveReasonId",
                select: "reason"
            })
            .populate({
                path: "approvedBy",
                select: "firstName lastName email"
            })
            .sort({ createdAt: -1 });

        const [data, total] = await Promise.all([
            query.skip(skip).limit(limit).lean(),
            LeaveRequestModel.countDocuments(filter)
        ]);

        return sendResponse(res, 200, true, "All leave requests fetched", {
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            total,
            teamOnly: isTeamOnly,
            data
        });

    } catch (error) {
        return handleError(res, error);
    }
};

exports.getTodaysLeaves = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { LeaveRequestModel, EmployeeModel } = await initModels(org_uuid);
        const { organizationId, startDate: startQuery, endDate: endQuery, search, page: pageQuery, limit: limitQuery } = req.query;

        // ---------- PAGINATION ----------
        const page = Math.max(1, parseInt(pageQuery || 1));
        const limit = Math.min(100, parseInt(limitQuery || 10));
        const skip = (page - 1) * limit;

        let start = new Date();
        start.setHours(0, 0, 0, 0);
        let end = new Date(start);
        end.setDate(end.getDate() + 1);

        if (startQuery && endQuery) {
            start = new Date(startQuery);
            start.setHours(0, 0, 0, 0);
            end = new Date(endQuery);
            end.setHours(23, 59, 59, 999);
        }

        // Filter for approved leaves that overlap with the date range
        const filter = {
            status: 'Approved',
            $or: [
                {
                    startDate: { $lte: end },
                    endDate: { $gte: start }
                },
                {
                    leaveDurationType: 'Cluster',
                    clusterDates: {
                        $elemMatch: {
                            $gte: start,
                            $lte: end
                        }
                    }
                }
            ]
        };

        if (organizationId) {
            const employees = await EmployeeModel.find({ organizationId }).select('_id');
            filter.employeeId = { $in: employees.map(e => e._id) };
        }

        let query = LeaveRequestModel.find(filter)
            .populate({
                path: "employeeId",
                select: "firstName lastName email uniqueId customId organizationId",
                populate: {
                    path: "organizationId",
                    select: "name"
                }
            })
            .populate({
                path: "leaveTypeId",
                select: "leaveType typeOfLeave leaveNameId",
                populate: {
                    path: "leaveNameId",
                    select: "name code shortName"
                }
            })
            .populate({
                path: "leaveReasonId",
                select: "reason"
            })
            .sort({ startDate: 1 });

        // ---------- SEARCH (Employee Fields) ----------
        if (search) {
            query = query.where({
                $or: [
                    { "employeeId.firstName": { $regex: search, $options: "i" } },
                    { "employeeId.lastName": { $regex: search, $options: "i" } },
                    { "employeeId.email": { $regex: search, $options: "i" } },
                    { "employeeId.uniqueId": { $regex: search, $options: "i" } },
                    { "employeeId.customId": { $regex: search, $options: "i" } }
                ]
            });
        }

        const [data, total] = await Promise.all([
            query.skip(skip).limit(limit).lean(),
            query.clone().countDocuments()
        ]);

        return sendResponse(res, 200, true, "Leaves fetched successfully", {
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            total,
            data
        });

    } catch (error) {
        console.error("getTodaysLeaves error:", error);
        return handleError(res, error);
    }
};

