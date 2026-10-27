/**
 * Bulk Attendance Helper
 * Utilities for bulk attendance operations with policy validation
 */

const attendanceValidator = require('./attendanceValidator');
const reportingValidator = require('./reportingValidator');

/**
 * Process bulk attendance with full policy validation
 * @param {Array} bulkAttendanceData - Array of attendance records
 * @param {Object} models - { AttendanceModel, EmployeeModel, ShiftModel, AttendancePolicyModel, ReportingMethodModel }
 * @returns {Object} { successful: [], failed: [], summary }
 */
async function processBulkAttendanceWithPolicy(bulkAttendanceData, models) {
    const {
        AttendanceModel,
        EmployeeModel,
        ShiftModel,
        AttendancePolicyModel,
        ReportingMethodModel
    } = models;

    const successful = [];
    const failed = [];

    for (const data of bulkAttendanceData) {
        try {
            const {
                employeeId,
                date,
                checkIn,
                checkOut,
                breaks = [],
                reportingChannel = "excel"
            } = data;

            // Fetch employee data once
            const employee = await EmployeeModel.findById(employeeId);
            if (!employee) {
                failed.push({
                    employeeId,
                    date,
                    reason: "Employee not found"
                });
                continue;
            }

            // Fetch policy, shift, and reporting method
            const [shift, policy, reportingMethod] = await Promise.all([
                ShiftModel.findById(employee.shiftId),
                AttendancePolicyModel.findById(employee.attendancePolicyId),
                ReportingMethodModel.findById(employee.reportingMethodId)
            ]);

            // Validate reporting channel for bulk import
            const channelValidation = reportingValidator.validateReportingChannel(
                reportingMethod?.allowedChannels || {},
                reportingChannel
            );

            if (!channelValidation.isAllowed) {
                failed.push({
                    employeeId,
                    date,
                    reason: `Reporting channel ${reportingChannel} not allowed`
                });
                continue;
            }

            // Parse dates and validate
            const moment = require('moment');
            const normalizedDate = moment(date).format("YYYY-MM-DD");

            // Check for duplicate
            const existingAttendance = await AttendanceModel.findOne({
                employeeId,
                date: normalizedDate
            });

            if (existingAttendance) {
                failed.push({
                    employeeId,
                    date,
                    reason: "Attendance already exists for this date"
                });
                continue;
            }

            // Validate and run full policy check
            const validationResult = attendanceValidator.validateAttendanceAgainstPolicy({
                checkInTime: new Date(checkIn),
                checkOutTime: new Date(checkOut),
                shiftStartTime: shift?.startTime,
                shiftEndTime: shift?.endTime,
                policy,
                shift,
                breaks: breaks.map(b => ({
                    breakIn: new Date(b.breakIn),
                    breakOut: new Date(b.breakOut)
                }))
            });

            // Create attendance record
            const attendance = await AttendanceModel.create({
                employeeId,
                date: normalizedDate,
                checkIn: new Date(checkIn),
                checkOut: new Date(checkOut),
                breaks: breaks.map(b => ({
                    breakIn: new Date(b.breakIn),
                    breakOut: new Date(b.breakOut)
                })),
                totalHoursWorked: validationResult.workedMinutes / 60,
                arrivalStatus: validationResult.lateStatus.isLate ? "late" : "onTime",
                status: validationResult.finalStatus,
                isHalfDay: validationResult.halfDayStatus.isHalfDay,
                overtimeHours: Math.max(0, validationResult.overtimeStatus.overtimeMinutes / 60),
                reportingChannel,
                remarks: `[Bulk Import][${validationResult.halfDayStatus.reason}]`
            });

            successful.push({
                employeeId,
                date,
                attendanceId: attendance._id,
                status: attendance.status,
                isHalfDay: attendance.isHalfDay,
                validationDetails: {
                    isLate: validationResult.lateStatus.isLate,
                    isEarlyExit: validationResult.earlyExitStatus.isEarlyExit,
                    overtime: attendance.overtimeHours > 0
                }
            });

        } catch (error) {
            failed.push({
                employeeId: data.employeeId,
                date: data.date,
                reason: error.message
            });
        }
    }

    return {
        successful,
        failed,
        summary: {
            totalProcessed: bulkAttendanceData.length,
            successCount: successful.length,
            failureCount: failed.length,
            successRate: ((successful.length / bulkAttendanceData.length) * 100).toFixed(2) + "%"
        }
    };
}

/**
 * Validate attendance for multiple employees in a date range
 * @param {Object} params - { employeeIds, startDate, endDate, models, policy }
 * @returns {Promise<Object>} Validation results with recommendations
 */
async function validateMultipleEmployeeAttendance(params) {
    const {
        employeeIds = [],
        startDate,
        endDate,
        models,
        includeReportingValidation = false
    } = params;

    const { AttendanceModel, EmployeeModel, ShiftModel, AttendancePolicyModel, ReportingMethodModel } = models;
    const results = {};

    const from = new Date(startDate);
    const to = new Date(endDate);

    for (const employeeId of employeeIds) {
        try {
            const employee = await EmployeeModel.findById(employeeId);
            if (!employee) {
                results[employeeId] = { error: "Employee not found" };
                continue;
            }

            const [shift, policy, reportingMethod] = await Promise.all([
                ShiftModel.findById(employee.shiftId),
                AttendancePolicyModel.findById(employee.attendancePolicyId),
                ReportingMethodModel.findById(employee.reportingMethodId)
            ]);

            const attendanceRecords = await AttendanceModel.find({
                employeeId,
                date: { $gte: from, $lte: to }
            });

            let lateCount = 0;
            let earlyExitCount = 0;
            let halfDayCount = 0;
            let absentCount = 0;
            let overtimeCount = 0;

            for (const record of attendanceRecords) {
                if (record.arrivalStatus === "late") lateCount++;
                if (record.isHalfDay) halfDayCount++;
                if (record.status === "Absent") absentCount++;
                if (record.overtimeHours > 0) overtimeCount++;
            }

            results[employeeId] = {
                employeeName: employee.firstName + " " + (employee.lastName || ""),
                policyName: policy?.name || "None",
                reportingMethod: reportingMethod?.name || "Not Set",
                statistics: {
                    totalDays: attendanceRecords.length,
                    lateCount,
                    halfDayCount,
                    absentCount,
                    overtimeCount,
                    presentCount: attendanceRecords.length - halfDayCount - absentCount
                },
                policyDetails: {
                    lateMarkMinutes: policy?.lateMarkMinutes,
                    earlyExitMinutes: policy?.earlyExitMinutes,
                    autoHalfDayEnabled: policy?.autoHalfDayFromLate || policy?.autoHalfDayFromEarlyExit,
                    overtimeAllowed: policy?.overtimeAllowed,
                    autoAbsentEnabled: policy?.autoAbsentEnabled
                },
                reportingValidation: includeReportingValidation ? {
                    status: reportingMethod?.status,
                    measurementMethod: reportingMethod?.measurementMethod,
                    allowedChannels: reportingMethod?.allowedChannels
                } : null
            };

        } catch (error) {
            results[employeeId] = { error: error.message };
        }
    }

    return results;
}

module.exports = {
    processBulkAttendanceWithPolicy,
    validateMultipleEmployeeAttendance
};
