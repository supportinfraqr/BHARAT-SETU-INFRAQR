const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');
const csv = require('csv-parser');
const fs = require('fs');
const xlsx = require('xlsx');
const moment = require("moment");
const { Readable } = require('stream');
const { getIO, attendanceRoom } = require('../config/socket');
const { sendResponse, handleError } = require('../utils/responce');
const attendanceValidator = require('../utils/attendanceValidator');
const reportingValidator = require('../utils/reportingValidator');
const { applyLastBiometricPunchCheckouts } = require('../utils/biometricPunchService');
const {
    FIXED_ATTENDANCE_STATUSES,
    decisionKey,
    parseLeaveDecisions,
    isLeaveTypeStatus,
    mapAttendanceStatusForDb,
    isEmployeeEligibleForLeaveType,
    resolveLeaveTypeByStatusName,
    findExistingLeaveForDate,
    getLeaveBalanceInfo,
    createOrUpdateLeaveFromBulk,
    normalizeBulkDate
} = require('../utils/bulkAttendanceLeaveHelper');
const { getEmployeeJoiningDate } = require('./leaveController/leaveService');
const { getIstDateString, getIstDayRange } = require('../utils/liveLocationHelper');

const EOD_MAX_LENGTH = 5000;
const EOD_MAX_RANGE_DAYS = 92;



async function sendAttendanceToUser(org_uuid, employeeId, attendanceData, action) {
    let compulsoryWorkTimeMs = 0;
    try {
        const { EmployeeModel, ShiftModel } = await initModels(org_uuid);
        const employee = await EmployeeModel.findById(employeeId).select('shiftId');
        const shift = employee?.shiftId ? await ShiftModel.findById(employee.shiftId) : null;
        const compulsoryMinutes = shift?.compulsoryWorkHours || 0;
        compulsoryWorkTimeMs = compulsoryMinutes * 60 * 1000;
    } catch (prepErr) {
        console.error("attendance socket prep failed:", prepErr);
    }

    // Format time helper
    const formatTime = (ms) => {
        if (ms < 0) ms = 0;
        const totalSeconds = Math.floor(ms / 1000);
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    // Calculate worked time excluding breaks
    const calculateWorkedTime = (checkIn, checkOut, breaks = []) => {
        const now = new Date();
        const checkInDate = new Date(checkIn);
        const checkOutDate = checkOut ? new Date(checkOut) : now;

        const totalBreak = breaks.reduce((sum, brk) => {
            if (brk.breakIn) {
                const breakIn = new Date(brk.breakIn);
                const breakOut = brk.breakOut ? new Date(brk.breakOut) : now;
                return sum + (breakOut - breakIn);
            }
            return sum;
        }, 0);

        let workedTime = checkOutDate - checkInDate - totalBreak;
        return workedTime < 0 ? 0 : workedTime;
    };

    let totalWorkedTime = 0;
    if (attendanceData?.checkIn) {
        totalWorkedTime = calculateWorkedTime(
            attendanceData.checkIn,
            attendanceData.checkOut,
            attendanceData.breaks
        );
    }

    const workedTimeFormatted = formatTime(totalWorkedTime);

    // 🔸 Progress based on compulsoryWorkHours
    const progress = compulsoryWorkTimeMs > 0
        ? Math.min(100, Math.round((totalWorkedTime / compulsoryWorkTimeMs) * 100))
        : 0;

    // Emit to every web and mobile session in this employee's room.
    try {
        const io = getIO();
        const room = attendanceRoom(org_uuid, employeeId);
        if (!room) return;
        const plain = attendanceData?.toObject?.() || attendanceData || {};

        io.to(room).emit("attendance-update", {
            status: "success",
            action: action || plain.trackStatus || null,
            message: "Updated attendance with shift progress",
            data: {
                ...plain,
                workedTimeFormatted,
                totalWorkedTime,
                progress,
            },
        });
    } catch (emitErr) {
        console.error("attendance socket emit failed:", emitErr);
    }
}

exports.sendAttendanceToUser = sendAttendanceToUser;

function parseDateTime(baseDate, input) {
    if (input === null || input === undefined || input === '') return null;

    // ✅ Already Date object
    if (input instanceof Date && !isNaN(input.getTime())) {
        // If it's a pure time Date from Excel (epoch-based), take UTC hours
        // Prefer combining with baseDate when the date part is clearly a dummy epoch date
        const y = input.getUTCFullYear();
        if (y < 1975) {
            const dateStr = moment(baseDate).format("YYYY-MM-DD");
            if (!dateStr || dateStr === "Invalid date") return null;
            const hour = String(input.getUTCHours()).padStart(2, "0");
            const min = String(input.getUTCMinutes()).padStart(2, "0");
            const sec = String(input.getUTCSeconds()).padStart(2, "0");
            const dt = new Date(`${dateStr}T${hour}:${min}:${sec}+05:30`);
            return isNaN(dt.getTime()) ? null : dt;
        }
        return input;
    }

    // ✅ Excel time as fraction of day (raw:true) e.g. 9:00 → 0.375, 18:00 → 0.75
    // Also handles datetime serials with fractional time (e.g. 46327.375)
    const asNumber = typeof input === "number" ? input : Number(String(input).trim());
    if (
        Number.isFinite(asNumber) &&
        (typeof input === "number" || /^\d+(\.\d+)?$/.test(String(input).trim()))
    ) {
        let dayFraction = asNumber;
        if (asNumber >= 1) {
            // Full Excel datetime serial → keep only time portion
            dayFraction = asNumber - Math.floor(asNumber);
        }
        if (dayFraction >= 0 && dayFraction < 1) {
            const totalSeconds = Math.round(dayFraction * 24 * 60 * 60);
            const h = Math.floor(totalSeconds / 3600) % 24;
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;

            const dateStr = moment(baseDate).format("YYYY-MM-DD");
            if (!dateStr || dateStr === "Invalid date") return null;

            const hour = String(h).padStart(2, "0");
            const min = String(m).padStart(2, "0");
            const sec = String(s).padStart(2, "0");
            const dt = new Date(`${dateStr}T${hour}:${min}:${sec}+05:30`);
            return isNaN(dt.getTime()) ? null : dt;
        }
    }

    // ✅ ISO string (2026-01-15T09:00:00.000Z)
    if (typeof input === "string" && input.includes("T")) {
        const iso = new Date(input);
        if (!isNaN(iso.getTime())) return iso;
    }

    // ✅ HH:mm or H:mm or HH:mm:ss (also "9:00", "09:00 AM")
    if (typeof input === "string" && input.includes(":")) {
        let timeStr = input.trim();
        let ampm = null;
        const ampmMatch = timeStr.match(/\s*(AM|PM)$/i);
        if (ampmMatch) {
            ampm = ampmMatch[1].toUpperCase();
            timeStr = timeStr.replace(/\s*(AM|PM)$/i, "").trim();
        }

        const parts = timeStr.split(":");
        if (parts.length < 2) return null;

        let [h, m, s = "00"] = parts.map(Number);

        if ([h, m, s].some(v => isNaN(v))) return null;

        if (ampm === "PM" && h < 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;

        if (
            h < 0 || h > 23 ||
            m < 0 || m > 59 ||
            s < 0 || s > 59
        ) {
            return null;
        }

        const dateStr = moment(baseDate).format("YYYY-MM-DD");
        if (!dateStr || dateStr === "Invalid date") return null;

        const hour = String(h).padStart(2, "0");
        const min = String(m).padStart(2, "0");
        const sec = String(s).padStart(2, "0");
        const dt = new Date(`${dateStr}T${hour}:${min}:${sec}+05:30`);
        return isNaN(dt.getTime()) ? null : dt;
    }

    return null;
}

// Moved to utils/attendanceValidator.js: calculateArrivalStatus -> checkLateStatus

function calculateNetWorkedHours(
    checkIn,
    checkOut,
    breaks = [],
    excludeBreak = false
) {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
        return {
            grossHours: 0,
            breakHours: 0,
            netHours: 0,
            netMinutes: 0
        };
    }

    const grossMs = checkOut - checkIn;
    const grossHours = grossMs / (1000 * 60 * 60);

    let breakMs = 0;

    for (const b of breaks) {
        if (
            b.breakIn instanceof Date &&
            b.breakOut instanceof Date &&
            b.breakOut > b.breakIn
        ) {
            breakMs += (b.breakOut - b.breakIn);
        }
    }

    const breakHours = breakMs / (1000 * 60 * 60);

    let netHours = excludeBreak
        ? grossHours - breakHours
        : grossHours;

    netHours = Math.max(netHours, 0);

    return {
        grossHours: Number(grossHours.toFixed(2)),
        breakHours: Number(breakHours.toFixed(2)),
        netHours: Number(netHours.toFixed(2)),
        netMinutes: Math.round(netHours * 60)
    };
}


// ========== VALIDATION FUNCTIONS NOW IN UTILS ==========
// See: utils/reportingValidator.js for reporting method validation
// See: utils/attendanceValidator.js for attendance policy validation

function getWeekOfMonth(date) {
    const d = new Date(date);
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    return Math.ceil((d.getDate() + firstDay.getDay()) / 7);
}

function getDayName(date) {
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(date).getDay()];
}

function getAssignedShiftDoc(sa) {
    const shift = sa?.shiftId && typeof sa.shiftId === "object" && !Array.isArray(sa.shiftId)
        ? sa.shiftId
        : sa?.shift;
    return shift?.weeklyOff ? shift : null;
}

function isShiftAssignActiveOn(sa, dayMoment) {
    return moment(sa.effectiveFrom).isSameOrBefore(dayMoment, "day") &&
        (!sa.effectiveTo || moment(sa.effectiveTo).isSameOrAfter(dayMoment, "day"));
}

function pickShiftForDay(assignments, dayMoment, fallbackShift) {
    const matches = (assignments || [])
        .filter(sa => isShiftAssignActiveOn(sa, dayMoment) && getAssignedShiftDoc(sa))
        .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom));

    return getAssignedShiftDoc(matches[0]) || (fallbackShift?.weeklyOff ? fallbackShift : null);
}

function generateWeeklyOffs(assignments, startDate, endDate) {
    const weeklyOffDates = [];
    const seen = new Set();
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = new Date(d.getTime());
        const active = (assignments || [])
            .filter(a => {
                if (!a.shift?.weeklyOff) return false;
                const from = new Date(a.effectiveFrom);
                const to = a.effectiveTo ? new Date(a.effectiveTo) : end;
                return from <= day && day <= to;
            })
            .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom));

        const shift = active[0]?.shift;
        if (!shift?.weeklyOff) continue;

        const weekNo = getWeekOfMonth(day);
        const dayName = getDayName(day);
        const weekKey =
            weekNo === 1 ? "firstWeek" :
                weekNo === 2 ? "secondWeek" :
                    weekNo === 3 ? "thirdWeek" :
                        weekNo === 4 ? "fourthWeek" : "fifthWeek";

        const offDays = shift.weeklyOff?.[weekKey]?.days || [];
        if (!offDays.includes(dayName)) continue;

        const date = day.toISOString().slice(0, 10);
        if (seen.has(date)) continue;
        seen.add(date);
        weeklyOffDates.push({ date, day: dayName });
    }

    return weeklyOffDates;
}

function summarizeShiftForTracker(assignments, rangeStart) {
    const list = (assignments || []).slice().sort(
        (a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom)
    );
    const active = list.find((assignment) => {
        const start = new Date(assignment.effectiveFrom);
        const end = assignment.effectiveTo ? new Date(assignment.effectiveTo) : null;
        return start <= rangeStart && (!end || end >= rangeStart);
    }) || list[0];
    const shift = active?.shift;
    if (!shift) return null;

    const days = new Set();
    ["firstWeek", "secondWeek", "thirdWeek", "fourthWeek", "fifthWeek"].forEach((week) => {
        (shift.weeklyOff?.[week]?.days || []).forEach((day) => days.add(day));
    });

    return {
        name: shift.name || "",
        startTime: shift.startTime || "",
        endTime: shift.endTime || "",
        compulsoryWorkHours: Number(shift.compulsoryWorkHours) || 0,
        breakDuration: Number(shift.breakDuration) || 0,
        weekOffDays: Array.from(days)
    };
}

function workedOnWeeklyOff(record) {
    if (!record) return false;
    if (record.checkIn) return true;
    const status = String(record.status || "").toLowerCase().replace(/\s+/g, "");
    return status === "present" || status === "halfday" || status === "onduty";
}

exports.addAttendance = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        if (!req.userId)
            return sendResponse(res, 401, false, "Unauthorized");

        const {
            AttendanceModel,
            EmployeeModel,
            ShiftModel,
            AttendancePolicyModel
        } = await initModels(org_uuid);

        const {
            employeeId,
            date,
            checkIn,
            checkOut,
            breaks = [],
            remarks
        } = req.body;

        // ---------- BASIC VALIDATION ----------
        if (!employeeId || !date || !checkIn || !checkOut)
            return sendResponse(res, 400, false, "Required fields missing");

        const employee = await EmployeeModel.findById(employeeId);
        if (!employee)
            return sendResponse(res, 404, false, "Employee not found");

        const [shift, policy] = await Promise.all([
            ShiftModel.findById(employee.shiftId),
            AttendancePolicyModel.findById(employee.attendancePolicyId)
        ]);

        const normalizedDate = moment(date).format("YYYY-MM-DD");

        // ---------- DUPLICATE CHECK ----------
        const exists = await AttendanceModel.findOne({
            employeeId,
            date: normalizedDate
        });
        if (exists)
            return sendResponse(res, 400, false, "Attendance already exists");

        // ---------- PARSE TIMES ----------
        const checkInTime = parseDateTime(normalizedDate, checkIn);
        const checkOutTime = parseDateTime(normalizedDate, checkOut);

        if (!checkInTime || !checkOutTime || checkOutTime <= checkInTime)
            return sendResponse(res, 400, false, "Invalid check-in/check-out time");

        // ---------- PARSE BREAKS ----------
        const parsedBreaks = [];

        for (const br of breaks) {
            if (!br.breakIn || !br.breakOut) continue;

            const bi = parseDateTime(normalizedDate, br.breakIn);
            const bo = parseDateTime(normalizedDate, br.breakOut);

            if (!bi || !bo || bo <= bi)
                return sendResponse(res, 400, false, "Invalid break time");

            parsedBreaks.push({ breakIn: bi, breakOut: bo });
        }

        // ---------- HOURS CALCULATION ----------
        const { grossHours, breakHours, netHours } =
            calculateNetWorkedHours(
                checkInTime,
                checkOutTime,
                parsedBreaks,
                shift?.excludeBreakFromWorkingHours
            );

        if (netHours <= 0 || netHours > 24)
            return sendResponse(res, 400, false, "Invalid working hours");

        // ========== VALIDATE AGAINST POLICY ==========
        const shiftStartTimeObj = shift?.startTime ? parseDateTime(normalizedDate, shift.startTime) : null;
        const shiftEndTimeObj = shift?.endTime ? parseDateTime(normalizedDate, shift.endTime) : null;

        const validationResult = attendanceValidator.validateAttendanceAgainstPolicy({
            checkInTime,
            checkOutTime,
            shiftStartTime: shiftStartTimeObj,
            shiftEndTime: shiftEndTimeObj,
            policy,
            shift,
            breaks: parsedBreaks
        });

        const workedMinutes = validationResult.workedMinutes;
        const requiredMinutes = validationResult.requiredMinutes;

        // ---------- SAVE ----------
        const attendance = await AttendanceModel.create({
            employeeId,
            date: normalizedDate,
            checkIn: checkInTime,
            checkOut: checkOutTime,
            breaks: parsedBreaks,
            totalHoursWorked: netHours,
            arrivalStatus: validationResult.lateStatus.isLate ? "late" : "onTime",
            status: validationResult.finalStatus,
            isHalfDay: validationResult.halfDayStatus.isHalfDay,
            overtimeHours: Math.max(0, validationResult.overtimeStatus.overtimeMinutes / 60),
            remarks: remarks || `[${validationResult.halfDayStatus.reason}]`,
            createdBy: req.userId
        });

        return sendResponse(res, 201, true, "Attendance added successfully", {
            attendanceId: attendance._id,
            grossHours,
            breakHours,
            netHours,
            arrivalStatus: attendance.arrivalStatus,
            status: attendance.status,
            isHalfDay: attendance.isHalfDay,
            overtimeHours: attendance.overtimeHours,
            validationDetails: {
                isLate: validationResult.lateStatus.isLate,
                minutesLate: validationResult.lateStatus.minutesLate,
                isEarlyExit: validationResult.earlyExitStatus.isEarlyExit,
                minutesEarly: validationResult.earlyExitStatus.minutesEarly,
                halfDayReason: validationResult.halfDayStatus.reason
            }
        });

    } catch (err) {
        console.error("addAttendance error:", err);
        return handleError(res, err);
    }
};

exports.getAttendanceById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, 'org_uuid not found');
        }
        const { AttendanceModel } = await initModels(org_uuid);

        const { attendanceId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
            return sendResponse(res, 400, false, 'Invalid attendance ID');
        }

        const attendanceRecord = await AttendanceModel.findById(attendanceId).populate('employeeId');

        if (!attendanceRecord) {
            return sendResponse(res, 404, false, 'Attendance record not found');
        }

        return sendResponse(res, 200, true, 'Attendance record fetched successfully', attendanceRecord);
    } catch (error) {
        return handleError(res, error);
    }
};

exports.updateAttendance = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const {
            AttendanceModel,
            EmployeeModel,
            ShiftModel,
            AttendancePolicyModel
        } = await initModels(org_uuid);

        const { attendanceId } = req.params;
        const { checkIn, checkOut, addBreak, updateBreak, breaks, status, remarks } = req.body;

        const attendance = await AttendanceModel.findById(attendanceId);
        if (!attendance)
            return sendResponse(res, 404, false, "Attendance not found");

        const employee = await EmployeeModel.findById(attendance.employeeId);
        const shift = employee?.shiftId
            ? await ShiftModel.findById(employee.shiftId)
            : null;
        const attendancePolicy = employee?.attendancePolicyId
            ? await AttendancePolicyModel.findById(employee.attendancePolicyId)
            : null;

        const date = moment(attendance.date).format("YYYY-MM-DD");

        // ---------- CHECK-IN ----------
        if (Object.prototype.hasOwnProperty.call(req.body, "checkIn")) {
            if (!checkIn) {
                attendance.checkIn = null;
                attendance.arrivalStatus = "onTime";
            } else {
                const parsed = parseDateTime(date, checkIn);
                if (!parsed)
                    return sendResponse(res, 400, false, "Invalid check-in time");

                attendance.checkIn = parsed;

                const shiftStartTimeObj = shift?.startTime ? parseDateTime(date, shift.startTime) : null;
                const lateStatus = attendanceValidator.checkLateStatus({
                    checkInTime: parsed,
                    shiftStartTime: shiftStartTimeObj,
                    lateMarkMinutes: attendancePolicy?.lateMarkMinutes || 0
                });

                attendance.arrivalStatus = lateStatus.isLate ? "late" : "onTime";
            }
        }

        // ---------- CHECK-OUT ----------
        if (Object.prototype.hasOwnProperty.call(req.body, "checkOut")) {
            if (!checkOut) {
                attendance.checkOut = null;
            } else {
                const parsed = parseDateTime(date, checkOut);
                if (!parsed)
                    return sendResponse(res, 400, false, "Invalid check-out time");

                attendance.checkOut = parsed;
            }
        }

        if (
            attendance.checkIn &&
            attendance.checkOut &&
            attendance.checkOut <= attendance.checkIn
        ) {
            return sendResponse(res, 400, false, "Invalid time range");
        }

        // ---------- BREAKS (full list from the edit card, including deletions) ----------
        if (Array.isArray(breaks)) {
            const rebuilt = [];
            for (const item of breaks) {
                const bi = item?.breakIn ? parseDateTime(date, item.breakIn) : null;
                const bo = item?.breakOut ? parseDateTime(date, item.breakOut) : null;
                if ((item?.breakIn && !bi) || (item?.breakOut && !bo)) {
                    return sendResponse(res, 400, false, "Invalid break time");
                }
                if (bi && bo && bo <= bi) {
                    return sendResponse(res, 400, false, "Invalid break time");
                }
                if (!bi && !bo) continue;
                rebuilt.push({ breakIn: bi, breakOut: bo });
            }
            attendance.breaks.splice(0, attendance.breaks.length);
            rebuilt.forEach((item) => attendance.breaks.push(item));
            attendance.markModified("breaks");
        }

        // ---------- ADD BREAK ----------
        else if (addBreak?.breakIn && addBreak?.breakOut) {
            const bi = parseDateTime(date, addBreak.breakIn);
            const bo = parseDateTime(date, addBreak.breakOut);

            if (!bi || !bo || bo <= bi)
                return sendResponse(res, 400, false, "Invalid break time");

            attendance.breaks.push({ breakIn: bi, breakOut: bo });
        }

        // ---------- UPDATE BREAK ----------
        if (updateBreak?.breakId) {
            const br = attendance.breaks.id(updateBreak.breakId);
            if (!br)
                return sendResponse(res, 404, false, "Break not found");

            if (updateBreak.breakIn)
                br.breakIn = parseDateTime(date, updateBreak.breakIn);

            if (updateBreak.breakOut)
                br.breakOut = parseDateTime(date, updateBreak.breakOut);

            if (br.breakIn && br.breakOut && br.breakOut <= br.breakIn)
                return sendResponse(res, 400, false, "Invalid break range");
        }

        // ---------- WORK HOURS & POLICY VALIDATION ----------
        if (attendance.checkIn && attendance.checkOut) {
            const { netMinutes, netHours } = calculateNetWorkedHours(
                attendance.checkIn,
                attendance.checkOut,
                attendance.breaks,
                shift?.excludeBreakFromWorkingHours
            );

            attendance.totalHoursWorked = netHours;

            // ========== VALIDATE AGAINST POLICY IF NOT ADMIN OVERRIDE ==========
            if (!status) {
                const shiftStartTimeObj = shift?.startTime ? parseDateTime(date, shift.startTime) : null;
                const shiftEndTimeObj = shift?.endTime ? parseDateTime(date, shift.endTime) : null;

                const validationResult = attendanceValidator.validateAttendanceAgainstPolicy({
                    checkInTime: attendance.checkIn,
                    checkOutTime: attendance.checkOut,
                    shiftStartTime: shiftStartTimeObj,
                    shiftEndTime: shiftEndTimeObj,
                    policy: attendancePolicy,
                    shift,
                    breaks: attendance.breaks
                });

                attendance.status = validationResult.finalStatus;
                attendance.isHalfDay = validationResult.halfDayStatus.isHalfDay;
                attendance.overtimeHours = Math.max(0, validationResult.overtimeStatus.overtimeMinutes / 60);
                attendance.remarks = `${remarks || ''} [${validationResult.halfDayStatus.reason}]`.trim();
            }
        }

        // ---------- ADMIN OVERRIDE ----------
        if (status) {
            attendance.status = status;
            attendance.remarks = remarks ? `${remarks} [admin_override]` : "[admin_override]";
        }

        if (remarks && !status) {
            attendance.remarks = remarks;
        }

        await attendance.save();

        // ========== EMIT UPDATE VIA SOCKET ==========
        if (employee?._id) {
            await sendAttendanceToUser(org_uuid, employee._id, attendance);
        }

        return sendResponse(
            res,
            200,
            true,
            "Attendance updated successfully",
            {
                attendanceId: attendance._id,
                status: attendance.status,
                isHalfDay: attendance.isHalfDay,
                overtimeHours: attendance.overtimeHours,
                totalHoursWorked: attendance.totalHoursWorked,
                arrivalStatus: attendance.arrivalStatus,
                remarks: attendance.remarks
            }
        );

    } catch (err) {
        console.error("updateAttendance error:", err);
        return handleError(res, err);
    }
};

exports.deleteAttendance = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, 'org_uuid not found');
        }
        const { AttendanceModel } = await initModels(org_uuid);

        const { attendanceId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
            return sendResponse(res, 400, false, 'Invalid attendance ID');
        }

        const deletedAttendance = await AttendanceModel.findByIdAndDelete(attendanceId);

        if (!deletedAttendance) {
            return sendResponse(res, 404, false, 'Attendance record not found');
        }

        return sendResponse(res, 200, true, 'Attendance record deleted successfully');
    } catch (error) {
        return handleError(res, error);
    }
};

exports.getAttendanceByDateRange = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { AttendanceModel, HolidayModel, EmployeeModel, ShiftAssignModel, LeaveRequestModel } = await initModels(org_uuid);

        const { employeeId } = req.params;
        const { organizationId, startDate, endDate } = req.query;

        // ---------- VALIDATIONS ----------
        if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
            return sendResponse(res, 400, false, "Invalid employee ID");
        }

        if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
            return sendResponse(res, 400, false, "Invalid organization ID");
        }

        if (!startDate || !endDate) {
            return sendResponse(res, 400, false, "startDate and endDate are required");
        }

        const from = new Date(startDate);
        const to = new Date(endDate);
        to.setHours(23, 59, 59, 999); // include full end day

        // ---------- COMMON DATE FILTER ----------
        const dateFilter = {
            date: { $gte: from, $lte: to }
        };

        // ---------- FETCH DATA PARALLEL ----------
        const [attendanceRecords, holidayRecords, shiftAssignments, leaveRecords, employee] = await Promise.all([
            AttendanceModel.aggregate([
                {
                    $match: {
                        employeeId:new mongoose.Types.ObjectId(employeeId),
                        ...dateFilter
                    }
                },
                {
                    $project: {
                        employeeId: 1,
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        status: 1,
                        checkIn: 1,
                        checkOut: 1,
                        totalHoursWorked: 1,
                        arrivalStatus: 1,
                        isHalfDay: 1,
                        remarks: 1,
                        breaks: 1,
                        eodReport: 1,
                        eodSkipped: 1
                    }
                },
                { $sort: { date: 1 } }
            ]),

            HolidayModel.find({
                $or: [{ organizationId }, { location: organizationId }],
                status: { $ne: "Inactive" },
                ...dateFilter
            })
                .sort({ date: 1 })
                .lean(),

            // Fetch shift assignments for weekoff calculation
            ShiftAssignModel.find({
                employeeId,
                effectiveFrom: { $lte: to },
                $or: [
                    { effectiveTo: { $gte: from } },
                    { effectiveTo: null },
                    { effectiveTo: { $exists: false } }
                ]
            })
                .populate("shiftId")
                .sort({ effectiveFrom: -1 })
                .lean(),

            // Fetch leave requests
            LeaveRequestModel.find({
                employeeId,
                status: "Approved",
                startDate: { $lte: to },
                endDate: { $gte: from }
            })
                .populate("leaveTypeId", "leaveTypeName")
                .select("startDate endDate leaveTypeId leaveDurationType leaveDays")
                .lean(),

            EmployeeModel.findById(employeeId).populate("shiftId").select("shiftId").lean()
        ]);

        // ---------- CALCULATE WEEKOFFS ----------
        const weekOffDates = [];
        const fallbackShift = employee?.shiftId && typeof employee.shiftId === "object"
            ? employee.shiftId
            : null;

        for (
            let m = moment(from);
            m.isSameOrBefore(to);
            m.add(1, "day")
        ) {
            const dayName = m.format("dddd"); // Sunday, Monday...
            const weekOfMonth = Math.ceil(m.date() / 7); // 1-5
            const shift = pickShiftForDay(shiftAssignments, m, fallbackShift);

            if (!shift?.weeklyOff) continue;

            const weeklyOff =
                shift.weeklyOff?.[
                    ["firstWeek", "secondWeek", "thirdWeek", "fourthWeek", "fifthWeek"][weekOfMonth - 1]
                ]?.days || [];

            if (weeklyOff.includes(dayName)) {
                weekOffDates.push(m.format("YYYY-MM-DD"));
            }
        }

        return sendResponse(res, 200, true, "Records fetched successfully", {
            attendanceRecords,
            holidayRecords,
            weekOffDates,
            leaveRecords
        });

    } catch (error) {
        console.error("getAttendanceByDateRange error:", error);
        return handleError(res, error);
    }
};

// Bulk add attendance
exports.bulkAddAttendance = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const models = await initModels(org_uuid);

        if (!req.file)
            return sendResponse(res, 400, false, "No file uploaded");

        const leaveDecisions = parseLeaveDecisions(req.body?.leaveDecisions);
        const options = {
            leaveDecisions,
            approverId: req.empId || req.userId || req.body?.approverId || null,
            organizationId: req.body?.organizationId || null
        };

        let records = [];

        // CSV
        if (req.file.mimetype === "text/csv") {
            const bufferStream = new Readable();
            bufferStream.push(req.file.buffer);
            bufferStream.push(null);

            bufferStream
                .pipe(csv())
                .on("data", row => records.push(row))
                .on("end", async () => {
                    await processBulkAttendance(records, models, res, options);
                });
        }
        // EXCEL
        else {
            const workbook = xlsx.read(req.file.buffer, { type: "buffer", cellDates: false });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            // raw:true keeps Excel dates as serial numbers → normalizeBulkDate converts safely
            records = xlsx.utils.sheet_to_json(sheet, { raw: true, defval: "" });
            await processBulkAttendance(records, models, res, options);
        }

    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal server error");
    }
};

async function processBulkAttendance(records, models, res, options = {}) {
    const {
        AttendanceModel,
        EmployeeModel,
        ShiftModel,
        AttendancePolicyModel,
        LeaveNameModel,
        LeaveTypeModel,
        LeaveRequestModel,
        LeaveReasonModel,
        HolidayModel
    } = models;

    const { leaveDecisions = [], approverId = null, organizationId = null } = options;

    const decisionMap = new Map();
    for (const d of leaveDecisions) {
        const key = decisionKey(
            d.employeeId,
            d.date,
            d.leaveTypeName || d.status
        );
        decisionMap.set(key, d);
    }

    const timeRequiredStatuses = [
        "Present", "On Duty", "paid-halfDay", "Unpaid-halfDay"
    ];

    const errors = [];
    const successes = [];
    const leaveConfirmations = [];
    const weekoffOverrides = [];
    const scanErrors = [];

    // ---------- PASS 1: validate leave rows & collect confirmations (no writes) ----------
    for (const row of records) {
        try {
            let { employeeId, date, status } = row;
            if (!employeeId || !date || !status) continue;

            status = status.toString().trim();
            if (!isLeaveTypeStatus(status)) continue;

            const normalizedDate = normalizeBulkDate(date);
            if (!normalizedDate) throw new Error(`Invalid date "${date}"`);

            if (status === 'Leave' || status === 'Lwp') {
                throw new Error(
                    "Please specify leave type name in Status column (e.g. Casual Leave, Sick Leave)"
                );
            }

            const employee = await EmployeeModel.findOne({
                $or: [{ uniqueId: employeeId }, { customId: employeeId }]
            });
            if (!employee) throw new Error("Employee not found");

            const resolved = await resolveLeaveTypeByStatusName({
                status,
                LeaveNameModel,
                LeaveTypeModel,
                organizationId: organizationId || employee.organizationId
            });
            if (!resolved) throw new Error(`Leave type "${status}" not found`);

            const { leaveType, leaveTypeName } = resolved;

            if (!isEmployeeEligibleForLeaveType(leaveType, employee)) {
                throw new Error(
                    `Leave type "${leaveTypeName}" is not assigned to employee ${employeeId}`
                );
            }

            const joiningDate = getEmployeeJoiningDate(employee);
            let balanceInfo;
            try {
                balanceInfo = await getLeaveBalanceInfo({
                    LeaveRequestModel,
                    leaveType,
                    employeeId: employee._id,
                    leaveTypeId: leaveType._id,
                    requestedDays: 1,
                    joiningDate,
                    requestedStartDate: normalizedDate,
                    requestedEndDate: normalizedDate
                });
            } catch (balanceErr) {
                throw new Error(balanceErr.message || "Insufficient leave balance");
            }

            const existingLeave = await findExistingLeaveForDate({
                LeaveRequestModel,
                employeeId: employee._id,
                leaveTypeId: leaveType._id,
                date: normalizedDate
            });

            const dKey = decisionKey(employeeId, normalizedDate, leaveTypeName);
            if (decisionMap.has(dKey)) continue;

            leaveConfirmations.push({
                employeeId,
                employeeMongoId: employee._id,
                employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
                date: normalizedDate,
                leaveTypeId: leaveType._id,
                leaveTypeName,
                existingStatus: existingLeave
                    ? (existingLeave.status === 'Pending' ? 'Applied' : existingLeave.status)
                    : null,
                leaveBalance: balanceInfo.remaining,
                needsDecision: !existingLeave,
                leaveRequestId: existingLeave?._id || null
            });
        } catch (err) {
            scanErrors.push({
                employeeId: row.employeeId || "NA",
                date: normalizeBulkDate(row.date) || row.date || "NA",
                message: err.message
            });
        }
    }

    // Hard leave validation failures — stop before any writes
    if (scanErrors.length) {
        return res.status(200).json({
            success: false,
            needsLeaveConfirmation: false,
            message: "Leave validation failed. Upload not processed.",
            data: { successes: [], errors: scanErrors, leaveConfirmations: [] }
        });
    }

    // Wait for Applied/Approved (or acknowledge) before writing anything
    if (leaveConfirmations.length) {
        return res.status(200).json({
            success: false,
            needsLeaveConfirmation: true,
            message: "Leave confirmation required before completing upload",
            data: {
                successes: [],
                errors: [],
                leaveConfirmations,
                weekoffOverrides: []
            }
        });
    }

    // ---------- PASS 2: commit all rows ----------
    for (const row of records) {
        try {
            let { employeeId, date, checkIn, checkOut, status, remarks } = row;

            if (!employeeId || !date || !status)
                throw new Error("Required fields missing");

            status = status.toString().trim();
            const normalizedDate = normalizeBulkDate(date);
            if (!normalizedDate) throw new Error(`Invalid date "${date}"`);

            const employee = await EmployeeModel.findOne({
                $or: [{ uniqueId: employeeId }, { customId: employeeId }]
            });

            if (!employee) throw new Error("Employee not found");

            const shift = await ShiftModel.findById(employee.shiftId);
            const policy = await AttendancePolicyModel.findById(employee.attendancePolicyId);
            const isWeekOffDay = isWeeklyOff(new Date(normalizedDate), shift);

            let holidayWeekOff = false;
            if (HolidayModel) {
                const holiday = await HolidayModel.findOne({
                    date: {
                        $gte: moment(normalizedDate).startOf('day').toDate(),
                        $lte: moment(normalizedDate).endOf('day').toDate()
                    },
                    type: 'weekoff'
                }).lean();
                holidayWeekOff = !!holiday;
            }

            const weekOff = isWeekOffDay || holidayWeekOff;
            const leaveRow = isLeaveTypeStatus(status);

            /* ================= LEAVE TYPE FLOW ================= */
            if (leaveRow) {
                if (status === 'Leave' || status === 'Lwp') {
                    throw new Error(
                        "Please specify leave type name in Status column (e.g. Casual Leave, Sick Leave)"
                    );
                }

                const resolved = await resolveLeaveTypeByStatusName({
                    status,
                    LeaveNameModel,
                    LeaveTypeModel,
                    organizationId: organizationId || employee.organizationId
                });

                if (!resolved) {
                    throw new Error(`Leave type "${status}" not found`);
                }

                const { leaveType, leaveTypeName } = resolved;

                if (!isEmployeeEligibleForLeaveType(leaveType, employee)) {
                    throw new Error(
                        `Leave type "${leaveTypeName}" is not assigned to employee ${employeeId}`
                    );
                }

                const joiningDate = getEmployeeJoiningDate(employee);
                const existingLeave = await findExistingLeaveForDate({
                    LeaveRequestModel,
                    employeeId: employee._id,
                    leaveTypeId: leaveType._id,
                    date: normalizedDate
                });

                const dKey = decisionKey(employeeId, normalizedDate, leaveTypeName);
                const decision = decisionMap.get(dKey);

                let action = 'Applied';
                if (decision?.action === 'Approved') action = 'Approved';
                else if (decision?.action === 'Applied') action = 'Applied';
                else if (existingLeave) {
                    action = existingLeave.status === 'Approved' ? 'Approved' : 'Applied';
                }

                if (!existingLeave || (existingLeave.status === 'Pending' && action === 'Approved')) {
                    try {
                        await getLeaveBalanceInfo({
                            LeaveRequestModel,
                            leaveType,
                            employeeId: employee._id,
                            leaveTypeId: leaveType._id,
                            requestedDays: 1,
                            joiningDate
                        });
                    } catch (balanceErr) {
                        throw new Error(balanceErr.message || "Insufficient leave balance");
                    }
                }

                const leaveResult = await createOrUpdateLeaveFromBulk({
                    LeaveRequestModel,
                    LeaveReasonModel,
                    leaveType,
                    employee,
                    date: normalizedDate,
                    action,
                    leaveTypeName,
                    remarks,
                    approverId
                });

                const finalDbStatus = mapAttendanceStatusForDb(status, true);
                const finalRemarks = `${remarks || ''} [Leave: ${leaveTypeName}] [${leaveResult.status}]`.trim();

                const duplicate = await AttendanceModel.findOne({
                    employeeId: employee._id,
                    date: normalizedDate
                });

                if (duplicate) {
                    duplicate.status = finalDbStatus;
                    duplicate.isHalfDay = false;
                    duplicate.remarks = finalRemarks;
                    duplicate.reportingChannel = 'excel';
                    duplicate.checkIn = null;
                    duplicate.checkOut = null;
                    await duplicate.save();
                } else {
                    await AttendanceModel.create({
                        employeeId: employee._id,
                        date: normalizedDate,
                        checkIn: null,
                        checkOut: null,
                        totalHoursWorked: 0,
                        arrivalStatus: 'onTime',
                        status: finalDbStatus,
                        isHalfDay: false,
                        overtimeHours: 0,
                        remarks: finalRemarks,
                        reportingChannel: 'excel',
                        trackStatus: 'null'
                    });
                }

                successes.push({
                    employeeId,
                    date: normalizedDate,
                    status: leaveTypeName,
                    leaveStatus: leaveResult.status,
                    leaveRequestId: leaveResult.leaveRequest?._id,
                    weekOffOverridden: false
                });
                continue;
            }

            /* ================= FIXED ATTENDANCE STATUSES ================= */
            if (!FIXED_ATTENDANCE_STATUSES.has(status)) {
                throw new Error(
                    `Invalid status "${status}". Use Present/Absent/Leave type name (e.g. Casual Leave)`
                );
            }

            let checkInTime = null;
            let checkOutTime = null;
            let arrivalStatus = "onTime";
            let totalHoursWorked = 0;
            let isHalfDay = false;
            let overtimeHours = 0;
            let finalStatus = mapAttendanceStatusForDb(status, false);
            let finalRemarks = remarks || "";
            let weekOffOverridden = false;

            // Present on weekoff → override weekoff and mark Present
            if (status === "Present" && weekOff) {
                weekOffOverridden = true;
                finalRemarks = `${finalRemarks} [weekoff_override]`.trim();
            }

            if (timeRequiredStatuses.includes(status)) {
                checkInTime = parseDateTime(normalizedDate, checkIn);
                checkOutTime = parseDateTime(normalizedDate, checkOut);

                if (!checkInTime || !checkOutTime || checkOutTime <= checkInTime)
                    throw new Error("Invalid checkIn/checkOut time");

                const shiftStartTimeObj = shift?.startTime ? parseDateTime(normalizedDate, shift.startTime) : null;
                const shiftEndTimeObj = shift?.endTime ? parseDateTime(normalizedDate, shift.endTime) : null;

                const validationResult = attendanceValidator.validateAttendanceAgainstPolicy({
                    checkInTime,
                    checkOutTime,
                    shiftStartTime: shiftStartTimeObj,
                    shiftEndTime: shiftEndTimeObj,
                    policy,
                    shift,
                    breaks: []
                });

                totalHoursWorked = validationResult.workedMinutes / 60;
                arrivalStatus = validationResult.lateStatus.isLate ? "late" : "onTime";
                isHalfDay = validationResult.halfDayStatus.isHalfDay;
                overtimeHours = Math.max(0, validationResult.overtimeStatus.overtimeMinutes / 60);

                if (status === "Present" || status === "On Duty") {
                    finalStatus = mapAttendanceStatusForDb(validationResult.finalStatus, false);
                }

                finalRemarks = `${finalRemarks} [${validationResult.halfDayStatus.reason}]`.trim();
            }

            const duplicate = await AttendanceModel.findOne({
                employeeId: employee._id,
                date: normalizedDate
            });

            // Excel bulk upload can update existing day (e.g. Absent → Present)
            if (duplicate) {
                const prevStatus = duplicate.status;
                duplicate.checkIn = checkInTime;
                duplicate.checkOut = checkOutTime;
                duplicate.totalHoursWorked = totalHoursWorked;
                duplicate.arrivalStatus = arrivalStatus;
                duplicate.status = finalStatus;
                duplicate.isHalfDay = isHalfDay;
                duplicate.overtimeHours = overtimeHours;
                duplicate.remarks = `${finalRemarks} [excel_update:${prevStatus}->${finalStatus}]`.trim();
                duplicate.reportingChannel = 'excel';
                duplicate.trackStatus = checkOutTime ? "checkOut" : (checkInTime ? "checkIn" : "null");
                await duplicate.save();
            } else {
                await AttendanceModel.create({
                    employeeId: employee._id,
                    date: normalizedDate,
                    checkIn: checkInTime,
                    checkOut: checkOutTime,
                    totalHoursWorked,
                    arrivalStatus,
                    status: finalStatus,
                    isHalfDay,
                    overtimeHours,
                    remarks: finalRemarks,
                    reportingChannel: 'excel',
                    trackStatus: checkOutTime ? "checkOut" : (checkInTime ? "checkIn" : "null")
                });
            }

            if (weekOffOverridden) {
                weekoffOverrides.push({ employeeId, date: normalizedDate });
            }

            successes.push({
                employeeId,
                date: normalizedDate,
                status: finalStatus,
                isHalfDay,
                arrivalStatus,
                totalHoursWorked: Number(totalHoursWorked.toFixed(2)),
                overtimeHours: Number(overtimeHours.toFixed(2)),
                weekOffOverridden,
                updated: !!duplicate
            });

        } catch (err) {
            errors.push({
                employeeId: row.employeeId || "NA",
                date: normalizeBulkDate(row.date) || row.date || "NA",
                message: err.message
            });
        }
    }

    return res.status(errors.length ? 207 : 201).json({
        success: errors.length === 0,
        needsLeaveConfirmation: false,
        message: errors.length
            ? "Partial success in bulk attendance upload"
            : "Bulk attendance uploaded successfully",
        data: { successes, errors, weekoffOverrides }
    });
}

exports.getAllEmployeesAttendanceByDateRange = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const {
            AttendanceModel,
            HolidayModel,
            EmployeeModel,
            ShiftAssignModel,
            ShiftModel,
            LeaveRequestModel
        } = await initModels(org_uuid);

        const { startDate, endDate, orgId, search, page = 1, limit = 10, teamOnly } = req.query;

        if (!startDate || !endDate || !orgId)
            return sendResponse(res, 400, false, "startDate, endDate & orgId required");

        const from = new Date(startDate);
        const to = new Date(endDate);
        to.setHours(23, 59, 59, 999);

        const skip = (page - 1) * limit;

        const isTeamOnly = String(teamOnly).toLowerCase() === 'true';
        if (isTeamOnly && !req.empId) {
            return sendResponse(res, 400, false, "Logged-in employee not found for team view");
        }

        /* ================= EMPLOYEES ================= */
        const empQuery = {
            organizationId: orgId,
            status: { $ne: "Inactive" },
            ...(isTeamOnly && { reportingManagerId: req.empId }),
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

        const [employees, totalEmployees] = await Promise.all([
            EmployeeModel.find(empQuery)
                .select("_id firstName lastName email uniqueId customId")
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            EmployeeModel.countDocuments(empQuery)
        ]);

        const employeeIds = employees.map(e => e._id);

        /* ================= ATTENDANCE ================= */
        const attendance = await AttendanceModel.aggregate([
            {
                $match: {
                    employeeId: { $in: employeeIds },
                    date: { $gte: from, $lte: to }
                }
            },
            {
                $project: {
                    employeeId: 1,
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "Asia/Kolkata" } },
                    status: 1,
                    checkIn: 1,
                    checkOut: 1,
                    totalHoursWorked: 1,
                    overtimeHours: 1,
                    arrivalStatus: 1,
                    isHalfDay: 1,
                    remarks: 1,
                    breaks: 1
                }
            }
        ]);

        /* ================= HOLIDAYS ================= */
        const holidays = await HolidayModel.find({
            $or: [{ organizationId: orgId }, { location: orgId }],
            date: { $gte: from, $lte: to },
            status: { $ne: "Inactive" }
        })
            .select("date holidayName name description")
            .lean()
            .then(h =>
                h.map(x => ({
                    date: moment(x.date).utcOffset(330).format("YYYY-MM-DD"),
                    name: x.holidayName || x.name || x.description || "Holiday",
                    description: x.holidayName || x.description || x.name || "Holiday"
                }))
            );

        /* ================= SHIFT ASSIGN ================= */
        const shiftAssignments = await ShiftAssignModel.aggregate([
            {
                $match: {
                    employeeId: { $in: employeeIds },
                    effectiveFrom: { $lte: to },
                    $or: [
                        { effectiveTo: { $gte: from } },
                        { effectiveTo: null },
                        { effectiveTo: { $exists: false } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "shifts",
                    localField: "shiftId",
                    foreignField: "_id",
                    as: "shift"
                }
            },
            { $unwind: "$shift" },
            {
                $project: {
                    employeeId: 1,
                    shift: 1,
                    effectiveFrom: 1,
                    effectiveTo: 1
                }
            }
        ]);

        /* ================= LEAVES ================= */
        const leaves = await LeaveRequestModel.find({
            employeeId: { $in: employeeIds },
            status: "Approved",
            startDate: { $lte: to },
            endDate: { $gte: from }
        })
            .populate("leaveTypeId", "leaveTypeName")
            .select("employeeId startDate endDate leaveTypeId leaveDurationType leaveDays comments")
            .lean();

        /* ================= MAP ================= */
        const result = employees.map(emp => {
            const empAttendance = attendance.filter(
                a => a.employeeId.toString() === emp._id.toString()
            );

            const empLeaves = leaves.filter(
                l => l.employeeId.toString() === emp._id.toString()
            );

            const empShifts = shiftAssignments.filter(
                s => s.employeeId.toString() === emp._id.toString()
            );

            const attendanceByDate = new Map(
                empAttendance.map(a => [String(a.date || "").slice(0, 10), a])
            );
            const trackerWeekOffs = generateWeeklyOffs(empShifts, from, to);
            const weeklyOffs = trackerWeekOffs
                .filter(w => !workedOnWeeklyOff(attendanceByDate.get(String(w.date || "").slice(0, 10))));

            return {
                employeeId: emp._id,
                employeeCode: emp.customId || emp.uniqueId || "",
                employeeName: `${emp.firstName} ${emp.lastName}`,
                email: emp.email,
                attendance: empAttendance,
                weeklyOffs,
                trackerWeekOffs,
                shift: summarizeShiftForTracker(empShifts, from),
                leaves: empLeaves
            };
        });

        return sendResponse(res, 200, true, "Data fetched successfully", {
            holidays,
            employees: result,
            teamOnly: isTeamOnly,
            pagination: {
                totalEmployees,
                currentPage: Number(page),
                totalPages: Math.ceil(totalEmployees / limit)
            }
        });

    } catch (err) {
        console.error("attendance range error:", err);
        return handleError(res, err);
    }
};

exports.checkIn = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        const {
            AttendanceModel,
            EmployeeModel,
            ShiftModel,
            AttendancePolicyModel,
            ReportingMethodModel
        } = await initModels(org_uuid);

        const { employeeId, date, checkIn, userLat, userLng, reportingType = "web", currentIp } = req.body;

        if (!employeeId || !date || !checkIn)
            return sendResponse(res, 400, false, "Required fields missing");

        const employee = await EmployeeModel.findById(employeeId);
        if (!employee)
            return sendResponse(res, 404, false, "Employee not found");

        const shift = await ShiftModel.findById(employee.shiftId);
        const policy = await AttendancePolicyModel.findById(employee.attendancePolicyId);
        const reportingMethod = await ReportingMethodModel.findById(employee.reportingMethodId);

        // ========== VALIDATE REPORTING METHOD ==========
        const reportingValidation = await reportingValidator.validateReportingMethod(
            reportingMethod,
            reportingType,
            userLat,
            userLng,
            currentIp
        );

        if (!reportingValidation.valid) {
            return sendResponse(res, 400, false, reportingValidation.error);
        }

        const normalizedDate = moment(date).format("YYYY-MM-DD");
        const checkInTime = parseDateTime(normalizedDate, checkIn);

        if (!checkInTime) {
            return sendResponse(res, 400, false, "Invalid check-in time");
        }

        let attendance = await AttendanceModel.findOne({
            employeeId,
            date: normalizedDate
        });

        if (attendance?.checkIn)
            return sendResponse(res, 400, false, "Already checked in");

        // ========== VALIDATE AGAINST POLICY ==========
        const shiftStartTimeObj = shift?.startTime ? parseDateTime(normalizedDate, shift.startTime) : null;
        const shiftEndTimeObj = shift?.endTime ? parseDateTime(normalizedDate, shift.endTime) : null;

        const lateStatus = attendanceValidator.checkLateStatus({
            checkInTime,
            shiftStartTime: shiftStartTimeObj,
            lateMarkMinutes: policy?.lateMarkMinutes || 0
        });

        // Validate punch relaxation
        const relaxationStatus = attendanceValidator.validatePunchRelaxation({
            checkInTime,
            shiftStartTime: shiftStartTimeObj,
            shiftEndTime: shiftEndTimeObj,
            attendanceDate: normalizedDate,
            policy: policy || {}
        });


        if (!relaxationStatus.validCheckIn && policy?.punchRelaxation?.beforeShiftMinutes) {
            return sendResponse(res, 400, false, `Check-in outside allowed window. ${relaxationStatus.message}`);
        }

        if (!attendance) {
            attendance = new AttendanceModel({
                employeeId,
                date: normalizedDate
            });
        }

        attendance.checkIn = checkInTime;
        attendance.arrivalStatus = lateStatus.isLate ? "late" : "onTime";
        attendance.status = "Present";
        attendance.trackStatus = "checkIn";
        attendance.reportingChannel = reportingType;

        await attendance.save();

        // ========== EMIT UPDATE VIA SOCKET ==========
        await sendAttendanceToUser(org_uuid, employeeId, attendance, "checkIn");

        return sendResponse(res, 201, true, "Check-in successful", {
            attendanceId: attendance._id,
            checkInTime: attendance.checkIn,
            arrivalStatus: attendance.arrivalStatus,
            isLate: lateStatus.isLate,
            minutesLate: lateStatus.minutesLate
        });

    } catch (err) {
        console.error("checkIn error:", err);
        return handleError(res, err);
    }
};

exports.checkOut = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        const {
            AttendanceModel,
            EmployeeModel,
            ShiftModel,
            AttendancePolicyModel,
            ReportingMethodModel
        } = await initModels(org_uuid);

        const { employeeId, date, checkOut, userLat, userLng, reportingType = "web", currentIp, eodReport, eodSkipped } = req.body;

        if (!employeeId || !date || !checkOut)
            return sendResponse(res, 400, false, "Required fields missing");

        const eodText = typeof eodReport === "string" ? eodReport.trim() : "";
        if (eodText.length > EOD_MAX_LENGTH)
            return sendResponse(res, 400, false, `EOD report cannot exceed ${EOD_MAX_LENGTH} characters`);

        const employee = await EmployeeModel.findById(employeeId);
        if (!employee)
            return sendResponse(res, 404, false, "Employee not found");

        const shift = await ShiftModel.findById(employee.shiftId);
        const policy = await AttendancePolicyModel.findById(employee.attendancePolicyId);
        const reportingMethod = await ReportingMethodModel.findById(employee.reportingMethodId);

        // ========== VALIDATE REPORTING METHOD ==========
        const reportingValidation = await reportingValidator.validateReportingMethod(
            reportingMethod,
            reportingType,
            userLat,
            userLng,
            currentIp
        );

        if (!reportingValidation.valid) {
            return sendResponse(res, 400, false, reportingValidation.error);
        }

        const normalizedDate = moment(date).format("YYYY-MM-DD");
        const attendance = await AttendanceModel.findOne({ employeeId, date: normalizedDate });

        if (!attendance?.checkIn)
            return sendResponse(res, 400, false, "Check-in not found");

        if (attendance.checkOut)
            return sendResponse(res, 400, false, "Already checked out");

        const checkOutTime = parseDateTime(normalizedDate, checkOut);
        if (!checkOutTime) {
            return sendResponse(res, 400, false, "Invalid check-out time");
        }

        if (checkOutTime <= attendance.checkIn)
            return sendResponse(res, 400, false, "Invalid checkout time");

        // Parse shift end time
        const shiftEndTimeObj = shift?.endTime ? parseDateTime(normalizedDate, shift.endTime) : null;

        // Validate punch relaxation
        const relaxationStatus = attendanceValidator.validatePunchRelaxation({
            checkOutTime,
            shiftEndTime: shiftEndTimeObj,
            policy: policy || {}
        });

        if (!relaxationStatus.validCheckOut && policy?.punchRelaxation?.afterShiftMinutes) {
            return sendResponse(res, 400, false, `Check-out outside allowed window. ${relaxationStatus.message}`);
        }

        // ========== CALCULATE WORKED TIME ==========
        const { grossHours, breakHours, netHours } = calculateNetWorkedHours(
            attendance.checkIn,
            checkOutTime,
            attendance.breaks,
            shift?.excludeBreakFromWorkingHours
        );

        const workedMinutes = netHours * 60;
        const requiredMinutes = shift?.compulsoryWorkHours || 0; // Already in minutes

        // ========== VALIDATE AGAINST POLICY ==========
        const earlyExitStatus = attendanceValidator.checkEarlyExitStatus({
            checkOutTime,
            shiftEndTime: shiftEndTimeObj,
            earlyExitMinutes: policy?.earlyExitMinutes || 0
        });

        const halfDayStatus = attendanceValidator.determineHalfDayStatus({
            workedMinutes,
            requiredMinutes,
            policy,
            earlyExitStatus
        });

        const overtimeStatus = attendanceValidator.calculateOvertimeStatus({
            workedMinutes,
            shiftWorkMinutes: requiredMinutes,
            policy
        });

        // ========== SAVE CHECKOUT ==========
        attendance.checkOut = checkOutTime;
        attendance.totalHoursWorked = netHours;
        attendance.overtimeHours = Math.max(0, overtimeStatus.overtimeMinutes / 60);
        attendance.status = halfDayStatus.isHalfDay ? "HalfDay" : "Present";
        attendance.isHalfDay = halfDayStatus.isHalfDay;
        attendance.trackStatus = "checkOut";
        attendance.reportingChannel = reportingType;
        attendance.remarks = `${attendance.remarks || ''} [${halfDayStatus.reason}]`.trim();
        if (eodText) {
            attendance.eodReport = eodText;
            attendance.eodSubmittedAt = new Date();
            attendance.eodSkipped = false;
        } else if ((eodSkipped === true || eodSkipped === "true") && !attendance.eodReport) {
            attendance.eodSkipped = true;
        }

        await attendance.save();

        // ========== EMIT UPDATE VIA SOCKET ==========
        await sendAttendanceToUser(org_uuid, employeeId, attendance, "checkOut");

        return sendResponse(res, 200, true, "Check-out successful", {
            attendanceId: attendance._id,
            checkOutTime: attendance.checkOut,
            grossHours,
            breakHours,
            netHours,
            status: attendance.status,
            isHalfDay: attendance.isHalfDay,
            overtimeHours: attendance.overtimeHours,
            earlyExit: earlyExitStatus.isEarlyExit,
            minutesEarly: earlyExitStatus.minutesEarly
        });

    } catch (err) {
        console.error("checkOut error:", err);
        return handleError(res, err);
    }
};

exports.updateMyEod = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        // Always the logged-in employee from the JWT, never from the body.
        const employeeId = req.empId;
        if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId))
            return sendResponse(res, 403, false, "Logged-in employee not found");

        const { date, eodReport } = req.body;
        const day = moment(date, "YYYY-MM-DD", true);
        if (!day.isValid())
            return sendResponse(res, 400, false, "date must be YYYY-MM-DD");

        const eodText = typeof eodReport === "string" ? eodReport.trim() : "";
        if (!eodText)
            return sendResponse(res, 400, false, "EOD report cannot be empty");
        if (eodText.length > EOD_MAX_LENGTH)
            return sendResponse(res, 400, false, `EOD report cannot exceed ${EOD_MAX_LENGTH} characters`);

        const { AttendanceModel } = await initModels(org_uuid);

        const from = new Date(`${day.format("YYYY-MM-DD")}T00:00:00.000Z`);
        const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

        const attendance = await AttendanceModel.findOne({
            employeeId,
            date: { $gte: from, $lt: to },
            checkIn: { $ne: null }
        });
        if (!attendance)
            return sendResponse(res, 404, false, "No check-in found for this date");

        const now = new Date();
        attendance.eodReport = eodText;
        attendance.eodSkipped = false;
        if (!attendance.eodSubmittedAt) attendance.eodSubmittedAt = now;
        attendance.eodUpdatedAt = now;
        await attendance.save();

        return sendResponse(res, 200, true, "EOD report saved", {
            attendanceId: attendance._id,
            eodReport: attendance.eodReport,
            eodSubmittedAt: attendance.eodSubmittedAt,
            eodUpdatedAt: attendance.eodUpdatedAt
        });
    } catch (err) {
        console.error("updateMyEod error:", err);
        return handleError(res, err);
    }
};

exports.getEodReports = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        const { AttendanceModel, EmployeeModel } = await initModels(org_uuid);

        const {
            date, fromDate, toDate, employeeId, orgId, search,
            eodStatus = "all", page = 1, limit = 20, teamOnly
        } = req.query;
        if (!orgId)
            return sendResponse(res, 400, false, "orgId required");

        // Either a single `date`, or a `fromDate`..`toDate` range (inclusive).
        const startDay = moment(fromDate || date, "YYYY-MM-DD", true);
        const endDay = moment(toDate || fromDate || date, "YYYY-MM-DD", true);
        if (!startDay.isValid() || !endDay.isValid())
            return sendResponse(res, 400, false, "date (or fromDate/toDate) must be YYYY-MM-DD");
        if (endDay.isBefore(startDay))
            return sendResponse(res, 400, false, "To date cannot be before From date");
        if (endDay.diff(startDay, "days") + 1 > EOD_MAX_RANGE_DAYS)
            return sendResponse(res, 400, false, `Date range cannot exceed ${EOD_MAX_RANGE_DAYS} days`);

        if (employeeId && !mongoose.Types.ObjectId.isValid(employeeId))
            return sendResponse(res, 400, false, "Invalid employeeId");

        // Attendance dates are stored as UTC midnight of the IST calendar day.
        const from = new Date(`${startDay.format("YYYY-MM-DD")}T00:00:00.000Z`);
        const to = new Date(new Date(`${endDay.format("YYYY-MM-DD")}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000);

        const isTeamOnly = String(teamOnly).toLowerCase() === "true";
        if (isTeamOnly && !req.empId)
            return sendResponse(res, 400, false, "Logged-in employee not found for team view");

        const empQuery = {
            organizationId: orgId,
            status: { $ne: "Inactive" },
            ...(employeeId && { _id: employeeId }),
            ...(isTeamOnly && { reportingManagerId: req.empId }),
            ...(search && {
                $or: [
                    { firstName: { $regex: search, $options: "i" } },
                    { lastName: { $regex: search, $options: "i" } },
                    { uniqueId: { $regex: search, $options: "i" } },
                    { customId: { $regex: search, $options: "i" } }
                ]
            })
        };

        const employees = await EmployeeModel.find(empQuery)
            .select("_id firstName lastName uniqueId customId photoUrl jobTitle departmentId")
            .populate("departmentId", "name")
            .lean();

        const employeeMap = new Map(employees.map(e => [e._id.toString(), e]));

        const attendance = await AttendanceModel.find({
            employeeId: { $in: employees.map(e => e._id) },
            date: { $gte: from, $lt: to },
            checkIn: { $ne: null }
        })
            .select("employeeId date checkIn checkOut totalHoursWorked status eodReport eodSubmittedAt eodSkipped")
            .lean();

        const allRows = attendance
            .map(a => {
                const emp = employeeMap.get(a.employeeId.toString());
                const eod = (a.eodReport || "").trim();
                return {
                    attendanceId: a._id,
                    date: moment.utc(a.date).format("YYYY-MM-DD"),
                    employeeId: a.employeeId,
                    employeeName: `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim(),
                    employeeCode: emp?.customId || emp?.uniqueId || "",
                    jobTitle: emp?.jobTitle || "",
                    department: emp?.departmentId?.name || "",
                    photoUrl: emp?.photoUrl || "",
                    checkIn: a.checkIn,
                    checkOut: a.checkOut || null,
                    totalHoursWorked: a.totalHoursWorked || 0,
                    status: a.status,
                    eodReport: eod,
                    eodSubmittedAt: a.eodSubmittedAt || null,
                    eodSkipped: !eod && !!a.eodSkipped,
                    hasEod: !!eod
                };
            })
            .sort((x, y) =>
                y.date.localeCompare(x.date) || x.employeeName.localeCompare(y.employeeName)
            );

        const submitted = allRows.filter(r => r.hasEod).length;
        const skipped = allRows.filter(r => r.eodSkipped).length;
        const summary = {
            total: allRows.length,
            submitted,
            skipped,
            pending: allRows.length - submitted - skipped
        };

        const filters = {
            submitted: r => r.hasEod,
            skipped: r => r.eodSkipped,
            pending: r => !r.hasEod && !r.eodSkipped
        };
        const filtered = filters[eodStatus] ? allRows.filter(filters[eodStatus]) : allRows;

        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const records = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        return sendResponse(res, 200, true, "EOD reports fetched successfully", {
            fromDate: startDay.format("YYYY-MM-DD"),
            toDate: endDay.format("YYYY-MM-DD"),
            summary,
            records,
            pagination: {
                totalRecords: filtered.length,
                currentPage: pageNum,
                totalPages: Math.max(1, Math.ceil(filtered.length / limitNum))
            }
        });
    } catch (err) {
        console.error("getEodReports error:", err);
        return handleError(res, err);
    }
};

// Lightweight employee picker for the EOD Reports "employee wise" view.
exports.getEodEmployees = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        const { EmployeeModel } = await initModels(org_uuid);
        const { orgId, search, teamOnly } = req.query;
        if (!orgId) return sendResponse(res, 400, false, "orgId required");

        const isTeamOnly = String(teamOnly).toLowerCase() === "true";
        if (isTeamOnly && !req.empId)
            return sendResponse(res, 400, false, "Logged-in employee not found for team view");

        const term = String(search || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const employees = await EmployeeModel.find({
            organizationId: orgId,
            status: { $ne: "Inactive" },
            ...(isTeamOnly && { reportingManagerId: req.empId }),
            ...(term && {
                $or: [
                    { firstName: { $regex: term, $options: "i" } },
                    { lastName: { $regex: term, $options: "i" } },
                    { uniqueId: { $regex: term, $options: "i" } },
                    { customId: { $regex: term, $options: "i" } }
                ]
            })
        })
            .select("_id firstName lastName uniqueId customId photoUrl departmentId")
            .populate("departmentId", "name")
            .sort({ firstName: 1, lastName: 1 })
            .limit(20)
            .lean();

        return sendResponse(res, 200, true, "Employees fetched successfully", employees.map(e => ({
            _id: e._id,
            name: `${e.firstName || ""} ${e.lastName || ""}`.trim(),
            code: e.customId || e.uniqueId || "",
            department: e.departmentId?.name || "",
            photoUrl: e.photoUrl || ""
        })));
    } catch (err) {
        console.error("getEodEmployees error:", err);
        return handleError(res, err);
    }
};

exports.breakIn = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        const { AttendanceModel, ReportingMethodModel, EmployeeModel } = await initModels(org_uuid);
        const { employeeId, date, breakIn, userLat, userLng, reportingType = "web", currentIp } = req.body;

        if (!employeeId || !date || !breakIn)
            return sendResponse(res, 400, false, "Required fields missing");

        const normalizedDate = moment(date).format("YYYY-MM-DD");
        const employee = await EmployeeModel.findById(employeeId);
        if (!employee)
            return sendResponse(res, 404, false, "Employee not found");

        const reportingMethod = await ReportingMethodModel.findById(employee.reportingMethodId);

        // ========== VALIDATE REPORTING METHOD ==========
        const validation = await reportingValidator.validateReportingMethod(
            reportingMethod,
            reportingType,
            userLat,
            userLng,
            currentIp
        );

        if (!validation.valid) {
            return sendResponse(res, 400, false, validation.error);
        }

        const attendance = await AttendanceModel.findOne({ employeeId, date: normalizedDate });
        if (!attendance?.checkIn)
            return sendResponse(res, 400, false, "Check-in required");

        const lastBreak = attendance.breaks.at(-1);
        if (lastBreak && !lastBreak.breakOut)
            return sendResponse(res, 400, false, "Already on break");

        const breakInTime = parseDateTime(normalizedDate, breakIn);
        if (!breakInTime)
            return sendResponse(res, 400, false, "Invalid break-in time");

        attendance.breaks.push({ breakIn: breakInTime });
        attendance.trackStatus = "breakIn";
        attendance.reportingChannel = reportingType;
        await attendance.save();

        await sendAttendanceToUser(org_uuid, employeeId, attendance, "breakIn");

        return sendResponse(res, 200, true, "Break-in successful", attendance);
    } catch (err) {
        console.error("breakIn error:", err);
        return handleError(res, err);
    }
};

exports.breakOut = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

        const { AttendanceModel, ReportingMethodModel, EmployeeModel } = await initModels(org_uuid);
        const { employeeId, date, breakOut, userLat, userLng, reportingType = "web", currentIp } = req.body;

        if (!employeeId || !date || !breakOut)
            return sendResponse(res, 400, false, "Required fields missing");

        const normalizedDate = moment(date).format("YYYY-MM-DD");
        const employee = await EmployeeModel.findById(employeeId);
        if (!employee)
            return sendResponse(res, 404, false, "Employee not found");

        const reportingMethod = await ReportingMethodModel.findById(employee.reportingMethodId);

        // ========== VALIDATE REPORTING METHOD ==========
        const validation = await reportingValidator.validateReportingMethod(
            reportingMethod,
            reportingType,
            userLat,
            userLng,
            currentIp
        );

        if (!validation.valid) {
            return sendResponse(res, 400, false, validation.error);
        }

        const attendance = await AttendanceModel.findOne({ employeeId, date: normalizedDate });
        if (!attendance)
            return sendResponse(res, 400, false, "Attendance not found");

        const activeBreak = attendance.breaks.find(b => !b.breakOut);
        if (!activeBreak)
            return sendResponse(res, 400, false, "No active break");

        const breakOutTime = parseDateTime(normalizedDate, breakOut);
        if (!breakOutTime)
            return sendResponse(res, 400, false, "Invalid break-out time");

        if (breakOutTime <= activeBreak.breakIn)
            return sendResponse(res, 400, false, "Invalid break-out time");

        activeBreak.breakOut = breakOutTime;
        attendance.trackStatus = "checkIn";
        attendance.reportingChannel = reportingType;
        await attendance.save();

        await sendAttendanceToUser(org_uuid, employeeId, attendance, "breakOut");

        return sendResponse(res, 200, true, "Break-out successful", attendance);
    } catch (err) {
        console.error("breakOut error:", err);
        return handleError(res, err);
    }
};

exports.getMonthlyAttendanceSummary = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const {
            AttendanceModel,
            HolidayModel,
            LeaveRequestModel,
            ShiftAssignModel,
            ShiftModel
        } = await initModels(org_uuid);

        const { employeeId } = req.params;
        const { startDate, endDate, organizationId } = req.query;

        if (!startDate || !endDate)
            return sendResponse(res, 400, false, "startDate & endDate required");

        if (!mongoose.Types.ObjectId.isValid(employeeId))
            return sendResponse(res, 400, false, "Invalid employee ID");

        const from = new Date(startDate);
        const to = new Date(endDate);
        to.setHours(23, 59, 59, 999);

        /* ================= TOTAL DAYS ================= */
        const totalDays =
            Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;

        /* ================= HOLIDAYS ================= */
        const holidays = await HolidayModel.find({
            organizationId,
            date: { $gte: from, $lte: to }
        }).lean();

        const holidayDates = new Set(
            holidays.map(h => h.date.toISOString().slice(0, 10))
        );

        /* ================= WEEK OFF ================= */
        const shiftAssigns = await ShiftAssignModel.aggregate([
            {
                $match: {
                    employeeId: new mongoose.Types.ObjectId(employeeId),
                    effectiveFrom: { $lte: to },
                    $or: [
                        { effectiveTo: { $gte: from } },
                        { effectiveTo: null },
                        { effectiveTo: { $exists: false } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "shifts",
                    localField: "shiftId",
                    foreignField: "_id",
                    as: "shift"
                }
            },
            { $unwind: "$shift" }
        ]);

        const weekOffDates = new Set();

        const getWeekOfMonth = d =>
            Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);

        const getDayName = d =>
            ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];

        for (const sa of shiftAssigns) {
            const shift = sa.shift;
            if (!shift.weeklyOff) continue;

            let s = new Date(Math.max(sa.effectiveFrom, from));
            let e = sa.effectiveTo
                ? new Date(Math.min(sa.effectiveTo, to))
                : to;

            for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
                const weekNo = getWeekOfMonth(d);
                const weekKey =
                    weekNo === 1 ? "firstWeek" :
                        weekNo === 2 ? "secondWeek" :
                            weekNo === 3 ? "thirdWeek" :
                                weekNo === 4 ? "fourthWeek" : "fifthWeek";

                const offDays = shift.weeklyOff?.[weekKey]?.days || [];
                if (offDays.includes(getDayName(d))) {
                    weekOffDates.add(d.toISOString().slice(0, 10));
                }
            }
        }

        /* ================= LEAVES ================= */
        const leaves = await LeaveRequestModel.find({
            employeeId,
            status: "Approved",
            startDate: { $lte: to },
            endDate: { $gte: from }
        }).lean();

        const leaveDates = new Set();
        for (const l of leaves) {
            let s = new Date(Math.max(l.startDate, from));
            let e = new Date(Math.min(l.endDate, to));
            for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
                leaveDates.add(d.toISOString().slice(0, 10));
            }
        }

        /* ================= ATTENDANCE ================= */
        const attendance = await AttendanceModel.find({
            employeeId,
            date: { $gte: from, $lte: to }
        }).lean();

        let present = 0;
        let HalfDay = 0;

        attendance.forEach(a => {
            if (a.status === "Present") present += 1;
            if (a.status === "HalfDay") HalfDay += 0.5;
        });

        /* ================= CALCULATION ================= */
        const totalHolidays = holidayDates.size;
        const totalWeekOffs = weekOffDates.size;
        const totalLeaveDays = leaveDates.size;

        const workingDays =
            totalDays - totalHolidays - totalWeekOffs;

        const workedDays =
            present + HalfDay + totalLeaveDays;

        const absentDays = Math.max(workingDays - workedDays, 0);

        return sendResponse(res, 200, true, "Monthly attendance summary", {
            totalDays,
            workingDays,
            presentDays: present,
            HalfDay,
            leaveDays: totalLeaveDays,
            holidays: totalHolidays,
            weekOffs: totalWeekOffs,
            absentDays
        });

    } catch (err) {
        console.error("monthly summary error:", err);
        return handleError(res, err);
    }
};

// exports.markAbsentEmployees = async (req, res) => {
//     try {
//         const org_uuid = req.headers.org_uuid;
//         if (!org_uuid) {
//             return sendResponse(res, 400, false, 'org_uuid not found');
//         }

//         const { AttendanceModel, EmployeeModel, HolidayModel } = await initModels(org_uuid);

//         const date = req.body.date || new Date().toISOString().split('T')[0];

//         // Get all employees with their organizationId
//         const allEmployees = await EmployeeModel.find({}, '_id organizationId').lean();
//         const attendanceForDate = await AttendanceModel.find({ date }, 'employeeId').lean();
//         const presentEmployeeIds = new Set(attendanceForDate.map(record => record.employeeId.toString()));

//         // Get holidays for the date
//         const holiday = await HolidayModel.findOne({ date }).lean();

//         // Identify absent employees, excluding those with holidays
//         const absentEmployees = allEmployees.filter(employee => {
//             const isPresent = presentEmployeeIds.has(employee._id.toString());
//             const isHoliday = holiday && holiday.location === employee.organizationId.toString();
//             return !isPresent && !isHoliday;
//         });

//         // Prepare absent records
//         const absentRecords = absentEmployees.map(employee => ({
//             employeeId: employee._id,
//             date,
//             status: 'Absent',
//             checkIn: null,
//             checkOut: null,
//             totalHoursWorked: 0,
//             remarks: 'Marked Absent'
//         }));

//         if (absentRecords.length > 0) {
//             await AttendanceModel.insertMany(absentRecords);
//         }

//         return sendResponse(res, 200, true, `Absent records created for ${absentRecords.length} employees`, absentRecords);
//     } catch (error) {
//         return handleError(res, error);
//     }
// };

exports.todayAttendanceByEmployeeId = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const { AttendanceModel, EmployeeModel } = await initModels(org_uuid);
        const { employeeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(employeeId))
            return sendResponse(res, 400, false, "Invalid employee ID");

        // Today in IST. Server-local moment() missed the punch for employees
        // when the host timezone was not India, so Break In / EOD stayed hidden until refresh.
        const today = getIstDateString();
        const { startOfDay, endOfDay } = getIstDayRange();

        // 🔹 Optional: validate employee exists
        const employeeExists = await EmployeeModel.exists({ _id: employeeId });
        if (!employeeExists)
            return sendResponse(res, 404, false, "Employee not found");

        const attendance = await AttendanceModel.findOne({
            employeeId: new mongoose.Types.ObjectId(employeeId),
            $or: [
                { date: today },
                { date: new Date(`${today}T00:00:00.000Z`) },
                { date: { $gte: startOfDay, $lte: endOfDay } }
            ]
        }).sort({ checkIn: -1 })
            .populate("employeeId", "firstName lastName email")
            .lean();

        if (!attendance)
            return sendResponse(
                res,
                404,
                false,
                "No attendance record found for today"
            );

        return sendResponse(
            res,
            200,
            true,
            "Today's attendance fetched successfully",
            attendance
        );

    } catch (error) {
        console.error("todayAttendance error:", error);
        return handleError(res, error);
    }
};

exports.getAttendanceRateChart = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const { AttendanceModel } = await initModels(org_uuid);
        const { employeeId, year } = req.query;

        if (employeeId && !mongoose.Types.ObjectId.isValid(employeeId))
            return sendResponse(res, 400, false, "Invalid employeeId");

        const now = moment();
        const fiscalYear =
            year ? parseInt(year) : (now.month() < 3 ? now.year() - 1 : now.year());

        const start = moment(`${fiscalYear}-04-01`).startOf("day").toDate();
        const end = moment(`${fiscalYear + 1}-03-31`).endOf("day").toDate();

        const match = {
            date: { $gte: start, $lte: end }
        };

        if (employeeId) {
            match.employeeId = new mongoose.Types.ObjectId(employeeId);
        }

        const rawData = await AttendanceModel.aggregate([
            { $match: match },
            {
                $project: {
                    month: { $month: "$date" },
                    year: { $year: "$date" },
                    status: 1,
                    arrivalStatus: 1
                }
            },
            {
                $group: {
                    _id: { year: "$year", month: "$month" },
                    present: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["Present", "HalfDay"]] },
                                1,
                                0
                            ]
                        }
                    },
                    absent: {
                        $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] }
                    },
                    onTime: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $in: ["$status", ["Present", "HalfDay"]] },
                                        { $eq: ["$arrivalStatus", "onTime"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    late: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $in: ["$status", ["Present", "HalfDay"]] },
                                        { $eq: ["$arrivalStatus", "late"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        /* ====== BUILD 12 MONTH RESPONSE (APR → MAR) ====== */
        const result = [];

        for (let i = 0; i < 12; i++) {
            const m = moment(start).add(i, "months");
            const month = m.month() + 1;
            const year = m.year();

            const found = rawData.find(
                r => r._id.month === month && r._id.year === year
            );

            const present = found?.present || 0;
            const absent = found?.absent || 0;
            const onTime = found?.onTime || 0;
            const late = found?.late || 0;
            const total = present + absent;

            result.push({
                month,
                year,
                totalDays: total,
                present,
                absent,
                onTime,
                late,
                percentages: {
                    present: total ? ((present / total) * 100).toFixed(2) : "0.00",
                    absent: total ? ((absent / total) * 100).toFixed(2) : "0.00",
                    onTime: total ? ((onTime / total) * 100).toFixed(2) : "0.00",
                    late: total ? ((late / total) * 100).toFixed(2) : "0.00"
                }
            });
        }

        return sendResponse(
            res,
            200,
            true,
            "Attendance rate chart fetched successfully",
            result
        );

    } catch (err) {
        console.error("AttendanceRateChart error:", err);
        return handleError(res, err);
    }
};

exports.getEmployeeAttendanceByDateRange = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const {
            AttendanceModel,
            HolidayModel,
            EmployeeModel,
            ShiftAssignModel,
            ShiftModel,
            LeaveRequestModel
        } = await initModels(org_uuid);

        const { startDate, endDate, orgId, employeeId } = req.query;

        if (!startDate || !endDate || !orgId || !employeeId)
            return sendResponse(res, 400, false, "startDate, endDate, orgId & employeeId required");

        if (!mongoose.Types.ObjectId.isValid(employeeId))
            return sendResponse(res, 400, false, "Invalid employeeId");

        const start = moment(startDate, ["YYYY-MM-DD", "MM/DD/YYYY"]).startOf("day");
        const end = moment(endDate, ["YYYY-MM-DD", "MM/DD/YYYY"]).endOf("day");

        if (!start.isValid() || !end.isValid())
            return sendResponse(res, 400, false, "Invalid date format");

        // ================= EMPLOYEE =================
        const employee = await EmployeeModel.findOne({
            _id: employeeId,
            organizationId: orgId,
            status: { $ne: "Inactive" }
        })
            .select("_id firstName lastName email shiftId")
            .populate("shiftId")
            .lean();

        if (!employee)
            return sendResponse(res, 404, false, "Employee not found");

        // ================= PARALLEL FETCH =================
        const [
            attendanceRecords,
            holidays,
            leaves,
            shiftAssignments
        ] = await Promise.all([

            // Attendance
            AttendanceModel.find({
                employeeId,
                date: { $gte: start.toDate(), $lte: end.toDate() }
            })
                .sort({ date: 1 })
                .lean(),

            // Holidays (ORG level)
            HolidayModel.find({
                organizationId: orgId,
                date: { $gte: start.toDate(), $lte: end.toDate() }
            })
                .select("date name")
                .lean(),

            // Leaves
            LeaveRequestModel.find({
                employeeId,
                status: "Approved",
                startDate: { $lte: end.toDate() },
                endDate: { $gte: start.toDate() }
            })
                .select("startDate endDate leaveType leaveDurationType")
                .lean(),

            // Shift Assignments
            ShiftAssignModel.find({
                employeeId,
                effectiveFrom: { $lte: end.toDate() },
                $or: [
                    { effectiveTo: { $gte: start.toDate() } },
                    { effectiveTo: null },
                    { effectiveTo: { $exists: false } }
                ]
            })
                .populate("shiftId")
                .sort({ effectiveFrom: -1 })
                .lean()
        ]);

        // ================= WEEK OFF CALCULATION =================
        const weekOffDates = [];
        const fallbackShift = employee?.shiftId && typeof employee.shiftId === "object"
            ? employee.shiftId
            : null;

        for (
            let m = moment(start);
            m.isSameOrBefore(end);
            m.add(1, "day")
        ) {
            const dayName = m.format("dddd"); // Sunday, Monday...
            const weekOfMonth = Math.ceil(m.date() / 7); // 1-5
            const shift = pickShiftForDay(shiftAssignments, m, fallbackShift);

            if (!shift?.weeklyOff) continue;

            const weeklyOff =
                shift.weeklyOff?.[
                    ["firstWeek", "secondWeek", "thirdWeek", "fourthWeek", "fifthWeek"][weekOfMonth - 1]
                ]?.days || [];

            if (weeklyOff.includes(dayName)) {
                weekOffDates.push(m.format("YYYY-MM-DD"));
            }
        }

        // ================= FORMAT RESPONSE =================
        const formattedAttendance = attendanceRecords.map(a => ({
            ...a,
            date: moment(a.date).format("YYYY-MM-DD")
        }));

        const formattedLeaves = leaves.map(l => ({
            startDate: moment(l.startDate).format("YYYY-MM-DD"),
            endDate: moment(l.endDate).format("YYYY-MM-DD"),
            leaveType: l.leaveType,
            leaveDurationType: l.leaveDurationType
        }));

        const formattedHolidays = holidays.map(h => ({
            date: moment(h.date).format("YYYY-MM-DD"),
            name: h.name
        }));

        return sendResponse(res, 200, true, "Data fetched successfully", {
            employee: {
                employeeId: employee._id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                email: employee.email
            },
            attendance: formattedAttendance,
            leaves: formattedLeaves,
            weekOffs: weekOffDates,
            holidays: formattedHolidays
        });

    } catch (error) {
        console.error("getEmployeeAttendanceByDateRange error:", error);
        return handleError(res, error);
    }
};

// Get week number of month (1–5)
function getWeekOfMonth(date) {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstDayWeekDay = firstDayOfMonth.getDay(); // 0 = Sunday
    const offsetDate = date.getDate() + firstDayWeekDay - 1;
    return Math.floor(offsetDate / 7) + 1;
}

// Check weekly off based on shift schema
function isWeeklyOff(date, shift) {
    if (!shift?.weeklyOff) return false;

    const weekNumber = getWeekOfMonth(date);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

    const weekKeyMap = {
        1: "firstWeek",
        2: "secondWeek",
        3: "thirdWeek",
        4: "fourthWeek",
        5: "fifthWeek"
    };

    const weekKey = weekKeyMap[weekNumber];
    const weekConfig = shift.weeklyOff?.[weekKey];

    if (!weekConfig || !Array.isArray(weekConfig.days)) {
        return false;
    }

    return weekConfig.days.includes(dayName);
}

exports.markAbsentEmployees = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const {
            AttendanceModel,
            EmployeeModel,
            HolidayModel,
            AttendancePolicyModel,
            ShiftModel,
            LeaveRequestModel,
            BiometricPunchLogModel
        } = await initModels(org_uuid);

        // Get date from request or use today
        const date = req.body.date ? moment(req.body.date).toDate() : new Date();
        const dateStr = moment(date).format("YYYY-MM-DD");

        /* ===============================
           1️⃣ HOLIDAYS FOR THIS DATE
        =============================== */
        const holidays = await HolidayModel.find({ date: dateStr, status: { $ne: "Inactive" } }).lean();
        const holidayOrgSet = new Set(
            holidays.flatMap(h => [h.organizationId, h.location].filter(Boolean).map(id => id.toString()))
        );

        /* ===============================
           2️⃣ APPROVED LEAVES
        =============================== */
        const leaves = await LeaveRequestModel.find({
            status: "Approved",
            startDate: { $lte: new Date(dateStr + "T23:59:59") },
            endDate: { $gte: new Date(dateStr + "T00:00:00") }
        }).lean();

        const leaveEmployeeSet = new Set(
            leaves.map(l => l.employeeId.toString())
        );

        /* ===============================
           3️⃣ CURRENT ATTENDANCE RECORDS
        =============================== */
        const attendanceRecords = await AttendanceModel.find({
            date: dateStr
        })
        .populate('employeeId', 'attendancePolicyId shiftId')
        .lean();

        const presentEmployeeSet = new Set(
            attendanceRecords.map(a => a.employeeId._id.toString())
        );

        // Find missing checkouts (checked in but not checked out)
        const missingCheckoutRecords = attendanceRecords.filter(a => a.checkIn && !a.checkOut);

        /* ===============================
           4️⃣ ACTIVE EMPLOYEES
        =============================== */
        const employees = await EmployeeModel.find(
            { status: "Active" },
            "_id organizationId attendancePolicyId shiftId dateOfJoining"
        ).lean();

        if (!employees.length) {
            return sendResponse(res, 200, true, "No active employees found", {
                absentMarked: 0,
                checkoutHandled: 0,
                totalProcessed: 0
            });
        }

        /* ===============================
           5️⃣ LOAD POLICIES AND SHIFTS
           Auto absent does not depend on policy or reporting method.
        =============================== */
        const policyIds = [...new Set(employees.map(e => e.attendancePolicyId).filter(Boolean))];
        const shiftIds = [...new Set(employees.map(e => e.shiftId).filter(Boolean))];

        const [policies, shifts] = await Promise.all([
            AttendancePolicyModel.find({ _id: { $in: policyIds } }).lean(),
            ShiftModel.find({ _id: { $in: shiftIds } }).lean()
        ]);

        const policyMap = Object.fromEntries(policies.map(p => [p._id.toString(), p]));
        const shiftMap = Object.fromEntries(shifts.map(s => [s._id.toString(), s]));

        /* ===============================
           6️⃣ MARK ABSENT (NO ATTENDANCE)
        =============================== */
        const absentRecords = [];

        for (const emp of employees) {
            const empId = emp._id.toString();

            // Skip if already has attendance record
            if (presentEmployeeSet.has(empId)) continue;

            // Skip if on leave
            if (leaveEmployeeSet.has(empId)) continue;

            // Skip if holiday
            if (holidayOrgSet.has(emp.organizationId?.toString())) continue;

            const shift = shiftMap[emp.shiftId?.toString()];

            // Joining date se pehle Absent nahi lagana
            if (emp.dateOfJoining) {
                const joiningDate = moment(emp.dateOfJoining).utcOffset(330).format("YYYY-MM-DD");
                if (dateStr < joiningDate) continue;
            }

            // Skip if it's a weekly off
            if (isWeeklyOff(date, shift)) {
                continue;
            }

            absentRecords.push({
                employeeId: emp._id,
                date: dateStr,
                status: "Absent",
                checkIn: null,
                checkOut: null,
                totalHoursWorked: 0,
                arrivalStatus: "onTime",
                isHalfDay: false,
                remarks: "Auto marked absent - No punch",
                attendancePolicyId: emp.attendancePolicyId,
                shiftId: emp.shiftId
            });
        }

        /* ===============================
           7️⃣ HANDLE MISSING CHECKOUTS
           Last biometric punch after check-in becomes Out first.
           Remaining open records follow missingCheckoutAction (shift-end / HalfDay).
           Existing checkOut (e.g. web Punch Out) is never overwritten.
        =============================== */
        const lastPunchClosedIds = await applyLastBiometricPunchCheckouts({
            org_uuid,
            AttendanceModel,
            BiometricPunchLogModel,
            ShiftModel,
            AttendancePolicyModel,
            dateStr,
            missingCheckoutRecords
        });

        const remainingMissingCheckout = missingCheckoutRecords.filter(
            (r) => !lastPunchClosedIds.has(String(r._id))
        );

        const checkoutUpdates = [];

        for (const record of remainingMissingCheckout) {
            // Get policy and shift from populated employee data
            const policyId = record.employeeId?.attendancePolicyId?.toString();
            const shiftId = record.employeeId?.shiftId?.toString();
            
            const policy = policyMap[policyId];
            if (!policy || !policy.missingCheckoutAction) continue;

            const shift = shiftMap[shiftId];
            const missingCheckoutAction = policy.missingCheckoutAction;

            if (missingCheckoutAction === "autoCheckout") {
                // Auto-checkout at shift end time
                const shiftEnd = shift?.endTime
                    ? parseDateTime(dateStr, shift.endTime)
                    : parseDateTime(dateStr, "17:30");

                // Calculate worked time
                const { netHours } = calculateNetWorkedHours(
                    record.checkIn,
                    shiftEnd,
                    record.breaks || [],
                    shift?.excludeBreakFromWorkingHours
                );

                // Run policy validation
                const shiftStartTimeObj = shift?.startTime ? parseDateTime(dateStr, shift.startTime) : null;
                const shiftEndTimeObj = shift?.endTime ? parseDateTime(dateStr, shift.endTime) : null;

                const validationResult = attendanceValidator.validateAttendanceAgainstPolicy({
                    checkInTime: record.checkIn,
                    checkOutTime: shiftEnd,
                    shiftStartTime: shiftStartTimeObj,
                    shiftEndTime: shiftEndTimeObj,
                    policy,
                    shift,
                    breaks: record.breaks || []
                });

                checkoutUpdates.push({
                    _id: record._id,
                    checkOut: shiftEnd,
                    totalHoursWorked: netHours,
                    status: validationResult.finalStatus,
                    isHalfDay: validationResult.halfDayStatus.isHalfDay,
                    overtimeHours: Math.max(0, validationResult.overtimeStatus.overtimeMinutes / 60),
                    trackStatus: "checkOut",
                    remarks: `${record.remarks || ''} [Auto checkout at ${moment(shiftEnd).format('HH:mm')}] [${validationResult.halfDayStatus.reason}]`.trim()
                });
            } else {
                // Mark as missing checkout (HalfDay status)
                checkoutUpdates.push({
                    _id: record._id,
                    status: "HalfDay",
                    isHalfDay: true,
                    remarks: `${record.remarks || ''} [Missing checkout - Marked HalfDay]`.trim()
                });
            }
        }

        /* ===============================
           8️⃣ BATCH OPERATIONS
        =============================== */
        let absentCount = 0;
        let checkoutCount = 0;

        if (absentRecords.length > 0) {
            const result = await AttendanceModel.insertMany(absentRecords);
            absentCount = result.length;
        }

        if (checkoutUpdates.length > 0) {
            for (const update of checkoutUpdates) {
                await AttendanceModel.findByIdAndUpdate(
                    update._id,
                    { $set: update },
                    { new: true }
                );
            }
            checkoutCount = checkoutUpdates.length;
        }

        checkoutCount += lastPunchClosedIds.size;

        return sendResponse(res, 200, true, "Scheduler task completed", {
            date: dateStr,
            absentMarked: absentCount,
            checkoutHandled: checkoutCount,
            lastPunchCheckout: lastPunchClosedIds.size,
            totalProcessed: absentCount + checkoutCount,
            details: {
                holidaysCount: holidayOrgSet.size,
                leaveEmployeesCount: leaveEmployeeSet.size,
                weeklyOffsHandled: "Included in logic"
            }
        });

    } catch (error) {
        console.error("[markAbsentEmployees] Error:", error);
        return handleError(res, error);
    }
};
