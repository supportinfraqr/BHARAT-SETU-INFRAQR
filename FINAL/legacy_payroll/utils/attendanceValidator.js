/**
 * Attendance Validator - Policy and time-based validation for attendance records
 * Handles: late marks, early exits, half-day determination, overtime calculation
 */

/**
 * Check if check-in is late
 * @param {Object} params - { checkInTime, shiftStartTime, lateMarkMinutes }
 * @returns {Object} { isLate, minutesLate }
 */
function checkLateStatus(params) {
    const { checkInTime, shiftStartTime, lateMarkMinutes = 0 } = params;

    if (!checkInTime || !shiftStartTime) {
        return { isLate: false, minutesLate: 0 };
    }

    const shiftStart = new Date(shiftStartTime);
    const allowedUntil = new Date(shiftStart.getTime() + (lateMarkMinutes * 60 * 1000));

    if (checkInTime > allowedUntil) {
        const minutesLate = Math.floor((checkInTime - allowedUntil) / (1000 * 60));
        return { isLate: true, minutesLate };
    }

    return { isLate: false, minutesLate: 0 };
}

/**
 * Check if check-out is early
 * @param {Object} params - { checkOutTime, shiftEndTime, earlyExitMinutes }
 * @returns {Object} { isEarlyExit, minutesEarly }
 */
function checkEarlyExitStatus(params) {
    const { checkOutTime, shiftEndTime, earlyExitMinutes = 0 } = params;

    if (!checkOutTime || !shiftEndTime) {
        return { isEarlyExit: false, minutesEarly: 0 };
    }

    const shiftEnd = new Date(shiftEndTime);
    const allowedEarlyExit = new Date(shiftEnd.getTime() - (earlyExitMinutes * 60 * 1000));

    if (checkOutTime < allowedEarlyExit) {
        const minutesEarly = Math.floor((allowedEarlyExit - checkOutTime) / (1000 * 60));
        return { isEarlyExit: true, minutesEarly };
    }

    return { isEarlyExit: false, minutesEarly: 0 };
}

/**
 * Handle missing checkout - auto-checkout at shift end
 * @param {Object} params - { checkOut, shift, policy }
 * @returns {Object} { checkOutTime, isMissingCheckout, action }
 */
function handleMissingCheckout(params) {
    const { checkOut, shift, policy } = params;

    if (checkOut) {
        return { checkOutTime: checkOut, isMissingCheckout: false, action: null };
    }

    const action = policy?.missingCheckoutAction || "autoCheckout";

    if (action === "autoCheckout") {
        // Auto-checkout at shift end time (assuming shiftEndTime is already a DateTime object)
        const shiftEndTime = shift?.endTime instanceof Date
            ? shift.endTime
            : (shift?.endTime ? new Date(shift.endTime) : new Date());
        
        return {
            checkOutTime: shiftEndTime,
            isMissingCheckout: true,
            action: "autoCheckout"
        };
    }

    return {
        checkOutTime: checkOut,
        isMissingCheckout: true,
        action: "missingCheckout"
    };
}

/**
 * Validate punch relaxation window
 * @param {Object} params - { checkInTime, shiftStartTime, checkOutTime, shiftEndTime, policy, attendanceDate }
 * @returns {Object} { isValid, validCheckIn, validCheckOut, message }
 */
function validatePunchRelaxation(params) {
    const {
        checkInTime,
        shiftStartTime,
        checkOutTime,
        shiftEndTime,
        policy = {},
        attendanceDate
    } = params;

    const safePolicy = policy || {};
    const relaxation = safePolicy.punchRelaxation || {};
    const beforeRelaxation = relaxation.beforeShiftMinutes || 0;
    const afterRelaxation = relaxation.afterShiftMinutes || 0;

    // If both relaxation values are 0, skip validation (accept any punch time)
    if (beforeRelaxation === 0 && afterRelaxation === 0) {
        return {
            isValid: true,
            validCheckIn: true,
            validCheckOut: true,
            beforeRelaxation: 0,
            afterRelaxation: 0,
            message: "No punch relaxation validation (0 minutes configured)"
        };
    }

    let validCheckIn = true;
    let validCheckOut = true;

    if (checkInTime && shiftStartTime) {
        const shiftStart = new Date(shiftStartTime);
        const earliestCheckIn = new Date(shiftStart.getTime() - (beforeRelaxation * 60 * 1000));
        const latestFromStart = new Date(shiftStart.getTime() + (afterRelaxation * 60 * 1000));
        const latestCheckIn = shiftEndTime
            ? new Date(new Date(shiftEndTime).getTime() + (afterRelaxation * 60 * 1000))
            : latestFromStart;

        validCheckIn = checkInTime >= earliestCheckIn && checkInTime <= latestCheckIn;
    }

    if (checkOutTime && shiftEndTime) {
        const shiftEnd = new Date(shiftEndTime);
        const earliestCheckOut = new Date(shiftEnd.getTime() - (beforeRelaxation * 60 * 1000));
        const latestCheckOut = new Date(shiftEnd.getTime() + (afterRelaxation * 60 * 1000));

        validCheckOut = checkOutTime >= earliestCheckOut && checkOutTime <= latestCheckOut;
    }

    return {
        isValid: validCheckIn && validCheckOut,
        validCheckIn,
        validCheckOut,
        beforeRelaxation,
        afterRelaxation,
        message: !validCheckIn ? "Check-in outside relaxation window" :
            !validCheckOut ? "Check-out outside relaxation window" : "Valid"
    };
}

/**
 * Determine if attendance is half-day
 * @param {Object} params - { workedMinutes, requiredMinutes, policy, earlyExitStatus }
 * @returns {Object} { isHalfDay, reason }
 */
function determineHalfDayStatus(params) {
    const { workedMinutes, requiredMinutes, policy = {}, earlyExitStatus = {} } = params;

    // Default: full day required = compulsoryWorkHours
    const fullDayThreshold = requiredMinutes || 0;
    const halfDayThreshold = policy?.halfDayMinutes || (fullDayThreshold * 0.5);

    if (workedMinutes < halfDayThreshold) {
        return { isHalfDay: true, reason: "Worked less than half-day threshold" };
    }

    if (earlyExitStatus.isEarlyExit && workedMinutes < fullDayThreshold) {
        return { isHalfDay: true, reason: "Early exit - worked less than full day" };
    }

    return { isHalfDay: false, reason: "Full day worked" };
}

/**
 * Calculate overtime hours
 * @param {Object} params - { workedMinutes, shiftWorkMinutes, policy }
 * @returns {Object} { overtimeMinutes, overtimeHours }
 */
function calculateOvertimeStatus(params) {
    const { workedMinutes, shiftWorkMinutes, policy = {} } = params;

    const overtimeThreshold = policy?.overtimeThreshold || shiftWorkMinutes || 0;
    const overtimeMinutes = Math.max(0, workedMinutes - overtimeThreshold);
    const overtimeHours = overtimeMinutes / 60;

    return {
        overtimeMinutes: Math.round(overtimeMinutes),
        overtimeHours: Number(overtimeHours.toFixed(2)),
        isOvertime: overtimeMinutes > 0
    };
}

/**
 * Main validation function - comprehensive attendance policy validation
 * @param {Object} params - Complete attendance and policy data
 * @returns {Object} Complete validation result with all statuses
 */
function validateAttendanceAgainstPolicy(params) {
    const {
        checkInTime,
        checkOutTime,
        shiftStartTime,
        shiftEndTime,
        policy = {},
        shift = {},
        breaks = []
    } = params;

    // ========== LATE STATUS ==========
    let lateStatus = { isLate: false, minutesLate: 0 };
    if (checkInTime && shiftStartTime && policy?.lateMarkRuleEnabled) {
        lateStatus = checkLateStatus({
            checkInTime,
            shiftStartTime,
            lateMarkMinutes: policy?.lateMarkMinutes || 0
        });
    }

    // ========== EARLY EXIT STATUS ==========
    let earlyExitStatus = { isEarlyExit: false, minutesEarly: 0 };
    if (checkOutTime && shiftEndTime && policy?.earlyExitRuleEnabled) {
        earlyExitStatus = checkEarlyExitStatus({
            checkOutTime,
            shiftEndTime,
            earlyExitMinutes: policy?.earlyExitMinutes || 0
        });
    }

    // ========== PUNCH RELAXATION ==========
    const relaxationStatus = validatePunchRelaxation({
        checkInTime,
        shiftStartTime,
        checkOutTime,
        shiftEndTime,
        policy
    });

    // ========== WORKED TIME CALCULATION ==========
    let workedMinutes = 0;
    if (checkInTime && checkOutTime && checkOutTime > checkInTime) {
        const grossMs = checkOutTime - checkInTime;
        
        // Calculate break duration
        let breakMs = 0;
        for (const b of breaks) {
            if (b.breakIn instanceof Date && b.breakOut instanceof Date && b.breakOut > b.breakIn) {
                breakMs += (b.breakOut - b.breakIn);
            }
        }

        const netMs = shift?.excludeBreakFromWorkingHours ? (grossMs - breakMs) : grossMs;
        workedMinutes = Math.round(netMs / (1000 * 60));
    }

    // ========== REQUIRED MINUTES ==========
    const requiredMinutes = shift?.compulsoryWorkHours || 0; // Already in minutes

    // ========== HALF-DAY STATUS ==========
    const halfDayStatus = determineHalfDayStatus({
        workedMinutes,
        requiredMinutes,
        policy,
        earlyExitStatus
    });

    // ========== OVERTIME STATUS ==========
    const overtimeStatus = calculateOvertimeStatus({
        workedMinutes,
        shiftWorkMinutes: requiredMinutes,
        policy
    });

    // ========== FINAL STATUS DETERMINATION ==========
    let finalStatus = "Present";
    if (halfDayStatus.isHalfDay) {
        finalStatus = policy?.halfDayStatus || "HalfDay";
    }
    if (lateStatus.isLate && policy?.lateMissingWorkPolicy === "Absent") {
        finalStatus = "Absent";
    }

    return {
        lateStatus,
        earlyExitStatus,
        relaxationStatus,
        halfDayStatus,
        overtimeStatus,
        finalStatus,
        workedMinutes,
        requiredMinutes,
        isValid: relaxationStatus.isValid
    };
}

module.exports = {
    checkLateStatus,
    checkEarlyExitStatus,
    handleMissingCheckout,
    validatePunchRelaxation,
    determineHalfDayStatus,
    calculateOvertimeStatus,
    validateAttendanceAgainstPolicy
};
