/**
 * Helpers for bulk attendance Excel leave handling
 */
const moment = require('moment');
const mongoose = require('mongoose');
const {
    checkLeaveBalance,
    checkMonthlyLeaveBalance,
    getEmployeeJoiningDate
} = require('../controller/leaveController/leaveService');

const FIXED_ATTENDANCE_STATUSES = new Set([
    'Present',
    'Absent',
    'Leave',
    'On Duty',
    'Lwp',
    'paid-halfDay',
    'Unpaid-halfDay'
]);

function normalizeKey(value) {
    return String(value || '').trim().toLowerCase();
}

/**
 * Normalize Excel/CSV date values including Excel serial numbers (e.g. 46381 → 2026-12-25).
 * Always returns a calendar YYYY-MM-DD with no timezone day-shift.
 */
function normalizeBulkDate(date) {
    if (date === null || date === undefined || date === '') return null;

    // Excel serial number (number or numeric string) — most reliable from xlsx raw:true
    const asNumber = typeof date === 'number' ? date : Number(String(date).trim());
    if (
        Number.isFinite(asNumber) &&
        asNumber > 20000 &&
        asNumber < 80000 &&
        (typeof date === 'number' || /^\d+(\.\d+)?$/.test(String(date).trim()))
    ) {
        const ymd = excelSerialToYmd(asNumber);
        if (ymd) return ymd;
    }

    if (date instanceof Date && !isNaN(date.getTime())) {
        // SheetJS UTC-midnight dates: use UTC Y/M/D to avoid IST→previous-day shift
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    const str = String(date).trim();

    // Prefer Indian DD-MM-YYYY when ambiguous (01-11-2026 = 1 Nov, not 11 Jan)
    const dmy = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/.exec(str);
    if (dmy) {
        const dd = Number(dmy[1]);
        const mm = Number(dmy[2]);
        const yyyy = Number(dmy[3]);
        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
            return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        }
    }

    const formats = [
        'YYYY-MM-DD',
        'DD-MMM-YYYY',
        'YYYY/MM/DD',
        moment.ISO_8601
    ];
    const strict = moment(str, formats, true);
    if (strict.isValid()) return strict.format('YYYY-MM-DD');

    const loose = moment(str);
    if (loose.isValid()) return loose.format('YYYY-MM-DD');

    return null;
}

/** Excel serial → YYYY-MM-DD (UTC calendar day, no TZ shift) */
function excelSerialToYmd(serial) {
    const whole = Math.floor(Number(serial));
    if (!Number.isFinite(whole)) return null;
    // Excel epoch 1899-12-30; SheetJS/Excel day count
    const utcDays = whole - 25569;
    const ms = utcDays * 86400 * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

function xlsxExcelSerialToMoment(serial) {
    const ymd = excelSerialToYmd(serial);
    return ymd ? moment.utc(ymd, 'YYYY-MM-DD') : moment.invalid();
}

function decisionKey(employeeId, date, leaveTypeName) {
    const normalized = normalizeBulkDate(date) || moment(date).format('YYYY-MM-DD');
    return `${normalizeKey(employeeId)}|${normalized}|${normalizeKey(leaveTypeName)}`;
}

function parseLeaveDecisions(raw) {
    if (!raw) return [];
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function isLeaveTypeStatus(status) {
    if (!status) return false;
    const trimmed = String(status).trim();
    if (FIXED_ATTENDANCE_STATUSES.has(trimmed)) {
        return trimmed === 'Leave' || trimmed === 'Lwp';
    }
    return true;
}

function mapAttendanceStatusForDb(status, isLeaveRow) {
    if (isLeaveRow || status === 'Leave') return 'Leave';
    if (status === 'Lwp') return 'Lwp';
    if (status === 'paid-halfDay' || status === 'Unpaid-halfDay') return 'HalfDay';
    if (status === 'On Duty') return 'On Duty';
    if (status === 'Present' || status === 'Absent' || status === 'HalfDay') return status;
    return 'Absent';
}

function isEmployeeEligibleForLeaveType(leaveType, employee) {
    const employeeId = employee._id.toString();
    const filters = leaveType.customFilters || {};

    const notAllowed = Array.isArray(filters.notAssignEmployee)
        && filters.notAssignEmployee.some(id => id?.toString() === employeeId);
    if (notAllowed) return false;

    switch (leaveType.applicableTo) {
        case 'All':
            return true;
        case 'Department':
            return Array.isArray(filters.departments)
                && filters.departments.some(dep => dep?.toString() === (employee.departmentId || '').toString());
        case 'Employee':
            return Array.isArray(filters.employees)
                && filters.employees.some(e => e?.toString() === employeeId);
        case 'Custom':
        default:
            if (filters.employees?.some(e => e?.toString() === employeeId)) return true;
            if (filters.departments?.some(dep => dep?.toString() === (employee.departmentId || '').toString())) {
                return true;
            }
            return false;
    }
}

async function resolveLeaveTypeByStatusName({
    status,
    LeaveNameModel,
    LeaveTypeModel,
    organizationId
}) {
    const name = String(status || '').trim();
    if (!name || name === 'Leave' || name === 'Lwp') {
        return null;
    }

    const leaveName = await LeaveNameModel.findOne({
        status: 'active',
        $or: [
            { name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } },
            { shortName: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } },
            { code: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } }
        ]
    }).lean();

    if (!leaveName) return null;

    const leaveTypeQuery = {
        leaveNameId: leaveName._id,
        status: 'active'
    };

    let leaveType = null;
    if (organizationId) {
        leaveType = await LeaveTypeModel.findOne({
            ...leaveTypeQuery,
            organizationId
        })
            .populate('leaveNameId', 'name shortName code')
            .lean();
    }

    if (!leaveType) {
        leaveType = await LeaveTypeModel.findOne(leaveTypeQuery)
            .populate('leaveNameId', 'name shortName code')
            .lean();
    }

    if (!leaveType) return null;

    return {
        leaveName,
        leaveType,
        leaveTypeName: leaveName.name || leaveName.shortName || leaveName.code || name
    };
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findExistingLeaveForDate({
    LeaveRequestModel,
    employeeId,
    leaveTypeId,
    date
}) {
    const dayStart = moment.utc(date).startOf('day').toDate();
    const dayEnd = moment.utc(date).endOf('day').toDate();

    return LeaveRequestModel.findOne({
        employeeId,
        leaveTypeId,
        status: { $in: ['Pending', 'Approved'] },
        startDate: { $lte: dayEnd },
        endDate: { $gte: dayStart }
    }).lean();
}

async function getLeaveBalanceInfo({
    LeaveRequestModel,
    leaveType,
    employeeId,
    leaveTypeId,
    requestedDays = 1,
    joiningDate = null,
    requestedStartDate = null,
    requestedEndDate = null
}) {
    if (leaveType.isUnlimited) {
        return {
            remaining: 'Unlimited',
            totalCredit: 'Unlimited',
            usedDays: 0,
            isUnlimited: true
        };
    }

    const balance = await checkLeaveBalance({
        LeaveRequestModel,
        leaveType,
        employeeId,
        leaveTypeId,
        requestedDays,
        joiningDate,
        requestedStartDate,
        requestedEndDate
    });

    return {
        remaining: balance.remaining,
        totalCredit: balance.totalCredit,
        usedDays: balance.usedDays,
        isUnlimited: false
    };
}

async function resolveLeaveReasonId(LeaveReasonModel, leaveNameId) {
    let reason = await LeaveReasonModel.findOne({
        leaveNameId,
        status: 'active'
    }).lean();

    if (!reason) {
        reason = await LeaveReasonModel.create({
            reason: 'Bulk Attendance Upload',
            description: 'Auto-created for bulk attendance leave upload',
            leaveNameId,
            isSystemGenerated: true,
            status: 'active'
        });
    }

    return reason._id;
}

async function createOrUpdateLeaveFromBulk({
    LeaveRequestModel,
    LeaveReasonModel,
    leaveType,
    employee,
    date,
    action, // Applied | Approved
    leaveTypeName,
    remarks,
    approverId
}) {
    const normalizedDate = normalizeBulkDate(date) || String(date).trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        throw new Error(`Invalid leave date "${date}"`);
    }
    // Store as UTC calendar day (no local TZ shift)
    const dayStart = new Date(`${normalizedDate}T00:00:00.000Z`);
    const dayEnd = new Date(`${normalizedDate}T00:00:00.000Z`);
    const leaveDays = 1;
    const joiningDate = getEmployeeJoiningDate(employee);

    const existing = await findExistingLeaveForDate({
        LeaveRequestModel,
        employeeId: employee._id,
        leaveTypeId: leaveType._id,
        date: normalizedDate
    });

    const targetStatus = action === 'Approved' ? 'Approved' : 'Pending';
    const leaveReasonId = await resolveLeaveReasonId(LeaveReasonModel, leaveType.leaveNameId);

    // Skip balance check when acknowledging an existing covering leave
    // (only re-check when creating new, or upgrading Pending → Approved)
    const needsBalanceCheck = !existing || (existing.status === 'Pending' && targetStatus === 'Approved');
    if (needsBalanceCheck) {
        if (leaveType.typeOfLeave === 'Monthly') {
            await checkMonthlyLeaveBalance({
                LeaveRequestModel,
                leaveType,
                employeeId: employee._id,
                leaveTypeId: leaveType._id,
                startDate: dayStart,
                endDate: dayEnd,
                excludeRequestId: existing?._id || null
            });
        } else {
            await checkLeaveBalance({
                LeaveRequestModel,
                leaveType,
                employeeId: employee._id,
                leaveTypeId: leaveType._id,
                requestedDays: leaveDays,
                requestedStartDate: dayStart,
                requestedEndDate: dayEnd,
                joiningDate,
                excludeRequestId: existing?._id || null
            });
        }
    }

    if (existing) {
        const update = {
            comments: remarks
                ? `${existing.comments || ''} [Bulk Upload] ${remarks}`.trim()
                : existing.comments || `Bulk upload - ${leaveTypeName}`
        };

        // Only upgrade Pending → Approved when user chooses Approved
        if (existing.status === 'Pending' && targetStatus === 'Approved') {
            update.status = 'Approved';
            update.approvedDate = new Date();
            if (approverId && mongoose.Types.ObjectId.isValid(approverId)) {
                update.approvedBy = approverId;
            }
        }

        const updated = await LeaveRequestModel.findByIdAndUpdate(existing._id, update, { new: true });
        return { leaveRequest: updated, created: false, status: updated.status };
    }

    const payload = {
        employeeId: employee._id,
        leaveTypeId: leaveType._id,
        leaveReasonId,
        startDate: dayStart,
        endDate: dayEnd,
        leaveDurationType: 'Full-Day',
        leaveDays,
        status: targetStatus,
        comments: remarks || `Bulk attendance upload - ${leaveTypeName}`,
        appliedDate: new Date()
    };

    if (targetStatus === 'Approved') {
        payload.approvedDate = new Date();
        if (approverId && mongoose.Types.ObjectId.isValid(approverId)) {
            payload.approvedBy = approverId;
        }
    }

    const leaveRequest = await LeaveRequestModel.create(payload);
    return { leaveRequest, created: true, status: leaveRequest.status };
}

module.exports = {
    FIXED_ATTENDANCE_STATUSES,
    normalizeKey,
    normalizeBulkDate,
    decisionKey,
    parseLeaveDecisions,
    isLeaveTypeStatus,
    mapAttendanceStatusForDb,
    isEmployeeEligibleForLeaveType,
    resolveLeaveTypeByStatusName,
    findExistingLeaveForDate,
    getLeaveBalanceInfo,
    createOrUpdateLeaveFromBulk
};
