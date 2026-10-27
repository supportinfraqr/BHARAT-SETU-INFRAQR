const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');
const { sendResponse, handleError } = require('../utils/responce');

const applyDateFilter = (filters, fromDate, toDate) => {
    if (fromDate || toDate) {
        filters.attendanceDate = {};
        if (fromDate) filters.attendanceDate.$gte = new Date(fromDate);
        if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            filters.attendanceDate.$lte = end;
        }
    }
};

const parseAttendanceDateUtc = (attendanceDate) => {
    let parsedDate;

    if (typeof attendanceDate === 'string' && attendanceDate.includes('-')) {
        parsedDate = new Date(attendanceDate + 'T00:00:00.000Z');
    } else {
        parsedDate = new Date(attendanceDate);
    }

    parsedDate.setUTCHours(0, 0, 0, 0);
    return parsedDate;
};

exports.applyRegularization = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        const {
            RegularizationMethodModel,
            RegularizationRequestModel,
            EmployeeModel,
            AttendanceModel,
            AttendancePolicyModel
        } = await initModels(org_uuid);

        const { 
            regularizationMethodId, 
            attendanceDate, 
            reason, 
            documentUrl, 
            categoryId, 
            employeeId, 
            organizationId,
            type,
            odDetails,
            mpDetails,
            fidDetails,
            otDetails
        } = req.body;

        if (!regularizationMethodId || !attendanceDate || !reason || !categoryId || !employeeId || !organizationId || !type) {
            return sendResponse(res, 400, false, "Required fields missing (regularizationMethodId, attendanceDate, reason, categoryId, employeeId, organizationId, type)");
        }

        // Validate type
        if (!["OD", "MP", "FID", "OT"].includes(type)) {
            return sendResponse(res, 400, false, "type must be one of: OD, MP, FID, OT");
        }

        // Type-specific field validation
        if (type === "OD" && !odDetails) {
            return sendResponse(res, 400, false, "odDetails required for On Duty regularization");
        }
        if (type === "MP" && !mpDetails) {
            return sendResponse(res, 400, false, "mpDetails required for Missing Punch regularization");
        }
        if (type === "FID" && !fidDetails) {
            return sendResponse(res, 400, false, "fidDetails required for Forgot ID regularization");
        }
        if (type === "OT" && !otDetails) {
            return sendResponse(res, 400, false, "otDetails required for Overtime regularization");
        }

        // Validate employee exists
        const employee = await EmployeeModel.findById(employeeId);
        if (!employee) {
            return sendResponse(res, 404, false, "Employee not found");
        }

        // ---- VALIDATE ATTENDANCE POLICY ----
        let attendancePolicy = null;
        if (employee.attendancePolicyId) {
            attendancePolicy = await AttendancePolicyModel.findById(employee.attendancePolicyId);
        }

        // Check policy-specific validations based on type
        if (attendancePolicy) {
            if (type === "OD") {
                if (!attendancePolicy.odAllowed) {
                    return sendResponse(res, 403, false, "On Duty (OD) is not allowed as per attendance policy");
                }
            }
            
            if (type === "OT") {
                if (!attendancePolicy.overtimeAllowed) {
                    return sendResponse(res, 403, false, "Overtime is not allowed as per attendance policy");
                }
                
                // Validate overtime hours against policy
                if (otDetails && attendancePolicy.overtimeMaxHoursPerDay) {
                    const totalOTHours = (otDetails.overtimeHours || 0) + ((otDetails.overtimeMinutes || 0) / 60);
                    if (totalOTHours > attendancePolicy.overtimeMaxHoursPerDay) {
                        return sendResponse(
                            res, 
                            400, 
                            false, 
                            `Overtime hours (${totalOTHours.toFixed(2)}h) exceed policy limit of ${attendancePolicy.overtimeMaxHoursPerDay}h per day`
                        );
                    }
                }
            }
        }

        const method = await RegularizationMethodModel.findById(regularizationMethodId);
        if (!method) {
            return sendResponse(res, 404, false, "Regularization method not found");
        }

        if (method.status !== "Active") {
            return sendResponse(res, 400, false, "Regularization method is inactive");
        }

        // Verify method type matches request type
        if (method.type !== type) {
            return sendResponse(res, 400, false, `Method type mismatch. Method is for ${method.type}, but request is for ${type}`);
        }

        const categoryRule = method.applicableCategories.find(
            c => c.categoryId.toString() === categoryId.toString()
        );

        if (!categoryRule || !categoryRule.canRaise) {
            return sendResponse(res, 403, false, "Not allowed to apply regularization for this category");
        }

        // ---- VALIDATE ATTENDANCE DATE ----
        // Parse date string and create UTC midnight to avoid timezone issues
        let reqDate;
        if (typeof attendanceDate === 'string' && attendanceDate.includes('-')) {
            // For "YYYY-MM-DD" format, create date at UTC midnight
            reqDate = new Date(attendanceDate + 'T00:00:00.000Z');
        } else {
            reqDate = new Date(attendanceDate);
        }
        
        // Set to UTC midnight for comparison
        reqDate.setUTCHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        if (reqDate > today) {
            return sendResponse(res, 400, false, "Cannot apply for future dates");
        }

        // ---- PAST DAYS CHECK ----
        if (categoryRule.allowPastDaysUpto) {
            const daysDiff = Math.floor((today - reqDate) / (1000 * 60 * 60 * 24));
            if (daysDiff > categoryRule.allowPastDaysUpto) {
                return sendResponse(
                    res,
                    400,
                    false,
                    `Can only apply for last ${categoryRule.allowPastDaysUpto} days`
                );
            }
        }

        // ---- CUT OFF + GRACE CHECK ----
        if (categoryRule.cutOffDay) {
            const cutOff = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), categoryRule.cutOffDay));
            const graceEnd = new Date(cutOff);
            graceEnd.setUTCDate(cutOff.getUTCDate() + (categoryRule.graceDays || 0));

            if (today > graceEnd) {
                return sendResponse(res, 400, false, "Regularization window closed for this month");
            }
        }

        // ---- MONTHLY LIMIT CHECK ----
        if (categoryRule.maxRequestsPerMonth) {
            const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
            const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0, 23, 59, 59));

            const monthlyCount = await RegularizationRequestModel.countDocuments({
                employeeId,
                regularizationMethodId,
                attendanceDate: { $gte: monthStart, $lte: monthEnd },
                status: { $in: ["Pending", "Approved"] }
            });

            if (monthlyCount >= categoryRule.maxRequestsPerMonth) {
                return sendResponse(
                    res,
                    400,
                    false,
                    `Monthly limit of ${categoryRule.maxRequestsPerMonth} requests reached`
                );
            }
        }

        // ---- PREVENT DUPLICATE ----
        if (method.preventDuplicate) {
            const exists = await RegularizationRequestModel.findOne({
                employeeId,
                regularizationMethodId,
                attendanceDate: reqDate,
                status: { $in: ["Pending", "Approved"] }
            });
            if (exists) {
                return sendResponse(res, 400, false, "Request already exists for this date");
            }
        }

        // ---- DOCUMENT REQUIRED ----
        if (method.documentRequired && !documentUrl) {
            return sendResponse(res, 400, false, "Document is required for this regularization");
        }

        // ---- CHECK IF ATTENDANCE EXISTS ----
        // Query by date range (full UTC day)
        const startOfDay = new Date(reqDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        
        const endOfDay = new Date(reqDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        
        console.log("Checking attendance for employeeId:", employeeId, "date:", reqDate);
        const attendance = await AttendanceModel.findOne({
            employeeId,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        if (!attendance) {
            return sendResponse(res, 400, false, "Attendance record not found for this date");
        }

        const requestData = {
            organizationId,
            employeeId,
            categoryId,
            regularizationMethodId,
            attendanceDate: reqDate,
            reason,
            documentUrl,
            type
        };

        // Add type-specific details
        if (type === "OD") requestData.odDetails = odDetails;
        if (type === "MP") requestData.mpDetails = mpDetails;
        if (type === "FID") requestData.fidDetails = fidDetails;
        if (type === "OT") requestData.otDetails = otDetails;

        const request = await RegularizationRequestModel.create(requestData);

        return sendResponse(res, 201, true, "Regularization request submitted successfully", request);

    } catch (err) {
        return handleError(res, err);
    }
};

exports.updateRegularizationRequest = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        const {
            RegularizationMethodModel,
            RegularizationRequestModel,
            AttendanceModel
        } = await initModels(org_uuid);

        const { requestId } = req.params;
        const {
            regularizationMethodId,
            attendanceDate,
            reason,
            documentUrl,
            categoryId,
            employeeId,
            type,
            odDetails,
            mpDetails,
            fidDetails,
            otDetails
        } = req.body;

        if (!regularizationMethodId || !attendanceDate || !reason || !categoryId || !employeeId || !type) {
            return sendResponse(res, 400, false, "Required fields missing (regularizationMethodId, attendanceDate, reason, categoryId, employeeId, type)");
        }

        if (!["OD", "MP", "FID", "OT"].includes(type)) {
            return sendResponse(res, 400, false, "type must be one of: OD, MP, FID, OT");
        }

        const request = await RegularizationRequestModel.findById(requestId);
        if (!request) {
            return sendResponse(res, 404, false, "Regularization request not found");
        }

        if (request.employeeId.toString() !== employeeId.toString()) {
            return sendResponse(res, 403, false, "You can only update your own request");
        }

        if (request.status !== "Pending") {
            return sendResponse(res, 400, false, "Only pending request can be edited");
        }

        const method = await RegularizationMethodModel.findById(regularizationMethodId);
        if (!method) {
            return sendResponse(res, 404, false, "Regularization method not found");
        }

        if (method.status !== "Active") {
            return sendResponse(res, 400, false, "Regularization method is inactive");
        }

        if (method.type !== type) {
            return sendResponse(res, 400, false, `Method type mismatch. Method is for ${method.type}, but request is for ${type}`);
        }

        const categoryRule = method.applicableCategories.find(
            c => c.categoryId.toString() === categoryId.toString()
        );

        if (!categoryRule || !categoryRule.canRaise) {
            return sendResponse(res, 403, false, "Not allowed to apply regularization for this category");
        }

        const reqDate = parseAttendanceDateUtc(attendanceDate);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        if (reqDate > today) {
            return sendResponse(res, 400, false, "Cannot apply for future dates");
        }

        if (categoryRule.allowPastDaysUpto) {
            const daysDiff = Math.floor((today - reqDate) / (1000 * 60 * 60 * 24));
            if (daysDiff > categoryRule.allowPastDaysUpto) {
                return sendResponse(
                    res,
                    400,
                    false,
                    `Can only apply for last ${categoryRule.allowPastDaysUpto} days`
                );
            }
        }

        if (categoryRule.cutOffDay) {
            const cutOff = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), categoryRule.cutOffDay));
            const graceEnd = new Date(cutOff);
            graceEnd.setUTCDate(cutOff.getUTCDate() + (categoryRule.graceDays || 0));

            if (today > graceEnd) {
                return sendResponse(res, 400, false, "Regularization window closed for this month");
            }
        }

        if (method.preventDuplicate) {
            const exists = await RegularizationRequestModel.findOne({
                _id: { $ne: requestId },
                employeeId,
                regularizationMethodId,
                attendanceDate: reqDate,
                status: { $in: ["Pending", "Approved"] }
            });
            if (exists) {
                return sendResponse(res, 400, false, "Request already exists for this date");
            }
        }

        if (method.documentRequired && !documentUrl) {
            return sendResponse(res, 400, false, "Document is required for this regularization");
        }

        const startOfDay = new Date(reqDate);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(reqDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const attendance = await AttendanceModel.findOne({
            employeeId,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        if (!attendance) {
            return sendResponse(res, 400, false, "Attendance record not found for this date");
        }

        const updateData = {
            categoryId,
            regularizationMethodId,
            attendanceDate: reqDate,
            reason,
            documentUrl,
            type,
            odDetails: type === "OD" ? odDetails : undefined,
            mpDetails: type === "MP" ? mpDetails : undefined,
            fidDetails: type === "FID" ? fidDetails : undefined,
            otDetails: type === "OT" ? otDetails : undefined
        };

        const updatedRequest = await RegularizationRequestModel.findByIdAndUpdate(
            requestId,
            updateData,
            { new: true }
        );

        return sendResponse(res, 200, true, "Regularization request updated successfully", updatedRequest);
    } catch (err) {
        return handleError(res, err);
    }
};

exports.cancelRegularizationRequest = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        const { RegularizationRequestModel } = await initModels(org_uuid);
        const { requestId } = req.params;
        const { employeeId, cancelReason } = req.body;

        if (!employeeId) {
            return sendResponse(res, 400, false, "employeeId is required");
        }

        const request = await RegularizationRequestModel.findById(requestId);
        if (!request) {
            return sendResponse(res, 404, false, "Regularization request not found");
        }

        if (request.employeeId.toString() !== employeeId.toString()) {
            return sendResponse(res, 403, false, "You can only cancel your own request");
        }

        if (request.status !== "Pending") {
            return sendResponse(res, 400, false, "Only pending request can be cancelled");
        }

        request.status = "Cancelled";
        request.rejectionReason = cancelReason || "Cancelled by employee";
        await request.save();

        return sendResponse(res, 200, true, "Regularization request cancelled successfully", request);
    } catch (err) {
        return handleError(res, err);
    }
};

exports.deleteRegularizationRequest = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        const { RegularizationRequestModel } = await initModels(org_uuid);
        const { requestId } = req.params;
        const { employeeId } = req.body;

        if (!employeeId) {
            return sendResponse(res, 400, false, "employeeId is required");
        }

        const request = await RegularizationRequestModel.findById(requestId);
        if (!request) {
            return sendResponse(res, 404, false, "Regularization request not found");
        }

        if (request.employeeId.toString() !== employeeId.toString()) {
            return sendResponse(res, 403, false, "You can only delete your own request");
        }

        if (request.status === "Approved") {
            return sendResponse(res, 400, false, "Approved request cannot be deleted");
        }

        await RegularizationRequestModel.findByIdAndDelete(requestId);

        return sendResponse(res, 200, true, "Regularization request deleted successfully");
    } catch (err) {
        return handleError(res, err);
    }
};

exports.approveRejectRegularization = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        const {
            RegularizationRequestModel,
            RegularizationMethodModel,
            AttendanceModel,
            EmployeeModel,
            ShiftModel,
            AttendancePolicyModel
        } = await initModels(org_uuid);

        const { requestId } = req.params;
        const { action, rejectionReason, categoryId, employeeId } = req.body;

        if (!action || !categoryId || !employeeId) {
            return sendResponse(res, 400, false, "action, categoryId, and employeeId are required");
        }

        if (!["Approved", "Rejected"].includes(action)) {
            return sendResponse(res, 400, false, "Invalid action. Must be 'Approved' or 'Rejected'");
        }

        if (action === "Rejected" && !rejectionReason) {
            return sendResponse(res, 400, false, "Rejection reason is required");
        }

        const request = await RegularizationRequestModel
            .findById(requestId)
            .populate("regularizationMethodId")
            .populate("employeeId");

        if (!request) {
            return sendResponse(res, 404, false, "Regularization request not found");
        }

        if (request.status !== "Pending") {
            return sendResponse(res, 400, false, `Request already ${request.status.toLowerCase()}`);
        }

        const rule = request.regularizationMethodId.applicableCategories.find(
            c => c.categoryId.toString() === categoryId.toString()
        );

        if (!rule || !rule.canApprove) {
            return sendResponse(res, 403, false, "Not allowed to approve this request");
        }

        request.status = action;
        request.approvedBy = employeeId;
        request.approvedAt = new Date();
        request.rejectionReason = action === "Rejected" ? rejectionReason : null;

        await request.save();

        // ========== UPDATE ATTENDANCE IF APPROVED ==========
        if (action === "Approved") {
            const attendance = await AttendanceModel.findOne({
                employeeId: request.employeeId._id,
                date: request.attendanceDate
            });

            if (attendance) {
                const employee = request.employeeId;
                const shift = await ShiftModel.findById(employee.shiftId);
                const method = request.regularizationMethodId;
                const type = request.type;
                
                // Get employee's attendance policy for validation
                let attendancePolicy = null;
                if (employee.attendancePolicyId) {
                    attendancePolicy = await AttendancePolicyModel.findById(employee.attendancePolicyId);
                }
                
                // Validate against attendance policy before applying
                if (attendancePolicy) {
                    if (type === "OD" && !attendancePolicy.odAllowed) {
                        return sendResponse(res, 403, false, "Cannot approve: OD not allowed in attendance policy");
                    }
                    if (type === "OT" && !attendancePolicy.overtimeAllowed) {
                        return sendResponse(res, 403, false, "Cannot approve: Overtime not allowed in attendance policy");
                    }
                }

                // Mark as regularized
                attendance.regularized = true;
                attendance.regularizationRequestId = request._id;
                attendance.remarks = `${attendance.remarks || ''} [Regularized: ${method.name} - ${type}]`.trim();

                // Type-specific attendance updates
                if (type === "OD") {
                    // On Duty - Mark full day present if specified
                    if (method.rules?.odRules?.markFullDayPresent) {
                        attendance.status = "Present";
                        if (shift?.startTime && shift?.endTime) {
                            const [sHour, sMin] = shift.startTime.split(':').map(Number);
                            const [eHour, eMin] = shift.endTime.split(':').map(Number);
                            
                            attendance.checkIn = new Date(request.attendanceDate);
                            attendance.checkIn.setHours(sHour, sMin, 0, 0);
                            
                            attendance.checkOut = new Date(request.attendanceDate);
                            attendance.checkOut.setHours(eHour, eMin, 0, 0);
                        }
                    } else if (request.odDetails?.isFullDay) {
                        attendance.status = "Present";
                        if (shift?.startTime && shift?.endTime) {
                            const [sHour, sMin] = shift.startTime.split(':').map(Number);
                            const [eHour, eMin] = shift.endTime.split(':').map(Number);
                            
                            attendance.checkIn = new Date(request.attendanceDate);
                            attendance.checkIn.setHours(sHour, sMin, 0, 0);
                            
                            attendance.checkOut = new Date(request.attendanceDate);
                            attendance.checkOut.setHours(eHour, eMin, 0, 0);
                        }
                    } else if (request.odDetails?.startTime && request.odDetails?.endTime) {
                        // Partial day - use provided times
                        const startTimeObj = new Date(request.odDetails.startTime);
                        const endTimeObj = new Date(request.odDetails.endTime);
                        
                        if (!attendance.checkIn) {
                            attendance.checkIn = new Date(request.attendanceDate);
                            attendance.checkIn.setHours(startTimeObj.getHours(), startTimeObj.getMinutes(), 0, 0);
                        }
                        
                        if (!attendance.checkOut) {
                            attendance.checkOut = new Date(request.attendanceDate);
                            attendance.checkOut.setHours(endTimeObj.getHours(), endTimeObj.getMinutes(), 0, 0);
                        }
                        
                        attendance.status = "Present";
                    }
                }

                if (type === "MP") {
                    // Missing Punch
                    const mpRules = method.rules?.mpRules;
                    const mpDetails = request.mpDetails;

                    if (mpDetails?.missingPunchType === "checkIn" && mpRules?.allowSinglePunch) {
                        // Fill missing check-in
                        if (mpDetails.actualCheckIn) {
                            const checkInTime = new Date(mpDetails.actualCheckIn);
                            attendance.checkIn = new Date(request.attendanceDate);
                            attendance.checkIn.setHours(checkInTime.getHours(), checkInTime.getMinutes(), 0, 0);
                        } else if (mpRules.useShiftTiming && shift?.startTime) {
                            const [sHour, sMin] = shift.startTime.split(':').map(Number);
                            attendance.checkIn = new Date(request.attendanceDate);
                            attendance.checkIn.setHours(sHour, sMin, 0, 0);
                        }
                    }

                    if (mpDetails?.missingPunchType === "checkOut" && mpRules?.allowSinglePunch) {
                        // Fill missing check-out
                        if (mpDetails.actualCheckOut) {
                            const checkOutTime = new Date(mpDetails.actualCheckOut);
                            attendance.checkOut = new Date(request.attendanceDate);
                            attendance.checkOut.setHours(checkOutTime.getHours(), checkOutTime.getMinutes(), 0, 0);
                        } else if (mpRules.useShiftTiming && shift?.endTime) {
                            const [eHour, eMin] = shift.endTime.split(':').map(Number);
                            attendance.checkOut = new Date(request.attendanceDate);
                            attendance.checkOut.setHours(eHour, eMin, 0, 0);
                        }
                    }

                    if (mpDetails?.missingPunchType === "both" && mpRules?.allowBothMissing) {
                        // Fill both punches
                        if (mpDetails.actualCheckIn && mpDetails.actualCheckOut) {
                            const checkInTime = new Date(mpDetails.actualCheckIn);
                            const checkOutTime = new Date(mpDetails.actualCheckOut);
                            
                            attendance.checkIn = new Date(request.attendanceDate);
                            attendance.checkIn.setHours(checkInTime.getHours(), checkInTime.getMinutes(), 0, 0);
                            
                            attendance.checkOut = new Date(request.attendanceDate);
                            attendance.checkOut.setHours(checkOutTime.getHours(), checkOutTime.getMinutes(), 0, 0);
                        } else if (mpRules.useShiftTiming && shift?.startTime && shift?.endTime) {
                            const [sHour, sMin] = shift.startTime.split(':').map(Number);
                            const [eHour, eMin] = shift.endTime.split(':').map(Number);
                            
                            attendance.checkIn = new Date(request.attendanceDate);
                            attendance.checkIn.setHours(sHour, sMin, 0, 0);
                            
                            attendance.checkOut = new Date(request.attendanceDate);
                            attendance.checkOut.setHours(eHour, eMin, 0, 0);
                        }
                    }

                    if (attendance.status === "Absent") {
                        attendance.status = "Present";
                    }
                }

                if (type === "FID") {
                    // Forgot ID
                    const fidRules = method.rules?.fidRules;
                    const fidDetails = request.fidDetails;

                    if (fidRules?.allowManualEntry && fidDetails) {
                        if (fidDetails.actualCheckIn) {
                            const checkInTime = new Date(fidDetails.actualCheckIn);
                            attendance.checkIn = new Date(request.attendanceDate);
                            attendance.checkIn.setHours(checkInTime.getHours(), checkInTime.getMinutes(), 0, 0);
                        }

                        if (fidDetails.actualCheckOut) {
                            const checkOutTime = new Date(fidDetails.actualCheckOut);
                            attendance.checkOut = new Date(request.attendanceDate);
                            attendance.checkOut.setHours(checkOutTime.getHours(), checkOutTime.getMinutes(), 0, 0);
                        }

                        // If useShiftTiming and times not provided, use shift times
                        if (fidRules.useShiftTiming && shift) {
                            if (!attendance.checkIn && shift.startTime) {
                                const [sHour, sMin] = shift.startTime.split(':').map(Number);
                                attendance.checkIn = new Date(request.attendanceDate);
                                attendance.checkIn.setHours(sHour, sMin, 0, 0);
                            }
                            if (!attendance.checkOut && shift.endTime) {
                                const [eHour, eMin] = shift.endTime.split(':').map(Number);
                                attendance.checkOut = new Date(request.attendanceDate);
                                attendance.checkOut.setHours(eHour, eMin, 0, 0);
                            }
                        }

                        attendance.status = "Present";
                    }
                }

                if (type === "OT") {
                    // Overtime - Add overtime hours to attendance
                    const otRules = method.rules?.otRules;
                    const otDetails = request.otDetails;

                    if (otDetails && otDetails.overtimeHours !== undefined) {
                        const overtimeMinutes = (otDetails.overtimeHours || 0) * 60 + (otDetails.overtimeMinutes || 0);
                        
                        // Validate max overtime hours
                        if (otRules?.maxOvertimeHours && overtimeMinutes / 60 > otRules.maxOvertimeHours) {
                            // Already applied, but log it
                            attendance.remarks += ` [OT exceeds max: ${otRules.maxOvertimeHours}h]`;
                        }

                        // Store overtime in attendance
                        attendance.overtimeHours = overtimeMinutes / 60;
                        attendance.overtimeApproved = true;
                        attendance.remarks += ` [OT Approved: ${otDetails.overtimeHours}h ${otDetails.overtimeMinutes}m]`;
                    }
                }

                // Recalculate hours if both punches exist
                if (attendance.checkIn && attendance.checkOut) {
                    const workedMs = attendance.checkOut - attendance.checkIn;
                    attendance.totalHoursWorked = workedMs / (1000 * 60 * 60);
                }

                await attendance.save();
            }
        }

        return sendResponse(res, 200, true, `Request ${action.toLowerCase()} successfully`, request);

    } catch (err) {
        return handleError(res, err);
    }
};

exports.getMyRegularizationRequests = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const { RegularizationRequestModel } = await initModels(org_uuid);

        const employeeId = req.params.employeeId || req.body.employeeId;
        if (!employeeId) {
            return sendResponse(res, 400, false, "employeeId is required");
        }
        const page = Math.max(1, parseInt(req.query.page || 1));
        const limit = Math.min(100, parseInt(req.query.limit || 10));
        const skip = (page - 1) * limit;

        const search = (req.query.search || "").trim();
        const status = req.query.status;
        const { fromDate, toDate } = req.query;

        const filters = {
            employeeId
        };

        if (status) filters.status = status;

        if (search) {
            filters.$or = [
                { reason: { $regex: search, $options: "i" } }
            ];
        }

        // ✅ DATE FILTER
        applyDateFilter(filters, fromDate, toDate);

        const [data, totalCount] = await Promise.all([
            RegularizationRequestModel.find(filters)
                .populate("regularizationMethodId", "name shortName")
                .populate("approvedBy", "firstName lastName")
                .sort({ attendanceDate: -1 })
                .skip(skip)
                .limit(limit),
            RegularizationRequestModel.countDocuments(filters)
        ]);

        return sendResponse(res, 200, true, "My regularization requests", {
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            data
        });

    } catch (err) {
        return handleError(res, err);
    }
};

exports.getAllRegularizations = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { RegularizationRequestModel, EmployeeModel } = await initModels(org_uuid);

        const page = Math.max(1, parseInt(req.query.page || 1));
        const limit = Math.min(100, parseInt(req.query.limit || 10));
        const skip = (page - 1) * limit;

        const {
            search,
            status,
            organizationId,
            fromDate,
            toDate,
            teamOnly
        } = req.query;

        const isTeamOnly = String(teamOnly).toLowerCase() === 'true';
        if (isTeamOnly && !req.empId) {
            return sendResponse(res, 400, false, "Logged-in employee not found for team view");
        }

        /* ------------------ MATCH FILTER ------------------ */
        const match = {};

        if (status) {
            match.status = status;
        }

        if (organizationId) {
            match.organizationId = new mongoose.Types.ObjectId(organizationId);
        }

        // teamOnly=true → only direct reports of logged-in reporting manager
        if (isTeamOnly) {
            const teamEmpQuery = {
                reportingManagerId: req.empId,
                status: { $ne: "Inactive" },
                ...(organizationId && { organizationId })
            };
            const teamEmployees = await EmployeeModel.find(teamEmpQuery).select("_id").lean();
            match.employeeId = { $in: teamEmployees.map((e) => e._id) };
        }

        // Date filter (attendanceDate)
        if (fromDate || toDate) {
            match.attendanceDate = {};
            if (fromDate) {
                match.attendanceDate.$gte = new Date(fromDate);
            }
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                match.attendanceDate.$lte = end;
            }
        }

        /* ------------------ AGGREGATION ------------------ */
        const pipeline = [
            { $match: match },

            // Employee
            {
                $lookup: {
                    from: "employees",
                    localField: "employeeId",
                    foreignField: "_id",
                    as: "employee"
                }
            },
            { $unwind: "$employee" },

            // Regularization Method
            {
                $lookup: {
                    from: "regularizationmethods",
                    localField: "regularizationMethodId",
                    foreignField: "_id",
                    as: "method"
                }
            },
            { $unwind: "$method" },

            // Organization
            {
                $lookup: {
                    from: "organizations",
                    localField: "organizationId",
                    foreignField: "_id",
                    as: "organization"
                }
            },
            { $unwind: "$organization" }
        ];

        /* ------------------ SEARCH ------------------ */
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { "employee.firstName": { $regex: search, $options: "i" } },
                        { "employee.lastName": { $regex: search, $options: "i" } },
                        { "employee.email": { $regex: search, $options: "i" } },
                        { "method.shortName": { $regex: search, $options: "i" } },
                        { "method.name": { $regex: search, $options: "i" } },
                        { reason: { $regex: search, $options: "i" } }
                    ]
                }
            });
        }

        /* ------------------ FACET (PAGINATION) ------------------ */
        pipeline.push({
            $facet: {
                data: [
                    { $sort: { attendanceDate: -1 } },
                    { $skip: skip },
                    { $limit: limit }
                ],
                totalCount: [
                    { $count: "count" }
                ]
            }
        });

        const result = await RegularizationRequestModel.aggregate(pipeline);

        const data = result[0]?.data || [];
        const totalCount = result[0]?.totalCount?.[0]?.count || 0;

        return sendResponse(res, 200, true, "Regularizations fetched", {
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            teamOnly: isTeamOnly,
            data
        });

    } catch (error) {
        return handleError(res, error);
    }
};

